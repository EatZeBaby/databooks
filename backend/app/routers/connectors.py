from __future__ import annotations

import os
import logging
from fastapi import Body
from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.schemas import ConnectorList, ConnectorTestRequest, ConnectorTestResponse
from backend.app.storage import db
from backend.app.databricks_client import get_workspace_client
from fastapi import Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from backend.app.db import get_session_optional, DatasetModel as DM, engine
from backend.app.schemas import DatasetCreate, Visibility, Dataset
from backend.app.storage import db as memory_db
from backend.app.databricks_client import list_schemas as dbx_list_schemas_sdk, list_tables as dbx_list_tables_sdk


router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/connectors")
def list_connectors() -> ConnectorList:
    return ConnectorList(data=db.list_connectors())


class SnowflakeTestRequest(BaseModel):
    account: str | None = None
    user: str | None = None
    password: str | None = None
    warehouse: str | None = None
    database: str | None = None
    schema: str | None = None


@router.post("/connectors/snowflake/test")
def test_snowflake(req: SnowflakeTestRequest | None = Body(default=None)) -> ConnectorTestResponse:
    try:
        import snowflake.connector  # type: ignore
    except Exception as e:  # pragma: no cover
        return ConnectorTestResponse(ok=False, error=f"snowflake-connector not installed: {e}")

    req = req or SnowflakeTestRequest()
    account = (req.account or os.getenv("SNOW_ACCOUNT") or os.getenv("SNOWFLAKE_ACCOUNT") or "").strip()
    user = (req.user or os.getenv("SNOW_USERNAME") or os.getenv("SNOWFLAKE_USER") or "").strip()
    password = (req.password or os.getenv("SNOW_PWD") or os.getenv("SNOWFLAKE_PASSWORD") or "").strip()
    warehouse = (req.warehouse or os.getenv("SNOW_WAREHOUSE") or os.getenv("SNOWFLAKE_WAREHOUSE") or "").strip()
    database = (req.database or os.getenv("SNOW_DATABASE") or os.getenv("SNOWFLAKE_DATABASE") or "").strip()
    schema = (req.schema or os.getenv("SNOW_SCHEMA") or os.getenv("SNOWFLAKE_SCHEMA") or "").strip()

    # Verbose logging (mask sensitive values)
    def _mask(val: str, keep: int = 2) -> str:
        if not val:
            return ""
        if len(val) <= keep * 2:
            return "*" * len(val)
        return val[:keep] + ("*" * (len(val) - keep * 2)) + val[-keep:]

    logger.info(
        "Snowflake test: resolved config account='%s' user='%s' wh='%s' db='%s' schema='%s' pwd='%s'",
        account,
        user,
        warehouse or "",
        database or "",
        schema or "",
        _mask(password),
    )

    if not (account and user and password):
        logger.error("Snowflake test: missing required credentials (account/user/password)")
        return ConnectorTestResponse(ok=False, error="Missing account/user/password (env or body)")

    try:
        ctx = snowflake.connector.connect(
            account=account,
            user=user,
            password=password,
            warehouse=warehouse or None,
            database=database or None,
            schema=schema or None,
        )
        try:
            cur = ctx.cursor()
            try:
                # Diagnostics similar to advanced test
                diagnostics = {
                    "Version": "SELECT CURRENT_VERSION()",
                    "Current Time": "SELECT CURRENT_TIMESTAMP()",
                    "Account": "SELECT CURRENT_ACCOUNT()",
                    "User": "SELECT CURRENT_USER()",
                    "Role": "SELECT CURRENT_ROLE()",
                    "Warehouse": "SELECT CURRENT_WAREHOUSE()",
                    "Database": "SELECT CURRENT_DATABASE()",
                    "Schema": "SELECT CURRENT_SCHEMA()",
                }
                for label, q in diagnostics.items():
                    try:
                        cur.execute(q)
                        row = cur.fetchone()
                        logger.info("Snowflake test: %s = %s", label, row[0] if row else None)
                    except Exception as e:  # pragma: no cover
                        logger.warning("Snowflake test: %s query failed: %s", label, e)

                # Lightweight listing counts (avoid huge payloads)
                try:
                    cur.execute("SHOW DATABASES")
                    dbs = cur.fetchall() or []
                    logger.info("Snowflake test: databases accessible=%d", len(dbs))
                except Exception as e:
                    logger.warning("Snowflake test: SHOW DATABASES failed: %s", e)

                try:
                    cur.execute("SHOW WAREHOUSES")
                    whs = cur.fetchall() or []
                    logger.info("Snowflake test: warehouses accessible=%d", len(whs))
                except Exception as e:
                    logger.warning("Snowflake test: SHOW WAREHOUSES failed: %s", e)

                # Simple query timing
                try:
                    import time
                    t0 = time.time()
                    cur.execute("SELECT 1")
                    _ = cur.fetchone()
                    logger.info("Snowflake test: simple query time=%.3fs", time.time() - t0)
                except Exception as e:
                    logger.warning("Snowflake test: SELECT 1 failed: %s", e)

                # Summarize available data (limited samples)
                details: dict[str, object] = {}
                try:
                    cur.execute("SHOW DATABASES")
                    db_rows = cur.fetchall() or []
                    details["databases"] = [r[1] for r in db_rows[:10]] if db_rows and len(db_rows[0]) > 1 else [r[0] for r in db_rows[:10]]
                except Exception:
                    details["databases"] = []
                try:
                    cur.execute("SHOW SCHEMAS IN DATABASE \"" + (database or "") + "\"") if database else cur.execute("SHOW SCHEMAS")
                    sch_rows = cur.fetchall() or []
                    details["schemas_sample"] = [r[1] for r in sch_rows[:10]] if sch_rows and len(sch_rows[0]) > 1 else [r[0] for r in sch_rows[:10]]
                except Exception:
                    details["schemas_sample"] = []
                try:
                    cur.execute("SHOW TABLES LIMIT 10")
                    tbl_rows = cur.fetchall() or []
                    details["tables_sample"] = [r[1] for r in tbl_rows[:10]] if tbl_rows and len(tbl_rows[0]) > 1 else [r[0] for r in tbl_rows[:10]]
                except Exception:
                    details["tables_sample"] = []
                details["database"] = database or None

                return ConnectorTestResponse(ok=True, details=details)
            finally:
                cur.close()
        finally:
            ctx.close()
        # Unreachable due to early return with details
    except Exception as e:  # pragma: no cover
        logger.exception("Snowflake test: connection failed: %s", e)
        return ConnectorTestResponse(ok=False, error=str(e))



class DatabricksTestRequest(BaseModel):
    workspace_profile: str | None = None
    catalog: str | None = None
    schema: str | None = None


@router.post("/connectors/databricks/test")
def test_databricks(req: DatabricksTestRequest | None = Body(default=None)) -> ConnectorTestResponse:
    try:
        # Instantiate workspace client (auth via env/CLI profile)
        w = get_workspace_client()
        # Basic workspace ping
        me = w.current_user.me().as_dict() if hasattr(w.current_user.me(), 'as_dict') else {}
        logger.info("Databricks test: user=%s", me.get('userName') or me.get('displayName'))

        details: dict[str, object] = {}
        # List catalogs (sample)
        try:
            cats = list(w.catalogs.list())
            details['catalogs'] = [c.name for c in cats[:10]]
        except Exception as e:
            logger.warning("Databricks test: list catalogs failed: %s", e)
            details['catalogs'] = []

        # List schemas (sample) for provided catalog
        catalog = (req.catalog if req else None) or os.getenv('DATABRICKS_CATALOG')
        if catalog:
            try:
                schemas = list(w.schemas.list(catalog_name=catalog))
                # Provide a fuller list to the UI (cap to avoid huge payloads)
                names = [s.name for s in schemas]
                details['schemas'] = names[:200]
                details['schemas_sample'] = names[:10]
            except Exception as e:
                logger.warning("Databricks test: list schemas failed: %s", e)
                details['schemas'] = []
                details['schemas_sample'] = []

        # List tables (sample) for provided catalog+schema
        schema = (req.schema if req else None) or os.getenv('DATABRICKS_SCHEMA')
        if catalog and schema:
            try:
                tables = list(w.tables.list(catalog_name=catalog, schema_name=schema))
                details['tables_sample'] = [t.name for t in tables[:10]]
                details['catalog'] = catalog
                details['schema'] = schema
            except Exception as e:
                logger.warning("Databricks test: list tables failed: %s", e)
                details['tables_sample'] = []

        return ConnectorTestResponse(ok=True, details=details)
    except Exception as e:  # pragma: no cover
        logger.exception("Databricks test: connection failed: %s", e)
        return ConnectorTestResponse(ok=False, error=str(e))


class PostgresTestRequest(BaseModel):
    schema: str | None = None


@router.post("/connectors/postgres/test")
async def test_postgres(req: PostgresTestRequest | None = Body(default=None)) -> ConnectorTestResponse:
    sch = (req.schema if req else None) or os.getenv("PG_IMPORT_SCHEMA") or "printshop"
    if engine is None:
        return ConnectorTestResponse(ok=False, error="DATABASE_URL not configured")
    details: dict[str, object] = {"schema": sch}
    try:
        async with engine.connect() as conn:  # type: ignore[assignment]
            # Basic ping
            vr = await conn.execute(text("select version()"))
            details["version"] = (vr.scalar_one() or "").split()[0]
            # List schemas sample
            sr = await conn.execute(text("select schema_name from information_schema.schemata order by schema_name limit 20"))
            details["schemas_sample"] = [r[0] for r in sr.fetchall()]
            # List tables in target schema (sample)
            tr = await conn.execute(text("""
                select table_name from information_schema.tables
                where table_schema = :schema and table_type = 'BASE TABLE'
                order by table_name limit 50
            """), {"schema": sch})
            tbls = [r[0] for r in tr.fetchall()]
            details["tables_sample"] = tbls
        return ConnectorTestResponse(ok=True, details=details)
    except Exception as e:  # pragma: no cover
        logger.exception("Postgres test: failed: %s", e)
        return ConnectorTestResponse(ok=False, error=str(e))


class PostgresImportRequest(BaseModel):
    schema: str
    tables: list[str]


@router.post("/postgres/import")
async def import_postgres(payload: PostgresImportRequest, session: AsyncSession | None = Depends(get_session_optional)) -> dict:
    created: list[str] = []
    for tbl in payload.tables:
        ds = memory_db.create_dataset(DatasetCreate(
            name=tbl,
            description=f"Imported from Postgres {payload.schema}.{tbl}",
            tags=[],
            owner_id="system",
            org_id="org",
            source_type="postgres",
            source_metadata_json={"schema": payload.schema, "table": tbl},
            visibility=Visibility.internal,
        ))
        created.append(ds.id)
        if session is not None:
            row = DM(
                id=ds.id,
                name=ds.name,
                description=ds.description,
                tags=ds.tags,
                owner_id=ds.owner_id,
                org_id=ds.org_id,
                source_type=ds.source_type,
                source_metadata_json=ds.source_metadata_json,
                visibility=str(ds.visibility),
                created_at=ds.created_at,
                updated_at=ds.updated_at,
            )
            session.add(row)
    if session is not None:
        await session.commit()
    return {"created": created}


@router.get("/rfa/destinations")
def rfa_destinations(securable_type: str = Query(...), full_name: str = Query(...)) -> dict:
    """Return access request destinations for the specified securable."""
    try:
        w = get_workspace_client()
        resp = w.rfa.get_access_request_destinations(securable_type=securable_type, full_name=full_name)
        return resp.as_dict() if hasattr(resp, "as_dict") else (resp if isinstance(resp, dict) else {"result": str(resp)})
    except Exception as exc:
        logger.error("RFA destinations failed for %s %s: %s", securable_type, full_name, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/rfa/request")
def rfa_request_access(
    securable_type: str = Body(..., embed=True),
    full_name: str = Body(..., embed=True),
    permissions: list[str] = Body(default_factory=lambda: ["SELECT"], embed=True),
    principal: str | None = Body(default=None, embed=True),
    comment: str | None = Body(default=None, embed=True),
) -> dict:
    """Create an access request using CreateAccessRequest + SecurablePermissions (best-effort via SDK)."""
    try:
        from databricks.sdk.service.iam import Principal, PrincipalType
        from databricks.sdk.service.catalog import Securable, SecurablePermissions, SecurableType
        from databricks.sdk.service.iam import CreateAccessRequest
    except Exception:
        Principal = None  # type: ignore
        PrincipalType = None  # type: ignore
        Securable = None  # type: ignore
        SecurablePermissions = None  # type: ignore
        SecurableType = None  # type: ignore
        CreateAccessRequest = None  # type: ignore
    w = get_workspace_client()
    principal_str = principal or "francis.laurens@databricks.com"
    behalf_of = None
    try:
        if Principal and PrincipalType:
            behalf_of = Principal(id="4506057279870792", principal_type=PrincipalType.USER_PRINCIPAL)
    except Exception:
        behalf_of = None
    stype = (securable_type or "").upper()
    try:
        stype_enum = getattr(SecurableType, stype) if SecurableType else stype
    except Exception:
        raise HTTPException(status_code=400, detail={"error": f"Invalid securable_type '{securable_type}'"})
    try:
        if Securable and SecurablePermissions and CreateAccessRequest and behalf_of is not None:
            sec = Securable(full_name=full_name, type=stype_enum)
            sec_perms = SecurablePermissions(permissions=permissions, securable=sec)
            req = CreateAccessRequest(behalf_of=behalf_of, comment=comment, securable_permissions=[sec_perms])
            # Prefer batch API if present
            if hasattr(w.rfa, 'batch_create_access_requests'):
                resp = w.rfa.batch_create_access_requests(requests=[req])
            elif hasattr(w.rfa, 'create_access_request'):
                resp = w.rfa.create_access_request(request=req)
            else:
                raise HTTPException(status_code=501, detail={"error": "RFA API not available in this workspace SDK"})
        else:
            # No safe SDK available
            # Try documented REST fallback
            try:
                body = {
                    "requests": [{
                        "behalf_of": {"id": "4506057279870792", "principal_type": "USER_PRINCIPAL"},
                        "comment": comment,
                        "securable_permissions": [{
                            "permissions": permissions,
                            "securable": {"full_name": full_name, "type": stype}
                        }]
                    }]
                }
                # Prefer keyword 'data' first; if SDK expects 'body', try that too
                try:
                    resp = w.api_client.do("POST", "/api/3.0/rfa/requests", data=body)  # type: ignore[attr-defined]
                except Exception:
                    resp = w.api_client.do("POST", "/api/3.0/rfa/requests", body=body)  # type: ignore[attr-defined]
            except Exception:
                raise HTTPException(status_code=501, detail={"error": "RFA API not available in this environment"})
        if hasattr(resp, "as_dict"):
            return resp.as_dict()  # type: ignore[attr-defined]
        if isinstance(resp, dict):
            return resp
        return {"result": str(resp)}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("RFA request failed for %s %s: %s", securable_type, full_name, exc)
        detail = {"error": str(exc), "securable_type": securable_type, "full_name": full_name, "behalf_of": principal_str}
        raise HTTPException(status_code=500, detail=detail)


@router.get("/tables/{name}/has_select")
def has_select(name: str, principal_id: str | None = None, principal: str | None = None, catalog: str | None = None, schema: str | None = None) -> dict:
    """Return { allowed: bool } if the principal has SELECT on the table."""
    w = get_workspace_client()
    cat = catalog or os.getenv('DATABRICKS_CATALOG') or 'axel_richier'
    sch = schema or os.getenv('DATABRICKS_SCHEMA') or 'default'
    full_name = f"{cat}.{sch}.{name}"
    principal_id = principal_id or "4506057279870792"
    principal = principal or "francis.laurens@databricks.com"
    try:
        resp = w.grants.get(securable_type="TABLE", full_name=full_name)
        data = resp.as_dict() if hasattr(resp, "as_dict") else (resp if isinstance(resp, dict) else {})
        assignments = data.get("privilege_assignments") or data.get("assignments") or []
        def matches(p: object) -> bool:
            if isinstance(p, str):
                return p == principal or p == principal_id
            if isinstance(p, dict):
                return (
                    p.get("principal") in (principal, principal_id)  # type: ignore[attr-defined]
                    or p.get("user_name") == principal
                    or p.get("email") == principal
                    or p.get("id") == principal_id
                )
            return False
        allowed = False
        for a in assignments:
            ap = a.get("principal") if isinstance(a, dict) else None
            privs = a.get("privileges", []) if isinstance(a, dict) else []
            if matches(ap) and ("SELECT" in privs or "ALL_PRIVILEGES" in privs):
                allowed = True
                break
        if not allowed and hasattr(w.grants, "get_effective"):
            eff = w.grants.get_effective(securable_type="TABLE", full_name=full_name)
            edata = eff.as_dict() if hasattr(eff, "as_dict") else (eff if isinstance(eff, dict) else {})
            eassign = edata.get("privilege_assignments") or edata.get("assignments") or []
            for a in eassign:
                ap = a.get("principal") if isinstance(a, dict) else None
                privs = a.get("privileges", []) if isinstance(a, dict) else []
                if matches(ap) and ("SELECT" in privs or "ALL_PRIVILEGES" in privs):
                    allowed = True
                    break
        return {"allowed": allowed, "full_name": full_name}
    except Exception as exc:
        logger.error("has_select failed for %s: %s", full_name, exc)
        return {"allowed": False, "error": str(exc), "full_name": full_name}

