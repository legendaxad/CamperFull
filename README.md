# FullCamper

Camper rental platform made of three independent applications:

| App | Path | Status |
|---|---|---|
| Backend API | [`backend/`](backend/README.md) | Node.js, Express 5, TypeScript, MongoDB. Serves `/api/v1` (customer) and `/api/v1/admin` (dashboard) |
| Admin dashboard | `admin/` | React + TypeScript (planned) |
| Customer frontend | `frontend/` (currently `camper/`) | React (JavaScript) |

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
