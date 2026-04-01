from datetime import datetime
from pydantic import BaseModel, Field


class SecretStoreRequest(BaseModel):
    name: str
    category: str
    secret_value: str = Field(min_length=4)
    metadata: dict | None = None


class SecretIssueRequest(BaseModel):
    target: str
    secret_type: str
    ttl_minutes: int = Field(default=15, ge=5, le=60)
    metadata: dict | None = None


class SecretLeaseRead(BaseModel):
    lease_id: str
    target: str
    secret_type: str
    expires_at: datetime
    status: str
    metadata: dict | None

    class Config:
        from_attributes = True


class StoredSecretRead(BaseModel):
    id: int
    name: str
    category: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class SecretViewResponse(BaseModel):
    id: int
    name: str
    category: str
    metadata: dict | None
    secret: str
    lease_token: str
    expires_in: int
