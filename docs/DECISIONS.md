# Decisions

Load-bearing decisions, one record each (`DEC-NNN`). Add a record when a
choice would be expensive to reverse or would surprise someone reading the
code later. Don't edit an accepted decision; supersede it with a new one.

Format: context, decision, consequences, status.

---

## DEC-001 — RLS is the only access control; new accounts start pending

- **Date:** 2026-10-04 (migration 003, closing audit C1)
- **Context:** the browser holds the anon key and talks to Supabase
  directly. There's no server code of our own to enforce rules. Anyone can
  register, by email or Google, and the Supabase project's login is shared
  with other apps.
- **Decision:** every read goes through `has_map_access()` and every write
  through `is_admin()` in RLS. The `handle_new_user` trigger creates every
  profile as `pending`. UI role checks exist for display only.
- **Consequences:** a new account sees nothing until an admin approves it,
  which staff must be told (`docs/TRAINING.md`). Any new table must get RLS
  the same way. A loose policy anywhere cancels this, so access changes are
  verified with the anon key.
- **Status:** accepted.

## DEC-002 — Supa Partner GPS comes from the weekly customer CSV

- **Date:** 2026-09-30
- **Context:** to show customer to partner distance, partner locations were
  needed. The buffer pins were considered, but partners had no GPS
  anywhere, and matching by name was unreliable.
- **Decision:** the weekly export carries `Supa Partner Latitude` and
  `Supa Partner Longitude` on every customer row, stored on `customers`
  (migration 004). The columns were renamed from `lead_generate*` to
  `supa_partner_*` at the same time.
- **Consequences:** partner GPS is repeated on each of that partner's
  customers. A partner who moves is updated by the next import. There's no
  separate partner table yet; one would be needed if partners get more
  attributes.
- **Status:** accepted.

## DEC-003 — Road routes from the public OSRM servers

- **Date:** 2026-09-30
- **Context:** field staff wanted travel time, not only straight-line
  distance, for walking and riding as well as driving. mapcn was looked at
  as a model, but it needs MapLibre, Tailwind and shadcn, which means a
  rewrite and a heavier bundle.
- **Decision:** keep Leaflet, and fetch routes from
  `routing.openstreetmap.de` (FOSSGIS), which has foot, bike and car
  profiles. All three are fetched on demand, only when the user taps
  "Route to Supa Partner", simplified (about 1 KB each) and cached per
  session. Google Maps is used for turn-by-turn directions.
- **Consequences:** customer and partner coordinates go to a third party
  in Germany (audit M2). It's a fair-use public service with no SLA.
  Self-hosting OSRM, or proxying the requests, is a one-line change in
  `src/utils/routing.ts` if privacy or volume requires it.
- **Status:** accepted; privacy review open (M2).

## DEC-004 — Stay on the shared Supabase project, with PAR Map tables as they are

- **Date:** 2026-10-04
- **Context:** the audit found the project hosts other apps (`ac_*`,
  `logistics_*`). Chella confirmed that's by design: each app keeps
  name-prefixed tables.
- **Decision:** keep the shared project. PAR Map migrations touch only its
  own tables and bucket. Prefixing PAR Map's tables (`par_*`) is deferred.
- **Consequences:** one login system and one set of keys across apps; a
  permissive policy anywhere affects everyone. Every database review needs
  someone who knows all the apps in the project (audit N1).
- **Status:** accepted; table prefixing open.

## DEC-005 — Working repo is `kchella/Portfolio_Map`; Vercel to move to it

- **Date:** 2026-10-07
- **Context:** the code had no git locally, the organisation repo was about
  four months behind, and production deploys from Chella's personal repo.
- **Decision:** `kchella/Portfolio_Map` is the working repo, with the app
  at the repo root. `ECS-IT-Fintech/ECS_Maps_Zambia` holds the same merged
  work. Vercel will be switched to `Portfolio_Map` once the personal
  repo's five unmerged commits are brought in.
- **Consequences:** until the switch, a push to `Portfolio_Map` doesn't
  deploy. Vercel's Root Directory must be the repo root, not `par-map`.
- **Status:** accepted; Vercel switch pending.

## DEC-006 — Field-ready UI over decorative UI

- **Date:** 2026-10-04
- **Context:** the customer popup and route card went through several
  rounds. Gradients and glows read as "AI-made"; the large sizes were
  readable outdoors but too big.
- **Decision:** a calm white card with hairline rows, one solid orange
  primary action with dark text (white on `#f58202` fails contrast), text
  at least 11 px and tap targets at least 40 px. PAR colour appears as a
  status pill, not as a whole-card tint.
- **Consequences:** see `docs/DESIGN.md`. New screens follow the same
  rules.
- **Status:** accepted.
