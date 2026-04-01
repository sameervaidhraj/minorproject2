from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..audit.service import append_audit_log
from ..auth.service import require_roles
from ..cache import get_redis
from ..config import settings
from ..database import get_session
from ..models import SecretLease, StoredSecret, User
from .schemas import (
    SecretIssueRequest,
    SecretLeaseRead,
    SecretStoreRequest,
    SecretViewResponse,
    StoredSecretRead,
)
from .service import (
    fetch_leases,
    fetch_static_secrets,
    issue_dynamic_secret,
    issue_secret_view,
    store_secret,
)

router = APIRouter(prefix=f"{settings.api_prefix}/secrets", tags=["Secrets"])


@router.post("/store")
async def store_static_secret(
    payload: SecretStoreRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Admin", "Security Officer")),
):
    secret = await store_secret(session, payload=payload, user=user)
    return {"id": secret.id, "name": secret.name, "category": secret.category}


@router.post("/issue", response_model=SecretLeaseRead)
async def issue_secret(
    payload: SecretIssueRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Admin", "Security Officer")),
):
    lease = await issue_dynamic_secret(session, payload=payload, user=user)
    return SecretLeaseRead(
        lease_id=lease.lease_id,
        target=lease.target,
        secret_type=lease.secret_type,
        expires_at=lease.expires_at,
        status=lease.status,
        metadata=lease.extra_metadata,
    )


@router.get("/leases", response_model=list[SecretLeaseRead])
async def list_leases(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_roles("Admin", "Security Officer", "Auditor")),
):
    leases = await fetch_leases(session)
    return [
        SecretLeaseRead(
            lease_id=lease.lease_id,
            target=lease.target,
            secret_type=lease.secret_type,
            expires_at=lease.expires_at,
            status=lease.status,
            metadata=lease.extra_metadata,
        )
        for lease in leases
    ]


@router.get("/static", response_model=list[StoredSecretRead])
async def list_static_secrets(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_roles("Admin", "Security Officer", "Auditor")),
):
    secrets = await fetch_static_secrets(session)
    return [
        StoredSecretRead(
            id=secret.id,
            name=secret.name,
            category=secret.category,
            created_at=secret.created_at,
        )
        for secret in secrets
    ]


@router.post("/static/{secret_id}/view", response_model=SecretViewResponse)
async def view_secret_value(
    secret_id: int,
    session: AsyncSession = Depends(get_session),
    redis=Depends(get_redis),
    user: User = Depends(require_roles("Admin", "Security Officer")),
):
    result = await issue_secret_view(session, redis, secret_id=secret_id, user=user)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secret not found")
    await append_audit_log(
        session,
        actor_id=user.id if user else None,
        action="secret.view",
        details={"secret": result.secret.name, "lease_token": result.token[:8]},
    )
    return SecretViewResponse(
        id=result.secret.id,
        name=result.secret.name,
        category=result.secret.category,
        metadata=result.secret.extra_metadata or {},
        secret=result.plaintext,
        lease_token=result.token,
        expires_in=result.expires_in,
    )
