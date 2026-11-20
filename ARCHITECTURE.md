# FullCamper Architecture

FullCamper is a camper rental business made of three independent applications:

```
fullcamper/
├── backend/    Node.js + Express + TypeScript + MongoDB REST API (this document's focus)
├── admin/      React + TypeScript admin dashboard (separate app, consumes /api/v1/admin)
├── frontend/   Customer site (currently the JavaScript app in camper/)
├── ARCHITECTURE.md
├── PROJECT_LOG.md
└── README.md
```

Both clients talk to the same backend over JSON. They share no code and no dependencies.

---

## 1. Requirements source

The data model is based on the existing customer frontend (`camper/`), the only product specification available:

| Frontend feature | Backend support |
|---|---|
| Ranges: **Motors, Caravan, Tuning, Used car** | `Category` (admin-managed; seeded with these four) |
| Camper card: name, cost, type, licence, people, date, company, location, rating | `Camper`: `name`, `pricing`, `baseVehicle`, `licenseType`, `capacity`, `modelYear`, `company`, `location.region`, `ratingAverage` |
| Detail text blocks + "Heating when driving" section | `description` + `highlights[{title, description}]` |
| Sidebar filters: cost from/to, brand, company, licence type, location, number of travellers | `GET /campers` filters + `GET /campers/filters` |
| Search box, grid/list toggle | `search` param, pagination |
| Order / My orders / Cart ("Place order", card form) | `Booking` + `Payment`. Card data is handled by Toss, never by us |
| Compare page | `GET /campers/compare` |
| Detail tabs: Item reviews, Q&A, Contact | `Review`, `ContactInquiry` (with optional `camper`) |
| Camping places with Kakao map coordinates, facilities, hours | `CampingPlace` |
| Sign-up: first/last name, email, phone, password | `Member` (customer registration) |
| "Viewed: 135" | `Camper.viewCount` |

**Figma:** no Figma file link was supplied, so the design could not be inspected. Field names follow the frontend. Once a link is available, the camper schema should be checked against it; `specifications`, `highlights` and `extras` are designed to absorb additional design fields without schema churn.

**Terminology note:** the frontend's "Motors" and "Used car" pages show purchase-style prices (e.g. 90,200,000 KRW). Per the business brief this is a **rental** platform, so all campers carry daily rental pricing.

## 2. Layered MVC

The structure follows the BURAK project's philosophy (class-based services owning their model, enums in constants, a central error type) with a few deliberate improvements:

```
HTTP request
   │
   ▼
routes/        endpoint + middleware composition (auth → validate → controller)
   │
middleware/    auth (JWT cookie), validate (Zod), upload (Multer), security, errors
   │
controllers/   read validated input → call one service → sendSuccess()
   │
services/      ALL business rules, DB access, calculations, transactions
   │           (never imports express)
   ▼
models/        Mongoose schemas, indexes, schema-level validation
```

| Decision | Reason |
|---|---|
| Services are singletons (`export const bookingService = new BookingService()`) | Same as BURAK's `new MemberService()` but created once |
| Controllers never touch models directly (one small exception: the admin "send notification" recipient lookup) | Thin controllers, testable services |
| `AppError` + central `errorHandler` | No per-controller try/catch (Express 5 forwards async errors). Raw Mongo errors are never returned |
| Validation via `validate({ body, query, params })` + `getValidated()` | Controllers receive typed, coerced data with no casts |
| Separate `/api/v1/admin/*` tree with one `requireAdmin` guard | The admin surface is easy to audit; public routers stay free of admin logic |
| Field names are plain camelCase (`firstName`, not BURAK's `memberNick` prefixes) | Prefixes are redundant inside typed documents |
| Dependency direction `Payment → Booking → (Availability, Coupon, Pricing, Settings, Notification)` | No circular imports. Payment owns money-related booking transitions |
| Socket.IO not used | Notifications are polled (`/notifications/unread-count`). The dashboard doesn't need sub-second push, and polling avoids sticky sessions. Can be added on top of `NotificationService` |

## 3. Data model

```
Member (role: SUPER_ADMIN | ADMIN | CUSTOMER)
  ├── Session            refresh-token sessions (hashed, TTL-expired)
  ├── Booking ──────────► Camper ──► Category
  │     │   └──► Coupon     │  └───► Feature[]
  │     ├── Payment[]       ├── Review (1 per completed Booking)
  │     └── Review          └── Favorite (unique Member+Camper)
  ├── Favorite
  ├── Notification       one row per recipient
  └── ContactInquiry ──► Camper (optional)
CampingPlace              standalone content
BusinessSettings          single document (key = "business")
```

| Collection | Key fields | Indexes / constraints |
|---|---|---|
| **members** | firstName, lastName, email, phone, passwordHash (hidden), role, status, avatar, tokenVersion (hidden) | unique email; unique phone (partial: only when set); role+createdAt |
| **sessions** | member, audience, tokenHash, expiresAt, revokedAt | unique tokenHash; TTL on expiresAt |
| **categories** | name, slug, image, isActive, sortOrder | unique slug |
| **features** | name, slug, group, icon | unique slug |
| **campers** | name, slug, category, features[], description, highlights[], brand, company, baseVehicle, modelYear, licenseType, capacity{seats,sleeps}, specifications{dimensions, fuelType, transmission, engine, mileage}, location{region,city,address,pickupNotes}, pricing{dailyRate, weekendDailyRate, cleaningFee, securityDeposit}, extras[], min/maxNights, images[], status, isFeatured, ratingAverage/Count, viewCount, bookingLockVersion (hidden) | unique slug; status+category+price; status+featured+rating; status+region; status+createdAt; features |
| **bookings** | bookingNumber, customer, camper, startDate, endDate, nights, status, price (frozen breakdown), coupon, paymentStatus, holdExpiresAt, driver, notes, statusHistory[] | unique bookingNumber; **camper+status+startDate+endDate** (availability); customer+createdAt; status+startDate; status+holdExpiresAt |
| **payments** | booking, customer, provider, orderId, amount, status, transactionId, method, receiptUrl, paidAt, refundedAmount, refunds[] | unique orderId; unique transactionId (partial); status+paidAt |
| **coupons** | code, discountType, discountValue, maxDiscountAmount, minBookingAmount, startsAt, expiresAt, usageLimit, usageCount, perCustomerLimit, isActive | unique code |
| **reviews** | booking, camper, customer, rating, comment, status (PUBLISHED/HIDDEN), adminReply | **unique booking**; camper+status+createdAt |
| **favorites** | member, camper | **unique member+camper** |
| **notifications** | recipient, type, title, message, data, isRead | recipient+isRead+createdAt |
| **contactinquiries** | name, email, phone, subject, message, camper?, member?, status, adminReply | status+createdAt |
| **campingplaces** | name, slug, region, facilities[], coordinates, workingHours, images[] | unique slug |
| **businesssettings** | bookingHoldMinutes, freeCancellationDays, minLeadDays, maxAdvanceDays, pickup/returnTime, weekendNights | unique key |

**Design notes**
- Money is stored as whole **KRW integers**. Percentage discounts round down.
- A booking stores a **frozen price breakdown**, so later price edits never change existing bookings.
- Camper rating is **denormalized** onto the camper (recomputed on every review change and moderation) so catalog sorting needs no join. Hidden reviews don't count.
- Campers with bookings can't be deleted, only **archived**; categories in use can't be deleted; used coupons are **deactivated** instead of deleted. History stays intact.

## 4. Authentication

- Passwords: bcrypt (12 rounds by default). Login timing is equalised for unknown emails.
- **Access token:** JWT (HS256, 15 min), claims `sub`, `role`, `aud` (customer|admin), `ver` (token version).
- **Refresh token:** JWT signed with a separate secret, bound to a `Session` document that stores only its SHA-256 hash. Each refresh **rotates** the session. Reuse of an old token revokes all of that member's sessions.
- Both tokens live in **HTTP-only cookies** and are never in JSON bodies. The refresh cookie is path-scoped to the auth routes.
- Customer and admin sessions use **different cookie names and token audiences**: a customer token is rejected by admin routes, and admin accounts can't log in through the customer login.
- Every request re-checks the member in the database: blocked members and changed passwords take effect **immediately**. Incrementing `tokenVersion` invalidates all outstanding access tokens.
- Password reset: random 32-byte token, stored hashed, valid for 30 minutes, single use. Identical response for unknown emails.
- Admin accounts are created only by a SUPER_ADMIN (or by the `create-admin` CLI for the first one). A super admin can't change their own role or status.
- **CSRF:** cookies are `SameSite=Lax` by default, and every non-GET request with an `Origin` header outside the allow-list (`CLIENT_URL`, `ADMIN_URL`) is rejected.
- **Rate limits:** 10 requests / 15 min per IP on login, register, password reset and contact; 300 / min for the whole API.

## 5. Booking system

### Date convention
- Dates are calendar days `YYYY-MM-DD`, stored as UTC midnight.
- `startDate` = pickup day (**inclusive**). `endDate` = return day (**exclusive**).
- `nights = endDate − startDate`. June 10 → June 15 is 5 nights.
- **Overlap:** `existing.start < requested.end AND existing.end > requested.start`
  - June 10–15 vs June 12–17 → conflict
  - June 10–15 vs June 15–20 → allowed (return in the morning, next pickup in the afternoon)
- "Today" is evaluated in **Asia/Seoul**.

### Rules checked on the server
Pickup ≥ today + `minLeadDays` (default 1); pickup ≤ today + `maxAdvanceDays`; camper `minNights` ≤ nights ≤ `maxNights`; camper must be `AVAILABLE`; extras must belong to the camper and respect `maxQuantity`; coupon rules. The client never sends prices.

### Pricing
`rentalSubtotal = weekdayNights × dailyRate + weekendNights × weekendDailyRate` (weekend nights default to Fri and Sat)
`subtotal = rentalSubtotal + cleaningFee + extras` (extras are per booking or per night × quantity)
`total = subtotal − couponDiscount`. The security deposit is shown but collected at pickup, not online.

### Which bookings block the calendar
`CONFIRMED`, `ACTIVE`, and `PENDING` **while `holdExpiresAt` is in the future**. An abandoned checkout releases its dates automatically. A sweep every 5 minutes then marks it `CANCELLED` and returns its coupon use.

### Double-booking prevention (concurrency)
Checking for overlaps and then inserting is **not** safe on its own: two concurrent transactions can both read "no conflict" from their snapshots and both insert (write skew). So every booking transaction first does

```
campers.updateOne({ _id }, { $inc: { bookingLockVersion: 1 } }, { session })
```

All bookings for the same camper now write the same document, so MongoDB aborts all but one with a write conflict. `withTransaction` retries the losers; on retry they see the committed booking and fail with **409**. Different campers don't contend at all. The same lock is taken when a booking is confirmed (admin or payment), because an expired hold may have lost its dates in the meantime. Coupon usage is reserved in the same transaction with a conditional `$inc`, so `usageLimit` can't be exceeded.

Verified by tests: 8 simultaneous overlapping requests → exactly 1 booking; 3 simultaneous single-use coupon redemptions → exactly 1.

### Lifecycle

```
PENDING ──payment / admin confirm──► CONFIRMED ──pickup (on/after start)──► ACTIVE ──return──► COMPLETED
   │                                     │
   ├─ customer / admin cancel ──► CANCELLED ◄── customer (≥ freeCancellationDays before pickup) / admin
   ├─ admin reject ────────────► REJECTED
   └─ hold expires ────────────► CANCELLED (automatic)
```

Transitions are enforced by a table in `Booking.service.ts`. Each one is a conditional update on the current status, so two simultaneous changes can't both apply. Every change is appended to `statusHistory` and the customer is notified.

## 6. Payments

Provider: **Toss Payments** (KRW, Korean cards and easy-pay), behind a `PaymentProvider` interface. A `MockPaymentProvider` exists for development and tests and is **rejected at startup in production**.

1. `checkout` creates a `PENDING` payment with our own `orderId`; the amount comes from the booking.
2. The customer pays in the Toss widget (card data never reaches us).
3. `confirm`:
   - the amount must equal the stored amount (otherwise FAILED, and the provider is never called);
   - the dates are re-checked under the camper lock and the hold is extended;
   - the provider captures (Toss `POST /v1/payments/confirm`, with an idempotency key);
   - only then, in one transaction: payment → `PAID`, booking → `CONFIRMED`.
   - If the capture succeeded but the booking can't be confirmed (e.g. cancelled meanwhile), the money is **refunded automatically**. If that refund fails, admins get a "manual refund required" notification.
4. **Webhooks** are not trusted: the body only identifies the payment, whose real state is fetched from Toss.
5. **Refunds** (partial or full) go through the provider with idempotency keys; status becomes `PARTIALLY_REFUNDED` or `REFUNDED`. Customer cancellations refund first and then cancel, so a failed refund changes nothing.

Revenue = Σ (amount − refundedAmount) over paid, partially refunded and refunded payments.

## 7. File uploads

Multer memory storage → Cloudinary. JPEG, PNG, WEBP and AVIF only; 5 MB per file; 10 files per request; 20 images per camper. The MIME type is double-checked against the file's **magic bytes**. Files get random UUID names and are never written to local disk. Replaced or removed images are deleted from Cloudinary, and a failed batch upload cleans up what it already uploaded. Without Cloudinary credentials, upload endpoints return 503.

## 8. Admin analytics

All figures are live MongoDB aggregations: net revenue (total and last 30 days), bookings by status, average booking value (confirmed/active/completed), customers (total, new in 30 days), campers by status, open inquiries, recent bookings and customers, upcoming reservations, revenue and booking time series (day/week/month in Korean time, gaps zero-filled), and top campers by booked revenue. `$dateTrunc` requires MongoDB 5.0+.

## 9. Security summary

Helmet headers · CORS allow-list with credentials · Origin check for CSRF · HTTP-only, SameSite, Secure (prod) cookies · rate limits · bcrypt · hashed refresh and reset tokens · token rotation and reuse detection · immediate revocation · Zod validation of every input (strict bodies reject unknown fields such as `role` or `price`) · regex input escaped (no ReDoS) · 1 MB JSON limit · ownership enforced in queries (other customers' records return 404) · password and token fields hidden from JSON and redacted from logs · production config guards.

## 10. Testing

Vitest + Supertest against the real Express app and an isolated in-memory MongoDB **replica set** per test file (transactions are exercised for real). `.env` is never loaded in tests, and the DB layer refuses non-local URIs under `NODE_ENV=test`.
