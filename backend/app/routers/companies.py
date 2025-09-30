from __future__ import annotations

from typing import Dict, Any, List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.db import get_session_optional, UserModel, DatasetModel, EventModel
from backend.app.storage import db

router = APIRouter()


def _dataset_row_to_dict(r: DatasetModel) -> Dict[str, Any]:
    return {
        "id": r.id,
        "name": r.name,
        "description": r.description,
        "tags": r.tags or [],
        "owner_id": r.owner_id,
        "org_id": r.org_id,
        "source_type": r.source_type,
        "source_metadata_json": r.source_metadata_json or {},
        "visibility": r.visibility,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    }


def _user_row_to_dict(r: UserModel) -> Dict[str, Any]:
    return {
        "id": r.id,
        "name": r.name,
        "email": r.email,
        "avatar_url": getattr(r, "avatar_url", None),
        "job_title": getattr(r, "job_title", None),
        "company": getattr(r, "company", None),
        "subsidiary": getattr(r, "subsidiary", None),
        "tools": getattr(r, "tools", None),
    }


@router.get("/companies")
async def list_companies(session: AsyncSession | None = Depends(get_session_optional)) -> Dict[str, Any]:
    items: Dict[str, int] = {}
    if session is not None:
        rows = (await session.execute(select(UserModel))).scalars().all()
        for r in rows:
            name = (getattr(r, "company", None) or "Unknown").strip() or "Unknown"
            items[name] = items.get(name, 0) + 1
    else:
        for u in db.users.values():
            name = (getattr(u, "company", None) or "Unknown").strip() or "Unknown"
            items[name] = items.get(name, 0) + 1
    data = [{"name": k, "count": v} for k, v in sorted(items.items(), key=lambda x: x[0].lower())]
    return {"companies": data}


@router.get("/companies/{company}")
async def get_company(company: str, session: AsyncSession | None = Depends(get_session_optional)) -> Dict[str, Any]:
    users: List[Dict[str, Any]] = []
    datasets: List[Dict[str, Any]] = []
    activity: List[Dict[str, Any]] = []

    if session is not None:
        # Users for company
        ur = await session.execute(select(UserModel).where(UserModel.company == company))
        urows = ur.scalars().all()
        users = [_user_row_to_dict(r) for r in urows]

        # Datasets owned by users of this company or tagged with the company
        drows = []
        owner_ids = [r.id for r in urows] if urows else []
        if owner_ids:
            dr = await session.execute(select(DatasetModel).where(DatasetModel.owner_id.in_(owner_ids)))
            drows.extend(dr.scalars().all())
        # Also by explicit dataset.company
        cr = await session.execute(select(DatasetModel).where(DatasetModel.company == company))
        drows.extend(cr.scalars().all())
        # Deduplicate datasets by id
        seen_ds = set()
        unique_ds = []
        for r in drows:
            if r.id in seen_ds:
                continue
            seen_ds.add(r.id)
            unique_ds.append(r)
            datasets = [_dataset_row_to_dict(r) for r in unique_ds]

            # Related activity: events by these users or on these datasets (last 100)
            ds_ids = [r.id for r in unique_ds]
            eid_owner = await session.execute(select(EventModel).where(EventModel.actor_id.in_(owner_ids)))
            eid_ds = await session.execute(select(EventModel).where(EventModel.dataset_id.in_(ds_ids)))
            evs = eid_owner.scalars().all() + eid_ds.scalars().all()
            # Deduplicate and sort by created_at
            seen = set()
            for e in evs:
                if e.id in seen:
                    continue
                seen.add(e.id)
                activity.append({
                    "id": e.id,
                    "type": e.type,
                    "payload_json": e.payload_json or {},
                    "actor_id": e.actor_id,
                    "dataset_id": e.dataset_id,
                    "created_at": e.created_at,
                })
            activity = sorted(activity, key=lambda x: x.get("created_at", ""))[-100:]
    else:
        # In-memory fallback: filter users and datasets by string company match
        users = [u.model_dump() for u in db.users.values() if getattr(u, "company", None) == company]
        owner_ids = [u["id"] for u in users]
        datasets = [d.model_dump() for d in db.datasets.values() if d.owner_id in owner_ids]
        for ev in db.events:
            if ev.actor_id in owner_ids or ev.dataset_id in {d["id"] for d in datasets}:
                activity.append(ev.model_dump())
        activity = activity[-100:]

    return {"company": company, "users": users, "datasets": datasets, "activity": activity}
