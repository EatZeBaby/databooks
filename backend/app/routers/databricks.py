from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.databricks_client import list_schemas, list_tables, get_table_info
from backend.app.schemas import Dataset, DatasetCreate, Visibility
from backend.app.storage import db
from backend.app.db import get_session_optional, DatasetModel as DM


logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/databricks/catalogs/{catalog}/schemas")
def dbx_list_schemas(catalog: str) -> dict:
    try:
        schemas = list_schemas(catalog)
        return {"schemas": schemas}
    except Exception as e:
        raise HTTPException(400, detail=str(e))


@router.get("/databricks/catalogs/{catalog}/schemas/{schema}/tables")
def dbx_list_tables(catalog: str, schema: str) -> dict:
    try:
        tables = list_tables(catalog, schema)
        return {"tables": tables}
    except Exception as e:
        logger.exception("Error listing tables for %s.%s", catalog, schema)
        raise HTTPException(400, detail=str(e))


@router.get("/databricks/tables/{catalog}.{schema}.{table}")
def dbx_table_info(catalog: str, schema: str, table: str) -> dict:
    try:
        info = get_table_info(catalog, schema, table)
        return {"table": info}
    except Exception as e:
        logger.exception("Error getting table info for %s.%s.%s", catalog, schema, table)
        raise HTTPException(400, detail=str(e))


@router.post("/databricks/import")
async def dbx_import_table(payload: dict, session: AsyncSession | None = Depends(get_session_optional)) -> Dataset:
    # payload: { catalog, schema, table, description? }
    catalog = payload.get("catalog")
    schema = payload.get("schema")
    table = payload.get("table")
    description = payload.get("description")
    if not (catalog and schema and table):
        raise HTTPException(422, detail="catalog, schema, table are required")

    # Create a dataset entry using UC identifiers as metadata
    ds = db.create_dataset(
        DatasetCreate(
            name=table,
            description=description,
            owner_id="dbx",  # to be replaced by current user
            org_id="org",
            source_type="databricks.uc",
            source_metadata_json={
                "catalog": catalog,
                "schema": schema,
                "table": table,
                "full_name": f"{catalog}.{schema}.{table}",
                "path": f"{catalog}.{schema}.{table}",
                "format": "delta",
            },
            visibility=Visibility.internal,
        )
    )
    # persist to Postgres if configured
    if session is not None:
        model = DM(
            id=ds.id,
            name=ds.name,
            description=ds.description,
            tags=ds.tags,
            owner_id=ds.owner_id,
            org_id=ds.org_id,
            source_type=ds.source_type,
            source_metadata_json=ds.source_metadata_json,
            visibility=ds.visibility.value if hasattr(ds.visibility, 'value') else ds.visibility,  # type: ignore[attr-defined]
            created_at=ds.created_at,
            updated_at=ds.updated_at,
        )
        session.add(model)
        await session.commit()
    return ds


