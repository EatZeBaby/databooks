from __future__ import annotations

from collections import Counter
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.storage import db
from backend.app.db import get_session_optional, DatasetModel


router = APIRouter()


@router.get("/tags")
async def list_tags(session: AsyncSession | None = Depends(get_session_optional)) -> dict:
  counts: Counter[str] = Counter()
  if session is not None:
    res = await session.execute(select(DatasetModel))
    for r in res.scalars().all():
      for t in (r.tags or []):
        counts[str(t)] += 1
  else:
    for d in db.datasets.values():
      for t in (d.tags or []):
        counts[str(t)] += 1
  top = sorted(counts.items(), key=lambda x: (-x[1], x[0]))
  return {"data": [{"tag": k, "count": v} for k, v in top]}


@router.get("/tags/{tag}/datasets")
async def datasets_by_tag(tag: str, session: AsyncSession | None = Depends(get_session_optional)) -> dict:
  tag_l = tag.lower()
  items = []
  if session is not None:
    res = await session.execute(select(DatasetModel))
    for r in res.scalars().all():
      tags = [str(t).lower() for t in (r.tags or [])]
      if tag_l in tags:
        items.append({
          "id": r.id,
          "name": r.name,
          "description": r.description,
          "visibility": r.visibility,
        })
  else:
    for d in db.datasets.values():
      tags = [str(t).lower() for t in (d.tags or [])]
      if tag_l in tags:
        items.append({
          "id": d.id,
          "name": d.name,
          "description": d.description,
          "visibility": str(d.visibility),
        })
  return {"data": items}


@router.post("/tags/{tag}/follow")
def follow_tag(tag: str, follow: bool = True) -> dict:
  user_id = "demo-user"
  key = (user_id, tag)
  if follow:
    db.tag_follows[key] = True
  else:
    db.tag_follows.pop(key, None)
  return {"tag": tag, "following": follow}


@router.get("/tags/{tag}/followers")
def tag_followers(tag: str) -> dict:
  count = sum(1 for (uid, t), v in db.tag_follows.items() if t == tag and v)
  me = db.tag_follows.get(("demo-user", tag), False)
  return {"followers": count, "following": bool(me)}


