from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import SecretLease, StoredSecret, User
from ..services.events import event_bus
from ..vault.service import decrypt_with_vault, encrypt_with_vault
from .schemas import SecretIssueRequest, SecretStoreRequest

SECRET_VIEW_CACHE_KEY = "secret:view"


@dataclass
class SecretViewResult:
    secret: StoredSecret
    plaintext: str
    token: str
    expires_in: int


async def store_secret(session: AsyncSession, *, payload: SecretStoreRequest, user: User) -> StoredSecret:
    encrypted_value = await encrypt_with_vault(payload.secret_value)
    secret = StoredSecret(
        name=payload.name,
        category=payload.category,
        encrypted_value=encrypted_value,
        extra_metadata=payload.metadata or {},
        created_by=user.id if user else None,
    )
    session.add(secret)
    await session.commit()
    await event_bus.publish(
        "secrets",
        {"event": "stored", "name": payload.name, "category": payload.category},
    )
    return secret


async def issue_dynamic_secret(session: AsyncSession, *, payload: SecretIssueRequest, user: User) -> SecretLease:
    lease_id = secrets.token_hex(16)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=payload.ttl_minutes)
    lease = SecretLease(
        lease_id=lease_id,
        target=payload.target,
        secret_type=payload.secret_type,
        issued_to=user.id if user else None,
        issued_at=datetime.now(timezone.utc),
        expires_at=expires_at,
        status="active",
        extra_metadata=payload.metadata or {},
    )
    session.add(lease)
    await session.commit()
    await event_bus.publish(
        "leases",
        {
            "event": "issued",
            "lease_id": lease.lease_id,
            "target": lease.target,
            "expires_at": lease.expires_at.isoformat(),
        },
    )
    return lease


async def fetch_leases(session: AsyncSession) -> list[SecretLease]:
    result = await session.execute(select(SecretLease).order_by(SecretLease.expires_at.desc()))
    return list(result.scalars())


async def fetch_static_secrets(session: AsyncSession) -> list[StoredSecret]:
    result = await session.execute(select(StoredSecret).order_by(StoredSecret.created_at.desc()))
    return list(result.scalars())


async def issue_secret_view(
    session: AsyncSession,
    redis: Redis,
    *,
    secret_id: int,
    user: User | None,
) -> SecretViewResult | None:
    secret = await session.get(StoredSecret, secret_id)
    if secret is None:
        return None
    plaintext = await decrypt_with_vault(secret.encrypted_value)
    lease_token = secrets.token_urlsafe(32)
    ttl_seconds = settings.secret_view_ttl_seconds
    await redis.setex(_view_cache_key(lease_token), ttl_seconds, str(secret.id))
    await event_bus.publish(
        "vault",
        {
            "event": "secret_view",
            "secret": secret.name,
            "issued_to": getattr(user, "username", None),
            "ttl": ttl_seconds,
        },
    )
    return SecretViewResult(secret=secret, plaintext=plaintext, token=lease_token, expires_in=ttl_seconds)


async def expire_overdue_leases(session: AsyncSession) -> int:
    result = await session.execute(
        select(SecretLease).where(SecretLease.expires_at < datetime.now(timezone.utc), SecretLease.status == "active")
    )
    affected = 0
    for lease in result.scalars():
        lease.status = "expired"
        affected += 1
    if affected:
        await session.commit()
    return affected


async def panic_revoke(session: AsyncSession) -> int:
    result = await session.execute(select(SecretLease).where(SecretLease.status == "active"))
    revoked = 0
    for lease in result.scalars():
        lease.status = "revoked"
        revoked += 1
    if revoked:
        await session.commit()
        await event_bus.publish("leases", {"event": "panic-revoke", "count": revoked})
    return revoked


def _view_cache_key(token: str) -> str:
    return f"{SECRET_VIEW_CACHE_KEY}:{token}"
