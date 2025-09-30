from __future__ import annotations

import random
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from sqlalchemy import update

from backend.app.schemas import Event, User
from backend.app.storage import db, now_iso
from backend.app.db import get_session_optional, EventModel, FollowModel, LikeModel, DatasetModel, UserModel


router = APIRouter()


async def _get_user_columns(session: AsyncSession) -> set[str]:
    from sqlalchemy import text
    from backend.app.db import Config
    try:
        res = await session.execute(text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = :schema AND table_name = 'users'
            """
        ), {"schema": Config.SCHEMA})
        return {r[0] for r in res.fetchall()}
    except Exception:
        # Fall back to known minimal set
        return {"id","name","email","org_id","role","created_at"}


async def _insert_user_safe(session: AsyncSession, u: User) -> None:
    """Insert a user row using only columns that exist in the DB schema."""
    from sqlalchemy import text
    from backend.app.db import Config
    cols = await _get_user_columns(session)
    data: dict[str, object] = {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "org_id": u.org_id,
        "role": u.role,
        "created_at": u.created_at,
    }
    # Optional fields if columns exist
    if "avatar_url" in cols and u.avatar_url is not None:
        data["avatar_url"] = u.avatar_url
    if "job_title" in cols and u.job_title is not None:
        data["job_title"] = u.job_title
    if "company" in cols and u.company is not None:
        data["company"] = u.company
    if "subsidiary" in cols and u.subsidiary is not None:
        data["subsidiary"] = u.subsidiary
    if "domain" in cols and getattr(u, "domain", None) is not None:
        data["domain"] = getattr(u, "domain")
    # Skip 'tools' to avoid JSON binding issues in text-based insert; can be updated later via ORM

    col_list = ", ".join(f'"{c}"' for c in data.keys())
    val_list = ", ".join(f':{c}' for c in data.keys())
    sql = text(f'INSERT INTO "{Config.SCHEMA}".users ({col_list}) VALUES ({val_list}) ON CONFLICT (id) DO NOTHING')
    await session.execute(sql, data)
    # Set JSON tools via ORM if the column exists
    if "tools" in cols and u.tools is not None:
        await session.execute(update(UserModel).where(UserModel.id == u.id).values(tools=u.tools))


def _ensure_datasets(session: Optional[AsyncSession] = None) -> list[tuple[str, str]]:
    items = list(db.datasets.values())
    if not items and session is not None:
        # load from DB
        # return list of (id, name)
        # mypy ignores for brevity
        return [(r.id, r.name) for r in session.run_sync(lambda s: [])]  # type: ignore
    return [(d.id, d.name) for d in items]


class SeedUsersRequest(BaseModel):
    companies: Optional[List[str]] = None
    domains: Optional[List[str]] = None
    per_domain: int = 3


@router.post("/admin/seed/users")
async def admin_seed_users(body: SeedUsersRequest | None = None, session: AsyncSession | None = Depends(get_session_optional)) -> dict:
    req = body or SeedUsersRequest()
    companies = req.companies or ["Renoir", "Apex", "Canva", "Lumina", "Verso"]
    domains = req.domains or ["marketing", "sales", "finance", "legal", "supply chain", "hr"]
    job_titles = [
        "Data Engineer",
        "Analytics Engineer",
        "Data Scientist",
        "Data Analyst",
        "Analytics Manager",
        "Data Product Manager",
        "BI Developer",
        "Data Governance Lead",
    ]

    # Try to use Faker for realistic user data
    try:
        from faker import Faker  # type: ignore
        faker: Faker | None  # type: ignore[name-defined]
        faker = Faker("en_US")
        use_faker = True
    except Exception:
        faker = None  # type: ignore
        use_faker = False

    created = 0
    for company in companies:
        domain_slug_root = company.lower().replace(" ", "")
        for domain in domains:
            for _ in range(max(1, int(req.per_domain))):
                uid = f"user-{uuid.uuid4()}"
                if use_faker and faker is not None:
                    name = faker.name()
                    local = (name.lower().replace(" ", ".").replace("'", ""))
                    email = f"{local}@{domain_slug_root}.example.com"
                    avatar = f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}"
                else:
                    # Fallback simple generation
                    fname = random.choice(["Ava","Noah","Liam","Mia","Leo","Zoe","Ethan","Ivy","Nora","Owen","Max","Lila"]) 
                    lname = random.choice(["Stone","Rivera","Nguyen","Patel","Kim","Morgan","Lopez","Khan","Garcia","Fischer","Young","Martin"]) 
                    name = f"{fname} {lname}"
                    email = f"{fname}.{lname}@{domain_slug_root}.example.com".lower()
                    avatar = f"https://ui-avatars.com/api/?name={fname}+{lname}"
                job = random.choice(job_titles)
                tools = random.sample(["databricks","snowflake","bigquery","redshift"], k=2)
                user = User(
                    id=uid,
                    name=name,
                    email=email,
                    platform_profile_id=None,
                    org_id="org",
                    role="consumer",
                    created_at=now_iso(),
                    platform_profile=None,
                    avatar_url=avatar,
                    tools=tools,
                    job_title=job,
                    company=company,
                    subsidiary=domain.title(),
                )
                db.upsert_user(user)
                if session is not None:
                    await _insert_user_safe(session, user)
                created += 1
    if session is not None:
        await session.commit()
    return {"created": created, "companies": companies, "domains": domains, "per_domain": req.per_domain, "faker": use_faker}


@router.post("/admin/seed")
async def seed_fake_users_and_activity(
    users: int = 10,
    interactions: int = 50,
    session: AsyncSession | None = Depends(get_session_optional),
) -> dict:
    created_users = 0
    created_events = 0
    created_likes = 0
    created_follows = 0

    # Seed users (in-memory)
    for i in range(users):
        user_id = f"user-{uuid.uuid4()}"
        user = User(
            id=user_id,
            name=f"User {i+1}",
            email=f"user{i+1}@example.com",
            platform_profile_id=None,
            org_id="org",
            role="consumer",
            created_at=now_iso(),
            platform_profile=None,
            avatar_url=f"https://ui-avatars.com/api/?name=User+{i+1}",
            tools=[random.choice(["databricks","snowflake","bigquery","redshift"])],
        )
        db.upsert_user(user)
        created_users += 1

    # Datasets available
    datasets = list(db.datasets.values())
    if not datasets and session is not None:
        res = await session.execute(select(DatasetModel))
        rows = res.scalars().all()
        datasets = [
            type("_D", (), dict(
                id=r.id,
                name=r.name,
            ))  # lightweight proxy
            for r in rows
        ]

    if not datasets:
        return {"users": created_users, "events": 0, "likes": 0, "follows": 0, "note": "No datasets available to generate activity."}

    user_ids = list(db.users.keys())
    platforms = ["snowflake", "databricks", "bigquery", "redshift"]

    for _ in range(interactions):
        ds = random.choice(datasets)
        actor = random.choice(user_ids) if user_ids else "demo-user"
        etype = random.choices(
            ["dataset.connected", "dataset.refreshed", "dataset.liked", "user.followed"],
            weights=[0.4, 0.2, 0.25, 0.15],
            k=1,
        )[0]
        if etype == "dataset.liked":
            db.likes[(actor, ds.id)] = True
            created_likes += 1
            if session is not None:
                session.add(LikeModel(user_id=actor, dataset_id=ds.id))
        elif etype == "user.followed":
            db.follows[(actor, ds.id)] = True
            created_follows += 1
            if session is not None:
                session.add(FollowModel(user_id=actor, dataset_id=ds.id))

        payload = {}
        if etype == "dataset.connected":
            payload = {"platform": random.choice(platforms)}
        elif etype == "dataset.refreshed":
            payload = {"delta_rows": random.randint(100, 10000)}

        ev = Event(
            id=str(uuid.uuid4()),
            type=etype,
            payload_json=payload,
            actor_id=actor,
            dataset_id=ds.id,
            created_at=now_iso(),
        )
        db.add_event(ev)
        if session is not None:
            session.add(EventModel(id=ev.id, type=ev.type, payload_json=ev.payload_json, actor_id=ev.actor_id, dataset_id=ev.dataset_id, created_at=ev.created_at))
        created_events += 1

    if session is not None:
        await session.commit()

    return {"users": created_users, "events": created_events, "likes": created_likes, "follows": created_follows}


@router.post("/admin/users")
async def admin_create_user(payload: dict, session: AsyncSession | None = Depends(get_session_optional)) -> User:
    """Create a user (in-memory) for demo/admin purposes.

    Body supports: name, email, avatar_url, job_title, company, subsidiary, tools (list[str])
    """
    user_id = payload.get("id") or f"user-{uuid.uuid4()}"
    name = payload.get("name") or "New User"
    email = payload.get("email") or f"{user_id[:6]}@example.com"
    u = User(
        id=user_id,
        name=name,
        email=email,
        platform_profile_id=None,
        org_id=payload.get("org_id") or "org",
        role=payload.get("role") or "consumer",
        created_at=now_iso(),
        platform_profile=None,
        avatar_url=payload.get("avatar_url") or f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}",
        tools=payload.get("tools") or ["databricks"],
        job_title=payload.get("job_title"),
        company=payload.get("company"),
        subsidiary=payload.get("subsidiary"),
    )
    db.upsert_user(u)
    if session is not None:
        # safe insert/upsert according to actual DB columns
        await _insert_user_safe(session, u)
        await session.commit()
    return u


@router.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, body: dict, session: AsyncSession | None = Depends(get_session_optional)) -> User:
    existing = db.get_user(user_id)
    if not existing:
        # create if not exist
        return await admin_create_user({"id": user_id, **body})
    if "name" in body:
        existing.name = str(body["name"])[:128]
    if "email" in body:
        existing.email = str(body["email"])[:256]
    if "avatar_url" in body:
        existing.avatar_url = str(body["avatar_url"])[:1024]
    if "job_title" in body:
        existing.job_title = str(body["job_title"])[:128]
    if "company" in body:
        existing.company = str(body["company"])[:128]
    if "subsidiary" in body:
        existing.subsidiary = str(body["subsidiary"])[:128]
    if "tools" in body and isinstance(body["tools"], list):
        existing.tools = [str(t) for t in body["tools"]][:8]
    db.upsert_user(existing)
    if session is not None:
        row = await session.get(UserModel, user_id)
        if row is None:
            row = UserModel(
                id=existing.id,
                name=existing.name,
                email=existing.email,
                avatar_url=existing.avatar_url,
                job_title=existing.job_title,
                company=existing.company,
                subsidiary=existing.subsidiary,
                tools=existing.tools,
                org_id=existing.org_id,
                role=existing.role,
                created_at=existing.created_at,
            )
            session.add(row)
        else:
            row.name = existing.name
            row.email = existing.email
            row.avatar_url = existing.avatar_url
            row.job_title = existing.job_title
            row.company = existing.company
            row.subsidiary = existing.subsidiary
            row.tools = existing.tools
        await session.commit()
    return existing


@router.post("/admin/users/bulk")
async def admin_bulk_users(count: int = 20, session: AsyncSession | None = Depends(get_session_optional)) -> dict:
    created = 0
    for i in range(count):
        user_id = f"user-{uuid.uuid4()}"
        name = f"User {user_id[:6]}"
        u = User(
            id=user_id,
            name=name,
            email=f"{user_id[:6]}@example.com",
            platform_profile_id=None,
            org_id="org",
            role="consumer",
            created_at=now_iso(),
            platform_profile=None,
            avatar_url=f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}",
            tools=[random.choice(["databricks","snowflake","bigquery","redshift"])],
            job_title=random.choice(["Data Engineer","Analyst","Scientist","PM"]),
            company="ExampleCorp",
            subsidiary=random.choice(["Analytics","BI","Platform"]),
        )
        db.upsert_user(u)
        if session is not None:
            session.add(UserModel(
                id=u.id,
                name=u.name,
                email=u.email,
                avatar_url=u.avatar_url,
                job_title=u.job_title,
                company=u.company,
                subsidiary=u.subsidiary,
                tools=u.tools,
                org_id=u.org_id,
                role=u.role,
                created_at=u.created_at,
            ))
        created += 1
    if session is not None:
        await session.commit()
    return {"created": created}


