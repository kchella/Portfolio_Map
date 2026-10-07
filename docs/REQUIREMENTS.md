# Requirements

What each feature must do, written so it can be checked. Status is as of
2026-10-07: **Done** (built and checked), **Partial** or **Open**. When a
feature changes, update its entry in the same PR.

Users: **field staff** (`user` role) on phones outdoors on weak data, and
**admins** who load data and manage access.

---

## R1 — Sign-in and approval · Done (reset password Open)

- Anyone can register with email or Google; the new account is `pending`.
- A `pending` account that signs in is signed out and told it's waiting for
  approval.
- An admin approves (`user`), promotes (`admin`) or revokes (`pending`) in
  Admin → Users & Access, and can't change their own role there.
- `/map` and `/admin` redirect to `/login` without a session; `/admin`
  needs `admin`.
- **Done when:** a pending account gets 0 rows from every PAR Map table
  with its own token, and an approved viewer gets data but can't write.
- **Open:** forgot-password sends nothing (audit M5); email confirmation is
  off (audit H2).

## R2 — Portfolio map · Done

- Every customer with valid GPS is a dot coloured by PAR bucket: on time
  green, 1–30 yellow, 31–60 orange, 61–90 red, 90+ dark red
  (`src/types/par.ts`).
- PAR 90+ customers are flagged **Priority visit**.
- Filter by PAR bucket; search by name, contract reference or phone. A
  single match flies the map to the customer and opens their popup.
- Five map styles (Light, Streets, Outdoors, Dark, Night); the choice and
  filters are remembered on the device.
- **Done when:** around 1,600+ markers pan and zoom smoothly on a mid-range
  phone.

## R3 — Customer popup · Done

- Shows the customer's initials, name, contract reference (tap to copy)
  and area.
- **PAR Status** row with the coloured status pill; "Priority visit" for
  PAR 90+.
- One row per phone number, each with **WhatsApp** and **Call** buttons.
  Local numbers are converted to `260…` for WhatsApp.
- **Supa Partner** row with the straight-line distance, or "No GPS".
- **Route to Supa Partner** button, only when partner GPS exists.
- Field-ready: text at least 11 px, tap targets at least 38–40 px, fits
  300 px or narrower screens.

## R4 — Routes to the Supa Partner · Done

- Opens only on demand (button); closes the popup and fits the route in
  view.
- Walk, bike and drive times shown side by side, fetched in parallel;
  remembers the last mode.
- The selected route shows distance, duration and estimated arrival, plus
  the straight-line distance; alternative routes can be selected.
- A dotted connector shows the gap between the road and each exact
  location.
- **Start navigation** opens Google Maps directions for the selected mode.
- If routing fails, a dashed straight line is shown and the card says no
  route was found.
- **Open:** privacy review of sending coordinates to the routing server
  (audit M2).

## R5 — Boundary layers and teams · Done

- Admins upload KMZ, KML or GeoJSON; set name and colour; lock; assign to
  one team (or none) from a dropdown.
- Teams are collapsible groups (collapsed by default; Unassigned open), with
  search across all layers.
- Showing, hiding, renaming, recolouring and deleting update instantly
  without re-downloading every layer.
- Locked layers can't be hidden by field staff.
- **Open:** visibility is a shared column, so an admin hiding a layer hides
  it for everyone (audit L3).

## R6 — Buffer circles · Done

- Admin uploads a CSV with Name, Latitude, Longitude, and a radius in m or
  km.
- Each row becomes a 36-point geodesic circle, named on hover, with an
  optional centre pin.

## R7 — Weekly customer import · Partial

- Admin drops the CSV; a preview shows the first rows.
- Columns: Contract Reference, Name, Area, Latitude, Longitude, PAR
  Status, Phone, Phone 2, Supa Partner Code / Name / Latitude / Longitude.
  Legacy Lead Generator headers are accepted.
- Phone numbers are normalised; PAR status is normalised to the five
  values.
- Rows without customer GPS are skipped, and the result says how many and
  why. Missing partner GPS is stored as null.
- The import replaces all customers. Summary tiles, the Supa Partner GPS
  coverage bar and the searchable table update immediately.
- **Done when (open part):** a failed or interrupted import leaves the
  previous week's data intact. Today the delete and insert aren't one
  transaction (PM-001, audit M4).

## R8 — Admin overview · Done

- Customer Data: tiles (total, on time, in arrears, PAR 90+), status filter
  chips with counts, and a table showing the first 200 matches (search to
  narrow).
- Boundary Layers: tiles (layers, teams, on the map, unassigned).
- Danger zone: clear all customer data, with confirmation.

## Non-functional

- **Performance:** first load and interaction usable on 3G-class data in
  Lusaka; canvas markers; no per-marker network requests.
- **Security:** see `docs/security/SECURITY-AUDIT.md`. No customer data is
  readable without an approved account (verified 2026-10-04).
- **Accessibility:** contrast at AA for text, including orange buttons
  (dark text on orange).
