from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.db import get_db
from app.models.models import Investigation, CAPARecord, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv_q = db.query(Investigation).filter(Investigation.created_by == user.id)
    capa_q = (
        db.query(CAPARecord)
        .join(Investigation, CAPARecord.investigation_id == Investigation.id)
        .filter(Investigation.created_by == user.id)
    )

    total = inv_q.count()
    open_count = inv_q.filter(~Investigation.status.in_(["Closed", "Approved"])).count()
    under_rca = inv_q.filter(Investigation.status == "RCA In Progress").count()
    pending_review = inv_q.filter(Investigation.status == "Pending QA Approval").count()
    capa_in_progress = capa_q.filter(CAPARecord.status.in_(["In Progress", "Approved"])).count()
    overdue_capa = capa_q.filter(
        CAPARecord.target_date < datetime.now(timezone.utc),
        ~CAPARecord.status.in_(["Closed", "Verified"]),
    ).count()

    # Monthly trend (last 6 months)
    monthly = (
        inv_q.with_entities(
            func.date_trunc("month", Investigation.created_at).label("month"),
            func.count(Investigation.id).label("count"),
        )
        .group_by("month")
        .order_by("month")
        .limit(6)
        .all()
    )

    # Category distribution
    categories = (
        inv_q.with_entities(Investigation.deviation_type, func.count(Investigation.id))
        .group_by(Investigation.deviation_type)
        .all()
    )

    return {
        "total": total,
        "open": open_count,
        "under_rca": under_rca,
        "pending_review": pending_review,
        "capa_in_progress": capa_in_progress,
        "overdue_capa": overdue_capa,
        "monthly_trend": [{"month": str(m.month)[:7], "count": m.count} for m in monthly],
        "categories": [{"name": c[0] or "Uncategorized", "count": c[1]} for c in categories],
    }
