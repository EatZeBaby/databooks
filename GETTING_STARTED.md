## Getting Started

This guide helps you run the backend (FastAPI) and frontend (Next.js) and test the MVP flow.

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1) Backend — FastAPI
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
```

Available at `http://127.0.0.1:8000`
- Health: `GET /health`
- API docs: `http://127.0.0.1:8000/docs`
- SSE stream: `curl -N http://127.0.0.1:8000/api/v1/feed/stream`

### 2) Frontend — Next.js + Tailwind
```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 npm run dev
```

Open `http://localhost:3000`.

### 3) Quick E2E Flow
1. Publish a dataset: go to `/publish`, fill basic fields (e.g., path `s3://bucket/path`, format `parquet`) and submit.
2. You will be redirected to `/datasets/{id}`. Click "Connect" to render platform-specific artifacts.
3. Open `/` to see the live feed update (SSE) with `dataset.connected` events.

### Key Files
- OpenAPI: `api/openapi.yaml`
- Backend app: `backend/app/main.py`, `backend/app/routers/*`, `backend/app/schemas.py`, `backend/app/storage.py`
- Templates: `templates/*.mustache`
- Frontend pages: `frontend/pages/*`
- Frontend API utils: `frontend/lib/api.ts`

### Troubleshooting
- Next.js alias error `Can't resolve '@/styles/globals.css'`:
  - Ensure `frontend/tsconfig.json` includes:
    ```json
    {
      "compilerOptions": {
        "baseUrl": ".",
        "paths": { "@/*": ["./*"] }
      }
    }
    ```
  - Restart `npm run dev`.
- CORS issues: dev server enables permissive CORS. Ensure frontend points to the backend via `NEXT_PUBLIC_API_BASE`.
- SSE stream shows nothing: trigger events by creating a dataset and clicking "Connect".


