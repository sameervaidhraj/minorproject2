from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.service import require_roles
from ..config import settings
from ..database import get_session
from ..models import User
from .service import fetch_audit_logs, verify_audit_chain

router = APIRouter(prefix=f"{settings.api_prefix}/audit", tags=["Audit"])


@router.get("/entries")
async def list_audit_entries(
    _: User = Depends(require_roles("Admin", "Security Officer", "Auditor")),
    session: AsyncSession = Depends(get_session),
):
    logs = await fetch_audit_logs(session)
    chain_ok = await verify_audit_chain(session)
    return {
        "tamper_detected": not chain_ok,
        "logs": [
            {
                "id": log.id,
                "actor_id": log.actor_id,
                "action": log.action,
                "details": log.details,
                "created_at": log.created_at,
                "chain_hash": log.chain_hash,
                "prev_hash": log.prev_hash,
            }
            for log in logs
        ],
    }
