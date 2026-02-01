from enum import Enum
from typing import Any
from pydantic import BaseModel

class AuditApp(str, Enum):
    gateway = "gateway"
    sentinel = "sentinel"
    pulse = "pulse"

class AuditEvent(BaseModel):
    request_id: str
    tenant_id: str
    app: AuditApp
    event_type: str
    ts: str  # ISO timestamp
    payload: Any
