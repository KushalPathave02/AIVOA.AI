"""Evidence analyzer node — analyzes uploaded evidence documents."""
from app.ai.llm import chat_json
from app.ai.prompts import EVIDENCE_ANALYSIS_PROMPT
from app.ai.state import InvestigationState


def evidence_analyzer(state: InvestigationState) -> dict:
    """Analyze evidence summaries collected for the investigation."""
    summaries = state.get("evidence_summaries", [])
    if not summaries:
        return {"evidence_summaries": []}

    fields = state.get("extracted_fields", {})
    context = (
        f"{fields.get('deviation_title', 'Unknown deviation')} — "
        f"{fields.get('deviation_description', '')}"
    )

    analyzed = []
    for ev in summaries:
        prompt = EVIDENCE_ANALYSIS_PROMPT.format(
            evidence_type=ev.get("evidence_type", "Other"),
            file_name=ev.get("file_name", "document"),
            content=ev.get("content", "")[:8000],
            deviation_title=fields.get("deviation_title", "Unknown"),
            deviation_description=fields.get("deviation_description", ""),
        )
        try:
            result = chat_json(prompt)
            analyzed.append({**ev, "analysis": result})
        except Exception as e:
            analyzed.append({**ev, "analysis": {"error": str(e)}})

    return {"evidence_summaries": analyzed}
