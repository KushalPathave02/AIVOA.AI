from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.db import get_db
from app.models.models import CAPARecord, Investigation, User
from app.schemas.schemas import CAPAOut, CAPAUpdate

router = APIRouter(prefix="/capa", tags=["capa"])


def _owned_capa_query(db: Session, user: User):
    return (
        db.query(CAPARecord)
        .join(Investigation, CAPARecord.investigation_id == Investigation.id)
        .filter(Investigation.created_by == user.id)
    )


def _get_owned_capa(db: Session, capa_id: str, user: User) -> CAPARecord:
    capa = _owned_capa_query(db, user).filter(CAPARecord.id == capa_id).first()
    if not capa:
        raise HTTPException(status_code=404, detail="CAPA not found")
    return capa


@router.get("", response_model=list[CAPAOut])
def list_capas(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _owned_capa_query(db, user).order_by(CAPARecord.created_at.desc()).all()


@router.get("/{capa_id}", response_model=CAPAOut)
def get_capa(capa_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_owned_capa(db, capa_id, user)


@router.put("/{capa_id}", response_model=CAPAOut)
def update_capa(
    capa_id: str,
    data: CAPAUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    capa = _get_owned_capa(db, capa_id, user)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(capa, field, value)

    db.commit()
    db.refresh(capa)
    return capa
