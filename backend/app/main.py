from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncEngine
import logging
import os

from backend.app.routers import datasets, connectors, feed, users, search, follows, databricks, dbtest, admin, tags
from backend.app.routers import companies
from backend.app.db import engine, Base, Config, get_connection_method


log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(title="Databooks", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(datasets.router, prefix="/api/v1", tags=["Datasets"])
app.include_router(connectors.router, prefix="/api/v1", tags=["Connectors"])
app.include_router(feed.router, prefix="/api/v1", tags=["Feed"])
app.include_router(users.router, prefix="/api/v1", tags=["Users"])
app.include_router(search.router, prefix="/api/v1", tags=["Search"])
app.include_router(follows.router, prefix="/api/v1", tags=["Feed"])
app.include_router(databricks.router, prefix="/api/v1", tags=["Databricks"])
app.include_router(dbtest.router, prefix="/api/v1", tags=["DB"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])
app.include_router(tags.router, prefix="/api/v1", tags=["Tags"])
app.include_router(companies.router, prefix="/api/v1", tags=["Companies"])


@app.on_event("startup")
async def on_startup() -> None:
    # Create tables if engine configured
    if engine is not None:
        async with engine.begin() as conn:  # type: ignore[assignment]
            # Ensure target schema exists, then create tables
            await conn.exec_driver_sql(f'CREATE SCHEMA IF NOT EXISTS "{Config.SCHEMA}"')
            await conn.run_sync(Base.metadata.create_all)
        logging.getLogger(__name__).info("Connected to database successfully using method='%s'", get_connection_method())


