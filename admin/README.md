# FullCamper Admin

Administration dashboard for FullCamper (React 19, TypeScript, Vite, Tailwind CSS v4, Redux Toolkit Query, Recharts, Motion).
It talks only to the shared backend's `/api/v1/admin/*` API.

## Run

```bash
cd backend && npm run dev            # API on http://localhost:8080
cd admin && npm install && npm run dev   # http://localhost:5173 (proxies /api to :8080)
```

- Port 5173 matches the backend's default `ADMIN_URL`, which is on the CORS/origin allow-list.
- Sign in with an administrator account. The first `SUPER_ADMIN` is created with `npm run create-admin` in `backend/`.
- `backend/.env` must not set `COOKIE_DOMAIN=false`. That literal is sent as `Domain=false` and browsers drop the auth cookies. Leave it empty for localhost.
- Production: build with `VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build` and serve `dist/` as a single-page app (all routes → `index.html`). Add the admin origin to `ADMIN_URL`.

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server with the API proxy |
| `npm run build` | Typecheck and production build |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | oxlint |
| `npm test` | Vitest: utilities, and a smoke test rendering every route against recorded API responses |

## Structure

```
src/
  app/            Redux store (RTK Query only)
  services/       axios client (cookie auth, single-flight refresh), RTK Query endpoints, error mapping
  types/api.ts    Response types mirroring backend models/services
  features/       theme (provider + persistence), auth (current admin)
  components/
    ui/           Button, Badge, Card, Field, Modal, ConfirmDialog, DataTable, Pagination, Segmented/Tabs, Toaster…
    layout/       AppShell, Sidebar, Topbar, notifications bell, theme toggle, page header/breadcrumbs
    charts/       Recharts wrappers that use the theme tokens
    dashboard/    KPI cards, date range control, alerts
  pages/          One folder per section (Dashboard, Analytics, Bookings, Campers, Customers, Payments, Reports, …)
  hooks/          URL-backed date range and list filters, debounce, count-up, media queries
  utils/          Formatting (KRW, Korean calendar days), dates, CSV, status semantics
  test/           Smoke test and its recorded fixtures
```

## Theming

- Every colour is a CSS variable in `src/styles/index.css`, defined once for light and once for `[data-theme='dark']`.
- Tailwind utilities (`bg-surface`, `text-fg-2`, `border-line`, `bg-accent-soft`, …) resolve to those variables. Components are written once and switch theme automatically, charts included (`useChartTheme`).
- An inline script in `index.html` applies the saved theme (`localStorage["fc-admin-theme"]`), or the OS preference, before first paint. Pages therefore never flash the wrong theme.
- **Settings → Appearance** offers Light, Dark or System.
- The chart palette was validated for colour-vision deficiency and contrast against both surfaces.
- Animations respect `prefers-reduced-motion` (`MotionConfig reducedMotion="user"`, plus a CSS fallback).

## Data rules

- **Revenue:** captured payments minus refunds, dated by capture time. It is never computed from booking prices.
- **Booking value:** shown separately, labelled as such.
- **Dates:** Korean calendar days. A booking's return day is exclusive.
- **Range comparisons:** compare against the immediately preceding period of equal length.
- **Snapshot metrics** (active campers, pending bookings, total customers) describe "now" and are never compared.
