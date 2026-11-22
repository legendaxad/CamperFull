# FullCamper

Camper rental platform made of three independent applications:

| App | Path | Status |
|---|---|---|
| Backend API | [`backend/`](backend/README.md) | Node.js, Express 5, TypeScript, MongoDB. Serves `/api/v1` (customer) and `/api/v1/admin` (dashboard) |
| Admin dashboard | [`admin/`](admin/README.md) | React 19, TypeScript, Vite, Tailwind v4, RTK Query, Recharts; light/dark themes; uses `/api/v1/admin` |
| Customer frontend | [`frontend/`](frontend/README.md) | React 19, TypeScript, Vite, Redux Toolkit; integrated with `/api/v1` |

- Architecture, data model, booking and payment rules: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Milestones, test results, limitations: [`PROJECT_LOG.md`](PROJECT_LOG.md)

## Quick start (backend)

```bash
cd backend
npm install
cp .env.example .env        # set MONGODB_URI (replica set / Atlas), JWT_SECRET, REFRESH_TOKEN_SECRET
npm run seed                # optional sample data (development only)
SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_PASSWORD='StrongPass123' npm run create-admin
npm run dev                 # http://localhost:8080/api/v1/health
npm test
```

## Quick start (frontend)

```bash
cd frontend
npm install
npm run dev                 # http://localhost:3000 (proxies /api to the backend on :8080)
npm test
```
