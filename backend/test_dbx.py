from __future__ import annotations

from typing import List, Optional
import uuid

from databricks.sdk import WorkspaceClient
import os


def get_workspace_client() -> WorkspaceClient:
    # Use Databricks CLI/profile-based auth; profile can be overridden via env
    profile = os.getenv("DATABRICKS_PROFILE", "fe-west")
    return WorkspaceClient(profile=profile)
w = get_workspace_client()

for instance in w.database.list_database_instances():
    print(instance.name)


cred = w.database.generate_database_credential(
        instance_names=["fe_shared_demo"],
        claims=None,
        request_id=str(uuid.uuid4()),
    )

print(cred)