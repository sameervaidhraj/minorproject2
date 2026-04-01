from sqlalchemy import JSON, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from .base import Base, TimestampMixin


class SecretCategory(str, enum.Enum):
    api = "API_KEY"
    database = "DATABASE"
    ssh = "SSH_KEY"


class StoredSecret(Base, TimestampMixin):
    __tablename__ = "stored_secrets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True)
    category: Mapped[str] = mapped_column(String(50))
    encrypted_value: Mapped[str] = mapped_column(String)
    vault_path: Mapped[str | None] = mapped_column(String(255))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    extra_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, default=dict)

    creator = relationship("User", backref="secrets")


class SecretLease(Base):
    __tablename__ = "secret_leases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lease_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    target: Mapped[str] = mapped_column(String(255))
    secret_type: Mapped[str] = mapped_column(String(50))
    issued_to: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    issued_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(50), default="active")
    extra_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, default=dict)

    owner = relationship("User")
