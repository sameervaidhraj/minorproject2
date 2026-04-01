from datetime import datetime
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    username: str
    password: str
    device_fingerprint: str | None = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserRead(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    last_login_ip: str | None
    created_at: datetime | None

    class Config:
        from_attributes = True
