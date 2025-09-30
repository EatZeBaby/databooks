from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from backend.app.schemas import User, PlatformProfile, PlatformProfileUpdate
from backend.app.storage import db
from backend.app.db import get_session_optional, PlatformProfileModel, FollowModel, LikeModel, UserModel, Config


router = APIRouter()
logger = logging.getLogger(__name__)


async def _safe_fetch_all_users(session: AsyncSession) -> list[User]:
    try:
        sql = text(
            f'SELECT id, name, email, org_id, role, created_at, avatar_url, job_title, company, subsidiary FROM "{Config.SCHEMA}".users'
        )
        res = await session.execute(sql)
        rows = res.mappings().all()
        logger.info("users._safe_fetch_all_users: fetched %d rows via text from schema=%s", len(rows), Config.SCHEMA)
        print("users._safe_fetch_all_users schema count=", len(rows), "schema=", Config.SCHEMA)
        return [
            User(
                id=r["id"],
                name=r["name"],
                email=r["email"],
                platform_profile_id=None,
                org_id=r.get("org_id") or "org",
                role=r.get("role") or "consumer",
                created_at=r.get("created_at") or "1970-01-01T00:00:00Z",
                platform_profile=None,
                avatar_url=r.get("avatar_url"),
                tools=None,
                job_title=r.get("job_title"),
                company=r.get("company"),
                subsidiary=r.get("subsidiary"),
                domain=None,
            )
            for r in rows
        ]
    except Exception as e:
        logger.info("users._safe_fetch_all_users: text select failed: %s", e)
        print("users._safe_fetch_all_users schema error:", e)
    # Unqualified fallback using current search_path
    try:
        sql2 = text(
            'SELECT id, name, email, org_id, role, created_at, avatar_url, job_title, company, subsidiary FROM users'
        )
        res2 = await session.execute(sql2)
        rows2 = res2.mappings().all()
        logger.info("users._safe_fetch_all_users: fetched %d rows via unqualified select (search_path)", len(rows2))
        print("users._safe_fetch_all_users unqualified count=", len(rows2))
        return [
            User(
                id=r["id"],
                name=r["name"],
                email=r["email"],
                platform_profile_id=None,
                org_id=r.get("org_id") or "org",
                role=r.get("role") or "consumer",
                created_at=r.get("created_at") or "1970-01-01T00:00:00Z",
                platform_profile=None,
                avatar_url=r.get("avatar_url"),
                tools=None,
                job_title=r.get("job_title"),
                company=r.get("company"),
                subsidiary=r.get("subsidiary"),
                domain=None,
            )
            for r in rows2
        ]
    except Exception as e2:
        logger.info("users._safe_fetch_all_users: unqualified select failed: %s", e2)
        print("users._safe_fetch_all_users unqualified error:", e2)
        return []


@router.get("/users/{id}/profile")
def get_user_profile(id: str) -> User:
    user = db.get_user(id)
    if not user:
        raise HTTPException(404, detail="User not found")
    return user


def _demo_user() -> User:
    # Minimal demo user; in real app, derive from auth token
    return User(
        id="demo-user",
    name="Axel Richier",
    email="axel.richier@databricks.com",
        platform_profile_id=None,
        org_id="org",
        role="consumer",
        created_at="1970-01-01T00:00:00Z",
        platform_profile=None,
        avatar_url="data:image/jpeg;base64,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",
        tools=["databricks"],
    job_title="Solutions Architect",
    company="Databricks",
    subsidiary="",
    )


@router.get("/users/me")
def get_me() -> User:
    return _demo_user()


@router.patch("/users/me")
async def patch_me(body: dict) -> User:
    # Persisting in memory for demo
    u = _demo_user()
    if "name" in body:
        u.name = str(body["name"])[:128]
    if "avatar_url" in body:
        u.avatar_url = str(body["avatar_url"])[:1024]
    if "tools" in body and isinstance(body["tools"], list):
        u.tools = [str(t) for t in body["tools"]][:5]
    if "job_title" in body:
        u.job_title = str(body["job_title"])[:128]
    if "company" in body:
        u.company = str(body["company"])[:128]
    if "subsidiary" in body:
        u.subsidiary = str(body["subsidiary"])[:128]
    return u


@router.get("/users/{id}")
async def get_user(id: str, session: AsyncSession | None = Depends(get_session_optional)) -> User:
    # First, in-memory cache
    u = db.get_user(id)
    if u:
        return u
    # Then DB via ORM
    if session is not None:
        try:
            res = await session.execute(select(UserModel).where(UserModel.id == id))
            row = res.scalar_one_or_none()
            if row is not None:
                return User(
                    id=row.id,
                    name=row.name,
                    email=row.email,
                    platform_profile_id=None,
                    org_id=getattr(row, 'org_id', 'org'),
                    role=getattr(row, 'role', 'consumer'),
                    created_at=getattr(row, 'created_at', '1970-01-01T00:00:00Z'),
                    platform_profile=None,
                    avatar_url=getattr(row, 'avatar_url', None),
                    tools=getattr(row, 'tools', None),
                    job_title=getattr(row, 'job_title', None),
                    company=getattr(row, 'company', None),
                    subsidiary=getattr(row, 'subsidiary', None),
                    domain=getattr(row, 'domain', None),
                )
        except Exception as e:
            logger.info("users.get_user: ORM failed: %s", e)
    # Text fallback
    if session is not None:
        try:
            sql = text(
                f'SELECT id, name, email, org_id, role, created_at, avatar_url, job_title, company, subsidiary FROM "{Config.SCHEMA}".users WHERE id = :id'
            )
            res = await session.execute(sql, {"id": id})
            r = res.mappings().first()
            if r:
                return User(
                    id=r["id"], name=r["name"], email=r["email"], platform_profile_id=None,
                    org_id=r.get("org_id") or "org", role=r.get("role") or "consumer",
                    created_at=r.get("created_at") or "1970-01-01T00:00:00Z", platform_profile=None,
                    avatar_url=r.get("avatar_url"), tools=None, job_title=r.get("job_title"),
                    company=r.get("company"), subsidiary=r.get("subsidiary"), domain=None,
                )
        except Exception as e:
            logger.info("users.get_user: text select failed: %s", e)
        # Unqualified fallback
        try:
            sql2 = text('SELECT id, name, email, org_id, role, created_at, avatar_url, job_title, company, subsidiary FROM users WHERE id = :id')
            res2 = await session.execute(sql2, {"id": id})
            r2 = res2.mappings().first()
            if r2:
                return User(
                    id=r2["id"], name=r2["name"], email=r2["email"], platform_profile_id=None,
                    org_id=r2.get("org_id") or "org", role=r2.get("role") or "consumer",
                    created_at=r2.get("created_at") or "1970-01-01T00:00:00Z", platform_profile=None,
                    avatar_url=r2.get("avatar_url"), tools=None, job_title=r2.get("job_title"),
                    company=r2.get("company"), subsidiary=r2.get("subsidiary"), domain=None,
                )
        except Exception as e2:
            logger.info("users.get_user: unqualified select failed: %s", e2)
    # Fallback synthetic profile
    return User(
        id=id,
        name=f"User {id[:6]}",
        email=f"{id[:6]}@example.com",
        platform_profile_id=None,
        org_id="org",
        role="consumer",
        created_at="1970-01-01T00:00:00Z",
        platform_profile=None,
        avatar_url=f"https://ui-avatars.com/api/?name=User+{id[:6]}",
        tools=["databricks","snowflake"],
        job_title="Data Analyst",
        company="ExampleCorp",
        subsidiary="BI",
    )


@router.get("/users/{id}/activity")
async def get_user_activity(id: str, session: AsyncSession | None = Depends(get_session_optional)) -> dict:
    # Return liked and following dataset ids, DB-backed when available
    if session is not None:
        fr = await session.execute(select(FollowModel).where(FollowModel.user_id==id))
        lr = await session.execute(select(LikeModel).where(LikeModel.user_id==id))
        following = [r.dataset_id for r in fr.scalars().all()]
        liked = [r.dataset_id for r in lr.scalars().all()]
        return {"liked": liked, "following": following}
    liked = [dsid for (uid, dsid), v in db.likes.items() if uid==id and v]
    following = [dsid for (uid, dsid), v in db.follows.items() if uid==id and v]
    return {"liked": liked, "following": following}


@router.get("/users")
async def list_users(q: str | None = None, limit: int = 50, offset: int = 0, session: AsyncSession | None = Depends(get_session_optional)) -> dict:
    logger.info("users.list_users: q=%s limit=%s offset=%s session_present=%s", q, limit, offset, session is not None)
    print("users.list_users session_present=", session is not None, "DB_SCHEMA=", getattr(Config, 'SCHEMA', None))
    users = list(db.users.values())
    # If DB is available, prefer DB users to ensure seeded data appears
    if session is not None:
        try:
            res = await session.execute(select(UserModel))
            rows = res.scalars().all()
            if rows:
                logger.info("users.list_users: ORM returned %d rows", len(rows))
                print("users.list_users ORM count=", len(rows))
                users = [
                    User(
                        id=r.id,
                        name=r.name,
                        email=r.email,
                        platform_profile_id=None,
                        org_id=getattr(r, 'org_id', 'org'),
                        role=getattr(r, 'role', 'consumer'),
                        created_at=getattr(r, 'created_at', '1970-01-01T00:00:00Z'),
                        platform_profile=None,
                        avatar_url=getattr(r, 'avatar_url', None),
                        tools=getattr(r, 'tools', None),
                        job_title=getattr(r, 'job_title', None),
                        company=getattr(r, 'company', None),
                        subsidiary=getattr(r, 'subsidiary', None),
                       #domain=getattr(r, 'domain', None),
                    )
                    for r in rows
                ]
            else:
                logger.info("users.list_users: ORM returned 0 rows; trying text fallback")
                print("users.list_users ORM count=0; trying text fallback")
                safe = await _safe_fetch_all_users(session)
                if safe:
                    logger.info("users.list_users: text fallback returned %d rows", len(safe))
                    print("users.list_users text fallback count=", len(safe))
                    users = safe
        except Exception as e:
            # keep in-memory fallback
            logger.info("users.list_users: ORM select failed: %s", e)
            print("users.list_users ORM select error:", e)
            pass
    if q:
        ql = q.lower()
        users = [u for u in users if ql in u.name.lower() or ql in u.email.lower()]
    total = len(users)
    logger.info("users.list_users: returning total=%d", total)
    print("users.list_users returning total=", total)
    data = users[offset: offset + limit]
    return {"data": data, "total": total}


@router.get("/users/me/profile")
async def get_my_platform_profile(session: AsyncSession | None = Depends(get_session_optional)) -> PlatformProfile | dict:
    user = _demo_user()
    if session is not None:
        res = await session.execute(select(PlatformProfileModel).where(PlatformProfileModel.user_id == user.id))
        row = res.scalar_one_or_none()
        if row:
            return PlatformProfile(id=row.id, user_id=row.user_id, platform_type=row.platform_type, config_json=row.config_json)
    # Fallback stub
    return {"user_id": user.id, "platform_type": "snowflake", "config_json": {"database":"ANALYTICS","schema":"PUBLIC"}}


@router.put("/users/me/profile")
async def put_my_platform_profile(body: PlatformProfileUpdate, session: AsyncSession | None = Depends(get_session_optional)) -> PlatformProfile:
    user = _demo_user()
    if session is None:
        # Emulate persistence in memory only
        profile = PlatformProfile(id="in-memory", user_id=user.id, platform_type=body.platform_type, config_json=body.config_json)
        return profile
    # Upsert
    res = await session.execute(select(PlatformProfileModel).where(PlatformProfileModel.user_id == user.id))
    row = res.scalar_one_or_none()
    import uuid
    if row is None:
        row = PlatformProfileModel(id=str(uuid.uuid4()), user_id=user.id, platform_type=body.platform_type.value if hasattr(body.platform_type,'value') else str(body.platform_type), config_json=body.config_json)
        session.add(row)
    else:
        row.platform_type = body.platform_type.value if hasattr(body.platform_type,'value') else str(body.platform_type)
        row.config_json = body.config_json
    await session.commit()
    return PlatformProfile(id=row.id, user_id=row.user_id, platform_type=row.platform_type, config_json=row.config_json)


