from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import AuditLog
from ..services.crypto import next_chain_hash
from ..services.events import event_bus
from ..vault.service import trigger_auto_seal


async def append_audit_log(
    session: AsyncSession,
    *,
    actor_id: int | None,
    action: str,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    result = await session.execute(select(AuditLog).order_by(AuditLog.id.desc()).limit(1))
    last = result.scalar_one_or_none()
    prev_hash = last.chain_hash if last else settings.audit_seed_hash
    payload = {
        "actor_id": actor_id,
        "action": action,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    chain_hash = next_chain_hash(prev_hash, payload)
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        details=details or {},
        created_at=datetime.now(timezone.utc),
        prev_hash=prev_hash,
        chain_hash=chain_hash,
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)
    await event_bus.publish(
        "audit",
        {
            "id": entry.id,
            "action": entry.action,
            "actor_id": entry.actor_id,
            "timestamp": entry.created_at.isoformat(),
        },
    )
    return entry


async def fetch_audit_logs(session: AsyncSession) -> list[AuditLog]:
    result = await session.execute(select(AuditLog).order_by(AuditLog.created_at.desc()))
    return list(result.scalars())


async def verify_audit_chain(session: AsyncSession) -> bool:
    result = await session.execute(select(AuditLog).order_by(AuditLog.id))
    expected = settings.audit_seed_hash
    for entry in result.scalars():
        payload = {
            "actor_id": entry.actor_id,
            "action": entry.action,
            "details": entry.details or {},
            "timestamp": entry.created_at.isoformat() if entry.created_at else "",
        }
        recomputed = next_chain_hash(expected, payload)
        if recomputed != entry.chain_hash:
            await event_bus.publish(
                "alerts",
                {
                    "event": "audit_tamper",
                    "log_id": entry.id,
                    "message": "Audit chain broken",
                },
            )
            await trigger_auto_seal("AUDIT_CHAIN_TAMPER", {"log_id": entry.id})
            return False
        expected = entry.chain_hash
    return True
