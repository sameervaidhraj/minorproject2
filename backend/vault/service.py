from __future__ import annotations

import asyncio
import base64
import logging
from contextlib import suppress
from dataclasses import dataclass
from typing import Any

import hvac
from hvac import exceptions as hvac_exceptions
from fastapi.concurrency import run_in_threadpool

from ..cache import redis_client
from ..config import settings
from ..services.crypto import split_master_key
from ..services.events import event_bus

logger = logging.getLogger(__name__)

UNSEAL_FRAGMENT_KEY = "vault:unseal:fragments"
_transit_ready = False
_transit_lock = asyncio.Lock()


def _encode_b64(value: str) -> str:
    return base64.b64encode(value.encode()).decode()


def _decode_b64(value: str) -> str:
    return base64.b64decode(value).decode()


@dataclass
class VaultStatus:
    sealed: bool
    progress: int
    required: int


class VaultGatekeeper:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._shares: dict[int, str] = {}
        self._entered: set[int] = set()
        self._sealed = True

    async def initialize(self) -> list[dict[str, Any]]:
        async with self._lock:
            pieces = split_master_key(
                settings.secret_key,
                settings.vault_key_shares,
                settings.vault_key_threshold,
            )
            self._shares = {idx: value for idx, value in pieces}
            self._entered.clear()
            self._sealed = True
            await _clear_fragment_cache()
        await event_bus.publish("vault", {"event": "initialized", "share_count": len(pieces)})
        return [
            {"index": idx, "fragment": fragment}
            for idx, fragment in sorted(self._shares.items(), key=lambda item: item[0])
        ]

    async def submit_share(self, index: int, fragment: str) -> VaultStatus:
        publish_unsealed = False
        async with self._lock:
            expected = self._shares.get(index)
            if expected is None or expected != fragment:
                raise ValueError("Invalid share fragment")
            self._entered.add(index)
            progress = max(len(self._entered), await _record_fragment(index, fragment))
            if progress >= settings.vault_key_threshold and self._sealed:
                self._sealed = False
                self._entered.clear()
                await _clear_fragment_cache()
                publish_unsealed = True
                progress = settings.vault_key_threshold
        if publish_unsealed:
            await event_bus.publish("vault", {"event": "unsealed"})
        return VaultStatus(self._sealed, progress, settings.vault_key_threshold)

    async def seal(self) -> None:
        async with self._lock:
            self._sealed = True
            self._entered.clear()
            await _clear_fragment_cache()
        await event_bus.publish("vault", {"event": "sealed"})

    async def status(self) -> VaultStatus:
        async with self._lock:
            if self._sealed:
                progress = max(len(self._entered), await _pending_fragment_count())
            else:
                progress = settings.vault_key_threshold
            return VaultStatus(self._sealed, progress, settings.vault_key_threshold)


vault_gatekeeper = VaultGatekeeper()


async def _record_fragment(index: int, fragment: str) -> int:
    try:
        await redis_client.hset(UNSEAL_FRAGMENT_KEY, index, fragment)
        await redis_client.expire(UNSEAL_FRAGMENT_KEY, settings.unseal_share_ttl_seconds)
        return await redis_client.hlen(UNSEAL_FRAGMENT_KEY)
    except Exception as exc:  # pragma: no cover - redis outage fallback
        logger.warning("Failed to persist unseal fragment %s: %s", index, exc)
        return 0


async def _pending_fragment_count() -> int:
    try:
        return await redis_client.hlen(UNSEAL_FRAGMENT_KEY)
    except Exception:  # pragma: no cover - redis outage fallback
        return 0


async def _clear_fragment_cache() -> None:
    with suppress(Exception):  # pragma: no cover - redis outage fallback
        await redis_client.delete(UNSEAL_FRAGMENT_KEY)


def _hvac_client() -> hvac.Client:
    return hvac.Client(url=settings.vault_addr, token=settings.vault_token)


async def ensure_transit_ready(force: bool = False) -> None:
    global _transit_ready
    async with _transit_lock:
        if _transit_ready and not force:
            return

        def _sync_prepare() -> None:
            client = _hvac_client()
            mounts = client.sys.list_mounted_secrets_engines()
            mount_data = mounts.get("data") if isinstance(mounts, dict) else mounts
            if "transit/" not in (mount_data or {}):
                client.sys.enable_secrets_engine("transit")
            try:
                client.secrets.transit.read_key(name=settings.vault_transit_key)
            except hvac_exceptions.InvalidPath:
                client.secrets.transit.create_key(name=settings.vault_transit_key)

        await run_in_threadpool(_sync_prepare)
        _transit_ready = True


async def seal_vault_remote() -> dict[str, Any]:
    def _seal() -> dict[str, Any]:
        client = _hvac_client()
        client.sys.seal()
        return client.sys.read_seal_status()

    return await run_in_threadpool(_seal)


async def read_vault_status() -> dict[str, Any]:
    gatekeeper_status = await vault_gatekeeper.status()

    def _status() -> dict[str, Any]:
        client = _hvac_client()
        return client.sys.read_seal_status()

    payload: dict[str, Any] = {
        "sealed": gatekeeper_status.sealed,
        "progress": gatekeeper_status.progress,
        "threshold": gatekeeper_status.required,
        "required": gatekeeper_status.required,
    }

    try:
        remote = await run_in_threadpool(_status)
        threshold = remote.get("threshold") or remote.get("required") or remote.get("t")
        if threshold is not None:
            remote.setdefault("threshold", threshold)
            remote.setdefault("required", threshold)
        payload["remote"] = remote
    except Exception:
        payload["remote"] = None

    return payload


async def encrypt_with_vault(plaintext: str) -> str:
    await ensure_transit_ready()

    def _encrypt() -> str:
        client = _hvac_client()
        response = client.secrets.transit.encrypt_data(
            name=settings.vault_transit_key,
            plaintext=_encode_b64(plaintext),
        )
        return response["data"]["ciphertext"]
    try:
        return await run_in_threadpool(_encrypt)
    except hvac_exceptions.InvalidPath:
        await ensure_transit_ready(force=True)
        return await run_in_threadpool(_encrypt)


async def decrypt_with_vault(ciphertext: str) -> str:
    await ensure_transit_ready()

    def _decrypt() -> str:
        client = _hvac_client()
        response = client.secrets.transit.decrypt_data(
            name=settings.vault_transit_key,
            ciphertext=ciphertext,
        )
        encoded = response["data"]["plaintext"]
        return _decode_b64(encoded)
    try:
        return await run_in_threadpool(_decrypt)
    except hvac_exceptions.InvalidPath:
        await ensure_transit_ready(force=True)
        return await run_in_threadpool(_decrypt)


async def trigger_auto_seal(reason: str, metadata: dict[str, Any] | None = None) -> None:
    logger.warning("Auto-sealing vault (%s)", reason)
    await vault_gatekeeper.seal()
    try:
        await seal_vault_remote()
    except Exception as exc:  # pragma: no cover - remote Vault optional
        logger.error("Failed to propagate remote seal: %s", exc)
    await event_bus.publish(
        "vault",
        {
            "event": "auto_sealed",
            "reason": reason,
            "metadata": metadata or {},
        },
    )
