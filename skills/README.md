# Skills

The [agent skills](https://code.claude.com/docs/en/skills) used in this repo. Each is a folder with a `SKILL.md` (frontmatter `name` and `description`, then instructions) that an agent loads when a task matches. Ten come from the jsmastery workflow package; `db-change` is written for PAR Map. How they fit this repo's rules is in [workflow-merge-notes.md](./workflow-merge-notes.md) and [AGENTS.md](../AGENTS.md).

## The skills

| Skill | Use it to | Status |
|---|---|---|
| [audit](./audit/SKILL.md) | Bootstrap or gap-fill the `AGENTS.md` context files | Entry point only |
| [scope](./scope/SKILL.md) | Keep the living feature plan in `docs/scope/` | Entry point only |
| [architect](./architect/SKILL.md) | Make a load-bearing decision and write its build spec in `docs/specs/` | Entry point only |
| [develop](./develop/SKILL.md) | Build a feature from its spec | Entry point only |
| [check](./check/SKILL.md) | `verify`: prove the change in the running app. `review`: fresh-model code review | Entry point only |
| [test](./test/SKILL.md) | Write tests for changed code | Entry point only |
| [debug](./debug/SKILL.md) | Find and fix a bug's root cause | Complete |
| [document](./document/SKILL.md) | Write PR text, changelog, release notes, postmortems | Entry point only |
| [sync](./sync/SKILL.md) | Update `AGENTS.md`, scope and spec statuses after a change | Entry point only |
| [component-registry-sources](./component-registry-sources/SKILL.md) | Decide where UI component code comes from | Complete |
| [db-change](./db-change/SKILL.md) | Change the shared live Supabase project safely: live state, idempotent migration with preview, hand-over, anon-key proof, logging | Complete (PAR Map's own) |

**Entry point only** means the `SKILL.md` is here but the files it tells the agent to read next (`modes/*.md`, `agent-prompt.md`, templates and guides) are not. Don't run those as automated workflows until the full skill folders are added; follow their steps by hand instead.

## The pipeline

```
Existing codebase:  audit → scope → feature loop
New project:        scope → architect (stack) → scaffold → audit → feature loop

Feature loop:  architect → develop → check verify → test → check review → document → sync
Any bug:       debug
```

`audit` is always used. `scope`, `architect`, `develop`, `document` and `sync` are the heavier steps, used when a feature warrants them. `check`, `test` and `debug` are always available.

## Using them

- **Claude Code** loads project skills from `.claude/skills`. Link it to this folder once per clone (commands in [CONTRIBUTING.md](../CONTRIBUTING.md)), then invoke a skill with `/<name>`.
- **Codex, Cursor, Gemini CLI** read [AGENTS.md](../AGENTS.md), which lists these paths. Open `skills/<name>/SKILL.md` directly.

## Rules that still apply here

- Git: `develop` and `test` commit on their own only if an `AGENTS.md` sets `## Git` `integration: on`. Never set it (AGENTS.md non-negotiable 14).
- `test` installs a test runner on first use. Adding a dependency needs Chella's approval.
- `audit` expects `CLAUDE.md` to hold only the `@AGENTS.md` import. This repo's `CLAUDE.md` also keeps a short Claude Code appendix (open decision 3 in the merge notes).
- `document postmortem` writes to `docs/postmortems/`. This repo keeps incidents in `docs/BUG_LOG.md` (`PM-NNN`).

## Adding or completing a skill

1. Copy the skill's whole folder here, named after the skill (kebab-case), including every file its `SKILL.md` refers to.
2. Update the table above and the skills list in [AGENTS.md](../AGENTS.md).
