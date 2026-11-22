# FullCamper — customer frontend

React 19 + TypeScript + Vite + Redux Toolkit. Implements the FullCamper Figma design and talks to the
shared backend in [`../backend`](../backend/README.md) (`/api/v1`).

## Run locally

```bash
# 1. Backend (terminal 1)
cd backend
npm install
npm run seed      # optional sample data (development only)
npm run dev       # http://localhost:8080/api/v1/health

# 2. Frontend (terminal 2)
cd frontend
npm install
npm run dev       # http://localhost:3000
```

The dev server runs on **port 3000** because the backend's `CLIENT_URL` (CORS + CSRF origin check)
defaults to `http://localhost:3000`. Requests to `/api/*` are proxied to the backend, so the auth cookies
are first-party and no CORS preflight is needed.

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API base including `/api/v1`. Empty in development (uses the proxy); set it for production builds, e.g. `https://api.example.com/api/v1`. The backend must list the site's origin in `CLIENT_URL`/`CORS_EXTRA_ORIGINS`. |
| `VITE_DEV_API_PROXY` | Development only: where `/api` is proxied (default `http://localhost:8080`). |

Copy `.env.example` to `.env` to change them. No secrets belong in frontend env files (everything with
`VITE_` is shipped to the browser).

## Scripts

| Command | |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint |
| `npm test` | Unit/integration tests (no backend needed) |
| `npm run test:e2e` | Renders the real app against a **running** backend + dev server (registers users and creates bookings — use a development database) |

## How it talks to the backend

- **HTTP client** — `src/services/api/apiClient.ts`: one Axios instance (`withCredentials`), envelope
  helpers (`{ success, message, data, meta }`), comma-list query params, and a single-flight
  `POST /auth/refresh` + retry on `401`. Errors are normalized into `ApiError` (`errors.ts`) so raw Axios
  errors never reach the UI; backend field errors (`body.email`, …) are mapped onto form fields.
- **Auth** — the backend's HTTP-only cookies (`fc_access`, `fc_refresh`). Nothing secret is stored in
  Redux or localStorage; the session is restored on load with `GET /auth/me`. Protected routes wait for
  that check. An expired refresh token signs the user out with a notice.
- **Services** — `src/services/*Api.ts` map 1:1 to backend routes; response types live in
  `src/types/api.ts` and mirror the Mongoose models (ObjectIds and dates as strings, optional fields,
  KRW integer prices).
- **Redux** — server state: `auth`, `campers` (normalized entities + listing/detail/compare/featured
  requests with de-duplication), `bookings`, `favorites`, `content` (settings, camping places).
  Client state (persisted): `comparison`, `cart` (trip planner), `publishing` (listing wizard).
  Listing filters, sort and pagination live in the URL and map directly onto `GET /campers`.
- **Prices** — always from the backend (`POST /bookings/quote`, booking `price` breakdown); the
  frontend never computes rental prices for marketplace campers.

### Feature ↔ endpoint map

| Feature | Endpoints |
|---|---|
| Register / sign in / sign out / session | `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `GET /auth/me` |
| Forgot / reset password | `POST /auth/forgot-password`, `/auth/reset-password` (`/reset-password?token=` page) |
| Profile, avatar, password | `PATCH /members/me`, `PUT /members/me/avatar`, `PATCH /auth/me/password` |
| Navigation, home | `GET /categories`, `GET /campers?featured=true`, `GET /settings` |
| Listing, search, filters, sort, pagination | `GET /campers`, `GET /campers/filters`, `GET /features` |
| Camper details | `GET /campers/:slug`, `/campers/:id/availability`, `/campers/:slug/reviews` |
| Q&A form | `POST /inquiries` |
| Compare | `GET /campers/compare?ids=` |
| Favorites | `GET /favorites/ids`, `GET /favorites`, `POST`/`DELETE /favorites/:camperId` |
| Cart (trip planner) & checkout | `POST /bookings/quote`, `POST /bookings` |
| Payment | `POST /payments/checkout` → provider → `POST /payments/confirm` |
| My orders | `GET /bookings`, `GET /bookings/:id`, `POST /bookings/:id/cancel`, `POST /reviews` |
| Camping places | `GET /camping-places` |

### Known limitations

- **Camper publishing** (`/publish`, *My campers*) is stored in the browser only. The backend creates
  campers through the admin dashboard and has no customer listing endpoint; the UI labels these listings
  "saved on this device".
- **Payments**: only the backend's `mock` provider has a frontend adapter (`src/services/paymentFlow.ts`).
  A Toss Payments adapter (widget + client key + redirect pages) is needed before `PAYMENT_PROVIDER=toss`.
- **Avatar upload** returns `503` until Cloudinary is configured on the backend; the UI shows that message.
- Videos, blog tiles and FAQ copy are static content (no CMS endpoint).
- Social sign-in buttons (Naver, Google, Kakao) are not backed by the API and only show a notice.
