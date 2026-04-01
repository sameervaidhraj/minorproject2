import time

from fastapi import HTTPException, status
from redis.asyncio import Redis


def _build_key(prefix: str, identifier: str) -> str:
    return f"rate:{prefix}:{identifier}"


async def enforce_rate_limit(redis: Redis, identifier: str, limit: int, window: int) -> None:
    key = _build_key("global", identifier)
    now = int(time.time())
    ttl = await redis.ttl(key)
    count = await redis.incr(key)
    if ttl == -1:
        await redis.expire(key, window)
    if count > limit:
        expires_in = await redis.ttl(key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"message": "Too many requests", "retry_after": max(expires_in, 1)},
        )
