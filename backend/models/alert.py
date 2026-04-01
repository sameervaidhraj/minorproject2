from sqlalchemy import JSON, Column, DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
import enum

from .base import Base, TimestampMixin


class AlertSeverity(str, enum.Enum):
    info = "INFO"
    warning = "WARNING"
    critical = "CRITICAL"


class AlertStatus(str, enum.Enum):
    open = "OPEN"
    investigating = "INVESTIGATING"
    resolved = "RESOLVED"


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity))
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(String(512))
    status: Mapped[AlertStatus] = mapped_column(Enum(AlertStatus), default=AlertStatus.open)
    extra_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, default=dict)
