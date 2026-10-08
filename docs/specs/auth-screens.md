# Spec: sign-in screens

**Status:** built on `feat/auth-screens` (2026-10-08), not yet deployed.
**Approved by:** Chella, 2026-10-08, from the SupaTicket sign-in screenshot.

## Decision

Everyone signs in. Field staff (`user`) see the map; only admins reach
`/admin`, where data is loaded, changed or deleted. A map without sign-in
was considered and rejected: the browser reads customers straight from
Supabase with the public key, so a map open to visitors means customer data
open to the internet (audit C1, DEC-001).

Unlike SupaTicket, PAR Map stays **self-service**: anyone can create an
account and reset their own password. New accounts are still `pending`
until an admin approves them.

## Look

The SupaTicket sign-in card, dark, so every SupaMoto app greets staff the
same way:

- `#101010` page, `#1a1a1a` card with a `#2c2c2c` hairline, 12 px radius,
  32 px padding (24/20 px under 420 px wide), max width 448 px.
- SupaMoto logo (56 px), app name, one-line subtitle.
- Fields: 12 px label, 44 px input group with a leading icon, tangerine
  focus ring.
- One solid primary action (`#fb9f38`, dark text); Google is an outlined
  secondary under an "or" divider.
- Poppins, loaded only on these screens.
- Tokens: `A` in `src/styles/theme.ts`. Shared parts:
  `src/components/auth/AuthShell.tsx`.

## Screens

| Route | Purpose | States |
|---|---|---|
| `/login` | Email + password, or Google | error (bad password, pending, no admin access), "password updated" note |
| `/register` | Name, email, role, password + confirm, or Google | sent confirmation email / created, awaiting approval |
| `/forgot-password` | Sends the reset email | sent (same message whether or not the address has an account), rate-limited |
| `/reset-password` | New password + confirm | checking link, link invalid (expired, used, other browser), saved, then back to `/login` |
| `/auth/callback` | Google / email-confirm landing | spinner on the dark canvas |

"Remember me" was removed: it did nothing, and sessions persist until sign
out anyway.

## Done when

- A reset email arrives, the link opens `/reset-password`, a new password
  saves, and signing in with it works.
- The same link opened a second time, or in another browser, shows "This
  link can't be used" with a way to request a new one.
- `/forgot-password` shows the same result for a registered and an
  unknown address.
- Register shows "Check your email" when Confirm email is on, and "Account
  created, awaiting approval" when it's off (audit H2).
- Text at least 11 px, tap targets at least 40 px, fits a 320 px screen.

## Needs a dashboard change before it works in production

Supabase → Authentication → URL Configuration → Redirect URLs must include
`https://ecs-maps-zambia.vercel.app/reset-password` (and
`http://localhost:3000/reset-password` for local testing). Without it,
Supabase sends the link to the Site URL instead.
