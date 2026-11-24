"""Root cause evaluation node."""
import json

from app.ai.llm import chat_json
from app.ai.prompts import ROOT_CAUSE_PROMPT
from app.ai.state import InvestigationState


def root_cause_evaluator(state: InvestigationState) -> dict:
    fields = state.get("extracted_fields", {})

    prompt = ROOT_CAUSE_PROMPT.format(
        deviation_title=fields.get("deviation_title", "Unknown deviation"),
        deviation_description=fields.get("deviation_description", ""),
        parameter=fields.get("parameter", ""),
        expected_value=fields.get("expected_value", ""),
        actual_value=fields.get("actual_value", ""),
        equipment_id=fields.get("equipment_id", ""),
        batch_number=fields.get("batch_number", ""),
        five_whys=json.dumps(state.get("five_whys", {}), default=str)[:3000],
        fishbone=json.dumps(state.get("fishbone", {}), default=str)[:3000],
        evidence=json.dumps(state.get("evidence_summaries", []), default=str)[:3000],
    )

    result = chat_json(prompt)
    if not isinstance(result, list):
        result = result.get("root_causes", []) if isinstance(result, dict) else []

    return {"root_causes": result}
