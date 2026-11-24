import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Integer, Float, Boolean, JSON
)
from sqlalchemy.orm import relationship

from app.database.db import Base


def utcnow():
    return datetime.now(timezone.utc)


def gen_id():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="QA Investigator")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    investigations = relationship("Investigation", back_populates="investigator")


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(String, primary_key=True, default=gen_id)
    investigation_id = Column(String, unique=True, index=True)
    deviation_title = Column(String)
    status = Column(String, default="Open")
    severity = Column(String, default="Medium")
    department = Column(String)
    reported_by = Column(String)
    assigned_investigator = Column(String)
    investigation_date = Column(DateTime, default=utcnow)
    date_of_occurrence = Column(DateTime)
    date_of_discovery = Column(DateTime)
    product_name = Column(String)
    batch_number = Column(String, index=True)
    manufacturing_stage = Column(String)
    equipment_id = Column(String)
    manufacturing_location = Column(String)
    deviation_type = Column(String)
    parameter = Column(String)
    expected_value = Column(String)
    actual_value = Column(String)
    expected_specification = Column(Text)
    actual_observation = Column(Text)
    deviation_description = Column(Text)
    immediate_actions = Column(Text)
    product_impact = Column(Text)
    probability = Column(String, default="Medium")
    detectability = Column(String, default="Medium")
    overall_risk = Column(String, default="Medium")
    batch_impact = Column(Text)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    investigator = relationship("User", back_populates="investigations")
    evidence = relationship("EvidenceDocument", back_populates="investigation", cascade="all, delete-orphan")
    extracted_info = relationship("ExtractedInformation", back_populates="investigation", uselist=False, cascade="all, delete-orphan")
    rca_analyses = relationship("RCAAnalysis", back_populates="investigation", cascade="all, delete-orphan")
    missing_evidence = relationship("MissingEvidence", back_populates="investigation", cascade="all, delete-orphan")
    capas = relationship("CAPARecord", back_populates="investigation", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="investigation", cascade="all, delete-orphan")


class EvidenceDocument(Base):
    __tablename__ = "evidence_documents"

    id = Column(String, primary_key=True, default=gen_id)
    investigation_id = Column(String, ForeignKey("investigations.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String)
    evidence_type = Column(String, default="Other")
    uploaded_by = Column(String)
    upload_date = Column(DateTime, default=utcnow)
    ai_summary = Column(Text)
    extracted_findings = Column(JSON)
    contradictions = Column(JSON)
    supports_cause = Column(Text)
    ai_analyzed = Column(Boolean, default=False)

    investigation = relationship("Investigation", back_populates="evidence")


class ExtractedInformation(Base):
    __tablename__ = "extracted_information"

    id = Column(String, primary_key=True, default=gen_id)
    investigation_id = Column(String, ForeignKey("investigations.id"), unique=True)
    raw_text = Column(Text)
    extracted_fields = Column(JSON)
    ai_summary = Column(Text)
    risk_assessment = Column(Text)
    missing_fields = Column(JSON)
    suggested_questions = Column(JSON)
    created_at = Column(DateTime, default=utcnow)

    investigation = relationship("Investigation", back_populates="extracted_info")


class RCAAnalysis(Base):
    __tablename__ = "rca_analyses"

    id = Column(String, primary_key=True, default=gen_id)
    investigation_id = Column(String, ForeignKey("investigations.id"))
    analysis_type = Column(String)  # five_whys, fishbone, root_cause
    result = Column(JSON)
    created_at = Column(DateTime, default=utcnow)

    investigation = relationship("Investigation", back_populates="rca_analyses")


class MissingEvidence(Base):
    __tablename__ = "missing_evidence"

    id = Column(String, primary_key=True, default=gen_id)
    investigation_id = Column(String, ForeignKey("investigations.id"))
    evidence_description = Column(Text)
    reason = Column(Text)
    related_cause = Column(String)
    priority = Column(String, default="Medium")
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=utcnow)

    investigation = relationship("Investigation", back_populates="missing_evidence")


class CAPARecord(Base):
    __tablename__ = "capa_records"

    id = Column(String, primary_key=True, default=gen_id)
    capa_id = Column(String, unique=True, index=True)
    investigation_id = Column(String, ForeignKey("investigations.id"))
    action_type = Column(String)  # Corrective / Preventive
    action_description = Column(Text)
    reason = Column(Text)
    responsible_person = Column(String)
    responsible_department = Column(String)
    target_date = Column(DateTime)
    priority = Column(String, default="Medium")
    status = Column(String, default="Proposed")
    effectiveness_criteria = Column(Text)
    verification_result = Column(Text)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    investigation = relationship("Investigation", back_populates="capas")
    effectiveness = relationship("CAPAEffectiveness", back_populates="capa", uselist=False, cascade="all, delete-orphan")


class CAPAEffectiveness(Base):
    __tablename__ = "capa_effectiveness"

    id = Column(String, primary_key=True, default=gen_id)
    capa_id = Column(String, ForeignKey("capa_records.id"), unique=True)
    review_date = Column(DateTime)
    recurrence_observed = Column(Boolean, default=False)
    effectiveness_rating = Column(String)
    notes = Column(Text)
    reviewed_by = Column(String)

    capa = relationship("CAPARecord", back_populates="effectiveness")


class AuditLog(Base):
    __tablename__ = "investigation_audit_logs"

    id = Column(String, primary_key=True, default=gen_id)
    investigation_id = Column(String, ForeignKey("investigations.id"))
    user_id = Column(String)
    action = Column(String)
    details = Column(Text)
    timestamp = Column(DateTime, default=utcnow)

    investigation = relationship("Investigation", back_populates="audit_logs")
