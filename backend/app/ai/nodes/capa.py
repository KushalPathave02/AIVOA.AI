"""CAPA generator node."""
import json

from app.ai.llm import chat_json
from app.ai.prompts import CAPA_PROMPT
from app.ai.state import InvestigationState


def capa_generator(state: InvestigationState) -> dict:
    fields = state.get("extracted_fields", {})

    prompt = CAPA_PROMPT.format(
        deviation_title=fields.get("deviation_title", "Unknown deviation"),
        root_causes=json.dumps(state.get("root_causes", []), default=str)[:3000],
        missing_evidence=json.dumps(state.get("missing_evidence", []), default=str)[:2000],
    )

    result = chat_json(prompt)
    return {"capa_recommendations": result if isinstance(result, dict) else {}}
