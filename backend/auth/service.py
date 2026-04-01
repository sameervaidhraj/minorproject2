from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Iterable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_session
from ..models import AccessLog, Device, Role, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def _token_payload(user: User, expires_minutes: int) -> dict[str, Any]:
    expire_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    return {"sub": str(user.id), "role": user.role.name, "exp": expire_at}


def issue_access_token(user: User) -> tuple[str, int]:
    payload = _token_payload(user, settings.access_token_exp_minutes)
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, settings.access_token_exp_minutes * 60


def issue_refresh_token(user: User) -> str:
    payload = _token_payload(user, settings.refresh_token_exp_minutes)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


async def authenticate_user(session: AsyncSession, identifier: str, password: str) -> User:
    result = await session.execute(
        select(User)
        .options(selectinload(User.role))
        .where(or_(User.username == identifier, User.email == identifier))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(password, user.password_hash):
        user.failed_attempts += 1
        await session.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    user.failed_attempts = 0
    return user


async def log_access(
    session: AsyncSession,
    *,
    user: User | None,
    ip_address: str | None,
    user_agent: str | None,
    success: bool,
    reason: str | None = None,
) -> None:
    entry = AccessLog(
        user_id=user.id if user else None,
        ip_address=ip_address,
        user_agent=user_agent,
        success=success,
        reason=reason,
        created_at=datetime.now(timezone.utc),
    )
    session.add(entry)
    await session.commit()


async def register_device(
    session: AsyncSession,
    *,
    user: User,
    ip_address: str | None,
    fingerprint: str | None,
) -> None:
    if not fingerprint:
        return
    result = await session.execute(
        select(Device).where(Device.user_id == user.id, Device.device_fingerprint == fingerprint)
    )
    device = result.scalar_one_or_none()
    if device is None:
        device = Device(user_id=user.id, device_fingerprint=fingerprint, ip_address=ip_address)
        session.add(device)
    device.last_seen = datetime.now(timezone.utc)
    device.ip_address = ip_address
    await session.commit()


async def get_current_user(
    token: str = Depends(oauth2_scheme), session: AsyncSession = Depends(get_session)
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        user_id: str | None = payload.get("sub")
    except jwt.PyJWTError as exc:  # type: ignore[attr-defined]
        raise credentials_error from exc
    result = await session.execute(select(User).options(selectinload(User.role)).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_error
    return user


def require_roles(*roles: str) -> Callable[[User], User]:
    async def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role.name not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _checker
