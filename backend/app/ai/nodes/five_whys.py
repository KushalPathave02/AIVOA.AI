"""5 Whys analysis node."""
import json

from app.ai.llm import chat_json
from app.ai.prompts import FIVE_WHYS_PROMPT
from app.ai.state import InvestigationState


def five_whys_analyzer(state: InvestigationState) -> dict:
    fields = state.get("extracted_fields", {})
    evidence = json.dumps(state.get("evidence_summaries", []), default=str)[:3000]

    prompt = FIVE_WHYS_PROMPT.format(
        deviation_title=fields.get("deviation_title", "Unknown deviation"),
        deviation_description=fields.get("deviation_description", ""),
        parameter=fields.get("parameter", ""),
        expected_value=fields.get("expected_value", ""),
        actual_value=fields.get("actual_value", ""),
        equipment_id=fields.get("equipment_id", ""),
        batch_number=fields.get("batch_number", ""),
        evidence=evidence,
    )

    result = chat_json(prompt)
    return {"five_whys": result}
