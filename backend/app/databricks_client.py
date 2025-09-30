from __future__ import annotations

from typing import List, Optional
import uuid

from databricks.sdk import WorkspaceClient
import os


def get_workspace_client() -> WorkspaceClient:
    # Use Databricks CLI/profile-based auth; profile can be overridden via env
    profile = os.getenv("DATABRICKS_PROFILE", "fe-west")
    return WorkspaceClient(profile=profile)


def list_schemas(catalog: str) -> List[str]:
    w = get_workspace_client()
    schemas = w.schemas.list(catalog_name=catalog)
    return [s.name for s in schemas]


def list_tables(catalog: str, schema: str) -> List[dict]:
    w = get_workspace_client()
    tables = w.tables.list(catalog_name=catalog, schema_name=schema)
    out: List[dict] = []
    for t in tables:
        out.append({
            "name": t.name,
            "full_name": t.full_name,
            "table_type": t.table_type,
            "data_source_format": getattr(t, 'data_source_format', None),
        })
    return out


def get_table_info(catalog: str, schema: str, table: str) -> dict:
    w = get_workspace_client()
    fqn = f"{catalog}.{schema}.{table}"
    # Use full_name per SDK requirement
    ti = w.tables.get(full_name=fqn)
    # Convert to safe dict; select relevant fields
    d = ti.as_dict() if hasattr(ti, 'as_dict') else {}
    cols = []
    for c in (d.get('columns') or []):
        cols.append({
            'name': c.get('name'),
            'type_text': c.get('type_text') or c.get('type_name'),
            'nullable': c.get('nullable'),
            'comment': c.get('comment'),
        })
    return {
        'full_name': d.get('full_name') or fqn,
        'catalog_name': d.get('catalog_name') or catalog,
        'schema_name': d.get('schema_name') or schema,
        'name': d.get('name') or table,
        'table_type': d.get('table_type'),
        'data_source_format': d.get('data_source_format'),
        'owner': d.get('owner'),
        'comment': d.get('comment'),
        'description': d.get('comment'),
        'created_at': d.get('created_at'),
        'updated_at': d.get('updated_at'),
        'storage_location': d.get('storage_location'),
        'properties': d.get('properties') or {},
        'columns': cols,
    }


def generate_database_token(instance_names: List[str], requested_claims: Optional[List[dict]] = None) -> str:
    """Generate a scoped database credential using workspace auth.

    Requires the workspace identity (profile) to have permission to mint credentials
    for the specified database instance(s).
    """
    w = get_workspace_client()
    # The SDK returns a dataclass; we convert to dict to avoid breaking on versions
    cred = w.database.generate_database_credential(
        instance_names=["fe_shared_demo"],
        claims=requested_claims or None,
        request_id=str(uuid.uuid4()),
    )
    d = cred.as_dict() if hasattr(cred, 'as_dict') else dict(getattr(cred, '__dict__', {}))
    token = d.get('token') or d.get('access_token') or d.get('jwt') or d.get('value')
    if not token:
        # Best-effort: some SDKs may nest credential
        nested = d.get('credential') or d.get('credentials') or {}
        token = nested.get('token') or nested.get('access_token') or nested.get('jwt')
    if not token:
        raise RuntimeError('Failed to generate database credential: token missing in response')
    return token


