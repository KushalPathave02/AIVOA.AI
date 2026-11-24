"""AI endpoints — invoke LangGraph nodes for extraction, RCA, CAPA."""
import json
import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.ai.graph import investigation_graph
from app.ai.nodes import document, extraction, evidence as evidence_node, five_whys, fishbone, root_cause, missing_evidence, capa
from app.ai.state import InvestigationState
from app.api.deps import get_current_user
from app.database.db import get_db
from app.models.models import (
    Investigation, EvidenceDocument, ExtractedInformation,
    RCAAnalysis, MissingEvidence, CAPARecord, User,
)

router = APIRouter(prefix="/ai", tags=["ai"])


def _state_from_investigation(db: Session, inv: Investigation) -> InvestigationState:
    """Build LangGraph state from a persisted investigation."""
    fields = {
        "deviation_title": inv.deviation_title,
        "deviation_description": inv.deviation_description,
        "parameter": inv.parameter,
        "expected_value": inv.expected_value,
        "actual_value": inv.actual_value,
        "equipment_id": inv.equipment_id,
        "batch_number": inv.batch_number,
        "product_name": inv.product_name,
        "department": inv.department,
        "severity": inv.severity,
        "deviation_type": inv.deviation_type,
    }
    fields = {k: v for k, v in fields.items() if v}

    # Latest extracted info raw text
    extracted = db.query(ExtractedInformation).filter(
        ExtractedInformation.investigation_id == inv.id
    ).first()
    raw_text = extracted.raw_text if extracted else ""

    # Evidence summaries
    ev_docs = db.query(EvidenceDocument).filter(
        EvidenceDocument.investigation_id == inv.id
    ).all()
    evidence_summaries = [
        {
            "id": e.id,
            "file_name": e.file_name,
            "evidence_type": e.evidence_type,
            "content": e.ai_summary or "",
        }
        for e in ev_docs
    ]

    # Prior RCA results for context
    prior = {}
    for analysis in db.query(RCAAnalysis).filter(RCAAnalysis.investigation_id == inv.id).all():
        prior[analysis.analysis_type] = analysis.result

    return InvestigationState(
        investigation_id=inv.id,
        raw_text=raw_text,
        document_text=raw_text,
        extracted_fields=fields,
        evidence_summaries=evidence_summaries,
        five_whys=prior.get("five_whys"),
        fishbone=prior.get("fishbone"),
        root_causes=prior.get("root_cause", []),
    )


def _get_investigation(db: Session, investigation_id: str, user: User = None) -> Investigation:
    q = db.query(Investigation).filter(Investigation.id == investigation_id)
    if user is not None:
        q = q.filter(Investigation.created_by == user.id)
    inv = q.first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv


def _save_rca(db: Session, investigation_id: str, analysis_type: str, result):
    existing = (
        db.query(RCAAnalysis)
        .filter(RCAAnalysis.investigation_id == investigation_id, RCAAnalysis.analysis_type == analysis_type)
        .first()
    )
    if existing:
        existing.result = result
    else:
        db.add(RCAAnalysis(investigation_id=investigation_id, analysis_type=analysis_type, result=result))
    db.commit()


# ---------- Extraction (no investigation required — pre-save) ----------

@router.post("/extract")
def ai_extract(
    text: str = Form(""),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Extract structured investigation fields from pasted text or uploaded document."""
    file_path = None
    if file and file.filename:
        upload_dir = "./uploads/extractions"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{file.filename}")
        with open(file_path, "wb") as f:
            f.write(file.file.read())

    state = InvestigationState(raw_text=text, file_path=file_path)

    # Run document processor then extractor
    doc_result = document.document_processor(state)
    if doc_result.get("error"):
        raise HTTPException(status_code=400, detail=doc_result["error"])
    state.update(doc_result)

    ext_result = extraction.information_extractor(state)
    if ext_result.get("error"):
        raise HTTPException(status_code=500, detail=ext_result["error"])

    return {
        "extracted_fields": ext_result["extracted_fields"],
        "ai_summary": ext_result.get("ai_summary"),
        "risk_assessment": ext_result.get("risk_assessment"),
        "missing_fields": ext_result.get("missing_fields", []),
        "suggested_questions": ext_result.get("suggested_questions", []),
    }


# ---------- Load saved analyses ----------

@router.get("/analyses/{investigation_id}")
def get_saved_analyses(investigation_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return all persisted AI analyses for an investigation."""
    inv = _get_investigation(db, investigation_id, user)

    analyses = {
        a.analysis_type: a.result
        for a in db.query(RCAAnalysis).filter(RCAAnalysis.investigation_id == inv.id).all()
    }

    missing = db.query(MissingEvidence).filter(MissingEvidence.investigation_id == inv.id).all()
    capas = db.query(CAPARecord).filter(CAPARecord.investigation_id == inv.id).all()

    def capa_to_action(c):
        return {
            "action": c.action_description,
            "reason": c.reason,
            "responsible_department": c.responsible_department,
            "priority": c.priority,
            "status": c.status,
            "effectiveness_criteria": c.effectiveness_criteria,
            "capa_id": c.capa_id,
        }

    return {
        "five_whys": analyses.get("five_whys"),
        "fishbone": analyses.get("fishbone"),
        "root_causes": analyses.get("root_cause", []),
        "missing_evidence": [
            {
                "evidence": m.evidence_description,
                "reason": m.reason,
                "related_cause": m.related_cause,
                "priority": m.priority,
            }
            for m in missing
        ],
        "capa_recommendations": {
            "corrective_actions": [capa_to_action(c) for c in capas if c.action_type == "Corrective"],
            "preventive_actions": [capa_to_action(c) for c in capas if c.action_type == "Preventive"],
        },
    }


# ---------- Per-step AI analyses (require saved investigation) ----------

@router.post("/five-whys")
def ai_five_whys(req: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = _get_investigation(db, req["investigation_id"], user)
    state = _state_from_investigation(db, inv)
    result = five_whys.five_whys_analyzer(state)
    _save_rca(db, inv.id, "five_whys", result["five_whys"])
    return result["five_whys"]


@router.post("/fishbone")
def ai_fishbone(req: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = _get_investigation(db, req["investigation_id"], user)
    state = _state_from_investigation(db, inv)
    result = fishbone.fishbone_analyzer(state)
    _save_rca(db, inv.id, "fishbone", result["fishbone"])
    return result["fishbone"]


@router.post("/rca")
def ai_root_cause(req: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = _get_investigation(db, req["investigation_id"], user)
    state = _state_from_investigation(db, inv)

    # Ensure 5-whys and fishbone exist for context
    if not state.get("five_whys"):
        state.update(five_whys.five_whys_analyzer(state))
    if not state.get("fishbone"):
        state.update(fishbone.fishbone_analyzer(state))

    result = root_cause.root_cause_evaluator(state)
    _save_rca(db, inv.id, "root_cause", result["root_causes"])
    return result["root_causes"]


@router.post("/missing-evidence")
def ai_missing_evidence(req: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = _get_investigation(db, req["investigation_id"], user)
    state = _state_from_investigation(db, inv)

    # Ensure root causes exist
    if not state.get("root_causes"):
        rc = root_cause.root_cause_evaluator(state)
        state["root_causes"] = rc["root_causes"]
        _save_rca(db, inv.id, "root_cause", rc["root_causes"])

    result = missing_evidence.missing_evidence_checker(state)

    # Persist missing evidence items
    db.query(MissingEvidence).filter(MissingEvidence.investigation_id == inv.id).delete()
    for item in result.get("missing_evidence", []):
        db.add(MissingEvidence(
            investigation_id=inv.id,
            evidence_description=item.get("evidence", ""),
            reason=item.get("reason", ""),
            related_cause=item.get("related_cause", ""),
            priority=item.get("priority", "Medium"),
        ))
    db.commit()

    return {
        "missing_evidence": result.get("missing_evidence", []),
        "investigation_questions": result.get("suggested_questions", []),
    }


@router.post("/capa")
def ai_capa(req: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = _get_investigation(db, req["investigation_id"], user)
    state = _state_from_investigation(db, inv)

    # Ensure root causes exist
    if not state.get("root_causes"):
        rc = root_cause.root_cause_evaluator(state)
        state["root_causes"] = rc["root_causes"]

    result = capa.capa_generator(state)
    recs = result.get("capa_recommendations", {})

    # Persist CAPA records
    db.query(CAPARecord).filter(CAPARecord.investigation_id == inv.id).delete()
    capa_num = db.query(CAPARecord).count() + 1
    for action_type, key in [("Corrective", "corrective_actions"), ("Preventive", "preventive_actions")]:
        for action in recs.get(key, []):
            capa_num += 1
            db.add(CAPARecord(
                capa_id=f"CAPA-{capa_num:04d}",
                investigation_id=inv.id,
                action_type=action_type,
                action_description=action.get("action", ""),
                reason=action.get("reason", ""),
                responsible_department=action.get("responsible_department", ""),
                priority=action.get("priority", "Medium"),
                status="Proposed",
                effectiveness_criteria=action.get("effectiveness_criteria", ""),
            ))
    db.commit()

    return recs


@router.post("/analyze-evidence/{evidence_id}")
def ai_analyze_evidence(evidence_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Analyze a single uploaded evidence document."""
    ev = db.query(EvidenceDocument).filter(EvidenceDocument.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")

    inv = _get_investigation(db, ev.investigation_id, user)

    # Extract text content from the file
    content = ""
    if ev.file_path and os.path.exists(ev.file_path):
        try:
            content = document.extract_text_from_file(ev.file_path)
        except Exception:
            content = ""

    if not content:
        content = ev.ai_summary or "No extractable content"

    state = InvestigationState(
        extracted_fields={
            "deviation_title": inv.deviation_title,
            "deviation_description": inv.deviation_description,
        },
        evidence_summaries=[{
            "file_name": ev.file_name,
            "evidence_type": ev.evidence_type,
            "content": content,
        }],
    )

    result = evidence_node.evidence_analyzer(state)
    analysis = result["evidence_summaries"][0].get("analysis", {}) if result["evidence_summaries"] else {}

    ev.ai_summary = analysis.get("ai_summary", "")
    ev.extracted_findings = analysis.get("relevant_findings", [])
    ev.contradictions = analysis.get("contradictions", [])
    ev.supports_cause = analysis.get("supports_cause")
    ev.ai_analyzed = True
    db.commit()
    db.refresh(ev)

    return {
        "id": ev.id,
        "ai_summary": ev.ai_summary,
        "extracted_findings": ev.extracted_findings,
        "contradictions": ev.contradictions,
        "supports_cause": ev.supports_cause,
        "ai_analyzed": ev.ai_analyzed,
    }


@router.post("/full-analysis/{investigation_id}")
def ai_full_analysis(investigation_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Run the complete LangGraph investigation pipeline."""
    inv = _get_investigation(db, investigation_id, user)
    state = _state_from_investigation(db, inv)

    # Run graph up to human_review
    config = {"configurable": {"thread_id": investigation_id}}
    result = investigation_graph.invoke(state, config)

    # Persist all results
    if result.get("extracted_fields"):
        ext = db.query(ExtractedInformation).filter(
            ExtractedInformation.investigation_id == inv.id
        ).first()
        if not ext:
            ext = ExtractedInformation(investigation_id=inv.id)
            db.add(ext)
        ext.extracted_fields = result["extracted_fields"]
        ext.ai_summary = result.get("ai_summary")
        ext.risk_assessment = result.get("risk_assessment")
        ext.missing_fields = result.get("missing_fields", [])
        ext.suggested_questions = result.get("suggested_questions", [])

    _save_rca(db, inv.id, "five_whys", result.get("five_whys"))
    _save_rca(db, inv.id, "fishbone", result.get("fishbone"))
    _save_rca(db, inv.id, "root_cause", result.get("root_causes", []))
    db.commit()

    return {
        "extracted_fields": result.get("extracted_fields", {}),
        "five_whys": result.get("five_whys"),
        "fishbone": result.get("fishbone"),
        "root_causes": result.get("root_causes", []),
        "missing_evidence": result.get("missing_evidence", []),
        "capa_recommendations": result.get("capa_recommendations", {}),
        "status": "awaiting_human_review",
    }
