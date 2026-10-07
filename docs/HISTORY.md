# History

A record of how PAR Map was built and of rules that no longer apply. **Not
current rules**: for those, see `AGENTS.md` and `CONTRIBUTING.md`.

## Build checklist (phases 1–9, carried over from `CHECKLIST.md`)

Kept as written, so the history reads as it happened. Notes in *italics*
mark items that are no longer true.

## Phase 1 — Foundation
- [x] Next.js app initialized with TypeScript
- [x] Tailwind CSS configured
- [x] `jszip`, `leaflet`, `react-leaflet`, `recharts`, `papaparse` installed
- [x] `src/utils/kmzParser.ts` created
- [x] `src/types/par.ts` created
- [x] `src/data/customers.ts` created (W13 · Mar 2026)
- [x] Data automation script (`scripts/csv_to_ts.py`) created
- [x] GitHub repo created and pushed
- [ ] Deployed to Vercel

## Phase 2 — Map Page
- [x] Map component (dynamic import, no SSR)
- [x] Mapbox Streets tiles rendering
- [x] KMZ drag-and-drop working
- [x] KMZ parses and renders as polygon layer
- [x] KMZ layer persistence (localStorage)
- [x] Floating UI redesign (search bar only, filters in sidebar)
- [x] Mapbox theme switcher (6 themes)
- [x] Sidebar PAR status filters (clickable rows with active state)
- [x] Canvas rendering (`preferCanvas: true`)
- [x] Customer dots rendering + colored by PAR status
- [x] Customer popup on click
- [x] Search by contract reference, name, or phone
- [x] Live sidebar stats (`computeStats`)

## Phase 3 — Refinement & Performance
- [x] Full UI redesign of map page
- [x] Performance: memoized marker layer, reduced marker radii
- [x] PAR status filtering (exact match)
- [x] Mobile responsive layout
- [x] Fast load on low bandwidth
- [x] README complete

## Phase 4 — Final UX Polish
- [x] Left sidebar redesign (280px, tonal)
- [x] Expandable navigation sections
- [x] Sidebar pin / hide / show tab
- [x] Map theme grid (3×2, 6 themes including Satellite)
- [x] Search bar refinement
- [x] Card-based layout for Portfolio and Layers
- [x] Count badges with status-colored backgrounds
- [x] Removed layer delete from map view (show/hide only)

## Phase 5 — Deployment Ready
- [x] Next.js redirects configured
- [x] Custom 404 auto-redirect page
- [x] Fixed marker popup data labels
- [x] Final visual verification complete

## Phase 6 — Admin Data Management
- [x] Supabase client and layer service (`layerService.ts`)
- [x] Persistent boundary storage (KMZ / KML / GeoJSON in Supabase Storage)
- [x] `kmz_layers` table with RLS policies
- [x] Admin dashboard (`/admin`) — customer data, layers, buffer circles
- [x] Buffer circle generator (CSV → geodesic GeoJSON → Supabase)
- [x] Managed vs local layers integrated on public map
- [x] Lock functionality (prevent field users toggling official layers)
- [x] Weekly customer data CSV uploader and TS generator in Admin
- [x] KML file support added
- [x] Area circle stats section (per-area totals, risk% table)
- [x] Layer rename (inline input, pencil icon)
- [x] Layer recolor (swatch picker per layer)
- [x] Team grouping for layers (assign layers to named field teams)

## Phase 7 — Admin Premium Redesign
- [x] Full inline-style redesign of `admin.tsx` (no Tailwind dependency)
- [x] Left sidebar (268px): logo, 3 nav items, back-to-map, logout
- [x] Sections: Customer Data, Boundary Layers, Buffer Circles
- [x] Customer Data: CSV upload + live registry table
- [x] Boundary Layers: upload form + teams + unassigned layers
- [x] Buffer Circles: CSV form + buffer layer list
- [x] All existing logic preserved

## Phase 8 — Light Mode Transition
- [x] Light-mode design tokens across map page and admin
- [x] Glassmorphism navbar and side panel
- [x] Clean Leaflet popup styles
- [x] Typography: Manrope (map) + Inter (admin) + DM Mono (monospace values)

## Phase 9 — Supabase Auth
- [x] Supabase Auth enabled (email/password + Google OAuth)
- [x] `profiles` table with `role` column ('admin' | 'user')
- [x] Trigger: auto-create profile row on sign-up
- [x] `useAuth()` hook (user, profile, isAdmin, loading, signOut)
- [x] Login page (`/login`) — email form + Google SSO
- [x] Register page (`/register`) — full name, email, role request, password
- [x] OAuth callback handler (`/auth/callback`) — profile upsert + redirect
- [x] Admin guard in `admin.tsx` — waits for loading before redirecting
- [x] Auth race condition fixed with `initialized` ref in `useAuth`
- [x] Edge middleware (`middleware.ts`) — session cookie check for /admin
- [x] Middleware uses direct cookie read (no async, no external dependencies)
- [x] `supabase.ts` — lazy `getSupabaseAdmin()` (server-only, never in browser)
- [x] GitHub repo pushed (`.env.local` gitignored)
- [ ] `.env.local` populated with real Supabase URL and keys
- [ ] Login redirect loop resolved (middleware cookie name verified)
- [ ] Deployed to Vercel with env vars set

*Notes on phases 1–9:*
- *Phase 1: `src/data/customers.ts` and `csv_to_ts.py` were replaced by the
  Supabase `customers` table and the admin import (removed 2026-05-11).
  "GitHub repo created and pushed" referred to the org repo, which then fell
  about four months behind.*
- *Phase 9: the middleware no longer reads the cookie directly; it calls
  `getUser()` through `@supabase/ssr`. The callback no longer upserts
  profiles; a database trigger creates them as `pending`. The open items
  were resolved: `.env.local` is populated, and the app is on Vercel.*

## Phase 10 — Supa Partner, routes, redesign, lock-down (2026-09-30 to 2026-10-07)

- [x] Dev server warnings fixed: `next.config.mjs`, `outputFileTracingRoot` (PM-005)
- [x] "Lead Generator" renamed to "Supa Partner" in UI, CSV and database (migration 004)
- [x] Supa Partner GPS columns; straight-line distance in the popup (DEC-002)
- [x] Road routes: walk / bike / drive via OSRM, route card, Google Maps hand-off (DEC-003)
- [x] Customer popup redesigned as a contact sheet: PAR Status row, Call / WhatsApp, copy ref (DEC-006)
- [x] Admin: Customer Data tiles, search, filter chips, 200-row table; Boundary Layers grouped by team with a dropdown
- [x] Admin sidebar uses the SupaMoto logo
- [x] Weekly import no longer empties the table on a schema mismatch (PM-001)
- [x] First security audit (`docs/security/SECURITY-AUDIT.md`)
- [x] Customer data and storage locked down: migrations 003 and 005 (PM-002, audit C1 / H1)
- [x] Code under git: PR #1 merged in `ECS-IT-Fintech/ECS_Maps_Zambia`; working repo `kchella/Portfolio_Map` (DEC-005)
- [x] Customer exports and `.env*` removed from tracking and ignored
- [x] Docs restructured: `AGENTS.md`, `CONTRIBUTING.md`, `docs/` (this file, bug and deploy logs, decisions, requirements, training)
- [ ] Merge the five personal-repo commits (May 19 – June 5) and switch Vercel to `Portfolio_Map`
- [ ] Turn on Confirm email (audit H2)
- [ ] Atomic, audited customer import (audit M4)
- [ ] Working password reset (audit M5)

## Retired rules (from the original `RULES.md`)

These were the rules before 2026-10. Each line says what replaced it.

- "Weekly PAR data lives in `src/data/customers.ts`, regenerated with
  `csv_to_ts.py`." Replaced by the `customers` table and Admin → Customer
  Data.
- "Next.js 14." Now Next.js 15.
- "Admin access via `/admin` with a password gate (`ADMIN_PASSWORD`)."
  Replaced by Supabase Auth roles. `ADMIN_PASSWORD` is unused (audit L4).
- "Public access: no login required." Now every map user needs an approved
  account (DEC-001).
- "Storage bucket `kmz-files` must be Public." Now private (migrations 003
  and 005).
- "One link, zero logins." Superseded by the security requirement above.
