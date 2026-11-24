"""Fishbone (Ishikawa) analysis node."""
import json

from app.ai.llm import chat_json
from app.ai.prompts import FISHBONE_PROMPT
from app.ai.state import InvestigationState


def fishbone_analyzer(state: InvestigationState) -> dict:
    fields = state.get("extracted_fields", {})

    prompt = FISHBONE_PROMPT.format(
        deviation_title=fields.get("deviation_title", "Unknown deviation"),
        deviation_description=fields.get("deviation_description", ""),
        parameter=fields.get("parameter", ""),
        equipment_id=fields.get("equipment_id", ""),
    )

    result = chat_json(prompt)
    return {"fishbone": result}
