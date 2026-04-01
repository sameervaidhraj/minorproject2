from fastapi import APIRouter, Depends, Request
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..cache import get_redis
from ..config import settings
from ..database import get_session
from ..models import User
from ..services.alerts import AlertSeverity, create_alert
from ..services.rate_limiter import enforce_rate_limit
from ..vault.service import trigger_auto_seal
from .schemas import LoginRequest, TokenPair, UserRead
from .service import (
    authenticate_user,
    get_current_user,
    issue_access_token,
    issue_refresh_token,
    log_access,
    register_device,
    require_roles,
)

router = APIRouter(prefix=f"{settings.api_prefix}/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenPair)
async def login(
    payload: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
    redis=Depends(get_redis),
):
    client_ip = request.client.host if request.client else "unknown"
    try:
        await enforce_rate_limit(
            redis,
            f"login:{client_ip}",
            settings.rate_limit_requests,
            settings.rate_limit_window_seconds,
        )
    except HTTPException as exc:
        if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            await create_alert(
                session,
                title="Brute-force lockout",
                description=f"Login rate limit tripped for {client_ip}",
                severity=AlertSeverity.critical,
                metadata={"ip": client_ip},
            )
            await trigger_auto_seal("RATE_LIMIT_TRIPPED", {"ip": client_ip})
        raise
    user = await authenticate_user(session, payload.username, payload.password)
    await register_device(
        session,
        user=user,
        ip_address=client_ip,
        fingerprint=payload.device_fingerprint,
    )
    await log_access(
        session,
        user=user,
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent"),
        success=True,
    )
    access_token, expires_in = issue_access_token(user)
    refresh_token = issue_refresh_token(user)
    return TokenPair(access_token=access_token, refresh_token=refresh_token, expires_in=expires_in)


@router.get("/users", response_model=list[UserRead])
async def list_users(
    _: User = Depends(require_roles("Admin", "Security Officer")),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).join(User.role))
    users = result.scalars().all()
    return [
        UserRead(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role.name,
            last_login_ip=user.last_login_ip,
            created_at=user.created_at,
        )
        for user in users
    ]
