# Design system — PAR Map

How PAR Map looks and why, as of 2026-10-07. **The code wins where this
file differs:**
- `src/styles/theme.ts` (`T`, `F`): map UI tokens;
- `src/components/admin/AdminUI.tsx` (`T`): admin tokens and primitives;
- `src/types/par.ts`: PAR colours, badges and labels.

Chella owns UI/UX. Build what's specified; don't restyle unasked.

## North star: calm, readable, in the field

The people using this stand outside in Lusaka sun, on a phone, often with
one hand, on weak data. Every choice follows from that:

- **Contrast over subtlety.** Secondary text is `variant` (`#41484d`), not a
  pale grey. Muted grey (`#8a9199`) is only for icons and genuinely
  secondary hints.
- **One obvious action per view.** A single solid orange button (Route to
  Supa Partner, Start navigation); everything else is neutral.
- **Quiet surfaces.** White cards, hairline dividers, soft shadows. No
  gradient headers, no glows, no tinted whole cards ("AI slop", DEC-006).
- **Colour carries meaning.** PAR colours only ever mean PAR status, and
  brand orange only ever means "act here".

## Colour

### Map UI (`src/styles/theme.ts`)

| Token | Value | Use |
|---|---|---|
| `canvas` | `#f8f9fa` | Page background |
| `low` | `#f1f4f5` | Icon-button fill, subtle blocks |
| `container` | `#ebeef0` | Hover fill |
| `card` | `#ffffff` | Cards, popups |
| `high` | `#dee3e6` | Borders on pills and chips |
| `onSurface` | `#2d3335` | Primary text. Never pure black |
| `variant` | `#41484d` | Secondary text and labels |
| `muted` | `#8a9199` | Icons, hints |
| `ghost` | `rgba(173,179,181,0.18)` | Hairline dividers |
| `primary` | `#f58202` | SupaMoto orange: the primary action |
| `primaryHover` | `#d97002` | Primary hover |
| `primaryText` | `#a85a00` | Orange text on white or tint (passes AA) |
| `onPrimary` | `#111827` | Text on orange. **White on `#f58202` fails AA** |
| `primaryDim` | `rgba(245,130,2,0.10)` | Avatar fill, selected chip |
| `error` | `#a8364b` | Errors (muted, not alarm red) |

`primaryGradient` exists in the tokens but **isn't used** for buttons any
more (DEC-006).

### PAR status (`src/types/par.ts`, the only source)

| Status | Dot | Badge text | Label |
|---|---|---|---|
| `ONTIME` | `#22c55e` | `#15803d` | On time |
| `PAR 1-30` | `#facc15` | `#a16207` | PAR 1–30 |
| `PAR 31-60` | `#f97316` | `#c2410c` | PAR 31–60 |
| `PAR 61-90` | `#ef4444` | `#b91c1c` | PAR 61–90 |
| `PAR 90+` | `#7f1d1d` | `#7f1d1d` | PAR 90+ (and "Priority visit") |

Badges are the dot colour at 10–16% opacity behind the darker text shade.

### Admin (`AdminUI.tsx`)

A neutral, near-monochrome set: `ink` `#111111`, `mid` `#555555`, `muted`
`#999999`, `border` `#e2e2e2`, `canvas` `#f7f7f7`; primary buttons are
black. Orange appears only as the active-nav marker and the GPS coverage
bar. Errors use `#c0392b` on a 6% tint.

### Sign-in screens (`A` in `theme.ts`)

Dark, matching the SupaTicket sign-in: `#101010` page, `#1a1a1a` card,
`#2c2c2c` hairlines, tangerine `#fb9f38` primary with dark text, Poppins.
Used only by `/login`, `/register`, `/forgot-password`, `/reset-password`
and `/auth/callback`, through `components/auth/AuthShell.tsx`. See
`docs/specs/auth-screens.md`.

## Typography

- **Inter** for everything (`F.family`), at weights 400, 500 and 600. Avoid
  700 except for large numbers in admin tiles.
- **DM Mono** only for codes in admin tables (contract references).
- **Manrope** is loaded but not used in current components.
- **Minimum size 11 px.** Labels 11–12 px, body and values 12.5–14 px,
  names 14–15 px, big numbers 22–24 px.
- Use tabular numbers (`fontVariantNumeric: 'tabular-nums'`) for every
  number that can change: counts, distances, times, phone numbers.

## Size and touch

- **Tap targets at least 38–40 px** (icon buttons 38 px, close buttons
  32–36 px with padding), and primary buttons 42–46 px tall.
- **The popup fits small phones:** `min(300px, 100vw - 32px)`. The route
  card is `min(380px, 100% - 24px)`.
- **Corner radius:** cards 16 px, buttons 10–12 px, pills fully rounded.
- **Shadows:** one soft ambient shadow for floating surfaces,
  `0 8px 30px rgba(17,24,39,0.10), 0 1px 3px rgba(17,24,39,0.05)`. No
  coloured glows.

## Components

### Customer popup (`PopupCard.tsx`)

A contact sheet:
- **Header:** initials avatar (orange tint), name, then contract reference
  (tap to copy, with a tick on success) and area.
- **Rows** separated by hairlines, each with a leading icon, a label over
  the value, and trailing content:
  - **PAR Status:** the badge, plus "Priority visit" for PAR 90+;
  - **Phone:** one row per number, with round WhatsApp and Call buttons;
  - **Supa Partner:** the name, with the distance or "No GPS" on the right.
- **One primary button:** "Route to Supa Partner", only when partner GPS
  exists.

Empty states always say why: "No number on file", "No GPS".

### Route card (`RouteCard.tsx`)

Floating at the top of the map, below the nav bar:
- a from/to timeline with both names, and a close button;
- a segmented **Walk / Bike / Drive** control, each tab with its own time
  (shimmer while loading);
- the big duration, distance and estimated arrival, plus the straight-line
  distance;
- alternative-route chips;
- the solid **Start navigation** button.

### Route on the map

- The selected route is drawn in brand orange. Bike and Drive are solid
  with a white outline; Walk is dotted.
- Alternatives are grey and tappable.
- Short grey dotted connectors run from the road to each exact point.
- The customer is a white dot with an orange ring; the partner is a solid
  orange dot with a name tooltip.
- The route sits above the customer dots (pane z-index 460).

### Admin

- **Summary tiles** at the top of each section: label, big number, sub-line.
- **Left column** for actions (upload, create), **right column** for the
  data (table or grouped list).
- **Tables:** sticky header, fixed column widths, ellipsis truncation; at
  most 200 rendered rows with "search to narrow".
- **Lists:** group by team (collapsed by default, Unassigned open); one
  dropdown per row instead of Assign/Remove buttons; 30 px icon buttons
  with hover labels.
- **Destructive actions** go in a separate red-bordered **Danger zone**.

## Don'ts

- **No gradients, glows or tinted whole-card backgrounds.**
- **No white text on SupaMoto orange.**
- **No pure black text on the map UI;** use `onSurface`.
- **No PAR colour used for anything except PAR status.**
- **No text under 11 px, and no tap target under about 38 px.**
- **No emojis in UI copy.** Labels are plain, short and literal: "PAR
  Status", not "Payment status: paying on time".
- **No HTML strings in Leaflet tooltips;** use text nodes.
