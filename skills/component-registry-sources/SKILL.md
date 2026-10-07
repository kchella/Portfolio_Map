---
name: component-registry-sources
description: Use when starting or extending UI work and deciding where to pull component code from, before hand-rolling something from scratch. Covers shadcn-based registries, animation libraries, full alternative design systems, and specialist registries (maps, data tables, agent chat UI), each with its source repository and whether it's copy-paste-owned code or an installed dependency. Read alongside `ui-ux-inspiration-sources` (visual reference only, no code) and `verified-stable-dependencies` (extra scrutiny before locking in a newer/niche source).
---

# Component & Code Sources

Distinct from `ui-ux-inspiration-sources`: those sites are for looking at
designs, these are for pulling actual component code into the repo.

## Ownership model — default to copy-paste

Preference: own the actual component code as an editable file in the repo,
not an opaque dependency configured through props. Applies to the
*component layer* — the visible markup/logic you'd actually want to edit.
It does not apply to genuine engines underneath a component (Radix
primitives, TanStack Table, MapLibre) — those stay as npm dependencies
under any of these sources, copy-paste included, because reimplementing
them buys nothing.

**Decision rule:** default to the shadcn-CLI group below. Reach for a
fully-installed system (MUI, Ant Design) only when the project needs
something so complete that hand-rolling it would cost more than the
ownership is worth — e.g. a data grid with built-in virtualization, or an
admin panel where every screen needs the same dense form patterns.

## Foundation

- **shadcn/ui** — [Copy-paste] not a component library, a code-distribution
  system. Components are copied into the repo and owned outright — no
  upstream dependency to break under you. Most sources below are built as
  add-ons to this. Default starting point unless the project has a reason
  not to use it.
  Repo: https://github.com/shadcn-ui/ui
- **TanStack** — [Installed, no alternative] headless logic only (Table,
  Query, Router, Form), no styling, no copy-paste option offered. Pairs
  with anything, including non-shadcn projects. Check here before writing
  custom data-fetching or table logic.
  Repo: https://github.com/TanStack (Table specifically: https://github.com/TanStack/table)

## Shadcn-compatible registries (extra components on top of the base kit)

All of these distribute via `npx shadcn add <url>` — the component file
lands in the repo, editable, same ownership model as shadcn/ui itself.

- **shadcn.io** (unaffiliated third party) — richer widgets shadcn doesn't
  ship natively: kanban boards, Gantt charts, AI chat inputs.
  Site: https://www.shadcn.io/ (no single public repo — community/commercial registry)
- **21st.dev** — community/AI-generated shadcn-style marketplace; good for
  long-tail, single-purpose components not worth building in-house.
  Site: https://21st.dev/
- **Animate UI** — motion/transition-focused components on shadcn
  primitives.
  Site: https://animate-ui.com/
- **Origin UI / Originkit** — free animated React/Framer sections
  (full-page blocks); MCP-connectable.
  Site: https://www.originkit.dev/
- **OpenStatus data-table-filters** — [Copy-paste + small installed engine]
  a complete, filterable data table built on TanStack Table + shadcn/ui.
  The table blocks are copied in; TanStack Table/Zustand/nuqs land as
  regular npm deps underneath. Check before hand-building another
  sortable/filterable table.
  Repo: https://github.com/openstatusHQ/data-table-filters
  (docs site: https://data-table.openstatus.dev)
- **mapcn-rn** — [Copy-paste + MapLibre engine] React Native map components
  as composable parts (Map, MapMarker, MapControls, etc.), copied in via
  the shadcn CLI, ported from the web version of mapcn.
  Site: https://mapcn-rn.dev/ — no single confirmed canonical repo at
  time of writing; at least two community forks exist
  (`aikenahac/mapcn-react-native`, `unkn0wndfbx/mapcn-react-native`).
  Verify which one the site currently points to before installing.

## Unconfirmed delivery model — check before use

- **Launch UI** — shadcn + Tailwind blocks for landing/marketing pages.
  Haven't confirmed whether it's pure copy-paste or includes a paid
  template purchase flow. Verify before relying on it.
  Site: https://www.launchuicomponents.com/
- **AlignUI** — paid, polished SaaS/enterprise design system (Figma kit +
  code). Haven't confirmed whether the code side is copy-paste or an
  installed package. Verify before relying on it.
  Site: https://www.alignui.com/ (no public repo — commercial product)

## AI / agent UI

- **assistant-ui** — [Hybrid] the visible pieces (Thread, Composer,
  ThreadList) are copy-paste `.tsx` via the shadcn CLI, same ownership
  model as shadcn/ui. The chat state/runtime engine is
  `@assistant-ui/react`, an installed npm package — that part is doing
  real work (streaming, message state) and isn't meant to be hand-copied.
  Check here before hand-building chat UI for an agent-facing app.
  Repo: https://github.com/assistant-ui/assistant-ui

## Full alternative design systems

[Installed only] No copy-paste option on any of these — components live in
`node_modules` and are configured via props/theme, not edited directly.
Also don't mix these with shadcn on the same screen — each has its own
visual language and theming system.

- **Material UI (MUI)** — mature, fully-built widgets (data grids, date
  pickers) out of the box. Stronger fit than shadcn when the priority is
  complete functionality over bespoke styling, and worth the ownership
  trade-off only for that reason.
  Repo: https://github.com/mui/material-ui
- **Ant Design** — enterprise/admin-heavy component set, strong for dense
  forms and internal tooling.
  Repo: https://github.com/ant-design/ant-design

## Not a component source

- **Agentation** — [Installed, but dev-only] a browser annotation tool,
  not a UI library. Click an element, leave a note; a local MCP server
  (`agentation-mcp`, port 4747 by default) lets Claude Code pull the
  annotation directly — selector, component hierarchy, computed styles —
  and resolve it, no copy-paste. Distributed as an npm package
  (`agentation`), not copy-paste, but it's dev-only (never ships to
  production), MIT-licensed, and small enough to read in five minutes if
  ownership of this one matters. Fully free and self-hosted — no account
  or API key required. Setup for Claude Code:
  `npx skills add benjitaylor/agentation` then `/agentation`. Relevant to
  `before-and-after` / `evidence-driven-testing` for turning a visual bug
  report into a precise fix instruction — not a place to source
  components from.
  Repo: https://github.com/benjitaylor/agentation

## Before adopting from a newer or niche source

Per `verified-stable-dependencies`, treat these differently based on age:

- **Low risk, adopt freely:** shadcn/ui, MUI, Ant Design, TanStack,
  assistant-ui, OpenStatus data-table-filters, Agentation (free, local,
  no account).
- **Check first:** Animate UI, Origin UI, mapcn-rn, 21st.dev-sourced
  components, Launch UI, AlignUI. Before locking a project to one,
  confirm: the repo/registry URL still resolves, there's recent commit
  activity, the license permits the intended use, and installing it
  doesn't pull in a second, conflicting version of a primitive (Radix,
  Tailwind config) already in the project. For mapcn-rn specifically,
  confirm which fork is current before installing — there isn't one
  settled canonical repo yet.
