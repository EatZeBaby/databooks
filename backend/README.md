## DataMesh Social — Backend (FastAPI)

### Quickstart
1. Create a virtual environment and install dependencies:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
```

2. Run the API server (reload):

```bash
uvicorn backend.app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`. Docs at `/docs`.

### Notes
- In-memory storage for MVP; not persistent.
- Templates are read from `templates/` at repo root.
- SSE stream on `/api/v1/feed/stream`.

### Configure Postgres (optional)
- Set `DATABASE_URL` to your Postgres connection string. For async driver, use `postgresql+asyncpg://`.
- Example (using environment variable expansion for password):

```bash
export PGPASSWORD='<your-password>'
export DATABASE_URL="postgresql://axel.richier%40databricks.com:${PGPASSWORD}@instance-33607cf0-86c1-4306-a5c3-2464761fa328.database.cloud.databricks.com:5432/databricks_postgres?sslmode=require"
uvicorn backend.app.main:app --reload
```

On startup, tables are created automatically. The API will persist datasets and events when DB is configured.


