from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.service import require_roles
from ..config import settings
from ..database import get_session
from ..models import User
from ..secrets.service import panic_revoke
from .service import read_vault_status, seal_vault_remote, vault_gatekeeper

router = APIRouter(prefix=f"{settings.api_prefix}/vault", tags=["Vault"])


@router.post("/init")
async def initialize_vault(_: User = Depends(require_roles("Admin"))):
    shares = await vault_gatekeeper.initialize()
    return {"shares": shares, "threshold": settings.vault_key_threshold}


@router.post("/unseal")
async def submit_unseal_fragment(
    payload: dict[str, int | str],
    _: User = Depends(require_roles("Admin", "Security Officer")),
):
    try:
        gatekeeper_status = await vault_gatekeeper.submit_share(int(payload["index"]), str(payload["fragment"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid share") from exc
    return {
        "sealed": gatekeeper_status.sealed,
        "progress": gatekeeper_status.progress,
        "required": gatekeeper_status.required,
    }


@router.post("/seal")
async def seal_vault(_: User = Depends(require_roles("Admin"))):
    await vault_gatekeeper.seal()
    try:
        remote_status = await seal_vault_remote()
    except Exception:
        remote_status = {"sealed": True}
    return {"sealed": True, "remote": remote_status}


@router.get("/status")
async def vault_status(_: User = Depends(require_roles("Admin", "Security Officer", "Auditor"))):
    status_payload = await read_vault_status()
    return status_payload


@router.post("/panic")
async def panic_mode(
    _: User = Depends(require_roles("Admin")),
    session: AsyncSession = Depends(get_session),
):
    revoked = await panic_revoke(session)
    await vault_gatekeeper.seal()
    return {"revoked": revoked, "sealed": True}
