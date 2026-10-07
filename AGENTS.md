# AGENTS.md

Governing instructions for every AI coding agent working in this repo —
Claude Code, Codex, Cursor (any model), Gemini CLI, or anything else that
reads this file. Read in full at session start. Skills referenced below
live in `skills/` in this repo (eleven skills, listed in `skills/README.md`).

## Non-negotiables

1. **Git is human-only.** No agent runs `git commit`, `git push`, `git
   merge`, `git rebase`, or `git branch` — not even on an isolated task
   branch. Agents draft commands and messages; a human runs them.
   Read-only inspection (`git
   status`, `git log`, `git rev-parse HEAD`, `gh pr list`, `gh pr view`)
   is fine to run directly — it doesn't change history.
2. **Stack is locked per project**, stated in this file's project-specific
   section below. No silent drift (no TypeScript sneaking into a plain-JS
   project, no swapping frameworks mid-build).
3. **No code before a plan.** System design and a plan/goal/checklist doc
   exist before implementation starts. See `scope` and `architect`.
4. **UI/UX before code.** Screens and flows are designed and agreed before
   they're built; later behavior changes update the design first. See
   `architect` and `component-registry-sources`.
5. **No boilerplate.** Every file traces to the plan or the UI/UX design.
   See `develop`.
6. **Stable releases only**, verified against real docs, not agent memory.
   See `architect` (its current-docs check).
7. **Explain as you go**, plain English, simple analogies, check in when a
   concept might be new.
8. **Build vertical slices.** One feature end-to-end before starting the
   next, except for genuine shared foundations. The build approach is
   recorded in the project section below and read by `scope`,
   `architect` and `develop`.
9. **No emojis anywhere in code, comments, commit messages, or output.**
   Comment the non-obvious only.
10. **Every real bug gets a numbered `BUG_LOG.md` entry** (cause, fix,
    prevention) and a short code comment at the fix site referencing it.
    `README.md` stays lean — essentials only. See `debug` (root cause and
    regression test) and `document` (postmortems).
11. **Ship at engineer grade, not demo grade** — error states, empty
    states, edge cases, no leftover placeholders. See `check` and `test`.
12. **Route tasks by risk surface**, not by convenience: schema/RLS/auth
    work goes to the backend agent; UI/UX, debug, docs, and PR-review roles
    are separate lanes. `check review` runs on a different model from the
    one that wrote the code.
13. **Write for humans.** Commit messages, PR text, docs, and comments are
    plain and specific, with no filler. `document` drafts PR text,
    changelogs, release notes and postmortems from the real diff.
14. **Never set `## Git` `integration: on`** in any AGENTS.md, root or
    nested. Some workflow skills (`develop`, `test`) check for this flag
    and will branch, commit, or `git init` on their own authority if it's
    present — even with a confirmation prompt, that still means the agent
    runs the command, which non-negotiable #1 does not allow. Absent or
    `off` is the only acceptable state.

## Workflow

Existing codebase: `audit` once, then `scope`, then the feature loop.
New project: `scope`, then `architect` (stack), scaffold, `audit`, then the
feature loop.

Feature loop, one feature at a time:

1. **Isolate.** Every task starts on its own branch (or worktree) off
   `origin/main`. Never build on `main`. Check open PRs and uncommitted
   work for overlap first.
2. **Plan: `scope`.** Enrol the feature: intent, "Done when", order, and
   whether it needs a decision first.
3. **Design: `architect`.** Any load-bearing decision (data model, provider,
   screen design, behaviour) gets a spec in `docs/specs/` before code.
4. **Build: `develop`.** Build from the spec and this file. It stops and
   routes back to `architect` if a decision is still owed.
5. **Prove: `check verify`, then `test`.** Drive the real app against the
   acceptance criteria, then add tests where the project has a runner.
   Bugs go through `debug`: reproduce first, fix the root cause, log it.
6. **Review: `check review`.** A fresh model reads the diff before the PR.
7. **Ship: `document`, then `sync`.** Write the PR text from the real diff;
   after merge, `sync` updates this file, the scope and spec statuses.

## Security non-negotiables

- **Database & migrations** — every migration is read in full before it
  runs; RLS claims are verified against `pg_policies`, never accepted from
  an agent's report.
- **Auth** — authorization checks live server-side/DB-side, never trusted
  from client-supplied IDs. Rate-limit auth endpoints. No sensitive tokens
  in `localStorage`.
- **No data leakage** — service-role/admin keys never reach client code or
  `NEXT_PUBLIC_*` vars. API responses return only what's needed, not full
  rows. CORS is scoped, not wide open.
- **Environments never cross** — separate dev/staging/prod databases and
  credentials across Supabase/Neon/Vercel/Netlify/Render/Railway/GCP/
  CircleCI. Preview deploys don't get production secrets. `.env` is
  gitignored, and no secret exists in git history even if removed since.
- **One security audit file** — `docs/security/SECURITY-AUDIT.md` is the
  single living register. Never start a new audit file. Whoever runs a
  security audit (person or agent) adds a row to its *Audit history*, adds
  the findings (ID, severity, file:line, exploit, proposed fix), re-checks
  the open items and updates their status in place, and proposes the fixes
  as a phase in its §4 checklist. Whoever lands a fix ticks its item there
  in the same change, with the migration or file, the date and how it was
  verified. Written-but-not-deployed stays unticked with a note. The file's
  "How this file is maintained" section has the details.

## Multi-agent rules

- Never commit directly to `main`.
- One worktree and one branch per task and per agent — never reuse or
  modify another agent's worktree, branch, or uncommitted work.
- Scope check before starting: skim open PRs' changed files and look for
  uncommitted work in shared checkouts. On overlap, stop and ask.
- No agent ever force-pushes anywhere, with or without lease — that stays
  a human action too, per the strict git-ownership rule above.
- Resolve lockfile conflicts by regenerating, never by hand-merging.
- Worktrees don't isolate shared resources: confirm a dev-server port
  answers *your* process before trusting it; don't run schema experiments
  against a shared database.
- If a conflict can't be resolved confidently, stop and report instead of
  guessing.

## Completing a task

1. Keep changes limited to the assigned task.
2. Run the repo's checks *(repo-specific — list exact commands in the
   project-specific section below)*.
3. Assemble evidence captured along the way (`check verify` output,
   screenshots, query results).
4. Draft the commit message and a stage summary for
   the human. The human commits, rebases onto latest `origin/main`, and
   reruns checks.
5. Draft the push command for the human to run.
6. Draft the PR: what changed, how it was tested (every claim backed by
   evidence), before/after proof, risks or follow-up work (`document pr`).
   The human opens it.
7. Review the PR diff, recommend rebase or merge with a stated reason. The
   human decides and executes.
8. End by presenting the PR URL. Do not merge unless explicitly
   instructed.

## Project-specific section

**Project:** PAR Map, SupaMoto Zambia's field map of the loan portfolio
(customers coloured by PAR bucket, boundary and buffer layers, customer to
Supa Partner distance and routes). Owner and approver: Chella. Team:
Chella, Harrison, Loveness.

### Git in this project (overrides non-negotiable 1)

In this repo, git is shared between agents and developers. Where the
generic sections above say a human runs a git command, an agent working
here may run it itself when the task calls for it:

- **Allowed:** create a branch or worktree, stage, commit, push a topic
  branch, open a PR.
- **Still human-only:** merging to `main`, force-pushing (with or without
  lease), `git reset --hard`, deleting branches or repos, rewriting pushed
  history, changing remotes, and editing git config or hooks.
- **Never:** commit to `main` directly, commit secrets, `.env*` files or
  customer exports (`scripts/*.csv`, `scripts/customers_output.ts`), or
  skip hooks (`--no-verify`).
- **Always:** follow `CONTRIBUTING.md` (branch names, Conventional Commits,
  checks before pushing), and say in the chat or PR what was committed or
  pushed.

**Remotes (2026-10-07):**
- `origin` is `kchella/Portfolio_Map`, the working repo.
- The organisation copy is `ECS-IT-Fintech/ECS_Maps_Zambia`.
- Production (Vercel) still deploys from Chella's personal repo, which has
  five commits (May 19 to June 5) not yet merged here. See
  `docs/HANDOVER.md`.

Non-negotiable 14 still applies: don't set `## Git` `integration: on`.

### Working practices

Adopted from SupaTicket (agreed 2026-10-02). They apply to people and
agents.

1. **Commit and push daily.** Work doesn't live only on one laptop. Until
   2026-10-04 this project had no git at all; don't let that happen again.
2. **No hand edits to the live database.** Every schema or policy change is
   a migration file in `supabase/migrations/`. The CLI history has never
   been set up for this project, so for now migrations are applied in the
   SQL Editor *from the file*, never typed ad hoc, and recorded in
   `docs/DEPLOY_LOG.md`.
3. **Check the live state; don't assume.** A migration in the repo is not
   proof it's live. Verify with `pg_policies` and an anon-key request. This
   is how audit C1 (all customers public) was found.
4. **Record every deploy** in `docs/DEPLOY_LOG.md`: migration, frontend or
   dashboard setting, with the date, what, the commit and who.
5. **Security before features.** A feature that touches an open High
   finding in `docs/security/SECURITY-AUDIT.md` isn't enabled in production
   until that finding is fixed.
6. **Re-test security fixes with the exploit.** There's no test runner, so
   replay the attack (for example the anon-key `curl`) and record the
   result in the audit.
7. **Keep the toolchain working.** On Chella's laptop `npm` fails with
   EPERM; run tools from `node_modules` directly
   (`node node_modules/typescript/bin/tsc`) until it's fixed.
8. **Second reviewer on risky changes.** Migrations, RLS, auth and storage
   policies are reviewed by Harrison or Loveness before merge.

### Where things are (read these, in this order, when relevant)

| File | What it is |
|---|---|
| `docs/HANDOVER.md` | Current state of work in flight. Read first. |
| `docs/security/SECURITY-AUDIT.md` | The living security register (C/H/M/L/N IDs) and the phased fix plan. Update it on every audit and every fix. |
| `docs/security/SECURITY-DEPLOY-RUNBOOK.md` | How to apply and verify the security migrations and dashboard settings, and how to roll back. |
| `docs/BUG_LOG.md` | Numbered bug log (`PM-NNN`) required by non-negotiable 10. |
| `docs/ARCHITECTURE.md` | Pages, code map, auth flow, data flow, map panes, live schema, key decisions. |
| `docs/DEPLOY_LOG.md` | One line per production deploy. |
| `docs/DECISIONS.md` | Decision records (`DEC-NNN`). |
| `docs/REQUIREMENTS.md` | What each feature must do, with "Done when" criteria. |
| `docs/DESIGN.md` | UI system. The code (`src/styles/theme.ts`, `admin/AdminUI.tsx`) wins where they differ. |
| `docs/TRAINING.md` | End-user guide for field staff and admins. |
| `docs/HISTORY.md` | Build history (phases 1 to 10) and retired rules. A record, not current rules. |
| `docs/AUDIT_LOG.md` | Code and design audits other than security, oldest first. |
| `CONTRIBUTING.md` | Human workflow: branches, migrations, reviews. |
| `README.md` | Overview, setup, data loading, deploying. |
| `skills/README.md` | Skill index. Each skill is `skills/<name>/SKILL.md`. |

Skills are reachable in two ways. Any agent can read `skills/<name>/SKILL.md`
directly by path. Claude Code auto-loads them through `.claude/skills`, a
local link to `skills/` (setup in `CONTRIBUTING.md`). Eight of the eleven are
entry points only: their `SKILL.md` refers to files (`modes/`,
`agent-prompt.md` and others) that aren't in the repo yet. Until those are
added, don't run them as automated workflows; follow their steps by hand
and apply the rules in this file. `debug` and `component-registry-sources`
are complete, as is `db-change`.

### Agent skills

- `skills/debug/SKILL.md`: root-cause loop for any bug; pairs with
  `docs/BUG_LOG.md` (`PM-NNN`).
- `skills/component-registry-sources/SKILL.md`: where UI component code may
  come from. **This project uses no component library**: UI is
  hand-written with inline style tokens (`src/styles/theme.ts`,
  `admin/AdminUI.tsx`). Adopting any source from that skill (shadcn, mapcn
  and others) needs Chella's approval and a `docs/DECISIONS.md` record.
- `skills/{audit,scope,architect,develop,check,test,document,sync}/SKILL.md`:
  the workflow pipeline (see Workflow above). Incomplete, see above.
  `scope` and `architect` write to `docs/scope/` and `docs/specs/`, which
  don't exist yet; create them on first use.
- `skills/db-change/SKILL.md`: **PAR Map's own skill.** Use it for any
  migration, RLS, storage or Auth-setting change on the shared live
  project: live state first, idempotent migration with PREVIEW, Chella
  runs it, anon-key proof, then logs. Complete.
- `skills/workflow-merge-notes.md`: how the skills fit these rules.

### Build approach

Vertical slices (non-negotiable 8): one feature end to end (migration, RLS,
service in `src/lib/`, UI) before the next. Example: Supa Partner went
004 migration, then CSV import, then the popup, then routes.

### Stack (locked)

Transcribed from `package.json` and `node_modules` on 2026-10-07; re-check
when a dependency changes.

- **Language:** TypeScript (strict) everywhere in `src/`.
- **Framework:** Next.js 15.5.14, Pages Router; React 19.2.4.
- **Map:** Leaflet 1.9.4, React-Leaflet 5.0.0, Mapbox style tiles.
- **Backend:** Supabase (`@supabase/supabase-js` 2.103.0,
  `@supabase/ssr` 0.10.2): Postgres with RLS, Auth (email + Google),
  Storage. No Edge Functions, no `api/` routes.
- **Parsing:** JSZip 3.10.1 (KMZ), DOMParser (KML), PapaParse 5.5.3 (CSV).
- **Routing:** public OSRM at `routing.openstreetmap.de` (foot, bike, car).
- **Styling:** inline style objects using tokens. Tailwind 3 is installed
  and only its base reset is active; no utility classes are used.
- **Installed but unused:** `recharts`, `clsx`, `geojson`. Remove or use
  them deliberately.
- **Not installed:** any test runner, Zod. Adding a dependency needs
  Chella's approval.

### Test/lint/build commands

```bash
npm run dev                # http://localhost:3000 → /map
npx tsc --noEmit           # type-check (or: node node_modules/typescript/bin/tsc --noEmit)
npm run lint               # ESLint (next lint)
npm run build              # never while the dev server runs; it corrupts .next
```

There is no automated test suite. Verification is type-check, lint, and a
manual check in the running app (signed in as admin and as a viewer), with
evidence in the PR.

### Key directories

- `src/pages/`: routes (`map`, `admin`, `login`, `register`,
  `forgot-password`, `auth/callback`).
- `src/components/`: `Map.tsx` (client-only Leaflet), `PopupCard.tsx`,
  `RouteCard.tsx`, and `admin/` (one manager per admin section).
- `src/lib/`: `supabase.ts` (the only Supabase client), `useAuth.ts`,
  `customerService.ts`, `layerService.ts`, `safeNext.ts`.
- `src/utils/`: pure helpers: `kmzParser`, `geoHelpers`, `routing`,
  `supaPartners`, `parHelpers`.
- `src/types/par.ts`: PAR statuses, colours, labels, priority rule.
- `supabase/migrations/`: numbered SQL, `NNN_description.sql`.

### Hard invariants specific to this project

- **RLS is the only real access control.** The browser holds the anon key.
  UI gating (`isAdmin`, `hasAccess`) is courtesy. Reads use
  `has_map_access()`, writes use `is_admin()`.
- **New accounts start `pending`** and get nothing until an admin approves.
  Never change the trigger default.
- **The Supabase project is shared** with other apps (`ac_*`,
  `logistics_*`, …). Migrations touch only PAR Map's tables (`customers`,
  `profiles`, `kmz_layers`, `buffer_layers`, `teams`) and the `kmz-files`
  bucket.
- **Policies are OR-ed.** Adding a strict policy doesn't remove a loose
  one; drop the loose one and verify with the anon key.
- **Leaflet only via `dynamic(..., { ssr: false })`.**
- **One browser Supabase client** (`src/lib/supabase.ts`); a second one
  breaks Google sign-in (PKCE).
- **Service-role key never in a `NEXT_PUBLIC_` variable** or anywhere in
  `src/`. `getSupabaseAdmin()` exists but must not be called from browser
  code.
- **PAR colours and labels only from `src/types/par.ts`;** UI colours only
  from the theme tokens.
- **No `dangerouslySetInnerHTML`.** Map tooltips use text nodes; keep it
  that way for any user-supplied name.
- **Field-ready UI:** text at least 11 px, tap targets at least 40 px, one
  solid primary action per view. Chella owns UI/UX; don't restyle unasked.
- **Performance is a hard constraint:** phones, Lusaka, low bandwidth.
  Canvas markers, no per-marker requests.

### Environment quick reference

- **Supabase:** one shared project, used as production. No staging.
- **Migrations:** applied by hand in the SQL Editor. Live state on
  2026-10-07: 003, 004 and 005 are live; 001 and 002 are partly
  superseded. `customers.week_label` exists live with no migration.
- **Auth settings** (sign-ups, email confirmation, Google) live in the
  Supabase dashboard. Turning on email confirmation is still open (audit
  H2).
- **Frontend:** Vercel, deploying on every push to `main` of the connected
  repo. Needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  and `NEXT_PUBLIC_MAPBOX_TOKEN`. A Dockerfile exists for self-hosting.
- **Agents never run anything that changes the live project** (SQL, policy
  changes, dashboard settings) unless Chella asks. Read-only checks with
  the anon key are fine; anything needing elevated access goes to Chella as
  SQL to run.

### Local test infrastructure

None. No local Supabase stack, no fixtures, no seed data. Signed-in pages
need a real approved account.
