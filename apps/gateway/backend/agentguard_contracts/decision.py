from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class DecisionAction(str, Enum):
    ALLOW = "ALLOW"
    REDACT = "REDACT"
    DENY = "DENY"
    WARN = "WARN"

class Redaction(BaseModel):
    type: str
    original: Optional[str] = None
    replacement: str
    start: int = Field(ge=0)
    end: int = Field(ge=0)

class Decision(BaseModel):
    request_id: str
    tenant_id: str
    action: DecisionAction
    reasons: List[str] = Field(default_factory=list)
    redactions: List[Redaction] = Field(default_factory=list)
    allowed_tools: List[str] = Field(default_factory=list)
    requires_approval: bool = False
    audit_id: Optional[str] = None
