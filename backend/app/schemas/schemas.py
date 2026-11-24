from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from datetime import datetime


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str

    class Config:
        from_attributes = True


# ---------- Investigation ----------
class InvestigationBase(BaseModel):
    deviation_title: Optional[str] = None
    status: Optional[str] = "Open"
    severity: Optional[str] = "Medium"
    department: Optional[str] = None
    reported_by: Optional[str] = None
    assigned_investigator: Optional[str] = None
    date_of_occurrence: Optional[datetime] = None
    date_of_discovery: Optional[datetime] = None
    product_name: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturing_stage: Optional[str] = None
    equipment_id: Optional[str] = None
    manufacturing_location: Optional[str] = None
    deviation_type: Optional[str] = None
    parameter: Optional[str] = None
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    expected_specification: Optional[str] = None
    actual_observation: Optional[str] = None
    deviation_description: Optional[str] = None
    immediate_actions: Optional[str] = None
    product_impact: Optional[str] = None
    probability: Optional[str] = "Medium"
    detectability: Optional[str] = "Medium"
    overall_risk: Optional[str] = "Medium"
    batch_impact: Optional[str] = None


class InvestigationCreate(InvestigationBase):
    pass


class InvestigationUpdate(InvestigationBase):
    pass


class InvestigationOut(InvestigationBase):
    id: str
    investigation_id: Optional[str] = None
    investigation_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvestigationDetail(InvestigationOut):
    evidence: list = []
    extracted_info: Optional[Any] = None
    rca_analyses: list = []
    missing_evidence: list = []
    capas: list = []
    audit_logs: list = []


# ---------- Evidence ----------
class EvidenceOut(BaseModel):
    id: str
    investigation_id: str
    file_name: str
    evidence_type: str
    uploaded_by: Optional[str] = None
    upload_date: Optional[datetime] = None
    ai_summary: Optional[str] = None
    extracted_findings: Optional[Any] = None
    contradictions: Optional[Any] = None
    supports_cause: Optional[str] = None
    ai_analyzed: bool = False

    class Config:
        from_attributes = True


# ---------- AI ----------
class ExtractRequest(BaseModel):
    text: Optional[str] = None


class AIAnalysisRequest(BaseModel):
    investigation_id: str


class ExtractedInfoOut(BaseModel):
    extracted_fields: dict
    ai_summary: Optional[str] = None
    risk_assessment: Optional[str] = None
    missing_fields: list = []
    suggested_questions: list = []


# ---------- CAPA ----------
class CAPAOut(BaseModel):
    id: str
    capa_id: Optional[str] = None
    investigation_id: Optional[str] = None
    action_type: str
    action_description: str
    reason: Optional[str] = None
    responsible_person: Optional[str] = None
    responsible_department: Optional[str] = None
    target_date: Optional[datetime] = None
    priority: str = "Medium"
    status: str = "Proposed"
    effectiveness_criteria: Optional[str] = None
    verification_result: Optional[str] = None

    class Config:
        from_attributes = True


class CAPAUpdate(BaseModel):
    status: Optional[str] = None
    responsible_person: Optional[str] = None
    target_date: Optional[datetime] = None
    effectiveness_criteria: Optional[str] = None
    verification_result: Optional[str] = None
