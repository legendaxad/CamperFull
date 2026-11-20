# FullCamper Project Log

## 2026-11-20 — Backend rebuild (`backend/`, branch `feature/backend-typescript`)

### Phase 1 — Audit and architecture ✅
**Found:**
- `backend/` held a small JavaScript Express scaffold: signup/login/me only, mixed ESM and CommonJS (it would not start), JWT in a header, an `express-validator` stub, a broken todo route, and S3 helpers that were never used.
- `backend/.gitignore` contained the typo `node_moduls`, so **22,386 `node_modules` files were committed**.
- `camper/` is the customer frontend (React CRA, JavaScript). It uses mock data for Motors / Caravan / Tuning / Used car, camping places with Kakao map coordinates, compare and order pages, and a card form in the cart. Its only API call is `POST localhost:8080/auth/login`.
- The BURAK reference project (`IT/MIT/BURAK`) uses class-based services, an `Errors` class with `HttpCode`/`Message` enums, and enums/types under `libs/`.
- Figma: the account is reachable through MCP, but **no Figma file link was provided**, so no design could be inspected. Requirements were taken from the frontend.

**Decided:** see `ARCHITECTURE.md` (entities, relationships, date convention, locking strategy, Toss Payments, cookie auth with separate admin/customer sessions, no Socket.IO).

### Phase 2 — Foundation ✅
- Removed the legacy JS files (still in git history), fixed `.gitignore`, and untracked `node_modules`.
- TypeScript strict (+ `noUncheckedIndexedAccess`), Express 5, Mongoose 8, Zod-validated env with production guards, pino logging, Helmet, CORS allow-list, origin check, rate limiting, central error handler, standard response envelope, transaction helper.

### Phase 3 — Authentication ✅
- Customer register/login/logout/refresh/me/profile/avatar/change password/forgot and reset password.
- Admin login/logout/refresh/me/profile/password. SUPER_ADMIN-only admin management. `create-admin` CLI.
- HTTP-only cookies, refresh rotation with reuse detection, `tokenVersion` revocation, blocked-member checks.
- **Fix during testing:** password change originally revoked tokens by timestamp, which left valid a token issued in the same second (JWT `iat` has one-second precision). Replaced with a per-member `tokenVersion` counter.

### Phase 4 — Core business ✅
- Categories, features, campers (CRUD, archive, images, filters, search, sort, compare, filter options, availability calendar, view counter), camping places.
- Booking system: quote, create, history, detail, cancel, admin lifecycle, transactional per-camper lock, payment holds with automatic expiry, server-side pricing with weekday/weekend rates and extras.
- Reviews (completed bookings only, one each, rating recalculation, moderation), favorites (idempotent, unique).
- **Fix during testing:** an impossible date (`2026-13-01`) returned 500 because Zod still ran the cross-field "end after start" check on the invalid value. Date errors are now fatal, so that check never runs on bad input.

### Phase 5 — Business management ✅
- Payments: provider abstraction, Toss Payments adapter, mock provider, checkout/confirm with amount verification, compensation refund, webhook verification, partial and full refunds, refund-on-cancel.
- Coupons: percentage (with cap) and fixed discounts, validity window, usage limit (atomic), per-customer limit, minimum amount, release on cancel.
- Notifications (customer and admin, read/unread, polling). Contact inquiries / camper Q&A. Business settings.
- **Fix during testing:** a webhook for a payment unknown to the provider caused a 500. It's now acknowledged and ignored; provider outages return 502 so the provider retries.

### Phase 6 — Admin support ✅
- Dashboard overview, revenue and booking time series, top campers, all from live aggregations.
- Admin management endpoints with filtering, search, sorting and pagination for campers, bookings, payments, customers, admins, reviews, coupons, notifications, inquiries, categories, features, camping places and settings.

### Phase 7 — Testing and hardening ✅
- `npm audit` flagged Zod < 4.6.6 (memory exhaustion, high) and tinypool via vitest 3 (dev only). Upgraded to **Zod 4.6.7** and **vitest 4.1.12** → **0 vulnerabilities**.
  - npm 10 crashes resolving vitest 4 peers (`Cannot read properties of null (reading 'edgesOut')`); `backend/.npmrc` sets `legacy-peer-deps=true`.
  - **Regression caught:** Zod 4 applies defaults inside `.partial()`, so a partial update (e.g. renaming a camper) would have reset `status`, `features`, `extras` and `isActive`. Added `patchSchema()` (optional fields, defaults removed) for every update schema, plus a regression test.
- Seed script (from the frontend's mock data), index sync script.
- End-to-end smoke test of the **compiled** server (`dist/`) against a local replica set: health, catalog, register, coupon quote, booking, checkout, payment confirm, double-booking 409, admin dashboard figures, security headers, cookie flags. All passed.

### Test results
```
npm run typecheck   ✔ no errors
npm run build       ✔ dist/ produced
npm test            ✔ 5 files, 67 tests passed
  tests/auth.test.ts               17  registration validation, login, cookies, refresh rotation and reuse, password change/reset, blocking, CSRF origin, admin separation, SUPER_ADMIN rules
  tests/booking.test.ts            17  pricing, overlap rules, back-to-back, 8-way concurrent booking, date/stay validation, hold expiry, privacy, lifecycle, admin re-check, availability filter, coupons (incl. concurrent usage limit)
  tests/catalog.test.ts            15  camper CRUD/validation/partial update/delete rules/upload 503, catalog search/filter/sort/pagination, categories, camping places, reviews, favorites, inquiries, notifications, settings
  tests/payment-dashboard.test.ts  10  verified capture, idempotent confirm, tampered amount, declined card + retry, ownership, refund on cancel, cancellation window, partial/full refunds, webhook verification, dashboard statistics
  tests/pricing.unit.test.ts        8  date parsing, overlap convention, weekend pricing, extras, coupon math
npm audit           ✔ 0 vulnerabilities
```

### New files
`backend/`: `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `.npmrc`, `.gitignore`, `.env.example`, `README.md`, `src/**` (app, server, config, constants, database, interfaces, models, validators, middleware, services, payment providers, controllers, routes, utils, scripts), `tests/**`.
Root: `ARCHITECTURE.md`, `PROJECT_LOG.md`, `README.md`.

### Known limitations / next steps
- **Figma not reviewed** (no link). Compare the camper fields against the design once it's available.
- **Local `.env`:** needs `REFRESH_TOKEN_SECRET`; `MONGODB_URI` is preferred (the old `MONGO_URL` still works). Not edited, because it holds your secrets.
- **Not yet run against your Atlas database.** Verified only on local throwaway replica sets.
- **Toss Payments** is implemented from its public REST API. It hasn't been exercised against Toss's sandbox; run one test-key payment end to end before going live.
- **Cloudinary** and **SMTP** paths can't be integration-tested without credentials. Without them, uploads return 503 and reset emails are only logged in development.
- **Admin password recovery** has no email flow; a SUPER_ADMIN manages admin accounts. A second super admin is recommended.
- **Notifications** are polled (no Socket.IO by design).
- **Revenue time series** attribute refunds to the original payment date.
- The **expired-hold sweep** runs in-process every 5 minutes. With several API instances it runs on each one (safe, since transitions are conditional, but redundant); a scheduled job is better at scale.
- **Customer frontend** still uses mock data and `POST /auth/login` on port 8080. It needs to switch to `/api/v1/*` with `withCredentials: true` (not changed here, as instructed).
