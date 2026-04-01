import asyncio

from ..celery_app import celery_app
from ..database import SessionLocal
from .service import expire_overdue_leases


@celery_app.on_after_configure.connect
def schedule_lease_reaper(sender, **kwargs):  # pragma: no cover - Celery wiring
    sender.add_periodic_task(60.0, reap_expired_leases.s(), name="expire secret leases")


@celery_app.task
def reap_expired_leases() -> int:
    async def _run() -> int:
        async with SessionLocal() as session:
            return await expire_overdue_leases(session)

    return asyncio.run(_run())
