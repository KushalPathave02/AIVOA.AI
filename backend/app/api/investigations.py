from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.db import get_db
from app.models.models import Investigation, AuditLog, User
from app.schemas.schemas import InvestigationCreate, InvestigationUpdate, InvestigationOut, InvestigationDetail

router = APIRouter(prefix="/investigations", tags=["investigations"])


def _next_investigation_id(db: Session) -> str:
    count = db.query(Investigation).count()
    year = 2026
    return f"RCA-{year}-{count + 1:03d}"


@router.get("", response_model=list[InvestigationOut])
def list_investigations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(Investigation)
        .filter(Investigation.created_by == user.id)
        .order_by(Investigation.created_at.desc())
        .all()
    )


@router.post("", response_model=InvestigationOut)
def create_investigation(
    data: InvestigationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inv = Investigation(**data.model_dump(exclude_unset=True))
    inv.investigation_id = _next_investigation_id(db)
    inv.created_by = user.id
    inv.assigned_investigator = inv.assigned_investigator or user.name
    db.add(inv)
    db.commit()
    db.refresh(inv)

    db.add(AuditLog(investigation_id=inv.id, user_id=user.id, action="created", details="Investigation created"))
    db.commit()
    return inv


def _get_owned_investigation(db: Session, investigation_id: str, user: User) -> Investigation:
    inv = (
        db.query(Investigation)
        .filter(Investigation.id == investigation_id, Investigation.created_by == user.id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv


@router.get("/{investigation_id}", response_model=InvestigationDetail)
def get_investigation(investigation_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_owned_investigation(db, investigation_id, user)


@router.put("/{investigation_id}", response_model=InvestigationOut)
def update_investigation(
    investigation_id: str,
    data: InvestigationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inv = _get_owned_investigation(db, investigation_id, user)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(inv, field, value)

    db.add(AuditLog(investigation_id=inv.id, user_id=user.id, action="updated", details="Investigation updated"))
    db.commit()
    db.refresh(inv)
    return inv


@router.delete("/{investigation_id}")
def delete_investigation(investigation_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = _get_owned_investigation(db, investigation_id, user)
    inv_number = inv.investigation_id
    db.delete(inv)  # cascades to evidence, RCA, CAPA, etc.
    db.commit()
    return {"deleted": True, "investigation_id": inv_number}


@router.post("/{investigation_id}/review")
def review_investigation(
    investigation_id: str,
    approved: bool,
    feedback: str = "",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Human review endpoint — QA approves or rejects AI-generated analysis."""
    inv = _get_owned_investigation(db, investigation_id, user)

    inv.status = "Approved" if approved else "Under Investigation"
    db.add(AuditLog(
        investigation_id=inv.id,
        user_id=user.id,
        action="reviewed",
        details=f"{'Approved' if approved else 'Rejected'} by {user.name}. Feedback: {feedback}",
    ))
    db.commit()
    return {"status": inv.status, "approved": approved}
