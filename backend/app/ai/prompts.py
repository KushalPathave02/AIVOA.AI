EXTRACTION_PROMPT = """You are a pharmaceutical Quality Assurance AI assistant specializing in deviation investigation for Active Pharmaceutical Ingredient (API) manufacturing under ICH Q7/GMP.

Analyze the following incident report and extract structured investigation data. Return ONLY valid JSON with these keys:

- deviation_title: concise title of the deviation
- department: Production | Quality Control | Quality Assurance | Engineering | Warehouse | R&D
- product_name: API product name if mentioned
- batch_number: batch identifier (e.g. API-2026-001)
- manufacturing_stage: process stage if mentioned
- equipment_id: equipment identifier (e.g. DR-102)
- manufacturing_location: facility/location if mentioned
- deviation_type: Process Deviation | Equipment Failure | Raw Material Issue | Human Error | Laboratory Issue | Environmental Condition
- parameter: the quality parameter that deviated (e.g. Moisture Content)
- expected_value: specification limit (e.g. ≤ 0.5%)
- actual_value: observed value (e.g. 1.2%)
- expected_specification: full expected spec text
- actual_observation: what was actually observed
- deviation_description: detailed description of the deviation
- immediate_actions: actions already taken (or "None reported")
- product_impact: potential impact on product quality/batch disposition
- severity: Critical | High | Medium | Low (your assessment)
- probability: Critical | High | Medium | Low
- detectability: Critical | High | Medium | Low
- overall_risk: Critical | High | Medium | Low
- batch_impact: assessment of impact on the batch
- reported_by: person who reported if mentioned
- date_of_occurrence: ISO date if mentioned, else null
- date_of_discovery: ISO date if mentioned, else null

Also include:
- ai_summary: 2-3 sentence summary of the incident
- risk_assessment: brief risk reasoning
- missing_fields: array of important fields NOT found in the text
- suggested_questions: array of 3-5 investigation questions the QA team should ask

Incident text:
{text}

Return ONLY the JSON object, no markdown fences, no explanation."""

FIVE_WHYS_PROMPT = """You are a pharmaceutical QA investigator. Perform a 5 Whys root cause analysis for this deviation.

Deviation: {deviation_title}
Description: {deviation_description}
Parameter: {parameter} | Expected: {expected_value} | Actual: {actual_value}
Equipment: {equipment_id} | Batch: {batch_number}
Evidence summaries: {evidence}

Return ONLY valid JSON:
{{
  "levels": [
    {{"question": "Why ...?", "answer": "hypothesis answer", "evidence": "supporting evidence or null", "confidence": 1-5}}
  ]
}}

Generate exactly 5 levels. Answers must be hypotheses requiring verification, not confirmed facts. Base answers on the deviation details and evidence provided."""

FISHBONE_PROMPT = """You are a pharmaceutical QA investigator. Generate a fishbone (Ishikawa) analysis for this deviation.

Deviation: {deviation_title}
Description: {deviation_description}
Parameter: {parameter} | Equipment: {equipment_id}

Categories: Man, Machine, Method, Material, Measurement, Environment

Return ONLY valid JSON:
{{
  "categories": [
    {{"name": "Man", "factors": ["factor 1", "factor 2"]}},
    {{"name": "Machine", "factors": [...] }},
    {{"name": "Method", "factors": [...]}},
    {{"name": "Material", "factors": [...]}},
    {{"name": "Measurement", "factors": [...]}},
    {{"name": "Environment", "factors": [...]}}
  ]
}}

Each category should have 2-4 plausible contributing factors specific to this deviation."""

ROOT_CAUSE_PROMPT = """You are a pharmaceutical QA AI assistant. Evaluate potential root causes for this deviation based on the investigation data and evidence.

Deviation: {deviation_title}
Description: {deviation_description}
Parameter: {parameter} | Expected: {expected_value} | Actual: {actual_value}
Equipment: {equipment_id} | Batch: {batch_number}
5 Whys result: {five_whys}
Fishbone factors: {fishbone}
Evidence: {evidence}

Return ONLY valid JSON — an array of potential root causes:
[
  {{
    "description": "potential root cause",
    "reasoning": "why this is plausible",
    "supporting_evidence": ["evidence item 1"],
    "contradictory_evidence": ["evidence item or 'None identified'"],
    "missing_evidence": ["evidence needed to confirm"],
    "confidence": 0-100,
    "status": "Under Review",
    "recommendation": "next investigation step"
  }}
]

Provide 3-5 potential root causes. Do NOT declare any as confirmed — all are hypotheses requiring evidence and QA approval."""

MISSING_EVIDENCE_PROMPT = """You are a pharmaceutical QA AI assistant. Identify missing evidence for this deviation investigation.

Deviation: {deviation_title}
Description: {deviation_description}
Parameter: {parameter} | Equipment: {equipment_id}
Potential root causes: {root_causes}
Evidence already collected: {evidence}

Return ONLY valid JSON:
{{
  "missing_evidence": [
    {{"evidence": "description of needed document/data", "reason": "why it's needed", "related_cause": "which root cause it relates to", "priority": "High|Medium|Low"}}
  ],
  "investigation_questions": ["question 1 for the QA investigator", "question 2", ...]
}}

List 5-8 missing evidence items typical for pharmaceutical deviation investigations (calibration certs, batch records, maintenance logs, training records, COAs, temperature logs, etc.) that are relevant to THIS specific deviation."""

CAPA_PROMPT = """You are a pharmaceutical QA AI assistant. Generate CAPA (Corrective and Preventive Action) recommendations for this deviation investigation.

Deviation: {deviation_title}
Root causes: {root_causes}
Missing evidence: {missing_evidence}

Return ONLY valid JSON:
{{
  "corrective_actions": [
    {{"action": "specific corrective action", "reason": "why needed", "responsible_department": "Engineering|Quality Assurance|Production|Maintenance", "priority": "High|Medium|Low", "effectiveness_criteria": "how to verify it worked"}}
  ],
  "preventive_actions": [
    {{"action": "specific preventive action", "reason": "why needed", "responsible_department": "...", "priority": "...", "effectiveness_criteria": "..."}}
  ]
}}

Provide 3-4 corrective and 3-4 preventive actions. Actions must be specific, measurable, and aligned with ICH Q10 CAPA principles."""

EVIDENCE_ANALYSIS_PROMPT = """You are a pharmaceutical QA AI assistant. Analyze this evidence document for a deviation investigation.

Evidence type: {evidence_type}
File name: {file_name}
Content:
{content}

Deviation context: {deviation_title} — {deviation_description}

Return ONLY valid JSON:
{{
  "ai_summary": "2-3 sentence summary of key findings in this document",
  "relevant_findings": ["finding 1", "finding 2"],
  "contradictions": ["any contradictory information found, or empty array"],
  "supports_cause": "which potential root cause this evidence supports, or null",
  "missing_documentation": ["related documents that should also be reviewed"]
}}

Focus on facts relevant to the deviation. Do not speculate beyond the document content."""
