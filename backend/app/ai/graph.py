"""LangGraph workflow for AI-powered deviation investigation.

Pipeline:
  document_processor → information_extractor → evidence_analyzer
    → five_whys_analyzer + fishbone_analyzer (parallel)
    → root_cause_evaluator → missing_evidence_checker → capa_generator
    → human_review → END

The graph is compiled with an in-memory checkpointer so it can be resumed
for human-in-the-loop review. For the REST API we primarily invoke the
full pipeline up to human_review, then persist results after QA approval.
"""
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from app.ai.state import InvestigationState
from app.ai.nodes import (
    document,
    extraction,
    evidence,
    five_whys,
    fishbone,
    root_cause,
    missing_evidence,
    capa,
)


def human_review_node(state: InvestigationState) -> dict:
    """Pause point for human review.

    In a production deployment this would use langgraph.interrupt() to pause
    execution until the investigator approves/edits/rejects AI suggestions.
    Here it marks the state as awaiting review — the API layer persists the
    AI output and waits for the investigator's PUT /review call.
    """
    return {"human_approved": False}


def should_continue(state: InvestigationState) -> str:
    """Route after human review: continue to save if approved, else end."""
    if state.get("human_approved"):
        return "save_investigation"
    return END


def build_graph() -> StateGraph:
    graph = StateGraph(InvestigationState)

    graph.add_node("document_processor", document.document_processor)
    graph.add_node("information_extractor", extraction.information_extractor)
    graph.add_node("evidence_analyzer", evidence.evidence_analyzer)
    graph.add_node("five_whys_analyzer", five_whys.five_whys_analyzer)
    graph.add_node("fishbone_analyzer", fishbone.fishbone_analyzer)
    graph.add_node("root_cause_evaluator", root_cause.root_cause_evaluator)
    graph.add_node("missing_evidence_checker", missing_evidence.missing_evidence_checker)
    graph.add_node("capa_generator", capa.capa_generator)
    graph.add_node("human_review", human_review_node)

    graph.set_entry_point("document_processor")
    graph.add_edge("document_processor", "information_extractor")
    graph.add_edge("information_extractor", "evidence_analyzer")

    # Parallel RCA branches
    graph.add_edge("evidence_analyzer", "five_whys_analyzer")
    graph.add_edge("evidence_analyzer", "fishbone_analyzer")
    graph.add_edge("five_whys_analyzer", "root_cause_evaluator")
    graph.add_edge("fishbone_analyzer", "root_cause_evaluator")

    graph.add_edge("root_cause_evaluator", "missing_evidence_checker")
    graph.add_edge("missing_evidence_checker", "capa_generator")
    graph.add_edge("capa_generator", "human_review")
    graph.add_conditional_edges("human_review", should_continue)

    return graph


# Compiled graph with checkpointer for human-in-the-loop support
investigation_graph = build_graph().compile(checkpointer=MemorySaver())
