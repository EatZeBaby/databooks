# Databooks

The first social network for your data. A full‑stack demo that lets you browse datasets, follow/like them, test data platform connectivity, and request access to Unity Catalog tables.

## Features

- Feed with dataset events (publish, schema changes, likes/follows)
- Dataset pages with inline preview, social actions, platform badges
- Connectors:
  - Databricks: list catalogs/schemas/tables, import datasets
  - Postgres (printshop): list tables from the app DB and import
  - Snowflake: connectivity diagnostics
- Access checks (Unity Catalog):
  - Per‑table “Access granted/request access” tag (principal: `francis.laurens@databricks.com`)
  - One‑click access request (RFA) using Databricks SDK/REST
- Companies: list companies, company page with users, datasets, activity
- Users and Groups pages; profile shows liked/followed datasets
- Minimal first‑launch login splash and `/login` page
- Modern UI/UX: Tailwind, framer‑motion micro‑interactions, sticky layout, toasts

## Tech stack

- Frontend: Next.js (React, TypeScript), Tailwind CSS, SWR, framer‑motion
- Backend: FastAPI (Python), SQLAlchemy (asyncpg), Pydantic v2
- DB: PostgreSQL (async), plus Databricks and Snowflake integrations

## Monorepo layout

```
backend/           # FastAPI app (routers, models, schemas)
frontend/          # Next.js app (pages, components, styles)
docs/              # Notes and feature docs
api/openapi.yaml   # API definition (partial)
```

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Postgres instance (DATABASE_URL)
- (Optional) Databricks workspace auth (profile/env) for UC operations
- (Optional) Snowflake credentials in env

## Environment variables

Backend (required):
```
DATABASE_URL=postgresql://<user>:<pass>@<host>:<port>/<db>?sslmode=prefer
DB_SCHEMA=databooks    # or your schema (defaults to public)
```

Databricks (optional, for catalog/schema listing, grants, RFA):
```
DATABRICKS_HOST=...
DATABRICKS_TOKEN=...
# Optional hints for listing
DATABRICKS_CATALOG=axel_richier
DATABRICKS_SCHEMA=default
```

Snowflake (optional, for diagnostics):
```
SNOW_ACCOUNT=...
SNOW_USERNAME=...
SNOW_PWD=...
SNOW_WAREHOUSE=...
SNOW_DATABASE=...
SNOW_SCHEMA=...
```

Frontend (optional hints):
```
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
NEXT_PUBLIC_DATABRICKS_HOST=https://<your-workspace-host>
NEXT_PUBLIC_DATABRICKS_WORKSPACE_ID=<workspace_id>
NEXT_PUBLIC_DATABRICKS_CATALOG=axel_richier
```

## Install and run

Backend (FastAPI):
```
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
```

Frontend (Next.js):
```
cd frontend
npm install
npm run dev
```

Open:
- App: http://localhost:3000
- API: http://localhost:8000/health

## First‑launch login

- Visit `/login` or the first‑launch splash, click “Login”.
- The flag is stored in `localStorage`, then you are routed to `/` (feed).

## Connectors

### Databricks
- Connectors page: test workspace, list schemas/tables, import datasets.
- Datasets and connectors show per‑table access tags:
  - “Access granted” if principal has SELECT
  - “request access” opens confirmation and sends an RFA request

Endpoints used:
- `GET /api/v1/connectors/databricks/test`
- `GET /api/v1/tables/{name}/has_select?catalog=&schema=`
- `POST /api/v1/rfa/request` (RFA via SDK/REST fallback `/api/3.0/rfa/requests`)

### Postgres (printshop)
- Uses the app’s `DATABASE_URL` to list printshop tables.
- Import creates datasets with `source_type=postgres`.

Endpoints:
- `POST /api/v1/connectors/postgres/test`
- `POST /api/v1/postgres/import`

### Snowflake
- Diagnostics (version, current user/role/warehouse, sample schemas/tables)
- On dataset Connect: “Open in Snowflake” link

Endpoint:
- `POST /api/v1/connectors/snowflake/test`

## Companies and users

- `GET /api/v1/companies` — list companies with user counts
- `GET /api/v1/companies/{company}` — users, datasets (by owner and dataset.company), recent activity
- Frontend pages:
  - `/companies` (index)
  - `/companies/[company]` (details: users grid, datasets, activity with names)

## Social actions and feed

- Follow/Like endpoints persist to Postgres and emit events
- Feed and dataset activity read from DB when available

Key endpoints:
```
POST /api/v1/follows { dataset_id, follow, user_id? }
POST /api/v1/likes   { dataset_id, follow, user_id? }
GET  /api/v1/feed
GET  /api/v1/datasets/:id/activity
```

## Dataset Connect snippets

- Databricks: `SELECT * FROM <catalog>.<schema>.<table>`
- Snowflake: UC external table create + `SELECT`
- DuckDB local: attach UC Iceberg REST and `DESCRIBE`

## Troubleshooting

- “Dataset not found” placeholder
  - Ensure `DATABASE_URL` and `DB_SCHEMA` are set; restart backend.
- Access request returns 501
  - Your workspace SDK may not expose RFA. The app falls back to `/api/3.0/rfa/requests`. If unavailable, 501 is returned.
- Databricks schemas list is short
  - We return `details.schemas` (up to 200). Ensure catalog is configured.

## Scripts / handy calls

Check DB health:
```
curl -s http://localhost:8000/api/v1/db/health | jq
```

List users (for Groups/Companies pages):
```
curl -s http://localhost:8000/api/v1/users | jq
```

Seed users (companies/domains) via Admin:
```
curl -s -X POST http://localhost:8000/api/v1/admin/seed/users -H 'Content-Type: application/json' -d '{"per_domain":2}' | jq
```

## License

This repository is provided for demo purposes without warranty. Adapt, extend, and integrate at will.
