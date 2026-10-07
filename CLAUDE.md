# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `par-map/` (the Next.js project root):

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

Root redirects `/` → `/map` automatically.

### Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=... \
  -t par-map .
docker run -p 3000:3000 par-map
```

## Architecture

**Next.js 15 Pages Router** app. All source is under `src/`.

### Pages & Routes

| Route | Access | File |
|---|---|---|
| `/map` | Public | `pages/map.tsx` — main 32KB map component |
| `/admin` | Admin only | `pages/admin.tsx` — layer + data management |
| `/login` | Public | `pages/login.tsx` |
| `/register` | Public | `pages/register.tsx` |
| `/auth/callback` | Internal | `pages/auth/callback.tsx` — OAuth redirect + profile upsert |
| `/forgot-password` | Public | `pages/forgot-password.tsx` |

### Key Architectural Rules

**Leaflet must never be imported at the top level of any page.** `Map.tsx` is loaded via `dynamic(import, { ssr: false })` because Leaflet depends on `window`. Any new component using Leaflet must follow the same pattern.

**`SUPABASE_SERVICE_ROLE_KEY` is server-only.** Call `getSupabaseAdmin()` only inside `src/pages/api/**` routes — never in browser code or components.

**`supabase` singleton from `lib/supabase.ts`** must be reused (not re-instantiated) across the browser to preserve the PKCE code verifier cookie for OAuth.

**Login uses `window.location.href`** (not `router.push`) to force a full navigation that ensures the session cookie is present before the Edge middleware runs on `/admin`.

### Auth Flow

Middleware (`src/middleware.ts`) runs at the Edge on every non-static route. It calls `supabase.auth.getUser()` — if no session and route starts with `/admin`, redirects to `/login?next=/admin`. Full role enforcement (admin vs user) happens client-side in `useAuth.ts`.

`useAuth` race condition: `onAuthStateChange` fires immediately on mount before `getSession()` resolves. An `initialized` ref guards against this — the initial event is skipped; only `getSession()` sets `loading=false`.

### Data Model

- `profiles` — user roles (`admin` | `user`), FK to `auth.users`. Auto-created by DB trigger.
- `kmz_layers` — KMZ boundary layers with `name`, `color`, `locked`, `visible`, `file_path`.
- `customers` — geographic loan data with PAR status fields.
- `teams` — organizational groupings for boundary layers.
- Storage bucket: `kmz-files` (public read, authenticated write).

Buffer layers are stored in `kmz_layers` (not a separate table) with a `"Buffers —"` name prefix. The `KMZLayer.isBuffer` flag distinguishes them at runtime.

### PAR Status

Five statuses with color encoding defined in `src/types/par.ts`:
- `ONTIME` (green) → `PAR 1-30` (yellow) → `PAR 31-60` (orange) → `PAR 61-90` (red) → `PAR 90+` (dark red)
- `PAR 90+` customers are flagged as priority visits via `isPriorityVisit()`.

### Layer Pipeline

KMZ upload: Admin uploads file → `layerService.uploadLayer()` stores in Supabase Storage → row inserted in `kmz_layers` → map fetches layers via `layerService.fetchLayers()` → `parseKmz()` (JSZip + DOMParser) converts to GeoJSON → rendered as Leaflet GeoJSON polygon.

Buffer upload: Admin uploads CSV (Name, Lat, Lng) → `geoHelpers.ts` generates 36-point geodesic polygons → stored as GeoJSON layer with `"Buffers —"` prefix.

### Environment Variables

```
NEXT_PUBLIC_MAPBOX_TOKEN      # Mapbox tile styling
NEXT_PUBLIC_SUPABASE_URL      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Public anon key
SUPABASE_SERVICE_ROLE_KEY     # Server-only — never expose to browser
```

## Code Rules

- TypeScript strict — no `any` without an explanatory comment.
- No SSR imports for Leaflet or anything that touches `window`.
- Performance is a hard constraint — field teams use this on mobile in Lusaka on low bandwidth.
