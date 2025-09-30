from __future__ import annotations

import asyncio
import json
from typing import Optional

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.schemas import PaginatedEvents, Event
from backend.app.storage import db, now_iso
from backend.app.db import get_session_optional, EventModel, DatasetModel


router = APIRouter()


@router.get("/feed")
async def get_feed(cursor: Optional[str] = None, limit: int = 50, session: AsyncSession | None = Depends(get_session_optional)) -> PaginatedEvents:
    # naive: ignore cursor and return latest N
    if session is not None:
        # Order by created_at to ensure latest items are shown first
        res = await session.execute(select(EventModel))
        rows = res.scalars().all()
        rows = sorted(rows, key=lambda r: r.created_at)
        data = []
        for r in rows[-limit:]:
            payload = r.payload_json or {}
            # Add human_text hint (best-effort)
            human = payload.get("human_text")
            if not human:
                if r.type == "dataset.published":
                    human = f"{payload.get('name', 'Dataset')} was added"
                elif r.type == "dataset.connected":
                    human = f"Connected to {payload.get('platform','target')}"
                elif r.type == "dataset.refreshed":
                    human = f"Refreshed {payload.get('delta_rows','')} rows"
                elif r.type == "dataset.schema.changed":
                    human = "Schema updated"
                elif r.type == "user.followed":
                    human = "New follower"
                elif r.type == "dataset.liked":
                    human = "New like"
                payload["human_text"] = human
            data.append(Event(
                id=r.id,
                type=r.type,
                payload_json=payload,
                actor_id=r.actor_id,
                dataset_id=r.dataset_id,
                created_at=r.created_at,
            ))
        return PaginatedEvents(cursor=None, data=data)
    data = db.events[-limit:]
    return PaginatedEvents(cursor=None, data=data)


@router.get("/datasets/{dataset_id}/activity")
async def get_dataset_activity(dataset_id: str, limit: int = 50, session: AsyncSession | None = Depends(get_session_optional)) -> PaginatedEvents:
    if session is not None:
        res = await session.execute(select(EventModel).where(EventModel.dataset_id == dataset_id))
        rows = res.scalars().all()
        rows = sorted(rows, key=lambda r: r.created_at)
        data = [
            Event(
                id=r.id,
                type=r.type,
                payload_json=r.payload_json or {},
                actor_id=r.actor_id,
                dataset_id=r.dataset_id,
                created_at=r.created_at,
            )
            for r in rows[-limit:]
        ]
        return PaginatedEvents(cursor=None, data=data)
    filtered = [ev for ev in db.events if ev.dataset_id == dataset_id]
    return PaginatedEvents(cursor=None, data=filtered[-limit:])


async def sse_event_generator():
    last_index = 0
    while True:
        await asyncio.sleep(1)
        new_events = db.events[last_index:]
        if new_events:
            last_index = len(db.events)
            for ev in new_events:
                payload = ev.model_dump()
                yield f"event: {payload['type']}\n".encode("utf-8")
                yield f"data: {json.dumps(payload)}\n\n".encode("utf-8")


@router.get("/feed/stream")
def feed_stream():
    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")


@router.post("/feed/backfill/datasets")
async def backfill_datasets(session: AsyncSession | None = Depends(get_session_optional)) -> dict:
    created = 0
    total = 0
    if session is not None:
        # Load all datasets from DB
        dres = await session.execute(select(DatasetModel))
        rows = dres.scalars().all()
        total = len(rows)
        for r in rows:
            # Check if a published event exists
            eres = await session.execute(select(EventModel).where(EventModel.dataset_id == r.id, EventModel.type == "dataset.published"))
            exists = eres.scalar_one_or_none()
            if exists:
                continue
            ev = Event(
                id=str(uuid.uuid4()),
                type="dataset.published",
                payload_json={"name": r.name},
                actor_id="system-backfill",
                dataset_id=r.id,
                created_at=r.created_at or now_iso(),
            )
            db.add_event(ev)
            em = EventModel(
                id=ev.id,
                type=ev.type,
                payload_json=ev.payload_json,
                actor_id=ev.actor_id,
                dataset_id=ev.dataset_id,
                created_at=ev.created_at,
            )
            session.add(em)
            created += 1
        await session.commit()
    else:
        items = list(db.datasets.values())
        total = len(items)
        for ds in items:
            if any(e.type == "dataset.published" and e.dataset_id == ds.id for e in db.events):
                continue
            ev = Event(
                id=str(uuid.uuid4()),
                type="dataset.published",
                payload_json={"name": ds.name},
                actor_id="system-backfill",
                dataset_id=ds.id,
                created_at=ds.created_at,
            )
            db.add_event(ev)
            created += 1
    return {"total_datasets": total, "events_created": created}


