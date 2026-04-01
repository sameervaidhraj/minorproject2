from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Centralized application configuration loaded from environment variables."""

    app_name: str = "Project Aegis"
    environment: str = Field(default="development")
    api_prefix: str = Field(default="/api")
    secret_key: str = Field(default="dev-super-secret", env="APP_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256")
    access_token_exp_minutes: int = Field(default=15)
    refresh_token_exp_minutes: int = Field(default=60)

    database_url: str = Field(default="sqlite+aiosqlite:///./data/aegis.db", env="DATABASE_URL")
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")

    vault_addr: str = Field(default="http://localhost:8200", env="VAULT_ADDR")
    vault_mount_path: str = Field(default="secret", env="VAULT_MOUNT_PATH")
    vault_transit_key: str = Field(default="aegis-transit", env="VAULT_TRANSIT_KEY")
    vault_token: str | None = Field(default=None, env="VAULT_TOKEN")

    rate_limit_requests: int = Field(default=20, env="RATE_LIMIT_REQUESTS")
    rate_limit_window_seconds: int = Field(default=60, env="RATE_LIMIT_WINDOW_SECONDS")
    unseal_share_ttl_seconds: int = Field(default=300, env="UNSEAL_SHARE_TTL_SECONDS")
    secret_view_ttl_seconds: int = Field(default=900, env="SECRET_VIEW_TTL_SECONDS")

    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    websocket_origins: List[str] = Field(default_factory=lambda: ["*"])

    audit_seed_hash: str = Field(default="GENESIS", env="AUDIT_SEED_HASH")
    totp_issuer: str = Field(default="Project Aegis", env="TOTP_ISSUER")

    vault_key_shares: int = Field(default=5, env="VAULT_KEY_SHARES")
    vault_key_threshold: int = Field(default=3, env="VAULT_KEY_THRESHOLD")

    log_level: str = Field(default="INFO", env="LOG_LEVEL")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
