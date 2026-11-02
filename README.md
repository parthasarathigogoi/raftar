# RAFTAR

**Travel. Live. Relive.**

RAFTAR is a premium Northeast India travel, photography and filmmaking brand. This build runs on an **event-based group travel** model: admins publish complete trips, and customers register and pay to join directly. There are no destination enquiries or manual quotations for standard trips.

- Public site: `/` (brand), `/events` (bookable departures), `/events/[slug]` (trip detail + registration), `/login`, `/dashboard`
- Admin studio: `/admin` (all trip, registration, finance and media management)
- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, MongoDB + Mongoose 9, Zod 4, JWT sessions (`jose`), Razorpay

## Event-based booking flow

1. Admin creates a **TripEvent** (itinerary, dates, seats, pricing, media add-ons) and publishes it.
2. The event appears publicly on `/events` while its status is `published`, `registration_open` or `full`.
3. A customer opens the trip, reads the itinerary and terms, picks travellers and media add-ons, enters traveller details and consents to checkout.
4. The server atomically reserves seats, creates a Razorpay order and returns the order to the browser.
5. The customer pays through Razorpay. The server verifies the signature (and webhooks) before the booking is confirmed and the held seats are promoted to booked seats.
6. The confirmed booking, payment history and (later) private media gallery appear in `/dashboard`.

Bookings are rejected for events that are unpublished, cancelled, completed, or outside the registration window.

## What was implemented

- **Models** — `TripEvent`, `TripBooking`, `Payment`, `Partner`, `Expense`, `Notification`, plus existing `MediaProject`, `MediaAsset`, `CustomerConsent`, `User`, `AuditLog`.
- **Trip event management** — full editor covering every field in the spec, with create / edit / preview / publish / unpublish / open + close registration / mark full / complete / cancel / duplicate.
- **Seat inventory** — `seatsBooked` + `seatsReserved` counters on the event. Holds use an atomic `$expr` capacity guard so two users cannot take the same final seat; expired holds are released automatically (`BOOKING_HOLD_MINUTES`); seats are confirmed only after verified payment.
- **Payments (Razorpay, India)** — server-side order creation, HMAC-SHA256 signature verification (`crypto.timingSafeEqual`), webhook processing with duplicate-event protection, transaction references, receipts, and failure/refund handling. Payment success is never trusted from the browser.
- **Admin dashboard** — Dashboard, Trip Events, Registrations, Bookings, Customers, Partners, Payments, Expenses, Finance, Media Studio, Stories, Staff, Notifications, Settings, with live statistics (published trips, upcoming trips, open registrations, participants, confirmed bookings, pending payments, available seats, collected revenue, expenses, estimated profit) and trip-wise reports.
- **Registration management** — per-event participant lists, search, payment-status filters, traveller details, payment history, CSV export, announcements, cancellations, refunds, and audit-logged manual registration.
- **Photography & filmmaking** — configurable per-event media add-ons, crew assignment (photographers / videographers / editors), media projects created for confirmed bookings, private delivery galleries, and capture consent kept separate from marketing consent.
- **Customer dashboard** — My Trips, My Bookings, Payment History, Traveller Details, My Media Gallery, Notifications and Profile; customers only ever see their own records.
- **Tests** — dependency-free unit tests for the booking maths run with `npm test`.

All dashboard figures come from live aggregates — no seeded or placeholder numbers.

## Routes

### Customer / public pages

| Route | Purpose |
| --- | --- |
| `/events` | Published departures (upcoming + past) |
| `/events/[slug]` | Full trip detail, itinerary, terms, media add-ons and the registration panel |
| `/login` | Sign in / create an RAFTAR account |
| `/dashboard` | Customer dashboard (all customer-only sections) |
| `/gallery` | Private gallery entry point |

### Admin pages (`/admin`)

`/admin` (Dashboard) · `/admin/trips` · `/admin/trips/new` · `/admin/trips/[id]` · `/admin/registrations` · `/admin/bookings` · `/admin/customers` · `/admin/partners` · `/admin/payments` · `/admin/expenses` · `/admin/finance` · `/admin/media-studio` · `/admin/stories` · `/admin/staff` · `/admin/notifications` · `/admin/settings`

### API routes

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` | POST / GET | Account + session |
| `/api/trips`, `/api/trips/[slug]` | GET | Public trip list / detail |
| `/api/trips/[slug]/register` | POST | Create booking hold + Razorpay order |
| `/api/payments/config` | GET | Whether Razorpay is configured |
| `/api/payments/verify` | POST | Verify signature and confirm booking |
| `/api/payments/webhook` | POST | Razorpay webhook (deduplicated) |
| `/api/bookings`, `/api/bookings/[id]` | GET / DELETE | Customer bookings; self-cancel |
| `/api/notifications` | GET / PATCH | Customer notifications; mark read |
| `/api/media/gallery` | GET | Private, ownership-filtered gallery |
| `/api/profile` | GET / PATCH | Customer profile |
| `/api/admin/trips`, `/[id]`, `/[id]/actions`, `/[id]/announcements` | GET / POST / PATCH | Trip event CRUD, lifecycle actions, announcements |
| `/api/admin/bookings`, `/[id]`, `/[id]/actions`, `export` | GET / POST | Registrations, manual booking, cancel/refund/record payment/complete, CSV export |
| `/api/admin/stats`, `/finance`, `/reports`, `/customers`, `/payments` | GET | Dashboard statistics and reports |
| `/api/admin/partners`, `/expenses`, `/media`, `/staff`, `/notifications` | GET / POST / PATCH / DELETE | Crew, expenses, media projects, team, broadcasts |

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `AUTH_SECRET` | Yes | Long random string used to sign session JWTs |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL, e.g. `http://localhost:3000` |
| `RAZORPAY_KEY_ID` | Yes for online payments | Razorpay key id |
| `RAZORPAY_KEY_SECRET` | Yes for online payments | Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Yes for webhooks | Webhook signing secret |
| `BOOKING_TAX_PERCENT` | No | GST % added to the taxable amount. Defaults to `0` (no tax is invented) |
| `BOOKING_HOLD_MINUTES` | No | Minutes a seat is temporarily held during checkout. Defaults to `15` |

If the Razorpay keys are **not** configured, the checkout shows a clear configuration message and the admin Settings page flags payments as disabled. Payments are never simulated.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Promote the first admin (registration creates customers by default):

```bash
# after creating an account through /login, set its role in MongoDB
mongosh "$MONGODB_URI" --eval 'db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })'
```

## Create and publish the first trip

1. Sign in and open **Admin → Trip Events → New trip** (`/admin/trips/new`).
2. Fill in the essentials (title, destination, short + full description, cover image), dates, the day-by-day itinerary, inclusions/exclusions, practical details, packing list and policies.
3. Set **price per person**, **total seats**, optional child pricing and the registration window, and add any photography / filmmaking media add-ons.
4. Click **Create trip** (saved as `draft` — not publicly visible).
5. From `/admin/trips`, use **Publish** to make it live. The trip now appears on `/events` and customers can register. You can unpublish, open/close registration, mark full, complete, cancel or duplicate it at any time.

## How a customer registers and pays

1. The customer opens `/events`, chooses a departure and opens `/events/[slug]`.
2. They read the itinerary and terms, then in the **Register** panel choose adults/children and any photography/filmmaking add-ons.
3. They enter traveller details and the booking contact, tick capture consent, marketing consent and the terms, and review the estimated total.
4. **Proceed to payment** calls `POST /api/trips/[slug]/register`: the server validates the event is bookable, atomically holds the seats, snapshots the price, creates the booking (`pending_payment`) and returns a Razorpay order.
5. The Razorpay checkout opens. On success the browser posts the signature to `POST /api/payments/verify`; the server verifies it (or receives the webhook), promotes the held seats to booked seats and marks the booking `confirmed`. Duplicate verifications/webhooks are ignored.
6. The customer lands on `/dashboard`, where the trip, payment history, traveller details and — once edited and approved — their private media gallery are available.

## Tests

```bash
npm test        # node --test — pure booking maths, formatting and reference helpers
npm run lint    # tsc --noEmit
```
