# SupaMoto PAR Map

The field map that shows where the arrears are, and how far each one is from the Supa Partner who can fix it.

SupaMoto sells clean-cooking stoves and pellets across Zambia on credit, and field teams collect repayments door to door. The weekly portfolio report says how many customers are in arrears. It doesn't say where they are, which ones sit next to each other, or which Supa Partner is closest to them. So visit routes get planned from a spreadsheet and memory, and the customer who is 90 days overdue two streets from a partner's shop waits another week.

The location is already in the data: every customer row carries GPS, and every Supa Partner can too. This app puts both on one map, colours each customer by how late they are, and lets a field officer standing in Chipata Compound tap a customer and get the walking route to their partner.

## What it does

A field officer opens the map on a phone on Monday morning and needs to know which doors to knock on first.

- **See the portfolio as a map.** Every customer is a dot coloured by PAR bucket, from green (on time) through yellow, orange and red to dark red (PAR 90+). PAR 90+ customers are flagged **Priority visit**. Filter by bucket, search by name, contract reference or phone, and the map jumps to the match.
- **Know your ground.** Admin-uploaded KMZ boundaries show each team's area, grouped by team. Buffer circles (for example 2 km around a shop or warehouse) show what is within reach.
- **Open a customer.** The popup shows PAR status, contract reference (tap to copy), area, phone numbers with one-tap **Call** and **WhatsApp**, and their Supa Partner with the straight-line distance.
- **Route to the Supa Partner.** One tap draws the road route and shows walk, bike and drive times side by side, with arrival time and alternative routes. **Start navigation** hands it to Google Maps for turn-by-turn directions.

Admins also get:
- the weekly customer CSV import, with a Supa Partner GPS coverage bar;
- boundary and buffer layer management (upload, rename, recolour, lock, assign to a team);
- account approvals.

The app is built for phones on weak connections: customer dots render on a canvas, layers are parsed once, and routes are cached per session.

## Who it's for

SupaMoto staff only. Customers never log in. There are three roles, stored in `public.profiles.role`:

| Role | Sees | Can change |
|---|---|---|
| `pending` | Nothing | Nothing |
| `user` (shown as *Viewer*) | The map: customers, layers, teams | Nothing |
| `admin` | The map and `/admin` | Customers, layers, teams, user roles |

Anyone can register, by email or Google, but **a new account sees nothing until an admin approves it** in Admin → Users & Access. Signing in and getting "waiting for approval" is that missing step, not a bug.

The rules are enforced by the database, not the browser. Row-level security (RLS) policies call `has_map_access()` and `is_admin()` on every query, so a pending account that opens `/map` directly gets empty results, and a viewer who calls the API to write gets refused. The UI hides admin links from viewers as a courtesy, not as security.

## How the data works

**One customer table, replaced weekly.** `customers` holds the current week only:
- contract reference, name, phones, area;
- PAR status;
- the customer's GPS;
- the Supa Partner's code, name and GPS.

An admin uploads the weekly export, and it replaces every row. The map reads all rows in 1,000-row pages, and every filter and search after that runs in the browser.

**PAR status comes from the export, not the app.** It's normalised to five values in `src/types/par.ts`: `ONTIME`, `PAR 1-30`, `PAR 31-60`, `PAR 61-90` and `PAR 90+`. That file is the single source of truth for the colours, labels and priority rule.

**Distances are straight-line; routes are by road.**
- The popup distance is calculated in the browser from the two GPS points, and needs no network.
- Routes come from the OpenStreetMap routing servers (`routing.openstreetmap.de`), which have separate foot, bike and car profiles. Walk, bike and drive are fetched together, so each tab shows its own time.
- Routes snap to the nearest road. A dotted connector shows the last few metres to each door.

**Customers without GPS are skipped on import.** A row with no usable latitude and longitude can't be placed on the map, and the import result says how many were skipped and why. A missing Supa Partner GPS never skips a row: the popup just says "No GPS" and offers no route.

## Running locally

You'll need Node.js 20 or newer and access to the Supabase project.

```bash
git clone https://github.com/kchella/Portfolio_Map.git
cd Portfolio_Map
npm install
```

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # the anon / public key, never service_role
NEXT_PUBLIC_MAPBOX_TOKEN=        # Mapbox account → Tokens
```

```bash
npm run dev      # http://localhost:3000, which redirects to /map
npm run lint
npm run build    # don't run while the dev server is running; it corrupts .next
```

**Keep the service-role key out of this app.** Next.js inlines every `NEXT_PUBLIC_` variable into the browser bundle, and the service-role key bypasses every RLS policy. Nothing in the app needs it today.

## Setting up the database

**The Supabase project is shared with other SupaMoto apps.** Each app keeps its own name-prefixed tables (`ac_*`, `logistics_*`, …). There's one login system for all of them, and no staging database. Treat every migration as a production change.

1. **Run the migrations in order** in the SQL Editor, from `supabase/migrations/`:
   - `003` locks reads to approved accounts and makes the `kmz-files` bucket private.
   - `004` renames Lead Generator to Supa Partner and adds partner GPS.
   - `005` removes leftover public-read policies.

   Each is safe to re-run.
2. **Make the first admin.** Register through the app, then in the SQL Editor run `update public.profiles set role = 'admin' where email = '…';`. From then on, admins approve everyone else in the app.
3. **Turn on Confirm email** in Authentication → Providers → Email, so people can't register with an address they don't own.
4. **Check the live database; don't assume.** A migration file in this repo is not proof that it's live (see *Notes from building it*). Check with a read-only query, for example:

   ```sql
   select tablename, policyname, cmd, qual from pg_policies
   where schemaname = 'public' and tablename in ('customers','kmz_layers','buffer_layers','teams');
   ```

## Loading data

There's no live pipeline. An admin imports by hand each week in **Admin → Customer Data**:

- **Columns:** Contract Reference, Name, Area, Latitude, Longitude, PAR Status, Phone, Phone 2, Supa Partner Code, Supa Partner Name, Supa Partner Latitude, Supa Partner Longitude. Download the template from the same page.
- **Old headers still work:** files using `Lead Generate` / `Lead Generator Name` still import.
- **What happens on import:** phone numbers are normalised to the local `0…` format, PAR status is normalised to the five values, and the upload **replaces** every customer. The table on the right updates as soon as it finishes.

Boundaries and buffers are managed in the same admin area:
- **Boundary Layers:** upload KMZ, KML or GeoJSON, then name, colour, lock and assign each to a team.
- **Buffer Circles:** upload a CSV with Name, Latitude and Longitude columns and a radius. The app draws a 36-point geodesic circle around each point.

## Deploying

The app is a standard Next.js 15 build. Production is on **Vercel**, which deploys every push to `main`. In the Vercel project settings:
- set the three `NEXT_PUBLIC_*` variables;
- set Root Directory to the repo root.

A `Dockerfile` is also included for self-hosting. Pass the same three variables as build arguments:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=... \
  -t par-map .
docker run -p 3000:3000 par-map
```

Database migrations are not part of a deploy. Apply them in the SQL Editor before deploying code that depends on them, and say in the PR that you did.

## Stack

- **Framework:** Next.js 15 (Pages Router), React 19, TypeScript (strict)
- **Map:** Leaflet + React-Leaflet 5, Mapbox tiles, canvas-rendered markers
- **Backend, auth, database, storage:** Supabase (Postgres, Auth with email and Google, RLS, Storage)
- **Parsing:** JSZip + DOMParser (KMZ/KML), PapaParse (CSV)
- **Routing:** OSRM (`routing.openstreetmap.de`)
- **Styling:** inline style tokens in `src/styles/theme.ts`, in SupaMoto orange

```
├── src/
│   ├── pages/
│   │   ├── map.tsx             # the field map: filters, search, layers panel
│   │   ├── admin.tsx           # admin shell (customers, layers, buffers, users)
│   │   ├── login.tsx, register.tsx, forgot-password.tsx
│   │   └── auth/callback.tsx   # OAuth / email-confirm landing, role check
│   ├── components/
│   │   ├── Map.tsx             # Leaflet map; client-only (dynamic, ssr: false)
│   │   ├── PopupCard.tsx       # customer popup
│   │   ├── RouteCard.tsx       # walk / bike / drive route card
│   │   └── admin/              # CustomerManager, LayerManager, BufferManager, UserManager
│   ├── lib/
│   │   ├── supabase.ts         # the one browser Supabase client (singleton, for PKCE)
│   │   ├── useAuth.ts          # session + profile + role
│   │   ├── customerService.ts  # weekly sync and paged reads
│   │   ├── layerService.ts     # KMZ / buffer storage and parsing
│   │   └── safeNext.ts         # same-origin redirect check
│   ├── utils/                  # kmzParser, geoHelpers, routing, supaPartners, parHelpers
│   ├── types/par.ts            # PAR statuses, colours, labels, priority rule
│   └── middleware.ts           # Edge: /map and /admin need a session
├── supabase/migrations/        # numbered SQL, run in order
├── docs/
│   ├── HANDOVER.md             # state of the project and what's next (read first)
│   ├── ARCHITECTURE.md         # pages, auth flow, data flow, live schema
│   ├── REQUIREMENTS.md         # what each feature must do
│   ├── DESIGN.md               # design system (tokens live in src/styles/theme.ts)
│   ├── DECISIONS.md            # decision records (DEC-NNN)
│   ├── BUG_LOG.md              # numbered bugs (PM-NNN)
│   ├── DEPLOY_LOG.md           # one line per production change
│   ├── AUDIT_LOG.md            # non-security audits
│   ├── TRAINING.md             # staff guide
│   ├── HISTORY.md              # build history and retired rules
│   └── security/               # SECURITY-AUDIT.md (living register) + deploy runbook
├── skills/                     # agent workflow skills (see skills/README.md)
├── AGENTS.md                   # the rulebook for every AI agent
├── CLAUDE.md                   # imports AGENTS.md for Claude Code
├── CONTRIBUTING.md             # branches, migrations, reviews
└── Dockerfile
```

**Leaflet must never be imported at the top level of a page.** It touches `window`, so it breaks the server render. Anything that uses it is loaded with `dynamic(() => import(...), { ssr: false })`, the way `Map.tsx` is.

## Notes from building it

Four problems worth knowing about. Three of them looked like success.

1. **A shared database drifts from its migration files silently.** Migration 003 (lock customer data to approved accounts) sat in the repo for months but had never been applied. Nothing complained, because the map worked. A read-only check with only the public key showed all 1,621 customers were readable without logging in. Never trust that a migration in the repo is in the database; check `pg_policies`.

2. **RLS policies are OR-ed, so adding a strict one doesn't remove a loose one.** Once 003 was applied, the data was still public, because older dashboard-made policies with different names ("Public read access", "Anyone can read …") still said `using (true)`. Even one of them is enough. 005 drops them by finding every `SELECT … using (true)` on the app's own tables. After any security change, test the result with the anon key; don't trust the migration.

3. **"Replace all" means "delete, then insert".** The weekly upload deletes every customer and then inserts the new rows. When the insert failed (the code expected a column a migration hadn't created yet), the delete had already happened, and the live map was empty. The upload now checks the schema before deleting anything. A dropped connection mid-upload can still do this, and the real fix (one transaction in a database function) is open in the audit.

4. **A private bucket can still serve files for an hour.** After the `kmz-files` bucket was made private, downloads still returned 200. It looked like the fix had failed. In fact Cloudflare was serving copies it had cached while the bucket was public; requests that bypassed the cache were refused. When testing an access change on storage, add a cache-busting query string.

Each is written up in `docs/BUG_LOG.md` (PM-001 to PM-003). Open issues and their fixes are tracked in `docs/security/SECURITY-AUDIT.md`.

## Known gaps

Stated here so nobody discovers them in the field:

- **Forgot password doesn't send an email yet.** The page says it did. Until it's fixed, an admin resets passwords in Supabase → Authentication.
- **Route lookups send the customer's and partner's coordinates to `routing.openstreetmap.de`,** a public server in Germany. No names are sent. Self-hosting OSRM is the fix if this isn't acceptable.
- **No CI yet.** Build, lint and `npm audit` are run by hand before a PR.
- **Layer visibility on the map is shared.** An admin hiding a layer on `/map` hides it for everyone.

## Collaborating

The full workflow is in `CONTRIBUTING.md`; rules for AI agents are in `AGENTS.md`. In short:

One rule supports the rest: **nobody pushes directly to `main`.** `main` deploys straight to production, so it must always build.

- **Branch from the latest `main`.** One topic per branch, named for what it does: `feat/route-card`, `fix/sync-atomic`, `chore/deps`.
- **Commit in small steps** using Conventional Commits: `feat(map): …`, `fix(admin): …`.
- **Sync before you push:** `git fetch origin && git rebase origin/main`.
- **Run the checks:** `npx tsc --noEmit`, `npm run lint` and `npm run build` must pass before the PR opens.
- **Open a PR into `main`** saying what changed, why, and how to verify it. If you touched `supabase/migrations/`, list the files and whether they've been applied to the shared project.
- **Get it reviewed.** Changes to the database, auth or storage need a second person. The reviewer merges.
- **After merge,** delete the branch, and apply any new migrations in order.

Standards specific to this project:
- **The database is shared and has no staging copy.** Migrations are numbered and safe to re-run, and you agree the next number with the team before writing one. No hand edits in the SQL Editor that aren't also saved as a migration.
- **Never commit `.env*` files or customer exports.** `.gitignore` blocks `.env*`, `scripts/*.csv` and `scripts/customers_output.ts`. Keep it that way.
- **Performance is a hard constraint.** Field teams use this on phones in Lusaka on low bandwidth. Don't add a library or a request per marker without measuring it.

## Getting help

**Can't see the map after signing in?** Your account is waiting for approval. Ask an admin to approve you in Admin → Users & Access.

**A customer is in the wrong place, or has the wrong status?** The map shows the last weekly import. Check the date of the last upload with an admin first. If it's still wrong, send the contract reference to an admin so it can be fixed in the source export.
