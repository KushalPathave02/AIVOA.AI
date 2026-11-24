from typing import TypedDict, Optional, Any


class InvestigationState(TypedDict, total=False):
    """State passed through the LangGraph investigation workflow."""

    # Input
    raw_text: str
    file_path: Optional[str]
    investigation_id: Optional[str]

    # Document processing
    document_text: str

    # Extraction
    extracted_fields: dict
    ai_summary: str
    risk_assessment: str
    missing_fields: list
    suggested_questions: list

    # Evidence
    evidence_summaries: list

    # RCA
    five_whys: dict
    fishbone: dict
    root_causes: list
    missing_evidence: list
    capa_recommendations: dict

    # Human review
    human_approved: bool
    human_feedback: str

    # Errors
    error: Optional[str]
