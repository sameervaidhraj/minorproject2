from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class EventBus:
    """Lightweight pub/sub broker for WebSocket fan-out."""

    def __init__(self) -> None:
        self._channels = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._channels[channel].add(websocket)

    async def disconnect(self, channel: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._channels[channel].discard(websocket)

    async def publish(self, channel: str, payload: Any) -> None:
        async with self._lock:
            targets = list(self._channels[channel])
        for ws in targets:
            try:
                await ws.send_json(payload)
            except Exception:
                # Drop dead connections silently to keep loop resilient.
                await self.disconnect(channel, ws)


event_bus = EventBus()
