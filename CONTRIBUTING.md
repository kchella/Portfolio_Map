# Contributing

How the team (Chella, Harrison, Loveness) and the AI agents working with
us make changes without overwriting each other. Coding rules for agents are
in [AGENTS.md](AGENTS.md); they apply to people too.

## Before you start

- Say in the team chat what you're picking up ("taking PM-004, branch
  `fix/sync-atomic`"). One topic per branch.
- `git fetch origin` and look at what changed. If `main` moved, rebase
  before you continue.
- Look at `supabase/migrations/` for new files you didn't know about.
- Read [docs/HANDOVER.md](docs/HANDOVER.md) for work in flight, and
  [docs/security/SECURITY-AUDIT.md](docs/security/SECURITY-AUDIT.md) if
  you're touching auth, data access or storage.

### One-time setup

```bash
git clone https://github.com/kchella/Portfolio_Map.git
cd Portfolio_Map
npm install
```

Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_MAPBOX_TOKEN`; ask Chella
for the values. Copy it as a file and never paste keys into chat. The
service-role key isn't needed.

### One-time setup: skills for Claude Code

Claude Code loads project skills from `.claude/skills`. Link it to the
tracked `skills/` folder once per clone (git ignores the link):

```powershell
# Windows (PowerShell, from the repo root; no admin needed)
cmd /c mklink /J .claude\skills "$PWD\skills"
```

```bash
# macOS / Linux
ln -s ../skills .claude/skills
```

## Branches and commits

- `main` is production: Vercel deploys every push. It always builds, and
  nobody commits to it directly.
- Work on short-lived topic branches off the latest `main`: `feat/...`,
  `fix/...`, `chore/...`, `docs/...`.
- Commit in small steps using [Conventional Commits](https://www.conventionalcommits.org):
  `fix(admin): keep customers when an import fails (PM-001)`.
- Git is shared between developers and agents in this repo. Agents may
  branch, commit and push topic branches. Merging to `main`,
  force-pushing, `reset --hard`, deleting branches and changing remotes
  stay with a person. The full rules are in [AGENTS.md](AGENTS.md), "Git in
  this project".
- Never commit `.env*` files, keys or customer exports. `.gitignore`
  blocks `.env*`, `scripts/*.csv` and `scripts/customers_output.ts`; check
  `git status` before every commit anyway. Never skip hooks.

## Before you push

```bash
npx tsc --noEmit
npm run lint
npm run build          # stop the dev server first; a build while it runs corrupts .next
git fetch origin && git rebase origin/main
```

Sync first, every time. A branch that's behind `main` can silently undo
other people's work when it's merged.

## Pull requests

In the description:

- What changed and why, in one paragraph.
- How to verify it, with evidence (screenshots, query output). For access
  changes, include the anon-key `curl` result.
- Any migrations: the file names, and whether they've been applied to the
  shared project.
- Any bug-log entries (`PM-NNN`) or audit findings it fixes.

At least one other person reviews. **The reviewer merges, not the
author.** Don't merge a PR that GitHub flags as out of date with its base;
rebase it first. After merging, add a line to
[docs/DEPLOY_LOG.md](docs/DEPLOY_LOG.md), since the merge is a deploy.

## Migrations

Schema changes only happen through `supabase/migrations/NNN_description.sql`.
The Supabase project is **shared with other SupaMoto apps** and has no
staging copy, so every migration is a production change for more than one
app.

1. **Reserve the number** in chat before writing ("taking `006`"). If two
   branches still collide, the unmerged one renumbers.
2. **Touch only PAR Map's objects:** `customers`, `profiles`, `kmz_layers`,
   `buffer_layers`, `teams` and the `kmz-files` bucket. Other apps use
   prefixed tables (`ac_*`, `logistics_*`); never alter them.
3. **Make it idempotent:** `create or replace`, `if not exists`,
   `drop policy if exists`.
4. **Start with a header comment:** what's wrong, what the fix does, how to
   verify and how to roll back. For destructive steps, include a read-only
   PREVIEW query, as in `005`.
5. **Never edit a migration that has been applied.** Fix it with a new,
   higher-numbered one.
6. **Have it read in full by someone else before it runs.** For RLS
   changes, check the result in `pg_policies`, and **test it with the anon
   key**. Policies are OR-ed, so a loose old policy can cancel a strict new
   one.
7. **Apply it in the Supabase SQL Editor from the file,** run its VERIFY
   steps, record it in `docs/DEPLOY_LOG.md`, and say in chat that it's
   live.
8. **Apply it before merging code that depends on it.** The weekly import
   once emptied the live table because the code expected a column a
   migration hadn't created yet (PM-001).

## Bugs

Every real bug gets a numbered entry in [docs/BUG_LOG.md](docs/BUG_LOG.md)
before it's fixed: file and line, the broken behaviour, the root cause with
evidence, the fix, and how it was verified. Leave a short comment at the
fix site naming the entry (`PM-002`). Number entries in order and don't
reuse numbers.

## Security

- The anon key is the only key the frontend ever sees.
- Every permission shown or hidden in the UI must also be enforced by RLS.
- Findings, the fix plan and the deploy runbook are in
  [docs/security/](docs/security/). Tick a finding there in the same PR
  that fixes it.

## When in doubt

Ask in the team chat before anything destructive: force-pushing, deleting
a branch or repo, renumbering a migration, clearing customer data, or
running SQL against the live project.
