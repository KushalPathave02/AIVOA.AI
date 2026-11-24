"""AIVOA.ai Copilot — conversational AI assistant endpoints.

Provides a Copilot-style chat that can:
- Answer questions about investigations, RCA, CAPA
- Extract structured incident data from pasted text or uploaded PDFs
- Auto-fill investigation forms via the LangGraph extraction pipeline
"""
import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.ai.llm import chat_json, chat_text, chat_messages, get_client
from app.ai.nodes import document, extraction, five_whys, fishbone, root_cause, missing_evidence, capa
from app.ai.prompts import EXTRACTION_PROMPT
from app.ai.state import InvestigationState
from app.api.deps import get_current_user
from app.core.config import settings
from app.database.db import get_db
from app.models.models import (
    Investigation, ExtractedInformation, RCAAnalysis, MissingEvidence,
    CAPARecord, AuditLog, User,
)

router = APIRouter(prefix="/ai/copilot", tags=["copilot"])

SYSTEM_PROMPT = """You are AIVOA.ai Copilot, an AI assistant embedded in PharmaRoot AI — a pharmaceutical Quality Management System for deviation investigation and CAPA management.

You help QA professionals by:
- Explaining deviation investigations, root cause analysis (5 Whys, Fishbone), and CAPA workflows
- Extracting structured data from incident reports, emails, and PDFs
- Suggesting investigation questions and missing evidence
- Recommending corrective and preventive actions per ICH Q10 principles

Rules:
- AI outputs are suggestions/hypotheses — a qualified QA professional must review and approve all findings
- Never declare a root cause as confirmed without evidence
- Be concise and professional. Use pharmaceutical QA terminology correctly.
- If asked to fill a form, provide the extracted fields as structured JSON.
"""


@router.post("/chat")
def copilot_chat(
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Conversational copilot. Accepts {message, history?, investigation_id?}."""
    message = payload.get("message", "")
    history = payload.get("history", [])
    investigation_id = payload.get("investigation_id")

    if not message.strip():
        raise HTTPException(status_code=400, detail="Message is required")

    context = ""
    if investigation_id:
        inv = db.query(Investigation).filter(
            Investigation.id == investigation_id, Investigation.created_by == user.id
        ).first()
        if inv:
            context = f"""
Current investigation context:
- ID: {inv.investigation_id}
- Title: {inv.deviation_title}
- Batch: {inv.batch_number} | Product: {inv.product_name}
- Parameter: {inv.parameter} | Expected: {inv.expected_value} | Actual: {inv.actual_value}
- Equipment: {inv.equipment_id} | Status: {inv.status} | Severity: {inv.severity}
"""

    messages = [{"role": "system", "content": SYSTEM_PROMPT + context}]
    for h in history[-10:]:  # last 10 messages for context
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    reply = chat_messages(messages, temperature=0.4, max_tokens=1000)
    return {"reply": reply, "model": settings.GROQ_MODEL}


@router.post("/extract")
def copilot_extract(
    text: str = Form(""),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Extract structured investigation data from text or an uploaded PDF/document.

    Uses the LangGraph document_processor → information_extractor nodes.
    """
    file_path = None
    if file and file.filename:
        upload_dir = "./uploads/copilot"
        os.makedirs(upload_dir, exist_ok=True)
        safe_name = f"{file.filename}"
        file_path = os.path.join(upload_dir, safe_name)
        with open(file_path, "wb") as f:
            f.write(file.file.read())

    state = InvestigationState(raw_text=text, file_path=file_path)

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
        "document_text_preview": state.get("document_text", "")[:500],
        "model": settings.GROQ_MODEL,
    }


@router.post("/process")
def copilot_process(
    text: str = Form(""),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Full autonomous pipeline: extract → create investigation → RCA → missing evidence → CAPA.

    Persists everything to the database so Dashboard, Investigations, RCA,
    Evidence and CAPA pages are all populated automatically.
    """
    # --- 1. Ingest document/text ---
    file_path = None
    if file and file.filename:
        upload_dir = "./uploads/copilot"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as f:
            f.write(file.file.read())

    state = InvestigationState(raw_text=text, file_path=file_path)
    doc_result = document.document_processor(state)
    if doc_result.get("error"):
        raise HTTPException(status_code=400, detail=doc_result["error"])
    state.update(doc_result)

    ext_result = extraction.information_extractor(state)
    if ext_result.get("error"):
        raise HTTPException(status_code=500, detail=ext_result["error"])
    state.update(ext_result)

    fields = state.get("extracted_fields", {}) or {}
    if not fields.get("deviation_title") and not fields.get("deviation_description"):
        raise HTTPException(status_code=422, detail="Could not extract enough information from the input")

    # --- 2. Create Investigation record ---
    inv_cols = {c.name for c in Investigation.__table__.columns}
    inv_data = {k: v for k, v in fields.items() if k in inv_cols and v not in (None, "")}
    count = db.query(Investigation).count()
    inv = Investigation(
        **inv_data,
        investigation_id=f"RCA-2026-{count + 1:03d}",
        status="RCA In Progress",
        created_by=user.id,
    )
    if not inv.assigned_investigator:
        inv.assigned_investigator = user.name
    if not inv.reported_by:
        inv.reported_by = user.name
    db.add(inv)
    db.commit()
    db.refresh(inv)

    # --- 3. Persist extracted info ---
    db.add(ExtractedInformation(
        investigation_id=inv.id,
        raw_text=state.get("document_text", text),
        extracted_fields=fields,
        ai_summary=state.get("ai_summary"),
        risk_assessment=state.get("risk_assessment"),
        missing_fields=state.get("missing_fields", []),
        suggested_questions=state.get("suggested_questions", []),
    ))
    db.add(AuditLog(investigation_id=inv.id, user_id=user.id, action="created",
                    details="Investigation auto-created by AIVOA.ai Copilot"))
    db.commit()

    # --- 4. Run RCA pipeline nodes ---
    state["investigation_id"] = inv.id
    results = {"extracted_fields": fields, "ai_summary": state.get("ai_summary")}

    try:
        r = five_whys.five_whys_analyzer(state)
        state.update(r)
        results["five_whys"] = r.get("five_whys")
        db.add(RCAAnalysis(investigation_id=inv.id, analysis_type="five_whys", result=r.get("five_whys")))
    except Exception as e:
        results["five_whys_error"] = str(e)

    try:
        r = fishbone.fishbone_analyzer(state)
        state.update(r)
        results["fishbone"] = r.get("fishbone")
        db.add(RCAAnalysis(investigation_id=inv.id, analysis_type="fishbone", result=r.get("fishbone")))
    except Exception as e:
        results["fishbone_error"] = str(e)

    try:
        r = root_cause.root_cause_evaluator(state)
        state.update(r)
        results["root_causes"] = r.get("root_causes", [])
        db.add(RCAAnalysis(investigation_id=inv.id, analysis_type="root_cause", result=r.get("root_causes", [])))
    except Exception as e:
        results["root_cause_error"] = str(e)

    try:
        r = missing_evidence.missing_evidence_checker(state)
        state.update(r)
        results["missing_evidence"] = r.get("missing_evidence", [])
        for item in r.get("missing_evidence", []):
            db.add(MissingEvidence(
                investigation_id=inv.id,
                evidence_description=item.get("evidence", ""),
                reason=item.get("reason", ""),
                related_cause=item.get("related_cause", ""),
                priority=item.get("priority", "Medium"),
            ))
    except Exception as e:
        results["missing_evidence_error"] = str(e)

    try:
        r = capa.capa_generator(state)
        state.update(r)
        recs = r.get("capa_recommendations", {})
        results["capa_recommendations"] = recs
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
    except Exception as e:
        results["capa_error"] = str(e)

    db.commit()

    return {
        "investigation_id": inv.id,
        "investigation_number": inv.investigation_id,
        "status": inv.status,
        "extracted_fields": fields,
        "ai_summary": state.get("ai_summary"),
        "five_whys": results.get("five_whys"),
        "fishbone": results.get("fishbone"),
        "root_causes": results.get("root_causes", []),
        "missing_evidence_count": len(results.get("missing_evidence", [])),
        "capa_count": len((results.get("capa_recommendations") or {}).get("corrective_actions", []))
                  + len((results.get("capa_recommendations") or {}).get("preventive_actions", [])),
        "errors": {k: v for k, v in results.items() if k.endswith("_error")},
        "model": settings.GROQ_MODEL,
    }


@router.get("/models")
def copilot_models(user: User = Depends(get_current_user)):
    """List supported Groq models for the copilot."""
    return {
        "current": settings.GROQ_MODEL,
        "available": [
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "allam-2-7b",
        ],
    }
