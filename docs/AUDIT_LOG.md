# Audit log

Code, design and documentation audits **other than security**, oldest
first. Security audits go only in `docs/security/SECURITY-AUDIT.md` (its
*Audit history*); this file links to them so the full timeline is in one
place.

| Date | Type | Scope | By | Result |
|---|---|---|---|---|
| 2026-10-04 | Handover review | Repo, docs, git state, migrations | Claude Code for Chella | `docs/HANDOVER.md`: no git locally; org repo about four months behind; customer data in git history; docs contradict each other |
| 2026-10-04 | Security (first) | App, migrations, live Supabase, storage, auth settings, Docker, deps | Claude Code for Chella | See `docs/security/SECURITY-AUDIT.md`. C1 (customers public) and H1 (storage public) found and fixed the same day |
| 2026-10-07 | Documentation | `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, all of `docs/` | Claude Code for Chella | Docs rewritten to match the code; SupaTicket-specific content replaced; missing docs created; `CHECKLIST.md` folded into `HISTORY.md` |

## Notes from the 2026-10-07 documentation audit

- `ARCHITECTURE.md` described a cookie-only middleware, an `api/userauth.ts`
  route, buffers stored in `kmz_layers` with a "Buffers —" prefix, and a
  public bucket. None of these are true now; rewritten.
- `DESIGN.md` described an indigo (`#4a4bd7`) gradient system. The app uses
  SupaMoto orange with field-ready rules; rewritten.
- `RULES.md` described Next.js 14, a password gate and `src/data/`;
  rewritten, and the old rules moved to `HISTORY.md`.
- `AGENTS.md` and `CONTRIBUTING.md` were copied from SupaTicket (Vite,
  plain JS, Netlify, `BT-` IDs, migrations 0050+). The shared org sections
  were kept; the project sections were rewritten for PAR Map.
- `CLAUDE.md` duplicated and contradicted the rules; it now loads
  `AGENTS.md`.
- Installed but unused dependencies: `recharts`, `clsx`, `geojson`. Tailwind
  only supplies its base reset. Recorded in `AGENTS.md`; nothing removed.
