from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.schemas import FollowState, FollowToggleRequest, Event
from backend.app.storage import db, now_iso
from backend.app.db import get_session_optional, FollowModel, LikeModel, EventModel


router = APIRouter()


@router.post("/follows")
async def follow_toggle(req: FollowToggleRequest, session: AsyncSession | None = Depends(get_session_optional)) -> FollowState:
    user_id = req.user_id or "demo-user"
    key = (user_id, req.dataset_id)
    if req.follow:
        db.follows[key] = True
        if session is not None:
            # Idempotent insert: only add if missing
            existing = await session.execute(select(FollowModel).where(FollowModel.user_id==user_id, FollowModel.dataset_id==req.dataset_id))
            if existing.scalar_one_or_none() is None:
                session.add(FollowModel(user_id=user_id, dataset_id=req.dataset_id))
                await session.commit()
    else:
        db.follows.pop(key, None)
        if session is not None:
            await session.execute(delete(FollowModel).where(FollowModel.user_id==user_id, FollowModel.dataset_id==req.dataset_id))
            await session.commit()
    # emit feed event
    ev = Event(
        id=str(__import__('uuid').uuid4()),
        type="user.followed",
        payload_json={"follow": req.follow},
        actor_id=user_id,
        dataset_id=req.dataset_id,
        created_at=now_iso(),
    )
    db.add_event(ev)
    if session is not None:
        em = EventModel(id=ev.id, type=ev.type, payload_json=ev.payload_json, actor_id=ev.actor_id, dataset_id=ev.dataset_id, created_at=ev.created_at)
        session.add(em)
        await session.commit()
    return FollowState(dataset_id=req.dataset_id, following=req.follow)


@router.post("/likes")
async def like_toggle(req: FollowToggleRequest, session: AsyncSession | None = Depends(get_session_optional)) -> FollowState:
    user_id = req.user_id or "demo-user"
    key = (user_id, req.dataset_id)
    if req.follow:
        db.likes[key] = True
        if session is not None:
            # Idempotent insert: only add if missing
            existing = await session.execute(select(LikeModel).where(LikeModel.user_id==user_id, LikeModel.dataset_id==req.dataset_id))
            if existing.scalar_one_or_none() is None:
                session.add(LikeModel(user_id=user_id, dataset_id=req.dataset_id))
                await session.commit()
    else:
        db.likes.pop(key, None)
        if session is not None:
            await session.execute(delete(LikeModel).where(LikeModel.user_id==user_id, LikeModel.dataset_id==req.dataset_id))
            await session.commit()
    # emit feed event
    ev = Event(
        id=str(__import__('uuid').uuid4()),
        type="dataset.liked",
        payload_json={"like": req.follow},
        actor_id=user_id,
        dataset_id=req.dataset_id,
        created_at=now_iso(),
    )
    db.add_event(ev)
    if session is not None:
        em = EventModel(id=ev.id, type=ev.type, payload_json=ev.payload_json, actor_id=ev.actor_id, dataset_id=ev.dataset_id, created_at=ev.created_at)
        session.add(em)
        await session.commit()
    return FollowState(dataset_id=req.dataset_id, following=req.follow)


@router.get("/datasets/{id}/social")
async def dataset_social_summary(id: str, session: AsyncSession | None = Depends(get_session_optional)) -> dict:
    followers = sum(1 for (uid, dsid), v in db.follows.items() if dsid == id and v)
    likes = sum(1 for (uid, dsid), v in db.likes.items() if dsid == id and v)
    if session is not None:
        fr = await session.execute(select(FollowModel).where(FollowModel.dataset_id==id))
        lr = await session.execute(select(LikeModel).where(LikeModel.dataset_id==id))
        followers = len(fr.scalars().all())
        likes = len(lr.scalars().all())
    # include current user's state (demo-user context)
    me_following = ("demo-user", id) in db.follows and db.follows.get(("demo-user", id))
    me_liked = ("demo-user", id) in db.likes and db.likes.get(("demo-user", id))
    if session is not None:
        # override from DB if present
        mfr = await session.execute(select(FollowModel).where(FollowModel.user_id=="demo-user", FollowModel.dataset_id==id))
        mlr = await session.execute(select(LikeModel).where(LikeModel.user_id=="demo-user", LikeModel.dataset_id==id))
        me_following = mfr.scalar_one_or_none() is not None
        me_liked = mlr.scalar_one_or_none() is not None
    return {"followers": followers, "likes": likes, "following": bool(me_following), "liked": bool(me_liked)}


@router.get("/users/me/social")
async def my_social(session: AsyncSession | None = Depends(get_session_optional)) -> dict:
    user_id = "demo-user"
    following = []
    liked = []
    if session is not None:
        fr = await session.execute(select(FollowModel).where(FollowModel.user_id==user_id))
        lr = await session.execute(select(LikeModel).where(LikeModel.user_id==user_id))
        following = [r.dataset_id for r in fr.scalars().all()]
        liked = [r.dataset_id for r in lr.scalars().all()]
    else:
        following = [dsid for (uid, dsid), v in db.follows.items() if uid==user_id and v]
        liked = [dsid for (uid, dsid), v in db.likes.items() if uid==user_id and v]
    return {"following": following, "liked": liked}


