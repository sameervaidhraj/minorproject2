from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.service import require_roles
from ..config import settings
from ..database import get_session
from ..models import Alert, AlertStatus, User

router = APIRouter(prefix=f"{settings.api_prefix}/alerts", tags=["Alerts"])


@router.get("")
async def list_alerts(
    _: User = Depends(require_roles("Admin", "Security Officer", "Auditor")),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Alert).order_by(Alert.created_at.desc()))
    alerts = result.scalars().all()
    return [
        {
            "id": alert.id,
            "title": alert.title,
            "severity": alert.severity.value,
            "status": alert.status.value,
            "description": alert.description,
            "created_at": alert.created_at,
        }
        for alert in alerts
    ]
