from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Optional

import pystache
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from backend.app.schemas import (
    ConnectRequest,
    ConnectResponse,
    ConnectResponsePayload,
    Dataset,
    DatasetCreate,
    DatasetUpdate,
    JobAccepted,
    PaginatedDatasets,
    PlatformType,
    Visibility,
)
from backend.app.storage import db, now_iso
import logging
from backend.app.db import get_session_optional, DatasetModel, Config, engine
from backend.app.databricks_client import get_table_info
from backend.app.storage import db


router = APIRouter()
logger = logging.getLogger(__name__)
def _dataset_from_row(row: DatasetModel) -> Dataset:
    return Dataset(
        id=row.id,
        name=row.name,
        description=row.description,
        tags=row.tags or [],
        owner_id=row.owner_id,
        org_id=row.org_id,
        #company=getattr(row, 'company', None),
        business_domain=getattr(row, 'business_domain', None),
        source_type=row.source_type,
        source_metadata_json=row.source_metadata_json or {},
        visibility=row.visibility,  # type: ignore[arg-type]
        created_at=row.created_at,
        updated_at=row.updated_at,
    )

async def _detect_datasets_schemas(session: AsyncSession) -> list[str]:
    try:
        # Discover all schemas that have a 'datasets' table, prefer configured one first
        sql = text(
            """
            SELECT table_schema
            FROM information_schema.tables
            WHERE table_name = 'datasets'
            ORDER BY CASE WHEN table_schema = :preferred THEN 0 ELSE 1 END, table_schema
            """
        )
        res = await session.execute(sql, {"preferred": Config.SCHEMA})
        rows = res.fetchall()
        return [r[0] for r in rows if r and r[0]]
    except Exception:
        return []

async def _safe_fetch_dataset_by_id(session: AsyncSession, dataset_id: str) -> Dataset | None:
    try:
        table = DatasetModel.__table__
        stmt = select(
            table.c.id,
            table.c.name,
            table.c.description,
            table.c.tags,
            table.c.owner_id,
            table.c.org_id,
            table.c.source_type,
            table.c.source_metadata_json,
            table.c.visibility,
            table.c.created_at,
            table.c.updated_at,
        ).where(table.c.id == dataset_id)
        res = await session.execute(stmt)
        row = res.mappings().first()
        if not row:
            # Try across all candidate schemas
            schemas = await _detect_datasets_schemas(session)
            for schema in schemas:
                sql = text(
                    f'SELECT id, name, description, tags, owner_id, org_id, source_type, source_metadata_json, visibility, created_at, updated_at FROM "{schema}".datasets WHERE id = :id'
                )
                res = await session.execute(sql, {"id": dataset_id})
                row = res.mappings().first()
                if row:
                    break
        if not row and engine is not None:
            # Last-resort: direct engine query (bypass session state)
            try:
                async with engine.connect() as conn:  # type: ignore[assignment]
                    schemas = await _detect_datasets_schemas(session)
                    for schema in schemas or [Config.SCHEMA]:
                        sql = text(
                            f'SELECT id, name, description, tags, owner_id, org_id, source_type, source_metadata_json, visibility, created_at, updated_at FROM "{schema}".datasets WHERE id = :id'
                        )
                        r = await conn.execute(sql, {"id": dataset_id})
                        m = r.mappings().first()
                        if m:
                            row = m
                            break
            except Exception:
                pass
        if not row:
            # Try unqualified table using current search_path
            sql2 = text(
                'SELECT id, name, description, tags, owner_id, org_id, source_type, source_metadata_json, visibility, created_at, updated_at FROM datasets WHERE id = :id'
            )
            res = await session.execute(sql2, {"id": dataset_id})
            row = res.mappings().first()
        if not row:
            return None
        return Dataset(
            id=row["id"],
            name=row["name"],
            description=row.get("description"),
            tags=row.get("tags") or [],
            owner_id=row["owner_id"],
            org_id=row["org_id"],
           # company=None,
           # business_domain=None,
            source_type=row["source_type"],
            source_metadata_json=row.get("source_metadata_json") or {},
            visibility=row["visibility"],  # type: ignore[arg-type]
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
    except Exception:
        return None

async def _safe_fetch_all_datasets(session: AsyncSession) -> list[Dataset]:
    try:
        table = DatasetModel.__table__
        stmt = select(
            table.c.id,
            table.c.name,
            table.c.description,
            table.c.tags,
            table.c.owner_id,
            table.c.org_id,
            table.c.source_type,
            table.c.source_metadata_json,
            table.c.visibility,
            table.c.created_at,
            table.c.updated_at,
        )
        res = await session.execute(stmt)
        rows = res.mappings().all()
        if not rows:
            schemas = await _detect_datasets_schemas(session)
            for schema in schemas:
                sql = text(
                    f'SELECT id, name, description, tags, owner_id, org_id, source_type, source_metadata_json, visibility, created_at, updated_at FROM "{schema}".datasets'
                )
                res = await session.execute(sql)
                rows = res.mappings().all()
                if rows:
                    break
        if not rows:
            # Try unqualified table
            sql2 = text(
                'SELECT id, name, description, tags, owner_id, org_id, source_type, source_metadata_json, visibility, created_at, updated_at FROM datasets'
            )
            res = await session.execute(sql2)
            rows = res.mappings().all()
        items: list[Dataset] = []
        for row in rows:
            items.append(Dataset(
                id=row["id"],
                name=row["name"],
                description=row.get("description"),
                tags=row.get("tags") or [],
                owner_id=row["owner_id"],
                org_id=row["org_id"],
                #company=None,
                #business_domain=None,
                source_type=row["source_type"],
                source_metadata_json=row.get("source_metadata_json") or {},
                visibility=row["visibility"],  # type: ignore[arg-type]
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            ))
        return items
    except Exception:
        return []


@router.get("/datasets")
async def list_datasets(
    query: Optional[str] = None,
    owner_id: Optional[str] = None,
    org_id: Optional[str] = None,
    platform: Optional[PlatformType] = None,
    visibility: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    session: AsyncSession | None = Depends(get_session_optional),
) -> PaginatedDatasets:
    # If DB session available, read from DB
    items = list(db.datasets.values())
    if session is not None:
        try:
            res = await session.execute(select(DatasetModel))
            rows = res.scalars().all()
            if rows:
                items = [
                    _dataset_from_row(r)
                    for r in rows
                ]
            else:
                # Wrong schema? Try safe fetch across schemas
                safe = await _safe_fetch_all_datasets(session)
                if safe:
                    items = safe
        except Exception as e:
            logger.debug("list_datasets: ORM read failed (%s); attempting safe text query.", e)
            safe = await _safe_fetch_all_datasets(session)
            if safe:
                items = safe
    # naive filter for MVP
    if query:
        q = query.lower()
        items = [d for d in items if q in d.name.lower() or (d.description or "").lower().find(q) >= 0]
    if owner_id:
        items = [d for d in items if d.owner_id == owner_id]
    if org_id:
        items = [d for d in items if d.org_id == org_id]
    if visibility:
        items = [d for d in items if d.visibility == visibility]

    total = len(items)
    start = (page - 1) * per_page
    end = start + per_page
    return PaginatedDatasets(page=page, per_page=per_page, total=total, data=items[start:end])


@router.post("/datasets", status_code=201)
async def create_dataset(payload: DatasetCreate, session: AsyncSession | None = Depends(get_session_optional)) -> Dataset:
    ds = db.create_dataset(payload)
    # persist to DB if available
    if session is not None:
        from backend.app.db import DatasetModel as DM
        model = DM(
            id=ds.id,
            name=ds.name,
            description=ds.description,
            tags=ds.tags,
            owner_id=ds.owner_id,
            org_id=ds.org_id,
            #company=ds.company,
            #=ds.business_domain,
            source_type=ds.source_type,
            source_metadata_json=ds.source_metadata_json,
            visibility=ds.visibility.value if hasattr(ds.visibility, 'value') else ds.visibility,  # type: ignore[attr-defined]
            created_at=ds.created_at,
            updated_at=ds.updated_at,
        )
        session.add(model)
        await session.commit()
    # emit dataset.published event (memory + DB)
    from backend.app.schemas import Event
    ev = Event(
        id=str(uuid.uuid4()),
        type="dataset.published",
        payload_json={"name": ds.name},
        actor_id="demo-user",
        dataset_id=ds.id,
        created_at=ds.created_at,
    )
    db.add_event(ev)
    if session is not None:
        from backend.app.db import EventModel as EM
        em = EM(
            id=ev.id,
            type=ev.type,
            payload_json=ev.payload_json,
            actor_id=ev.actor_id,
            dataset_id=ev.dataset_id,
            created_at=ev.created_at,
        )
        session.add(em)
        await session.commit()
    return ds


@router.get("/datasets/{id}")
async def get_dataset(id: str, session: AsyncSession | None = Depends(get_session_optional)) -> Dataset:
    ds = db.datasets.get(id)
    if session is not None:
        row = None
        try:
            res = await session.execute(select(DatasetModel).where(DatasetModel.id == id))
            row = res.scalar_one_or_none()
            
        except Exception as e:
            print("get_dataset: ORM read failed (%s); attempting safe text query.", e)
            logger.debug("get_dataset: ORM read failed (%s); attempting safe text query.", e)
        if row:
            ds = _dataset_from_row(row)
        else:
            print("failed getting dataset")
            # Try safe fetch across schemas when ORM returns nothing
            try:
                ds = await _safe_fetch_dataset_by_id(session, id)
            except Exception as e:
                logger.debug("get_dataset: safe fetch failed (%s)", e)
    if not ds:
        # Derive best-effort details from recent events
        derived_name = None
        created = None
        actor = "unknown"
        if session is not None:
            try:
                from backend.app.db import EventModel
                eres = await session.execute(select(EventModel).where(EventModel.dataset_id == id))
                erows = eres.scalars().all()
                if erows:
                    pub = [e for e in erows if e.type == "dataset.published"]
                    pick = pub[-1] if pub else sorted(erows, key=lambda r: r.created_at)[-1]
                    payload = pick.payload_json or {}
                    derived_name = payload.get("name") or payload.get("dataset") or None
                    created = pick.created_at
                    actor = pick.actor_id or actor
            except Exception:
                pass
        else:
            evs = [e for e in db.events if e.dataset_id == id]
            if evs:
                pub = [e for e in evs if e.type == "dataset.published"]
                pick = pub[-1] if pub else evs[-1]
                derived_name = pick.payload_json.get("name") or pick.payload_json.get("dataset")
                created = pick.created_at
                actor = pick.actor_id or actor

        now = now_iso()
        ds = Dataset(
            id=id,
            name=derived_name or "Dataset",
            description=None,
            tags=[],
            owner_id=actor,
            org_id="org",
            #company=None,
            #business_domain=None,
            source_type="unknown",
            source_metadata_json={},
            visibility=Visibility.public,
            created_at=created or now,
            updated_at=created or now,
        )
    # Enrich description from Databricks UC table comment when applicable
    try:
        if (ds.source_type == "databricks.uc"):
            src = ds.source_metadata_json or {}
            cat = src.get("catalog")
            sch = src.get("schema")
            tbl = src.get("table") or src.get("name")
            if cat and sch and tbl:
                info = get_table_info(cat, sch, tbl)
                comment = info.get("description") or info.get("comment")
                if comment and not ds.description:
                    ds.description = comment
    except Exception:
        # best-effort enrichment; ignore failures
        pass
    return ds


@router.get("/datasets/{id}/preview")
async def dataset_preview(id: str, session: AsyncSession | None = Depends(get_session_optional)) -> dict:
    # Minimal preview: schema sample from UC metadata if present
    ds = db.datasets.get(id)
    if not ds and session is not None:
        try:
            res = await session.execute(select(DatasetModel).where(DatasetModel.id == id))
            row = res.scalar_one_or_none()
            if row:
                ds = _dataset_from_row(row)
            else:
                ds = await _safe_fetch_dataset_by_id(session, id)
        except Exception as e:
            logger.debug("dataset_preview: ORM read failed (%s); using fallback", e)
    # If still missing, return a harmless placeholder preview instead of 404
    if not ds:
        return {
            "schema_sample": [],
            "row_count": None,
            "platform": "unknown",
            "data_type": "table",
        }
    src = ds.source_metadata_json or {}
    # Provide minimal stub structure; frontend can render gracefully
    schema_sample = []
    if src.get("schema") and src.get("table"):
        # Try to fetch Databricks table info if possible
        try:
            from backend.app.databricks_client import get_table_info
            info = get_table_info(src.get("catalog"), src.get("schema"), src.get("table"))
            schema_sample = (info.get("columns") or [])[:5]
            row_count = info.get("properties", {}).get("numRows") or None
        except Exception:
            row_count = None
    else:
        row_count = None
    return {
        "schema_sample": schema_sample,
        "row_count": row_count,
        "platform": "databricks" if ds.source_type == "databricks.uc" else ds.source_type,
        "data_type": "table",
    }


@router.get("/datasets/{id}/engagement")
async def dataset_engagement(id: str, session: AsyncSession | None = Depends(get_session_optional)) -> dict:
    # Reuse social summary and add recent actor stubs
    from sqlalchemy import select
    from backend.app.db import LikeModel, FollowModel
    followers = sum(1 for (uid, dsid), v in db.follows.items() if dsid == id and v)
    likes = sum(1 for (uid, dsid), v in db.likes.items() if dsid == id and v)
    recent_actors = []
    if session is not None:
        fr = await session.execute(select(FollowModel).where(FollowModel.dataset_id==id))
        lr = await session.execute(select(LikeModel).where(LikeModel.dataset_id==id))
        followers = len(fr.scalars().all())
        likes = len(lr.scalars().all())
    # Minimal avatars
    for i in range(min(followers, 3)):
        recent_actors.append({"id": f"u{i}", "name": f"User {i+1}", "avatar_url": f"https://ui-avatars.com/api/?name=U{i+1}"})
    # Simple health signals: freshness (hours), schema changes in recent events
    try:
        from datetime import datetime, timezone
        ds = db.datasets.get(id)
        if ds:
            dt = datetime.fromisoformat((ds.updated_at or ds.created_at).replace('Z','+00:00'))
            freshness_hours = max(0, int((datetime.now(timezone.utc) - dt).total_seconds() // 3600))
        else:
            freshness_hours = None
    except Exception:
        freshness_hours = None
    schema_changes = 0
    for ev in db.events[-200:]:
        if ev.dataset_id == id and ev.type == 'dataset.schema.changed':
            schema_changes += 1
    return {"counts": {"followers": followers, "likes": likes}, "recent_actors": recent_actors, "health": {"freshness_hours": freshness_hours, "schema_changes_30d": schema_changes}}


@router.patch("/datasets/{id}")
async def patch_dataset(id: str, patch: DatasetUpdate, session: AsyncSession | None = Depends(get_session_optional)) -> Dataset:
    ds = db.update_dataset(id, patch)
    # If not found in memory, try DB
    if not ds and session is not None:
        res = await session.execute(select(DatasetModel).where(DatasetModel.id == id))
        row = res.scalar_one_or_none()
        if row:
            existing = _dataset_from_row(row)
            # apply patch
            update_data = patch.model_dump(exclude_unset=True)
            for k, v in update_data.items():
                setattr(existing, k, v)
            # persist back
            row.name = existing.name
            row.description = existing.description
            row.tags = existing.tags
            row.visibility = str(existing.visibility)
            row.source_metadata_json = existing.source_metadata_json
            await session.commit()
            return existing
    if not ds:
        raise HTTPException(404, detail="Dataset not found")
    # Also persist memory-updated dataset to DB if available
    if session is not None:
        res = await session.execute(select(DatasetModel).where(DatasetModel.id == id))
        row = res.scalar_one_or_none()
        if row:
            row.name = ds.name
            row.description = ds.description
            row.tags = ds.tags
            row.visibility = str(ds.visibility)
            row.source_metadata_json = ds.source_metadata_json
            await session.commit()
    return ds


def _render_template(template_path: Path, context: dict) -> str:
    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()
    renderer = pystache.Renderer(escape=lambda u: u)  # do not HTML-escape code
    return renderer.render(template, context)


@router.post("/datasets/{id}/connect")
async def connect_dataset(id: str, request: ConnectRequest, session: AsyncSession | None = Depends(get_session_optional)) -> ConnectResponse:
    ds = db.datasets.get(id)
    if not ds and session is not None:
        res = await session.execute(select(DatasetModel).where(DatasetModel.id == id))
        row = res.scalar_one_or_none()
        if row:
            ds = _dataset_from_row(row)
    if not ds:
        raise HTTPException(404, detail="Dataset not found")

    # pick platform from request or stub user's default platform
    platform = request.target_platform_type or PlatformType.snowflake

    # Build context from dataset.source_metadata_json and a stub target
    context = {
        "source": ds.source_metadata_json,
        "target": {
            "platform": platform.value,
            "database": "ANALYTICS",
            "schema": "PUBLIC",
            "table": ds.name.upper(),
            "mount": "/mnt/delta",
            "path": ds.name.lower(),
            "project": "demo",
            "dataset": "public",
            "iam_role": "arn:aws:iam::123456789012:role/RedshiftCopyRole",
        },
        "user": {"name": "Demo User", "email": "demo@example.com"},
    }

    templates_root = Path(os.getcwd()) / "templates"
    artifacts = []
    snippet = ""

    if platform == PlatformType.snowflake:
        path = templates_root / "snowflake.sql.mustache"
        snippet = _render_template(path, context)
        artifacts.append({"type": "sql", "content": snippet})
    elif platform == PlatformType.databricks:
        path = templates_root / "databricks.py.mustache"
        snippet = _render_template(path, context)
        artifacts.append({"type": "python", "content": snippet})
    elif platform == PlatformType.bigquery:
        path = templates_root / "bigquery.sql.mustache"
        snippet = _render_template(path, context)
        artifacts.append({"type": "sql", "content": snippet})
    elif platform == PlatformType.redshift:
        path = templates_root / "redshift.sql.mustache"
        snippet = _render_template(path, context)
        artifacts.append({"type": "sql", "content": snippet})

    # Emit dataset.connected event (in-memory)
    from backend.app.schemas import Event
    ev = Event(
        id=str(uuid.uuid4()),
        type="dataset.connected",
        payload_json={"platform": platform.value},
        actor_id="demo-user",
        dataset_id=ds.id,
        created_at=now_iso(),
    )
    db.add_event(ev)
    if session is not None:
        from backend.app.db import EventModel as EM
        em = EM(
            id=ev.id,
            type=ev.type,
            payload_json=ev.payload_json,
            actor_id=ev.actor_id,
            dataset_id=ev.dataset_id,
            created_at=ev.created_at,
        )
        session.add(em)
        await session.commit()

    payload = ConnectResponsePayload(snippet=snippet, artifacts=artifacts, connection_test={"ok": True})
    return ConnectResponse(platform=platform, payload=payload)  # type: ignore[arg-type]


@router.post("/datasets/{id}/refresh", status_code=202)
def refresh_dataset(id: str) -> JobAccepted:
    job_id = str(uuid.uuid4())
    return JobAccepted(job_id=job_id, status="accepted")


class SchemaChangeRequest(BaseModel):
    column: str
    change: str = "added"
    details: dict | None = None


@router.post("/datasets/{id}/events/schema-change", status_code=201)
async def add_schema_change_event(id: str, body: SchemaChangeRequest, session: AsyncSession | None = Depends(get_session_optional)) -> dict:
    from backend.app.schemas import Event
    ev = Event(
        id=str(uuid.uuid4()),
        type="dataset.schema.changed",
        payload_json={"column": body.column, "change": body.change, "details": body.details or {}},
        actor_id="system",
        dataset_id=id,
        created_at=now_iso(),
    )
    db.add_event(ev)
    if session is not None:
        from backend.app.db import EventModel as EM
        em = EM(
            id=ev.id,
            type=ev.type,
            payload_json=ev.payload_json,
            actor_id=ev.actor_id,
            dataset_id=ev.dataset_id,
            created_at=ev.created_at,
        )
        session.add(em)
        await session.commit()
    return {"ok": True, "event_id": ev.id}


