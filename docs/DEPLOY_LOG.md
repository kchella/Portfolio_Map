# Deploy log

One line per production change: database migration, frontend deploy, or
dashboard setting (AGENTS.md, working practice 4). Newest at the bottom.
The Supabase project is shared with other apps, so a migration here is a
production change for all of them.

| Date | What | Version / commit | Where | Who |
|---|---|---|---|---|
| 2026-05-19 | Frontend: "Updated docker file and next.config file" | `00e909c` | Vercel (personal repo) | Chella |
| 2026-05-19 | Frontend: "fix: restrict middleware to admin routes only" — **build failed**, previous version stayed live | `198c264` | Vercel | Chella |
| 2026-05-19 | Frontend: "trigger redeploy" | `64448cd` | Vercel | Chella |
| 2026-05-21 | Frontend: PAR status values, black dots, phone number fix, mobile | `4a53bfc` | Vercel | Chella |
| 2026-05-22 | Frontend: rename PAR status strings to match CSV canonical values | `c2cbdac` | Vercel | Chella |
| 2026-06-05 | Frontend: "Fix the GPS" — **live as of 2026-10-07** | `8c610f1` | Vercel | Chella |
| 2026-09-30 | DB: `004_supa_partner.sql` (rename to `supa_partner_*`, add partner GPS) | file in repo | SQL Editor | Chella |
| 2026-10-04 | DB: `003_lock_down_data.sql` (pending-by-default, approved-only reads, private bucket) | file in repo | SQL Editor | Chella |
| 2026-10-04 | DB: `005_remove_open_reads.sql` (drop leftover `using (true)` reads and storage policies) — anon re-check clean | file in repo | SQL Editor | Chella |

## Not yet deployed

- **Frontend changes since June** (Supa Partner rename, routes, popup and
  admin redesign, safer import). They're merged in
  `ECS-IT-Fintech/ECS_Maps_Zambia` (`1fe9158`) and pushed to
  `kchella/Portfolio_Map`, but not to the repo Vercel deploys from. The
  five personal-repo commits above must be merged in first.
- **Auth setting:** Confirm email (audit H2).

*Entries before 2026-09-30 are reconstructed from Vercel's deployment list
(screenshot shared by Chella on 2026-10-07); migrations 001 and 002 have no
recorded date.*
