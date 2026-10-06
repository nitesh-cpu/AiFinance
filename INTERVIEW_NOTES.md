# SpendSense — Interview Notes

Use only claims that match the current implementation. The Python service in this repository is **FastAPI**, not Flask.

## Problem

SpendSense helps users record income and expenses, understand category/monthly spending, manage budgets, and view history-based forecasts, anomaly signals, recurring-spend candidates, and personalized insights.

## Architecture and stack

```text
React + Vite
    | Axios: JSON/CSV + bearer JWT
    v
Node.js + Express API ---- Mongoose ---- MongoDB
    |
    | internal HTTP; shared key in production
    v
Python FastAPI ML service
```

- React/Vite is the existing browser client.
- Express owns authentication, authorization, request validation, financial calculations, API contracts, and persistence.
- MongoDB/Mongoose stores users, transactions, budgets, and analysis-related records.
- FastAPI exposes ML endpoints; it is not the financial system of record.

## Important APIs

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/change-password`.
- Transactions: `GET/POST /api/transactions`, `PUT/DELETE /api/transactions/:id`, `POST /api/transactions/import-csv`, `GET /api/transactions/categories`.
- Budget and summaries: `/api/budgets`, `/api/analytics/overview`, `/api/analytics/categories`, `/api/analytics/spending-trend`, `/api/analytics/cash-flow`, `GET /api/reports/monthly`.
- Intelligence: `GET /api/forecast`, `GET /api/insights`, `/api/insights/anomalies`, `/api/insights/recurring`.
- ML: `POST /ml/categorize`, `/ml/anomaly`, `/ml/forecast`, `/ml/recurring`; public `GET /` is used as an ML health probe.

## Database design and access control

- `User` stores a bcrypt password hash, token version, preferences, and profile.
- `Transaction` is owned by `userId` and stores date, description, numeric amount, credit/debit type, category, and source.
- `Budget` is unique per `(userId, category)`.
- `Anomaly` is unique per `(userId, transactionId)` and keeps a review status.
- Existing transaction indexes include `(userId, date)` and `(userId, category, type, date)`.
- Every private route authenticates first; financial controllers use the authenticated user's ID in data filters and mutations.

## Authentication and security

1. Registration validates inputs and stores a bcrypt hash; login verifies the hash.
2. The API signs a 30-day JWT using a required environment secret of at least 32 characters.
3. Private routes verify the JWT, load its user, and compare the token version.
4. Password changes increment the token version to invalidate older access tokens.
5. The frontend sends the bearer token from existing Web Storage. This is a known XSS exposure tradeoff, not an HTTP-only cookie implementation.

Registration/login are rate-limited per API process. API responses avoid internal stack/database detail; structured logs use request/operation context and error names/codes, not credentials or financial payloads. Multi-instance deployments need shared rate limiting.

## Transaction and CSV flow

Manual transactions validate description, amount, type, and date. A selected category is kept; missing categories call ML with a timeout and fall back to keyword categorization when unavailable.

CSV import is authenticated and bounded (5 MB upload, 5,000 data rows). It validates supported headers and each row, reports invalid rows, and uses a user-scoped duplicate key composed from UTC calendar day, type, amount, and normalized description. Duplicates are skipped both against existing user records and within one upload. This preflight check is not atomic across concurrent imports.

Transaction listing supports server-side search, type/category/date filters, sorting, and offset pagination capped at 100 results per page.

## ML integration

Node calls FastAPI for categorization, anomaly evaluation, and forecasting, passing the shared `X-ML-Service-Key` when configured. Production ML endpoints require a key; the root health route remains public for platform probes.

ML calls have short timeouts. Categorization falls back to local description rules; forecasts use a local history projection; anomaly detection uses a local threshold. Recurring candidates in the current API are computed from user transactions in Node; the FastAPI recurring route exists, but that page flow does not call it.

## Analytics, budgets, anomalies, forecasts, and insights

- Analytics overview, category totals, six-month trend, and cash flow use user-filtered MongoDB aggregation.
- Budgets compare each category's spending in the selected budget period; insights include weekly spend across week/month boundaries and monthly pacing.
- Anomaly detection uses recent user-scoped debit history and prior same-category transactions; it stores/upserts findings by user and transaction to avoid repeated duplicate records.
- Forecasts use up to six months of history and return a limited-history state when insufficient data is available.
- Personalized insights derive from current/previous spending, budgets, forecast results, and anomalies. They are returned on request; the demo seed does not fabricate insight records.

## Performance and engineering tradeoffs

- Aggregations reduce transaction documents transferred into Node for summary endpoints.
- Indexes target owner/date and owner/category query patterns; extra indexes are avoided because they add write/storage cost.
- Paginated transaction rendering keeps browser lists bounded.
- Forecast and anomaly analysis have bounded history/windows; CSV categorization concurrency is limited.
- Numeric transaction amounts preserve the existing API/schema but use binary floating-point. Two-decimal response rounding is not a substitute for exact decimal accounting; a minor-unit/Decimal128 migration requires explicit backfill and API review.
- Substring search, deep `skip` offsets, dashboard request fan-out, and repeated personalized analysis should be optimized only when query/latency measurements justify a contract or caching change.

## Challenges and solutions to discuss

- **ML dependency failure:** preserve transaction operations through explicit local fallbacks and short client timeouts.
- **Cross-user data exposure:** enforce authenticated ownership in database query predicates, not in browser-supplied user IDs.
- **Duplicate CSV rows:** normalize descriptions and compare several transaction attributes instead of matching on description alone.
- **Large financial history:** aggregate summaries in MongoDB and paginate raw transaction lists.
- **Safe demo setup:** opt-in seed uses explicit credentials, refuses production mode, and replaces data only for its configured demo account.

## Current verification evidence

The repository has Node's built-in API test suite and Python unit tests, plus a GitHub Actions workflow for MongoDB-backed API tests, ML tests, and frontend build. During the final local verification, the API suite passed with ML unavailable and with a live local ML service; Python tests and the frontend build passed. The frontend linter reports existing warnings, and Vite reports a main bundle larger than its 500 KB advisory threshold.

## Limitations to state plainly

- CSV duplicate preflight can race between concurrent requests.
- Money is not stored in exact decimal representation.
- Currency formatting is INR-oriented despite a profile option for USD.
- Browser JWTs remain in Web Storage; login rate limiting is process-local.
- Forecast/anomaly/recurring outputs are estimates or history-based heuristics, not guarantees or financial advice.
- CI verifies the application but does not deploy it; no production deployment has been performed.
