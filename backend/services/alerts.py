from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.alert import Alert, AlertSeverity, AlertStatus
from ..services.events import event_bus


async def create_alert(
    session: AsyncSession,
    *,
    title: str,
    description: str,
    severity: AlertSeverity = AlertSeverity.warning,
    metadata: dict | None = None,
) -> Alert:
    alert = Alert(
        title=title,
        description=description,
        severity=severity,
        extra_metadata=metadata or {},
    )
    session.add(alert)
    await session.commit()
    await session.refresh(alert)
    await event_bus.publish(
        "alerts",
        {
            "id": alert.id,
            "title": alert.title,
            "severity": alert.severity.value,
            "description": alert.description,
            "created_at": alert.created_at.isoformat() if alert.created_at else datetime.utcnow().isoformat(),
        },
    )
    return alert


async def list_open_alerts(session: AsyncSession) -> list[Alert]:
    result = await session.execute(select(Alert).where(Alert.status != AlertStatus.resolved))
    return list(result.scalars())
