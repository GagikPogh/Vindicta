from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    avatar_url: Optional[str] = None
    preferences: Optional[dict[str, Any]] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    avatar_url: Optional[str] = None
    oauth_provider: str
    is_active: bool
    is_verified: bool
    preferences: dict[str, Any]
    created_at: datetime


class OAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: str


class OAuthUrlResponse(BaseModel):
    url: str


class InvestigationBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    priority: str = "medium"
    tags: list[str] = Field(default_factory=list)


class InvestigationCreate(InvestigationBase):
    pass


class InvestigationUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[list[str]] = None
    metadata: Optional[dict[str, Any]] = None


class InvestigationResponse(InvestigationBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    status: str
    metadata: dict[str, Any] = Field(validation_alias="metadata_")
    owner_id: UUID
    created_at: datetime
    updated_at: datetime
    entity_count: int = 0
    event_count: int = 0


class EntityBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    entity_type: str
    description: Optional[str] = None
    properties: dict[str, Any] = Field(default_factory=dict)
    risk_score: float = Field(default=0.0, ge=0.0, le=100.0)


class EntityCreate(EntityBase):
    investigation_id: Optional[UUID] = None


class EntityResponse(EntityBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    investigation_id: Optional[UUID] = None
    neo4j_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    entity_types: Optional[list[str]] = None
    investigation_id: Optional[UUID] = None
    limit: int = Field(default=20, ge=1, le=100)


class SearchResult(BaseModel):
    id: str
    name: str
    entity_type: str
    description: Optional[str] = None
    risk_score: float = 0.0
    source: str
    properties: dict[str, Any] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    query: str
    total: int
    results: list[SearchResult]
    took_ms: float


class GraphNode(BaseModel):
    id: str
    name: str
    type: str
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    center_id: Optional[str] = None


class TimelineEventBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    event_type: str
    occurred_at: datetime
    properties: dict[str, Any] = Field(default_factory=dict)
    entity_ids: list[str] = Field(default_factory=list)


class TimelineEventCreate(TimelineEventBase):
    investigation_id: UUID


class TimelineEventResponse(TimelineEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    investigation_id: UUID
    created_at: datetime


class ReportBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    investigation_id: Optional[UUID] = None


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    content: Optional[dict[str, Any]] = None
    status: Optional[str] = None


class ReportResponse(ReportBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    content: dict[str, Any]
    owner_id: UUID
    created_at: datetime
    updated_at: datetime


class DashboardStats(BaseModel):
    total_investigations: int
    active_investigations: int
    total_entities: int
    total_events: int
    total_reports: int
    high_risk_entities: int
    recent_activity: list[dict[str, Any]]


class MessageResponse(BaseModel):
    message: str


class ContactTagResponse(BaseModel):
    id: str
    tag_name: str
    source: str
    source_detail: Optional[str] = None
    confidence: float
    reported_by: Optional[str] = None
    recorded_at: str
    properties: dict[str, Any] = Field(default_factory=dict)


class SocialProfileResponse(BaseModel):
    id: str
    platform: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    profile_url: str
    avatar_url: Optional[str] = None
    source: str
    confidence: float
    is_verified: bool = False
    discovered_at: str
    last_seen_at: Optional[str] = None
    properties: dict[str, Any] = Field(default_factory=dict)


class SearchLinkResponse(BaseModel):
    platform: str
    label: str
    url: str
    type: str


class CarrierInfoResponse(BaseModel):
    name: Optional[str] = None
    line_type: Optional[str] = None
    region: Optional[str] = None
    country_code: Optional[str] = None


class RiskIndicatorResponse(BaseModel):
    type: str
    label: str
    severity: str


class PhoneLookupResponse(BaseModel):
    e164: str
    query_raw: str
    national: Optional[str] = None
    is_valid: bool = True
    carrier: Optional[CarrierInfoResponse] = None
    contact_tags: list[ContactTagResponse]
    social_profiles: list[SocialProfileResponse]
    search_links: list[SearchLinkResponse] = Field(default_factory=list)
    risk_indicators: list[RiskIndicatorResponse] = Field(default_factory=list)
    tag_count: int = 0
    profile_count: int = 0
    providers_used: list[str] = Field(default_factory=list)
    took_ms: float = 0
    cached: bool = False


class PhoneLookupRequest(BaseModel):
    phone: str = Field(min_length=5, max_length=20)


class AddContactTagRequest(BaseModel):
    phone: str
    tag_name: str = Field(min_length=1, max_length=255)
    source_detail: Optional[str] = None


class AddSocialProfileRequest(BaseModel):
    phone: str
    platform: str
    profile_url: str
    username: Optional[str] = None
    display_name: Optional[str] = None


class PhoneLookupHistoryItem(BaseModel):
    id: str
    e164: str
    query_raw: str
    tag_count: int
    profile_count: int
    created_at: str
