"""Missing evidence checker node."""
import json

from app.ai.llm import chat_json
from app.ai.prompts import MISSING_EVIDENCE_PROMPT
from app.ai.state import InvestigationState


def missing_evidence_checker(state: InvestigationState) -> dict:
    fields = state.get("extracted_fields", {})

    prompt = MISSING_EVIDENCE_PROMPT.format(
        deviation_title=fields.get("deviation_title", "Unknown deviation"),
        deviation_description=fields.get("deviation_description", ""),
        parameter=fields.get("parameter", ""),
        equipment_id=fields.get("equipment_id", ""),
        root_causes=json.dumps(state.get("root_causes", []), default=str)[:3000],
        evidence=json.dumps(state.get("evidence_summaries", []), default=str)[:2000],
    )

    result = chat_json(prompt)
    if isinstance(result, dict):
        return {
            "missing_evidence": result.get("missing_evidence", []),
            "suggested_questions": result.get("investigation_questions", state.get("suggested_questions", [])),
        }
    return {"missing_evidence": result if isinstance(result, list) else []}
