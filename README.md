# PharmaRoot AI — AIVOA.ai

AI-powered Root Cause Analysis (RCA) platform for Pharmaceutical Manufacturing Quality Management. Paste an incident report or upload a PDF — the AI Copilot automatically extracts details, creates the investigation, runs RCA (5 Whys, Fishbone, root causes), identifies missing evidence, and generates CAPA recommendations.

**All data entry, editing and deletion happens through the AI Copilot only** — forms are read-only by design.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Redux Toolkit, React Router, Tailwind CSS, Vite |
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| AI | LangGraph workflow, Groq LLM (`qwen/qwen3.8-27b`) |
| Auth | JWT tokens, bcrypt password hashing |

---

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GROQ_API_KEY
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

---

## Login IDs

| Email | Password | Role |
|---|---|---|
| **demo@pharmaroot.ai** | `Demo@1234` | QA Manager (clean demo account) |
| qa.manager@pharmaroot.ai | `password123` | QA Manager |
| investigator@pharmaroot.ai | `password123` | QA Investigator |
| qc.analyst@pharmaroot.ai | `password123` | QC Analyst |
| production.supervisor@pharmaroot.ai | `password123` | Production Supervisor |
| admin@pharmaroot.ai | `password123` | Admin |

> You can also create a new account at `/signup` — every user sees **only their own data** (full confidentiality isolation).

---

## AI Copilot — How to Use

Open the Copilot panel (bottom-right). Three modes:

### 1. Create Investigation (paste report or attach PDF)

Paste a deviation/incident report — the full AI pipeline runs automatically:

```
Deviation Report DR-2026-083

Date of Occurrence: 2026-11-24
Department: Packaging - Serialization
Reported By: Hassan Sheikh, Packaging Operator
Assigned Investigator: Maria Khan

Product Name: Atorvastatin 20mg Tablets
Batch Number: ATOR-2026-156
Manufacturing Stage: Blister Packaging
Equipment ID: BLISTER-03
Manufacturing Location: Building B, Packaging Hall

Deviation Type: Equipment Malfunction
Parameter: Seal Temperature
Expected Value: 170-180°C
Actual Value: 145°C (below range)

Expected Specification: Blister seal temperature must be maintained at 170-180°C for minimum 2.0 seconds per packaging validation protocol PV-2024-11
Actual Observation: Seal temperature on BLISTER-03 dropped to 145°C and remained unstable for ~45 minutes. Visual inspection showed incomplete seals on ~12% of blisters.

Deviation Description: Seal temperature excursion resulted in potential seal integrity failure. Line stopped after detection. Affected units segregated for leak testing.

Immediate Actions: Line stopped at 11:15 hrs. 4,200 blisters quarantined. Dye penetration leak test initiated on 200 blisters.

Product Impact: Incomplete seals may compromise moisture barrier and stability. Batch on hold.

Severity: High
```

**Result:** Investigation created → RCA (5 Whys, Fishbone, root causes) → missing evidence list → CAPA recommendations — all saved to DB and visible on Dashboard, Investigations, RCA, Evidence and CAPA pages.

### 2. Edit an Investigation

```
edit RCA-2026-008 severity to Critical
edit RCA-2026-008 batch to ATOR-2026-999
edit RCA-2026-008 status to Closed
```

**Editable fields:** `batch`, `product`, `title`, `severity`, `status`, `parameter`, `actual`, `expected`, `department`, `equipment`, `stage`, `location`, `description`

### 3. Delete an Investigation

```
delete RCA-2026-008
```

Deletes the investigation and all linked data (RCA analyses, evidence, missing evidence, CAPA records).

### 4. Chat / Questions

Short questions go to the AI chat (e.g. "what evidence is missing for RCA-2026-008?").

---

## Pages

- **Dashboard** — stats, trends, category distribution (per-user)
- **Investigations** — list of your investigations
- **Investigation Workspace** — read-only AI-managed form + AI extraction panel
- **RCA Analysis** — 5 Whys, Fishbone, root causes, missing evidence, CAPA
- **Evidence Management** — upload documents, AI analysis, missing-evidence checklist
- **CAPA Management** — corrective & preventive actions
- **Investigation Report** — full report view

---

## API Endpoints (key)

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/login` | Login |
| `POST /api/auth/register` | Signup (JSON: name, email, password, role) |
| `POST /api/ai/copilot/process` | Full AI pipeline (text or PDF) |
| `POST /api/ai/copilot/chat` | Copilot chat |
| `POST /api/ai/copilot/extract` | Extract fields only |
| `GET /api/ai/analyses/{id}` | All saved AI analyses |
| `GET/POST/PUT/DELETE /api/investigations` | CRUD (owner-scoped) |
| `GET /api/dashboard/stats` | Dashboard stats (per-user) |
| `GET/POST /api/evidence` | Evidence upload/list |
| `GET/PUT /api/capa` | CAPA records |

---

## Notes

- Groq free tier limits output to ~1000 tokens/request — full analysis takes 2–4 minutes due to rate-limit retries.
- All endpoints are user-scoped: users can only see/edit/delete their own investigations.
- Investigation forms are read-only in the UI — all mutations go through the Copilot.
