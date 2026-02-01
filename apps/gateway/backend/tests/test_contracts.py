import json
import os
import pytest
from jsonschema import validate
from agentguard_contracts.decision import Decision, DecisionAction

def test_decision_contract_consistency():
    """
    Verify that our Pydantic Decision model matches the source-of-truth JSON schema.
    """
    # 1. Path to the generated schema
    schema_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../../../packages/contracts-schema/schema/Decision.schema.json")
    )
    
    with open(schema_path, "r") as f:
        schema = json.load(f)
    
    # 2. Create a sample decision using Pydantic
    sample_decision = Decision(
        request_id="test-req-1",
        tenant_id="demo",
        action=DecisionAction.REDACT,
        reasons=["PII detected"],
        redactions=[{
            "type": "email",
            "replacement": "[REDACTED]",
            "start": 0,
            "end": 10
        }]
    )
    
    # 3. Validate the Pydantic-exported dict against the JSON schema
    # If this fails, it means Pydantic and Zod have drifted.
    validate(instance=sample_decision.model_dump(), schema=schema)
