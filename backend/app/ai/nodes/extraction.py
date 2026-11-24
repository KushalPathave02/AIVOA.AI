"""Information extraction node — uses Groq LLM to extract structured fields."""
from app.ai.llm import chat_json
from app.ai.prompts import EXTRACTION_PROMPT
from app.ai.state import InvestigationState


def information_extractor(state: InvestigationState) -> dict:
    """Extract structured investigation fields from document text."""
    text = state.get("document_text", "")
    if not text:
        return {"error": "No document text to extract from"}

    prompt = EXTRACTION_PROMPT.format(text=text[:12000])  # truncate very long docs
    result = chat_json(prompt)

    if not isinstance(result, dict):
        return {"error": "Extraction did not return a JSON object"}

    extracted_fields = {
        k: v
        for k, v in result.items()
        if k not in ("ai_summary", "risk_assessment", "missing_fields", "suggested_questions")
    }

    return {
        "extracted_fields": extracted_fields,
        "ai_summary": result.get("ai_summary", ""),
        "risk_assessment": result.get("risk_assessment", ""),
        "missing_fields": result.get("missing_fields", []),
        "suggested_questions": result.get("suggested_questions", []),
    }
