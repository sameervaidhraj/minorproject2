from contextlib import suppress

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .alerts.router import router as alerts_router
from .auth.router import router as auth_router
from .config import settings
from .database import init_database
from .cache import redis_client
from .audit.router import router as audit_router
from .secrets.router import router as secrets_router
from .services.events import event_bus
from .vault.router import router as vault_router
from .vault.service import ensure_transit_ready, vault_gatekeeper

app = FastAPI(title=settings.app_name, version="1.0.0", docs_url="/docs")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(secrets_router)
app.include_router(audit_router)
app.include_router(vault_router)
app.include_router(alerts_router)

SEALED_PATH_ALLOWLIST = {
    "/",
    "/health",
    f"{settings.api_prefix}/vault/unseal",
    f"{settings.api_prefix}/vault/init",
    f"{settings.api_prefix}/vault/status",
    f"{settings.api_prefix}/auth/login",
    f"{settings.api_prefix}/auth/mfa-verify",
}
SEALED_PREFIX_ALLOWLIST = ("/docs", "/openapi", "/static")


def _is_path_whitelisted(path: str) -> bool:
    normalized = path if path == "/" else path.rstrip("/")
    if any(path.startswith(prefix) for prefix in SEALED_PREFIX_ALLOWLIST):
        return True
    return normalized in SEALED_PATH_ALLOWLIST


@app.middleware("http")
async def enforce_vault_state(request: Request, call_next):
    if not _is_path_whitelisted(request.url.path):
        status_payload = await vault_gatekeeper.status()
        if status_payload.sealed:
            return JSONResponse(
                {"detail": "Vault sealed. Submit unseal fragments to continue."},
                status_code=503,
            )
    return await call_next(request)


@app.on_event("startup")
async def on_startup() -> None:
    await init_database()
    with suppress(Exception):
        await redis_client.ping()
    with suppress(Exception):
        await ensure_transit_ready()


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}


@app.websocket("/ws/audit")
async def audit_stream(websocket: WebSocket) -> None:
    if not await _websocket_allowed(websocket):
        return
    await event_bus.connect("audit", websocket)
    await _consume_forever("audit", websocket)


@app.websocket("/ws/vault")
async def vault_stream(websocket: WebSocket) -> None:
    if not await _websocket_allowed(websocket):
        return
    await event_bus.connect("vault", websocket)
    await _consume_forever("vault", websocket)


@app.websocket("/ws/leases")
async def leases_stream(websocket: WebSocket) -> None:
    if not await _websocket_allowed(websocket):
        return
    await event_bus.connect("leases", websocket)
    await _consume_forever("leases", websocket)


@app.websocket("/ws/alerts")
async def alerts_stream(websocket: WebSocket) -> None:
    if not await _websocket_allowed(websocket):
        return
    await event_bus.connect("alerts", websocket)
    await _consume_forever("alerts", websocket)


async def _consume_forever(channel: str, websocket: WebSocket) -> None:
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await event_bus.disconnect(channel, websocket)


async def _websocket_allowed(websocket: WebSocket) -> bool:
    status_payload = await vault_gatekeeper.status()
    if status_payload.sealed:
        await websocket.close(code=1013, reason="Vault sealed")
        return False
    return True
