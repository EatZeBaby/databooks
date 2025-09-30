from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class Visibility(str, Enum):
    public = "public"
    internal = "internal"
    private = "private"


class PlatformType(str, Enum):
    snowflake = "snowflake"
    databricks = "databricks"
    bigquery = "bigquery"
    redshift = "redshift"


class DatasetBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    owner_id: str
    org_id: str
    company: Optional[str] = None
    #business_domain: Optional[str] = None
    source_type: str
    source_metadata_json: Dict[str, Any] = Field(default_factory=dict)
    visibility: Visibility
    created_at: str
    updated_at: str


class Dataset(DatasetBase):
    pass


class DatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    owner_id: str
    org_id: str
    #company: Optional[str] = None
    #business_domain: Optional[str] = None
    source_type: str
    source_metadata_json: Dict[str, Any] = Field(default_factory=dict)
    visibility: Visibility


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    visibility: Optional[Visibility] = None
    source_metadata_json: Optional[Dict[str, Any]] = None
    #company: Optional[str] = None
    #business_domain: Optional[str] = None


class PaginatedDatasets(BaseModel):
    page: int
    per_page: int
    total: int
    data: List[Dataset]


class User(BaseModel):
    id: str
    name: str
    email: str
    platform_profile_id: Optional[str] = None
    org_id: str
    role: str
    created_at: str
    platform_profile: Optional[Dict[str, Any]] = None
    avatar_url: Optional[str] = None
    tools: Optional[List[str]] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    subsidiary: Optional[str] = None
    domain: Optional[str] = None


class PlatformProfile(BaseModel):
    id: str
    user_id: str
    platform_type: PlatformType
    config_json: Dict[str, Any] = Field(default_factory=dict)


class PlatformProfileUpdate(BaseModel):
    platform_type: PlatformType
    config_json: Dict[str, Any] = Field(default_factory=dict)


class Connector(BaseModel):
    id: str
    type: str
    capability_flags: List[str] = Field(default_factory=list)
    config_schema: Dict[str, Any] = Field(default_factory=dict)


class ConnectorList(BaseModel):
    data: List[Connector]


class ConnectorTestRequest(BaseModel):
    config: Dict[str, Any]


class ConnectorTestResponse(BaseModel):
    ok: bool
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class Artifact(BaseModel):
    type: Literal["sql", "cli", "python", "config"]
    content: str


class ConnectionTest(BaseModel):
    ok: bool
    message: Optional[str] = None


class ConnectRequest(BaseModel):
    target_platform_type: Optional[PlatformType] = None
    options: Dict[str, Any] = Field(default_factory=dict)


class ConnectResponsePayload(BaseModel):
    snippet: str
    artifacts: List[Artifact] = Field(default_factory=list)
    connection_test: Optional[ConnectionTest] = None


class ConnectResponse(BaseModel):
    platform: PlatformType
    payload: ConnectResponsePayload


class JobAccepted(BaseModel):
    job_id: str
    status: Literal["accepted"]


class Event(BaseModel):
    id: str
    type: Literal[
        "dataset.published",
        "dataset.refreshed",
        "dataset.schema.changed",
        "dataset.connected",
        "user.followed",
        "dataset.liked",
        "contract.signed",
    ]
    payload_json: Dict[str, Any] = Field(default_factory=dict)
    actor_id: Optional[str] = None
    dataset_id: Optional[str] = None
    created_at: str


class PaginatedEvents(BaseModel):
    cursor: Optional[str] = None
    data: List[Event]


class FollowToggleRequest(BaseModel):
    dataset_id: str
    follow: bool
    user_id: Optional[str] = None


class FollowState(BaseModel):
    dataset_id: str
    following: bool


class Suggestions(BaseModel):
    suggestions: List[str] = Field(default_factory=list)


