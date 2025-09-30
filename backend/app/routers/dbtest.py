from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from sqlalchemy import text

from backend.app.db import engine, Config

router = APIRouter()


@router.get("/db/health")
async def db_health(schema: Optional[str] = None) -> dict:
    """Check database health and list tables in the schema"""
    if engine is None:
        return {"ok": False, "error": "DATABASE_URL not configured"}
    
    try:
        async with engine.connect() as conn:  # type: ignore[assignment]
            dbname = (await conn.execute(text("select current_database()"))).scalar_one()
            target_schema = schema or Config.SCHEMA
            
            rows = await conn.execute(
                text(
                    """
                    select table_name
                    from information_schema.tables
                    where table_schema = :schema
                    order by table_name
                    """
                ),
                {"schema": target_schema},
            )
            tables = [r[0] for r in rows.fetchall()]
            
            return {
                "ok": True, 
                "database": dbname, 
                "schema": target_schema, 
                "tables": tables
            }
    except Exception as e:
        return {"ok": False, "error": str(e)}