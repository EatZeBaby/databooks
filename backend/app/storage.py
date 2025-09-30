from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

from backend.app.schemas import Dataset, DatasetCreate, DatasetUpdate, User, Connector, Event


ISO = "%Y-%m-%dT%H:%M:%SZ"


def now_iso() -> str:
    return time.strftime(ISO, time.gmtime())


class InMemoryDB:
    def __init__(self) -> None:
        self.datasets: Dict[str, Dataset] = {}
        self.users: Dict[str, User] = {}
        self.connectors: List[Connector] = []
        self.events: List[Event] = []
        self.follows: Dict[Tuple[str, str], bool] = {}
        self.likes: Dict[Tuple[str, str], bool] = {}
        self.tag_follows: Dict[Tuple[str, str], bool] = {}
        self.badges: Dict[str, List[str]] = {}

    # Dataset operations
    def create_dataset(self, payload: DatasetCreate) -> Dataset:
        dataset_id = str(uuid.uuid4())
        now = now_iso()
        ds = Dataset(
            id=dataset_id,
            name=payload.name,
            description=payload.description,
            tags=payload.tags or [],
            owner_id=payload.owner_id,
            org_id=payload.org_id,
            source_type=payload.source_type,
            source_metadata_json=payload.source_metadata_json or {},
            visibility=payload.visibility,
            created_at=now,
            updated_at=now,
        )
        self.datasets[dataset_id] = ds
        return ds

    def update_dataset(self, dataset_id: str, patch: DatasetUpdate) -> Optional[Dataset]:
        ds = self.datasets.get(dataset_id)
        if not ds:
            return None
        update_data = patch.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(ds, k, v)
        ds.updated_at = now_iso()
        self.datasets[dataset_id] = ds
        return ds

    # Users
    def upsert_user(self, user: User) -> User:
        self.users[user.id] = user
        return user

    def get_user(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)

    # Connectors
    def list_connectors(self) -> List[Connector]:
        return self.connectors

    def init_connectors(self) -> None:
        self.connectors = [
            Connector(id=str(uuid.uuid4()), type="snowflake", capability_flags=["render", "test"], config_schema={}),
            Connector(id=str(uuid.uuid4()), type="databricks", capability_flags=["render"], config_schema={}),
            Connector(id=str(uuid.uuid4()), type="bigquery", capability_flags=["render"], config_schema={}),
            Connector(id=str(uuid.uuid4()), type="redshift", capability_flags=["render"], config_schema={}),
            Connector(id=str(uuid.uuid4()), type="postgres", capability_flags=["render", "test"], config_schema={}),
        ]

    # Events
    def add_event(self, ev: Event) -> None:
        self.events.append(ev)


db = InMemoryDB()
db.init_connectors()


