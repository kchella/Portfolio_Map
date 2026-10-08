# PAR Map — staff guide

For SupaMoto field staff and admins. No technical knowledge needed.

## Getting access

1. Open the PAR Map link on your phone and tap **Register**, or **Continue
   with Google**.
2. Use your work email. Choose the role closest to yours.
3. You'll see **waiting for approval**. That's normal: an admin has to
   approve every new account before it can see customers. Message an admin
   (Chella) to approve you.
4. Once approved, sign in and the map opens.

Forgot your password? Tap **Forgot password?** on the sign-in screen and
enter your email. Open the link in the email **on the same phone and
browser**, then choose a new password. If the link says it can't be used,
request a new one.

You only sign in once per phone. The map stays signed in until you tap
sign out.

## Reading the map

Each dot is a customer, coloured by how late their payments are:

| Colour | Status | Meaning |
|---|---|---|
| Green | On time | Paying as agreed |
| Yellow | PAR 1–30 | 1–30 days overdue |
| Orange | PAR 31–60 | 31–60 days overdue |
| Red | PAR 61–90 | 61–90 days overdue |
| Dark red | PAR 90+ | More than 90 days overdue: **priority visit** |

The coloured outlines are your team areas (boundaries). Circles show areas
within a set distance of a shop or warehouse.

**Find a customer:** type their name, contract number or phone number in
the search bar. If only one customer matches, the map goes straight to
them.

**Show only some customers:** use the PAR filters in the side panel, for
example only PAR 90+, to plan priority visits.

## The customer card

Tap a dot to open the customer's card:

- **PAR Status:** how overdue they are.
- **Phone:** tap the phone button to call, or the chat button to open
  WhatsApp.
- **Contract number:** tap it to copy it, for example into a message.
- **Supa Partner:** who the customer belongs to, and how far away they are
  in a straight line.

## Getting directions to the Supa Partner

1. On the customer card, tap **Route to Supa Partner**.
2. Choose **Walk**, **Bike** or **Drive** at the top. Each shows its travel
   time.
3. The route appears on the map. If there's more than one way, tap another
   option to compare.
4. Tap **Start navigation** to open Google Maps with turn-by-turn
   directions.
5. Tap **×** to close the route.

If the card says **No GPS**, that partner's location hasn't been recorded
yet. Tell an admin so it's added to next week's data.

## Tips for the field

- The map shows **last week's import**. A customer who paid yesterday may
  still show as overdue until the next upload.
- On a weak connection, give the map a moment on first load; after that,
  moving around and filtering work without reloading.
- Wrong location or wrong status? Send the **contract number** to an admin.
  Don't guess; it gets fixed in the source data.

---

## For admins

### Approving people

Admin → **Users & Access**. New accounts show as **Pending**:
- **Approve** gives map access.
- **Make admin** gives admin access; give it only to people who manage
  data.
- **Revoke** removes access.

Check the email before approving: anyone can register.

### Weekly customer upload

1. Admin → **Customer Data** → **Download CSV template** the first time,
   to see the columns.
2. Drop the weekly export on the upload box, check the preview, and tap
   **Sync to database**.
3. Read the result. It says how many customers were synced and how many
   were skipped for missing or invalid GPS.
4. Check the **Supa Partner GPS** bar: customers without partner GPS get no
   distance or route.

The upload **replaces** all customers. Don't close the page until it
finishes.

### Boundaries and teams

- Admin → **Boundary Layers**: upload KMZ/KML, name and colour it, and pick
  its team from the dropdown on the layer's row.
- Lock official boundaries so field staff can't hide them.
- Admin → **Buffer Circles**: upload a CSV of Name, Latitude, Longitude and
  set the radius.
