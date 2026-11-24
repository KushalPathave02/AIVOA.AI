import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.database.db import get_db
from app.models.models import EvidenceDocument, Investigation, User
from app.schemas.schemas import EvidenceOut

router = APIRouter(prefix="/evidence", tags=["evidence"])


def _get_owned_investigation(db: Session, investigation_id: str, user: User) -> Investigation:
    inv = (
        db.query(Investigation)
        .filter(Investigation.id == investigation_id, Investigation.created_by == user.id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv


@router.get("", response_model=list[EvidenceOut])
def list_evidence(investigation_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_owned_investigation(db, investigation_id, user)
    return (
        db.query(EvidenceDocument)
        .filter(EvidenceDocument.investigation_id == investigation_id)
        .order_by(EvidenceDocument.upload_date.desc())
        .all()
    )


@router.post("/upload", response_model=EvidenceOut)
async def upload_evidence(
    file: UploadFile = File(...),
    investigation_id: str = Form(...),
    evidence_type: str = Form("Other"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inv = _get_owned_investigation(db, investigation_id, user)

    upload_dir = os.path.join(settings.UPLOAD_DIR, investigation_id)
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, stored_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    ev = EvidenceDocument(
        investigation_id=investigation_id,
        file_name=file.filename,
        file_path=file_path,
        evidence_type=evidence_type,
        uploaded_by=user.name,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev
