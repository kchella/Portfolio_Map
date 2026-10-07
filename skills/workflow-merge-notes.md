# Workflow merge: jsmastery-pro/skills + existing AGENTS.md

This is a working document, not a drop-in replacement. Review the three
open decisions at the bottom before treating any of this as final.

## New pipeline order

```
Brownfield (existing repo, most of your projects):
  /audit  →  /scope  →  feature loop

Greenfield (new project):
  /scope  →  /architect (stack)  →  scaffold  →  /audit  →  feature loop

Feature loop (per feature, depth per workflow tier):
  /architect  →  /develop  →  /check verify  →  /test  →  /check review  →  /document  →  /sync
```

Your existing "Isolate" step (`new-feature`, git worktree per task) still
runs first, before `/architect` on a feature — it's orthogonal to this
pipeline, not replaced by it.

## Non-negotiables — one addition

Add this as a new line under your existing Non-negotiables list (does not
renumber the rest, just appended):

> **14. Never set `## Git` `integration: on`** in any AGENTS.md, root or
> nested. Several jsmastery skills (`/develop`, `/test`) check for this
> flag and will branch, commit, or `git init` on the agent's own authority
> if it's present — even with confirmation prompts, that still means the
> agent runs the command, which non-negotiable #1 does not allow. Absent
> or `off` is the only acceptable state. If `/audit` or `/sync` ever
> proposes adding a `## Git` section, decline the `integration: on` part
> specifically.

Also worth noting where you got it for free: `/architect`, `/audit`,
`/check`, `/debug`, `/scope`, `/sync` only ever run read-only git
(`fetch`, `log`, `status`, `diff`, `rev-list`, `bisect`) — no changes
needed there.

## Skill table updates

Retire (superseded, avoid running both):
- `project-kickoff-planning` → `/scope`
- `lightweight-project-docs` → `/document`

Keep running alongside jsmastery skills, feeding them as inputs rather
than being replaced by them:
- `design-first-development`, `ui-ux-inspiration-sources` → feed
  `/architect`'s design conversation
- `code-structure`, `no-boilerplate-code` → constrain `/develop`'s build
- `vertical-slice-development` → maps to one of `/architect`'s four named
  build approaches (Tracer Bullet / Skateboard / Facade / Journey);
  record the chosen one on the scope header or root AGENTS.md so
  `/architect` picks it up automatically (see open decision #2 below)
- `evidence-driven-testing`, `before-and-after` → the proof-gathering
  method `/check verify` uses
- `multi-agent-role-routing` → decides which agent/model runs
  `/architect` vs `/develop` for backend/schema work, and is the same
  principle `/check review`'s "different model than wrote the code" rule
  already encodes — point them at each other rather than treating as
  separate rules
- `supabase-rls-verification`, `migration-review` → apply inside
  `/architect` (when the spec touches schema/RLS) and `/develop` (when
  building it); nothing in jsmastery covers this, it stays entirely yours
- `bug-log-and-readme` → hooks into `/debug`'s regression-test handoff
  and `/document`'s `postmortem` type
- `unslop` → runs over `/document`'s PR/changelog text before a human
  reads it, same as it does now for commit messages
- `code-comment-standards`, `engineer-grade-quality-bar` → apply during
  `/develop`'s build, same as now
- `context-window-handover` → `/sync`'s "state lives in files, run
  `/clear` at handoffs" pattern already does this; treat as the same
  practice under a different name rather than running both

Under review (see open decision #1):
- `governing-file-sync` vs `/sync` — likely redundant, not yet confirmed

## Open decisions (yours, not mine)

1. **`governing-file-sync` vs `/sync`.** I haven't read `governing-file-sync`'s
   SKILL.md, so I can't confirm it's fully superseded. If it does nothing
   `/sync`'s boundaries table (AGENTS.md edits, scope reconciliation, spec
   status lines) doesn't already cover, keep it as a supplement; otherwise
   retire it.

2. **Which build approach is `vertical-slice-development`?** `/architect`
   needs one of Tracer Bullet, Skateboard, Facade, or Journey recorded as
   the project default. Tracer Bullet is the closest standard match to
   "one feature end-to-end before the next" and is what's assumed above,
   but Journey (complete one user path's tasks fully before the next) is
   also a plausible reading depending on what your rule actually meant in
   practice. Pick one and record it.

3. **CLAUDE.md content beyond the `@AGENTS.md` import.** jsmastery's
   convention wants CLAUDE.md to be a bare one-line pointer, nothing else.
   Yours also carries Claude-Code-specific rules (subagent routing, the
   `evidence-driven-testing` doctor-check instruction) that don't apply to
   Codex or Gemini CLI. Decide: keep it as-is with a noted exception to
   the jsmastery convention, or fold that content into AGENTS.md (where
   it would then apply to every agent, not just Claude Code).
