# FullCamper Backend

REST API for the FullCamper camper rental business. It serves two separate clients:

- **Customer site** (`../frontend`): catalog, bookings, payments, reviews, favorites.
- **Admin dashboard** (`../admin`): analytics and management of campers, bookings, customers, payments, reviews, coupons, inquiries and settings.

Stack: Node.js 20+, Express 5, TypeScript (strict), MongoDB + Mongoose 8, Zod 4, JWT in HTTP-only cookies, bcrypt, Multer + Cloudinary, Toss Payments, Helmet, CORS, pino, Vitest + Supertest.

See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the design, data model and booking rules.

---

## 1. Setup

### Requirements
- Node.js **20 or newer** (developed on 22).
- MongoDB **5.0+ running as a replica set**. Bookings use multi-document transactions, which MongoDB only supports on replica sets.
  - **MongoDB Atlas** (any tier, including free) works as-is.
  - **Local:** start `mongod --replSet rs0` once, then run `rs.initiate()` in `mongosh`. Use `mongodb://127.0.0.1:27017/fullcamper?replicaSet=rs0`.

### Install and configure
```bash
cd backend
npm install
cp .env.example .env      # then fill in the values
```

The minimum for local development:

```env
MONGODB_URI=<your replica-set connection string>
JWT_SECRET=<random string>
REFRESH_TOKEN_SECRET=<a different random string>
```

Generate secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

`MONGO_URL` from the previous backend's `.env` is still accepted as a fallback for `MONGODB_URI`.

### First run
```bash
npm run seed            # optional: sample categories, features, campers, camping places, coupon (development only)
SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_PASSWORD='StrongPass123' npm run create-admin
npm run dev             # http://localhost:8080/api/v1/health
```

Admins can't register publicly. `create-admin` bootstraps the first `SUPER_ADMIN`, who can then create other admins from the dashboard (`POST /api/v1/admin/admins`).

## 2. Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start with auto-reload (tsx watch) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server (`dist/server.js`) |
| `npm run typecheck` | Type-check source and tests |
| `npm test` | Run all tests (in-memory MongoDB; never touches your database) |
| `npm run seed` | Insert sample data into empty collections (refuses in production) |
| `npm run create-admin` | Create the first super admin |
| `npm run sync-indexes` | Build MongoDB indexes (run on each production deploy) |

In production, run the compiled scripts with `node dist/scripts/<name>.js`.

## 3. Production checklist
- `NODE_ENV=production`. Startup fails on weak or identical JWT secrets, the mock payment provider, or insecure cookies.
- `PAYMENT_PROVIDER=toss` with `TOSS_SECRET_KEY`.
- Serve over HTTPS. Set `TRUST_PROXY=1` behind a reverse proxy so rate limiting sees real client IPs.
- If the API and the apps are on different sites, set `COOKIE_SAME_SITE=none` (requires HTTPS). On the same site (e.g. `api.example.com` + `www.example.com`), keep `lax` and set `COOKIE_DOMAIN=.example.com` if needed.
- Run `node dist/scripts/sync-indexes.js` after each deploy (automatic index builds are off in production).
- Configure Cloudinary and SMTP.
- Register the Toss webhook URL: `POST https://<api>/api/v1/payments/webhooks/toss`.

## 4. API conventions

Base path: `/api/v1`

```jsonc
// success
{ "success": true, "message": "Campers retrieved", "data": [...], "meta": { "page": 1, "limit": 12, "total": 40, "totalPages": 4, "hasNextPage": true, "hasPrevPage": false } }
// error
{ "success": false, "message": "Validation failed", "errors": [{ "field": "body.email", "message": "Invalid email address" }] }
```

- **Auth:** HTTP-only cookies (`fc_access` / `fc_refresh` for customers, `fc_admin_access` / `fc_admin_refresh` for admins). Browser clients must send requests with `credentials: "include"` (axios: `withCredentials: true`). An `Authorization: Bearer` header is also accepted. When an access token expires (401), call the matching `/refresh` endpoint once, then retry.
- **Dates:** `YYYY-MM-DD` calendar days. `startDate` is the pickup day (inclusive); `endDate` is the return day (exclusive).
- **Money:** whole KRW integers. Every price is calculated on the server.
- **Lists:** `?page=1&limit=12` (max 100). Multi-value filters accept `a,b,c`.
- **Ids:** public catalog endpoints accept either an id or a slug.
- **Status codes:** 400 validation/business rule, 401 not authenticated, 403 forbidden, 404 not found, 409 conflict (e.g. dates taken), 413 file too large, 429 rate limited, 502 payment provider error, 503 uploads not configured.

## 5. Endpoints

### Public & customer (`/api/v1`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | – | Health and database status |
| GET | `/settings` | – | Public business settings (contact, pickup/return times, policies) |
| POST | `/auth/register` | – | Customer sign-up (rate limited) |
| POST | `/auth/login` | – | Customer login (rate limited) |
| POST | `/auth/refresh` | refresh cookie | Rotate tokens |
| POST | `/auth/logout` | – | Revoke session, clear cookies |
| POST | `/auth/forgot-password` | – | Email a reset link (same response for unknown emails) |
| POST | `/auth/reset-password` | – | `{ token, password }` |
| GET | `/auth/me` | customer | Current profile |
| PATCH | `/auth/me/password` | customer | Change password (signs out other devices) |
| GET / PATCH | `/members/me` | customer | Read / update profile |
| PUT | `/members/me/avatar` | customer | Upload avatar (multipart `avatar`) |
| GET | `/campers` | – | Catalog: `search, category, brand, company, region, licenseType, features, minPrice, maxPrice, minSeats, minSleeps, featured, startDate+endDate, sort (newest, price_asc, price_desc, rating, popular)` |
| GET | `/campers/filters` | – | Filter options (brands, companies, regions, licence types, price range) |
| GET | `/campers/compare?ids=a,b` | – | 2 to 4 campers side by side |
| GET | `/campers/:idOrSlug` | – | Camper detail (counts a view) |
| GET | `/campers/:idOrSlug/availability?from&to` | – | Booked date ranges for the calendar |
| GET | `/campers/:idOrSlug/reviews` | – | Published reviews and rating summary |
| GET | `/categories`, `/categories/:idOrSlug` | – | Categories with camper counts |
| GET | `/features` | – | Amenities |
| GET | `/camping-places`, `/camping-places/:idOrSlug` | – | Camping sites (with coordinates for the map) |
| POST | `/bookings/quote` | optional | Price quote and availability; no reservation |
| POST | `/bookings` | customer | Create a booking (PENDING, holds dates until payment) |
| GET | `/bookings` | customer | Own bookings (`status`, `scope=all|upcoming|past`) |
| GET | `/bookings/:id` | customer | Own booking detail |
| POST | `/bookings/:id/cancel` | customer | Cancel (refunds automatically if paid and within policy) |
| POST | `/payments/checkout` | customer | `{ bookingId }` → orderId, amount, orderName for the payment widget |
| POST | `/payments/confirm` | customer | `{ transactionId, orderId, amount }` after the provider redirect |
| GET | `/payments`, `/payments/:id` | customer | Payment history |
| POST | `/payments/webhooks/toss` | provider | Webhook (verified by re-fetching from Toss) |
| POST | `/coupons/validate` | optional | Quote body + `couponCode` → discount |
| GET | `/reviews/me` | customer | Own reviews |
| POST | `/reviews` | customer | `{ bookingId, rating, comment }`. Completed bookings only, one review each |
| PATCH / DELETE | `/reviews/:id` | customer | Edit / delete own review |
| GET | `/favorites`, `/favorites/ids` | customer | Favorite campers / ids for heart icons |
| POST / DELETE | `/favorites/:camperId` | customer | Add (idempotent) / remove |
| GET | `/notifications` | customer | `?unread=true` |
| GET | `/notifications/unread-count` | customer | Badge count |
| PATCH | `/notifications/:id/read`, `/notifications/read-all` | customer | Mark read |
| DELETE | `/notifications/:id` | customer | Delete |
| POST | `/inquiries` | optional | Contact form / camper question (`camperId` optional) |

### Admin dashboard (`/api/v1/admin`; all routes require an admin session except login/refresh/logout)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login`, `/auth/refresh`, `/auth/logout` | Admin session |
| GET / PATCH | `/auth/me` | Admin profile |
| PATCH | `/auth/me/password` | Change password |
| GET | `/dashboard/overview` | Revenue, bookings by status, average value, customers, campers, open inquiries, recent bookings/customers, upcoming reservations |
| GET | `/dashboard/revenue?from&to&interval=day|week|month` | Net revenue time series (gaps filled with zeros) |
| GET | `/dashboard/bookings?from&to&interval` | Bookings created / confirmed / cancelled per period |
| GET | `/dashboard/top-campers?from&to&limit` | Campers ranked by booked revenue |
| GET / POST | `/campers` | List (all statuses, same filters plus `status`) / create |
| GET / PATCH / DELETE | `/campers/:id` | Detail / update / delete (only if never booked) |
| PATCH | `/campers/:id/status` | AVAILABLE, UNAVAILABLE, MAINTENANCE, ARCHIVED |
| POST | `/campers/:id/images` | Upload up to 10 images (multipart `images`) |
| PATCH | `/campers/:id/images/order` | `{ imageIds }`; the first is the cover |
| DELETE | `/campers/:id/images/:imageId` | Remove image (also from Cloudinary) |
| GET / POST / PATCH / DELETE | `/categories[/:id]` | Category management; `PUT /categories/:id/image` |
| GET / POST / PATCH / DELETE | `/features[/:id]` | Feature management |
| GET / POST / PATCH / DELETE | `/camping-places[/:id]` | Camping places; `POST /:id/images`, `DELETE /:id/images/:imageId` |
| GET | `/bookings` | `status, search, camperId, customerId, from, to, sort` |
| GET | `/bookings/:id` | Detail with customer and status history |
| PATCH | `/bookings/:id/status` | `{ status, reason?, refund? }` via the lifecycle rules |
| PATCH | `/bookings/:id/note` | Internal note |
| GET | `/payments`, `/payments/:id` | `status, bookingId, customerId, from, to, search` |
| POST | `/payments/:id/refund` | `{ amount?, reason }`; omit amount for the full remaining balance |
| GET | `/customers`, `/customers/:id` | Search customers; detail with booking and spend stats |
| PATCH | `/customers/:id/status` | ACTIVE / BLOCKED (blocking signs them out immediately) |
| GET / POST / PATCH | `/admins[/:id]` | **SUPER_ADMIN only.** Manage administrator accounts |
| GET / PATCH / DELETE | `/reviews[/:id]` | Moderate (PUBLISHED / HIDDEN), reply, delete |
| GET / POST / PATCH / DELETE | `/coupons[/:id]` | Coupon management (used coupons are deactivated instead of deleted) |
| GET / POST | `/notifications` | Own notifications / send one to a member |
| GET / PATCH | `/notifications/unread-count`, `/:id/read`, `/read-all` | Read state |
| GET / PATCH | `/inquiries[/:id]` | Contact messages: status and reply |
| GET / PATCH | `/settings` | Business settings (hold time, cancellation window, lead time, weekend nights, ...) |

## 6. Payment flow (Toss Payments)

1. Customer creates a booking → `POST /bookings` (dates held for `bookingHoldMinutes`, default 30).
2. Frontend calls `POST /payments/checkout` and opens the Toss widget with the returned `orderId`, `amount` and `orderName`, using the **client key** from the frontend's own config.
3. Toss redirects to the success URL with `paymentKey`, `orderId` and `amount`. The frontend calls `POST /payments/confirm` with `{ transactionId: paymentKey, orderId, amount }`.
4. The server checks the amount, re-reserves the dates, captures through Toss, and only then marks the payment `PAID` and the booking `CONFIRMED`.

For local development `PAYMENT_PROVIDER=mock` accepts any `transactionId`. Ids starting with `fail_` simulate a declined card.

## 7. Tests

```bash
npm test
```

Each test file gets its own in-memory MongoDB replica set (`mongodb-memory-server`, MongoDB 6.0.14). `.env` is never loaded in tests, and the connection layer refuses non-local databases when `NODE_ENV=test`.

## 8. Project structure

```
src/
  app.ts, server.ts      Express app factory / process entry (graceful shutdown, expiry sweep)
  config/                env validation, cookie settings
  constants/             enums, HTTP codes, messages
  database/              connection + transaction helper
  models/                Mongoose schemas and indexes
  interfaces/            TypeScript shapes of stored documents
  validators/            Zod schemas for body, query and params
  middleware/            auth, validation, errors, security, uploads
  services/              business logic (no Express types)
    payment-providers/   Toss + mock provider behind one interface
  controllers/           thin HTTP handlers
  routes/                public/customer routers + admin/ routers
  utils/                 dates, pagination, responses, jwt, logger...
  scripts/               seed, create-super-admin, sync-indexes
tests/                   Vitest + Supertest suites
```
