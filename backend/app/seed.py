"""Seed demo data — run: python -m app.seed"""
from datetime import datetime, timezone, timedelta

from app.core.security import hash_password
from app.database.db import SessionLocal, Base, engine
from app.models.models import User, Investigation, CAPARecord


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Demo users
    users = [
        ("qa.manager@pharmaroot.ai", "password123", "Sarah Chen", "QA Manager"),
        ("investigator@pharmaroot.ai", "password123", "Raj Patel", "QA Investigator"),
        ("qc.analyst@pharmaroot.ai", "password123", "Emily Rodriguez", "QC Analyst"),
        ("admin@pharmaroot.ai", "password123", "Admin User", "Admin"),
    ]
    for email, pw, name, role in users:
        if not db.query(User).filter(User.email == email).first():
            db.add(User(email=email, name=name, role=role, hashed_password=hash_password(pw)))
    db.commit()

    # Demo investigations
    if db.query(Investigation).count() == 0:
        demo_invs = [
            {
                "investigation_id": "RCA-2026-001",
                "deviation_title": "High moisture content in API batch",
                "status": "RCA In Progress",
                "severity": "High",
                "department": "Production",
                "batch_number": "API-2026-001",
                "product_name": "API Intermediate",
                "equipment_id": "DR-102",
                "parameter": "Moisture Content",
                "expected_value": "≤ 0.5%",
                "actual_value": "1.2%",
                "deviation_description": "Final moisture content 1.2% exceeded specification limit of 0.5%. Drying process performed on DR-102 with reported temperature fluctuations.",
                "deviation_type": "Process Deviation",
                "overall_risk": "High",
            },
            {
                "investigation_id": "RCA-2026-002",
                "deviation_title": "Low purity result in final product",
                "status": "Open",
                "severity": "Critical",
                "department": "Quality Control",
                "batch_number": "API-2026-002",
                "product_name": "Final API",
                "parameter": "Purity",
                "expected_value": "≥ 99.0%",
                "actual_value": "98.2%",
                "deviation_description": "HPLC purity result below specification. Initial lab investigation in progress.",
                "deviation_type": "Laboratory Issue",
                "overall_risk": "Critical",
            },
            {
                "investigation_id": "RCA-2026-003",
                "deviation_title": "Temperature excursion during drying",
                "status": "CAPA Proposed",
                "severity": "Medium",
                "department": "Production",
                "batch_number": "API-2026-003",
                "product_name": "API Intermediate",
                "equipment_id": "DR-101",
                "parameter": "Drying Temperature",
                "expected_value": "60-80°C",
                "actual_value": "95°C peak",
                "deviation_description": "Temperature exceeded range for 12 minutes during drying cycle.",
                "deviation_type": "Equipment Failure",
                "overall_risk": "Medium",
            },
        ]
        for data in demo_invs:
            inv = Investigation(**data, created_at=datetime.now(timezone.utc) - timedelta(days=hash(data["investigation_id"]) % 30))
            db.add(inv)
        db.commit()

        # Demo CAPAs
        inv1 = db.query(Investigation).filter(Investigation.investigation_id == "RCA-2026-001").first()
        if inv1:
            db.add(CAPARecord(
                capa_id="CAPA-0001",
                investigation_id=inv1.id,
                action_type="Corrective",
                action_description="Inspect and recalibrate dryer DR-102 temperature controller",
                reason="Temperature fluctuation suspected as cause of high moisture",
                responsible_department="Engineering",
                priority="High",
                status="In Progress",
                effectiveness_criteria="Temperature stays within 60-80°C for 3 consecutive batches",
            ))
            db.add(CAPARecord(
                capa_id="CAPA-0002",
                investigation_id=inv1.id,
                action_type="Preventive",
                action_description="Implement continuous temperature monitoring with alarm on DR-102",
                reason="Prevent recurrence of temperature excursions",
                responsible_department="Production",
                priority="Medium",
                status="Proposed",
                effectiveness_criteria="No temperature excursions in 6 months",
            ))
        db.commit()

    print("Seed complete.")
    db.close()


if __name__ == "__main__":
    seed()
