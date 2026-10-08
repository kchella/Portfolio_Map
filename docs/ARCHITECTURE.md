# PAR Map — Architecture

How the app is put together, as of 2026-10-07. For setup and day-to-day use, see the root `README.md`. For open security issues, see `docs/security/SECURITY-AUDIT.md`.

## Overview

PAR Map is a Next.js 15 (Pages Router) app for SupaMoto Zambia field teams. It shows the weekly loan portfolio on a Leaflet map with Mapbox tiles:
- each customer is coloured by PAR bucket;
- admin-managed boundary and buffer layers are drawn on top;
- each customer can be linked to their Supa Partner by distance and a road route.

**There is no server code of our own.** There are no `api/` routes. The browser talks to Supabase directly with the public anon key, and **row-level security (RLS) in Postgres is the only real access control**. The Edge middleware only checks that someone is signed in.

---

## Pages

| Route | Access | File | Purpose |
|---|---|---|---|
| `/` | — | `next.config.mjs` redirect | Redirects to `/map` |
| `/map` | Signed in + approved | `pages/map.tsx` | The field map |
| `/admin` | Admin | `pages/admin.tsx` | Customers, layers, buffers, users |
| `/login` | Public | `pages/login.tsx` | Email + Google sign-in |
| `/register` | Public | `pages/register.tsx` | Self-registration; account starts `pending` |
| `/forgot-password` | Public | `pages/forgot-password.tsx` | Sends the Supabase reset email (link → `/reset-password`) |
| `/reset-password` | Reset link | `pages/reset-password.tsx` | Exchanges the reset code, sets a new password, back to `/login` |
| `/auth/callback` | Internal | `pages/auth/callback.tsx` | OAuth / email-confirm landing, role check |
| `/404` | Public | `pages/404.tsx` | Redirects home |

---

## Code map

```
src/
├── middleware.ts                → Edge: /map and /admin need a session (getUser via @supabase/ssr)
├── pages/
│   ├── map.tsx                  → map page: nav bar, side panel (PAR filters, layers, teams), search
│   ├── admin.tsx                → admin gate (useAuth) + AdminLayout shell
│   ├── login.tsx, register.tsx, forgot-password.tsx
│   ├── auth/callback.tsx        → PKCE code exchange, role check, safe redirect
│   ├── _document.tsx            → fonts, favicon, theme colour
│   └── 404.tsx
├── components/
│   ├── Map.tsx                  → Leaflet map (client-only), panes, markers, layers, route overlay
│   ├── PopupCard.tsx            → customer popup (status, contact, Supa Partner, route button)
│   ├── RouteCard.tsx            → walk / bike / drive route card, Google Maps hand-off
│   ├── NavIcons.tsx, icons.tsx  → SVG icons
│   ├── OnboardingGuide.tsx      → first-visit guide (admin)
│   └── admin/
│       ├── AdminLayout.tsx      → sidebar + mobile nav
│       ├── AdminUI.tsx          → admin tokens (T) and primitives: Btn, Card, DZ, FI, Toggle, …
│       ├── CustomerManager.tsx  → weekly CSV import, summary tiles, searchable customer table
│       ├── LayerManager.tsx     → KMZ upload, teams, per-layer team dropdown
│       ├── BufferManager.tsx    → CSV → geodesic buffer circles
│       └── UserManager.tsx      → approve / promote / revoke accounts
├── lib/
│   ├── supabase.ts              → browser client singleton (PKCE), Profile type, unused getSupabaseAdmin()
│   ├── useAuth.ts               → user, profile, isAdmin, hasAccess, loading, authError, signOut
│   ├── customerService.ts       → syncCustomers (schema check → delete → chunked insert), getCustomers (paged)
│   ├── layerService.ts          → kmz_layers + buffer_layers CRUD, storage upload/download, parsing
│   └── safeNext.ts              → same-origin ?next= check; hasMapAccess(role)
├── hooks/useIsMobile.ts
├── types/par.ts                 → Customer, KMZLayer, PAR colours/badges/labels, isPriorityVisit, computeStats
├── utils/
│   ├── kmzParser.ts             → JSZip + DOMParser: KMZ/KML → GeoJSON
│   ├── geoHelpers.ts            → geodesicPoint, haversineM, formatDistance, formatPhoneNumber
│   ├── parHelpers.ts            → marker colour/radius, normalizePARStatus
│   ├── supaPartners.ts          → linkCustomerToPartner (straight-line distance)
│   └── routing.ts               → OSRM fetch per mode, session cache, Google Maps URL
└── styles/
    ├── theme.ts                 → map UI tokens (T, F)
    └── globals.css
```

---

## Authentication and access

### Roles

`public.profiles.role` is one of `pending`, `user` or `admin`. A trigger (`handle_new_user`) on `auth.users` creates the profile as **`pending`** for every new account.

The Supabase project is shared with other apps, so this trigger fires for their sign-ups too. Those accounts also land as `pending` and see nothing (audit N1).

| Role | `has_map_access()` | `is_admin()` |
|---|---|---|
| `pending` | false | false |
| `user` | true | false |
| `admin` | true | true |

Both functions are `SECURITY DEFINER` with `search_path` pinned (migration 003).

### Sign-in

```
Email:  login.tsx → signInWithPassword → fetch profile
        → pending?  sign out, show "waiting for approval"
        → next=/admin but not admin? → "no admin access"
        → window.location.href = safeNext(next)   (full navigation, so the cookie is set before middleware runs)

Google: signInWithOAuth({ redirectTo: /auth/callback?next=… })
        → Google → Supabase → /auth/callback
        → exchangeCodeForSession(code)   (PKCE; needs the same browser client singleton)
        → fetch profile → same pending / admin checks → router.replace(safeNext(next))
```

The callback doesn't create or update profiles; the database trigger does that.

### Middleware

`middleware.ts` runs on `/map` and `/admin` only. It builds a `@supabase/ssr` server client from the request cookies and calls `auth.getUser()`. With no user, it redirects to `/login?next=<path>`.

It doesn't check roles. Pages check roles for display, and RLS enforces them. If the auth call throws, the request **falls through** (audit L2).

### useAuth race fix

`onAuthStateChange` fires once immediately on mount, racing `getSession()`. An `initialized` ref skips that first event, so only `getSession()` sets `loading = false`.

---

## Data flow

### Customers (weekly)

```
Admin → Customer Data → drop CSV
  → PapaParse (headers lower-cased; old Lead Generator headers accepted)
  → per row: phone normalised, PAR normalised, GPS validated
      no / zero / out-of-range customer GPS → skipped (counted: "no GPS" vs "invalid")
      Supa Partner GPS invalid → stored as null (row kept)
  → syncCustomers():
      1. check the supa_partner_* columns exist (else write legacy lead_generate* columns)
      2. delete all customers                       ← not transactional (audit M4)
      3. insert in 500-row chunks
Map page → getCustomers(): select * in 1,000-row pages → filters/search in memory
```

### Boundary layers

```
Admin → Boundary Layers → upload KMZ / KML / GeoJSON
  → Storage: kmz-files/<timestamp>_<name>   (private bucket)
  → kmz_layers row (name, color, visible, locked, file_path)
Map / admin load → fetchLayers(): for each row, storage.download() → parse → GeoJSON
```

Layers are grouped into `teams` (`layer_ids uuid[]`). `visible` is a shared column, so an admin toggling it affects everyone (audit L3).

### Buffer circles

```
Admin → Buffer Circles → CSV (Name, Latitude, Longitude) + radius (m / km)
  → 36-point geodesic polygon per row (geoHelpers.geodesicPoint)
  → FeatureCollection stored in buffer_layers.geojson (jsonb), file also kept in Storage
Map → fetchBufferLayers() → rendered with per-feature name tooltips and optional centre pins
```

### Supa Partner distance and routes

```
Popup: linkCustomerToPartner() → haversine distance (no network); null if partner has no GPS
"Route to Supa Partner":
  → popup closes; RouteCard opens
  → fetchRoadRoutes() for walk, bike and drive in parallel
      https://routing.openstreetmap.de/routed-{foot,bike,car}/route/v1/driving/{lng,lat};{lng,lat}
      ?overview=simplified&alternatives=true   (cached per session; aborted on close)
  → selected route drawn in partnerLinkPane (above markers), dotted connectors to the exact points
  → map fits the route below the card; "Start navigation" opens Google Maps directions
```

Customer and partner coordinates leave our systems here (audit M2).

---

## Map rendering

| Pane | z-index | Contents |
|---|---|---|
| `bufferPinPane` | 430 | Buffer centre pins |
| `customerPane` | 450 | Boundary and buffer polygons, customer dots (one shared canvas renderer) |
| `partnerLinkPane` | 460 | Route line, connectors, customer and partner markers |

Customer markers are memoised `CircleMarker`s on a canvas, so thousands of dots stay smooth on a phone. Tooltips use text nodes, never HTML strings, so names from uploaded files can't inject script.

---

## Database (live, shared Supabase project)

PAR Map's tables have no prefix. Other apps' tables (`ac_*`, `logistics_*`, …) live in the same project.

| Table | Key columns | RLS read | RLS write |
|---|---|---|---|
| `profiles` | id → auth.users, full_name, role, email, role_request, created_at | own row, or admin | admin (update) |
| `customers` | contract_ref, name, phone, phone2, area, par_status, latitude, longitude, supa_partner_code, supa_partner_name, supa_partner_latitude, supa_partner_longitude, week_label* | `has_map_access()` | admin |
| `kmz_layers` | name, color, visible, locked, file_path | `has_map_access()` | admin |
| `buffer_layers` | name, color, visible, locked, file_path, geojson | `has_map_access()` | admin |
| `teams` | name, color, layer_ids uuid[] | `has_map_access()` | admin |

\* `week_label` exists live, but no migration creates it (schema drift, audit M1).

**Storage:** the `kmz-files` bucket is **private**. Approved accounts can read it, and only admins can write (migrations 003 and 005).

**Migrations** (`supabase/migrations/`) are applied by hand in the SQL Editor:

| Migration | Live? |
|---|---|
| 001, 002 | Partly superseded; don't trust them as a description of live |
| 003 | Live (2026-10-04) |
| 004 | Live (2026-09-30) |
| 005 | Live (2026-10-04) |

Always check the live state with `pg_policies` before relying on a migration.

---

## Key technical decisions

| Decision | Choice | Reason |
|---|---|---|
| No SSR for the map | `dynamic(import, { ssr: false })` | Leaflet needs `window` |
| Access control | RLS in Postgres; UI checks are cosmetic | The browser holds the anon key, so only the database can enforce rules |
| New accounts | `pending` until an admin approves | Anyone can register; registration alone must grant nothing |
| One Supabase client | Module-level singleton | Keeps the PKCE verifier between sign-in and callback |
| Full navigation after login | `window.location.href` | The session cookie is set before middleware runs |
| KMZ parsing | In the browser (JSZip + DOMParser) | No server code needed |
| Markers | Canvas renderer, memoised | Performance on low-end phones |
| Routing | Public OSRM (FOSSGIS), three profiles | Free walk, bike and car routes; self-host if privacy or volume needs it |
| Tiles | Mapbox styles | Better Lusaka coverage and styling than raw OSM |

---

## Deployment

- **Host:** Vercel, deploying on every push to `main`. Today that's from the personal repo; the move to `kchella/Portfolio_Map` is pending.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_MAPBOX_TOKEN`. The service-role key is not needed.
- **Docker:** `Dockerfile` (standalone output) for self-hosting. Node 20, root user (audit M6).
- **Data updates** don't need a deploy; they're a CSV import in `/admin`.
- **Migrations** aren't part of a deploy; apply them in the SQL Editor first.

## Constraints

- Must load fast on phones in Lusaka on low bandwidth.
- Leaflet must never be imported at the top level of a page.
- Never commit `.env*` files or customer exports.
- The service-role key must never reach browser code.
