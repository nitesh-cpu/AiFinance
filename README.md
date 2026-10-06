# SpendSense

SpendSense is a personal-finance app for tracking transactions, understanding spending, setting budgets, and reviewing data-based forecasts and alerts.

## Problem and features

People need a clear view of where their money goes without manually reconciling every transaction. SpendSense provides:

- Private account registration/login and profile preferences
- Manual transactions and validated CSV import with per-user duplicate checks
- ML-assisted categorization with a local fallback
- Category and period analytics, budgets, and monthly reports
- History-based expense forecasts, recurring-transaction heuristics, anomaly alerts, and personalized insights

Forecasts and categorization are estimates; they are not financial advice.

## Architecture and technology

```text
React + Vite browser
        | HTTPS/JSON, bearer JWT
        v
Node.js + Express API ---- Mongoose ---- MongoDB
        |
        | internal HTTP + ML_API_KEY (production)
        v
Python FastAPI service
```

The API owns authentication, authorization, validation, persistence, and financial calculations. FastAPI handles categorization, anomaly, recurring, and forecast operations. See [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) for request/data flows, design tradeoffs, and interview scenarios.

## Screenshots

No screenshots are committed yet. Add current, non-sensitive demo screenshots under `docs/screenshots/` and link them here before publishing a visual portfolio.

## Local setup

Requirements: Node.js 22 (or supported Node 20+), Python 3.12 recommended, and MongoDB 7+ or MongoDB Atlas. Start MongoDB first.

### Backend API

In PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

Set a private, random `JWT_SECRET` (minimum 32 characters) and `MONGO_URI` in `backend/.env`, then:

```powershell
npm ci
npm run dev
```

The API defaults to `http://localhost:5000`; health check: `GET /api/health`.

### ML service

Open a second terminal:

```powershell
cd backend\ml
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

The existing service is **FastAPI** (not Flask) and listens on port `8001` by default. Local development can leave `ML_API_KEY` empty. Production must set the same strong `ML_API_KEY` on the Node API and ML service.

### Frontend

Open a third terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` to the API URL ending in `/api`, for example `http://localhost:5000/api`. Vite variables are public; never put secrets in them.

### Safe demo data

Demo seeding is opt-in, disabled in production, and replaces records only for the configured demo account:

```powershell
cd backend
$env:SEED_DEMO_EMAIL = "demo@example.test"
$env:SEED_DEMO_PASSWORD = "choose-a-private-password"
npm run seed
```

Use those private values to register/login in the local app. The seed creates repeatable three-month income/expense history, repeated subscriptions, a current unusual purchase, and budgets that demonstrate alerts. Forecasts, recurring results, anomalies, and insights are calculated by their existing endpoints when viewed; the seed does not fabricate stored analysis results.

## Environment variables

| Variable | Service | Purpose |
|---|---|---|
| `MONGO_URI` | Backend/seed | MongoDB connection string; use a database with `test` in its name for API tests. |
| `JWT_SECRET` | Backend | Private JWT signing key, at least 32 characters. |
| `PORT` | Backend/ML | Optional listener port (defaults: 5000 / 8001). |
| `CLIENT_URL` | Backend | Allowed frontend origin(s); required in production. |
| `ML_SERVICE_URL` | Backend | ML service base URL; required in production. |
| `ML_API_KEY` | Backend and ML | Matching internal service key; required in production and at least 32 characters. |
| `VITE_API_BASE_URL` | Frontend build | Public API URL including `/api`. |
| `ML_ALLOWED_ORIGINS` | ML | Optional browser CORS allowlist. |
| `LOG_LEVEL` | ML | Python log level, defaults to `INFO`. |
| `SEED_DEMO_EMAIL`, `SEED_DEMO_PASSWORD`, `SEED_DEMO_NAME` | Seed | Explicit local demo identity; never use for production. |

See [backend/.env.example](./backend/.env.example) and [frontend/.env.example](./frontend/.env.example). Keep `.env` files local.

## API overview

All API paths are under `/api`. Private transaction, budget, analytics, insight, report, forecast, and user routes require a bearer JWT.

| Area | Main routes |
|---|---|
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/change-password` |
| Transactions | `GET/POST /transactions`, `PUT/DELETE /transactions/:id`, `POST /transactions/import-csv`, `GET /transactions/categories` |
| Budgets | `GET/POST /budgets`, `PUT/DELETE /budgets/:id` |
| Analytics | `GET /analytics/overview`, `/analytics/categories`, `/analytics/spending-trend`, `/analytics/cash-flow` |
| Intelligence | `GET /insights`, `/insights/health-score`, `/insights/anomalies`, `/insights/recurring`, `PATCH /insights/anomalies/:id`, `GET /forecast` |
| Reports/settings | `GET /reports/monthly`; `PUT /user/profile`, `/user/preferences`, `/user/notifications`; `DELETE /user/account` |

Transactions support server-side search, category/type/date filters, sorting, and pagination. CSV rows are validated; duplicates are skipped and summarized. ML endpoints are `POST /ml/categorize`, `/ml/anomaly`, `/ml/forecast`, and `/ml/recurring`; `GET /` is a public health probe, while production ML operations require the shared key.

## ML pipeline

```text
Manual/CSV transaction -> API validation -> supplied category or ML prediction
                                           -> local keyword fallback if ML fails
                                           -> MongoDB -> analytics/budgets/insights
```

Forecast and anomaly endpoints use user transaction history passed by the Node API. ML requests have timeouts; existing local fallbacks keep core API functionality available during ML downtime.

## Tests and build

MongoDB must be running. In the backend terminal:

```powershell
cd backend
$env:NODE_ENV = "test"
$env:MONGO_URI = "mongodb://127.0.0.1:27017/spendsense_test"
$env:JWT_SECRET = "test-only-secret-with-at-least-32-characters"
$env:ML_SERVICE_URL = "http://127.0.0.1:1"
npm ci
npm test
```

ML unit tests:

```powershell
cd backend\ml
python -m pip install -r requirements.txt
python -m unittest
```

Frontend:

```powershell
cd frontend
npm ci
npm run lint
npm run build
```

GitHub Actions runs backend API tests with MongoDB, ML unit tests, and a frontend production build on pushes and pull requests. It does not deploy.

## Deployment

- **Frontend:** deploy `frontend` to Vercel/Netlify with `npm ci` and `npm run build`; configure public `VITE_API_BASE_URL`.
- **Backend:** deploy `backend` to Render/Railway with `npm ci` and `npm start`; configure production MongoDB, JWT, CORS, and ML environment variables.
- **ML:** deploy `backend/ml` with Python dependencies and `uvicorn app:app --host 0.0.0.0 --port $PORT`; configure `NODE_ENV=production` and matching `ML_API_KEY`.
- **Database:** MongoDB Atlas or equivalent managed MongoDB; restrict network access and enable backups.

No deployment is automatic. Use HTTPS and platform secret stores; validate health probes and service-to-service connectivity in the selected hosting environment.

## Known limitations

- Amounts use JavaScript/Mongoose numbers; this is not exact decimal accounting. A minor-unit/Decimal128 migration needs an explicit data/API migration.
- Duplicate detection is a same-user preflight check, not atomic across concurrent CSV imports.
- Search uses substring matching; deep offset pagination and large imports need measurement before scaling further.
- Currency display is INR-oriented despite a USD profile option. Do not mix currencies without conversion.
- Browser bearer tokens remain in Web Storage, and authentication rate limiting is process-local.
