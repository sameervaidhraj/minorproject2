import asyncio

from ..celery_app import celery_app
from ..database import SessionLocal
from .service import verify_audit_chain


@celery_app.on_after_configure.connect
def schedule_audit_chain_guard(sender, **kwargs):  # pragma: no cover - Celery wiring
    sender.add_periodic_task(180.0, audit_chain_guard.s(), name="verify audit chain")


@celery_app.task
def audit_chain_guard() -> bool:
    async def _run() -> bool:
        async with SessionLocal() as session:
            return await verify_audit_chain(session)

    return asyncio.run(_run())
