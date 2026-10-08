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
| 2026-10-07 | Frontend: Supa Partner routes, redesigned popup and admin, data lock-down (pushed to the personal repo; already live before the switch below) | `da92689` | Vercel (`rkchellah/ECS_Maps_Zambia`) | Chella |
| 2026-10-08 | Vercel project `ecs-maps-zambia` switched to `kchella/Portfolio_Map` (DEC-005). First two builds **failed**: Root Directory was still `par-map`; cleared, then redeployed | — | Vercel settings | Chella |
| 2026-10-08 | Frontend: PR #2 remove "in arrears" share, PR #3 SupaMoto sign-in screens and working password reset (audit M5) | `6c03dc5` | Vercel (`Portfolio_Map`) | Chella |
| 2026-10-08 | Frontend: PR #4 keep sign-in canvas dark in production (PM-006). Checked live by Chella | `62c60ea` | Vercel (`Portfolio_Map`) | Chella |

## Not yet deployed

- **Auth setting:** Confirm email (audit H2).
- **Auth setting:** `/reset-password` in Supabase Redirect URLs (production
  and localhost). Until it's added, reset emails don't land on the new page
  (`docs/specs/auth-screens.md`).

*Entries before 2026-09-30 are reconstructed from Vercel's deployment list
(screenshot shared by Chella on 2026-10-07); migrations 001 and 002 have no
recorded date.*
