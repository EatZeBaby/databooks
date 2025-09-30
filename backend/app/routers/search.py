from __future__ import annotations

from fastapi import APIRouter

from backend.app.schemas import Suggestions
from backend.app.storage import db


router = APIRouter()


@router.get("/search/suggestions")
def suggestions(q: str) -> Suggestions:
    ql = q.lower()
    names = [d.name for d in db.datasets.values() if ql in d.name.lower()]
    return Suggestions(suggestions=names[:10])


