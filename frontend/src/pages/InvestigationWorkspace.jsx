import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  Mail,
  ClipboardPaste,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { runExtraction, resetRca, setExtracted } from '../redux/slices/rcaSlice'
import { fetchInvestigation, setCurrent } from '../redux/slices/investigationSlice'

const EMPTY_FORM = {
  investigation_id: '',
  deviation_title: '',
  date_of_occurrence: '',
  date_of_discovery: '',
  department: '',
  reported_by: '',
  assigned_investigator: '',
  product_name: '',
  batch_number: '',
  manufacturing_stage: '',
  equipment_id: '',
  manufacturing_location: '',
  expected_specification: '',
  actual_observation: '',
  deviation_description: '',
  immediate_actions: '',
  product_impact: '',
  severity: 'Medium',
  probability: 'Medium',
  detectability: 'Medium',
  overall_risk: 'Medium',
  batch_impact: '',
  deviation_type: '',
  parameter: '',
  expected_value: '',
  actual_value: '',
}

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const DEPARTMENTS = ['Production', 'Quality Control', 'Quality Assurance', 'Engineering', 'Warehouse', 'R&D']

export default function InvestigationWorkspace() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { extracted, status: rcaStatus, activeAnalysis, error } = useSelector((state) => state.rca)
  const { current } = useSelector((state) => state.investigation)
  const fileInputRef = useRef(null)

  const [inputMode, setInputMode] = useState('text') // text | file | email
  const [rawText, setRawText] = useState('')
  const [emailText, setEmailText] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [savedId, setSavedId] = useState(null)

  useEffect(() => {
    // Check for Copilot-extracted data first
    const pending = sessionStorage.getItem('pharmaroot_pending_extraction')
    if (pending) {
      sessionStorage.removeItem('pharmaroot_pending_extraction')
      try {
        const data = JSON.parse(pending)
        dispatch(setExtracted(data))
        const fields = data.extracted_fields || {}
        const clean = Object.fromEntries(
          Object.entries(fields).filter(
            ([k]) =>
              !['ai_summary', 'risk_assessment', 'missing_fields', 'suggested_questions', 'extracted_fields', 'document_text_preview', 'model'].includes(k)
          )
        )
        setForm((prev) => ({ ...prev, ...normalizeFields(clean) }))
      } catch (e) {
        console.error('Failed to apply pending extraction', e)
      }
    } else {
      dispatch(resetRca())
    }
    if (isEdit) {
      dispatch(fetchInvestigation(id)).then((action) => {
        if (action.payload) {
          const inv = action.payload
          setForm({ ...EMPTY_FORM, ...inv })
          setSavedId(inv.id)
        }
      })
    }
  }, [dispatch, id, isEdit])

  const DATE_FIELDS = ['date_of_occurrence', 'date_of_discovery']

  const normalizeFields = (fields) =>
    Object.fromEntries(
      Object.entries(fields)
        .filter(([k, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => {
          if (DATE_FIELDS.includes(k) && typeof v === 'string') {
            const d = new Date(v)
            if (!isNaN(d)) return [k, d.toISOString().slice(0, 10)]
          }
          return [k, v]
        })
    )

  // Populate form when AI extraction completes
  useEffect(() => {
    if (extracted) {
      const fields = extracted.extracted_fields || extracted
      const clean = Object.fromEntries(
        Object.entries(fields).filter(
          ([k]) =>
            !['ai_summary', 'risk_assessment', 'missing_fields', 'suggested_questions', 'extracted_fields', 'document_text_preview', 'model'].includes(k)
        )
      )
      setForm((prev) => ({ ...prev, ...normalizeFields(clean) }))
    }
  }, [extracted])

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleAnalyze = async () => {
    const text = inputMode === 'email' ? emailText : rawText
    if (!text && !selectedFile) return
    await dispatch(runExtraction({ text, file: selectedFile })).unwrap()
  }

  const analyzing = rcaStatus === 'loading'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-navy-900">
            {isEdit ? `Investigation ${current?.investigation_id || ''}` : 'New Investigation'}
          </h1>
          <p className="text-sm text-slate-500">AI-assisted deviation investigation workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="btn-outline">Cancel</button>
        </div>
      </div>

      {/* 3-column workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* LEFT: Incident Input */}
        <div className="lg:col-span-3 card p-4 flex flex-col min-h-0">
          <h3 className="text-sm font-semibold text-navy-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" /> Incident Input
          </h3>

          <div className="flex gap-1 mb-3">
            {[
              { key: 'text', label: 'Paste Text', icon: ClipboardPaste },
              { key: 'file', label: 'Upload', icon: Upload },
              { key: 'email', label: 'Email', icon: Mail },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setInputMode(key)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  inputMode === key ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {inputMode === 'file' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50/50 transition-colors p-4"
              >
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 font-medium">Click to upload PDF or TXT</p>
                <p className="text-xs text-slate-400 mt-1">Deviation report, batch record, email export</p>
                {selectedFile && (
                  <p className="text-xs text-teal-600 mt-2 font-medium">{selectedFile.name}</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            ) : (
              <textarea
                className="input flex-1 resize-none text-sm leading-relaxed"
                placeholder={
                  inputMode === 'email'
                    ? 'Paste the email received from QC or Production...'
                    : 'Paste the deviation description, batch report, or incident details...'
                }
                value={inputMode === 'email' ? emailText : rawText}
                onChange={(e) =>
                  inputMode === 'email' ? setEmailText(e.target.value) : setRawText(e.target.value)
                }
              />
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || (!rawText && !emailText && !selectedFile)}
            className="btn-primary w-full mt-3"
          >
            {analyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Analyze with AI</>
            )}
          </button>

          {error && (
            <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* MIDDLE: Investigation Form — AI-managed, read-only */}
        <div className="lg:col-span-6 overflow-y-auto pr-1 space-y-4">
          <div className="card p-3 bg-teal-50 border border-teal-200 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <p className="text-xs text-teal-800">
              <strong>AI-managed form.</strong> Fields cannot be edited manually. To update, delete, or correct any information, use the <strong>AI Copilot</strong> (bottom-right) — e.g. <code>edit RCA-2026-008 severity to Critical</code> or <code>delete RCA-2026-008</code>.
            </p>
          </div>

          {/* Basic Info */}
          <FormSection title="Basic Information">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Investigation ID" value={form.investigation_id} onChange={set('investigation_id')} placeholder="Auto-generated" />
              <Field label="Deviation Title" value={form.deviation_title} onChange={set('deviation_title')} className="col-span-2" placeholder="e.g. High moisture content in final API" />
              <Field label="Date of Occurrence" type="date" value={form.date_of_occurrence} onChange={set('date_of_occurrence')} />
              <Field label="Date of Discovery" type="date" value={form.date_of_discovery} onChange={set('date_of_discovery')} />
              <Select label="Department" value={form.department} onChange={set('department')} options={DEPARTMENTS} />
              <Field label="Reported By" value={form.reported_by} onChange={set('reported_by')} />
              <Field label="Assigned Investigator" value={form.assigned_investigator} onChange={set('assigned_investigator')} />
            </div>
          </FormSection>

          {/* Product Info */}
          <FormSection title="Product Information">
            <div className="grid grid-cols-2 gap-3">
              <Field label="API Product Name" value={form.product_name} onChange={set('product_name')} />
              <Field label="Batch Number" value={form.batch_number} onChange={set('batch_number')} />
              <Field label="Manufacturing Stage" value={form.manufacturing_stage} onChange={set('manufacturing_stage')} />
              <Field label="Equipment ID" value={form.equipment_id} onChange={set('equipment_id')} />
              <Field label="Manufacturing Location" value={form.manufacturing_location} onChange={set('manufacturing_location')} />
              <Field label="Deviation Type" value={form.deviation_type} onChange={set('deviation_type')} />
            </div>
          </FormSection>

          {/* Deviation Details */}
          <FormSection title="Deviation Details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Parameter" value={form.parameter} onChange={set('parameter')} />
              <Field label="Expected Value" value={form.expected_value} onChange={set('expected_value')} placeholder="e.g. ≤ 0.5%" />
              <Field label="Actual Value" value={form.actual_value} onChange={set('actual_value')} placeholder="e.g. 1.2%" />
              <Field label="Expected Specification" value={form.expected_specification} onChange={set('expected_specification')} className="col-span-2" />
              <Field label="Actual Observation" value={form.actual_observation} onChange={set('actual_observation')} className="col-span-2" />
              <TextArea label="Description of Deviation" value={form.deviation_description} onChange={set('deviation_description')} />
              <TextArea label="Immediate Actions Taken" value={form.immediate_actions} onChange={set('immediate_actions')} />
              <TextArea label="Potential Product Impact" value={form.product_impact} onChange={set('product_impact')} />
            </div>
          </FormSection>

          {/* Risk Assessment */}
          <FormSection title="Risk Assessment">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Severity" value={form.severity} onChange={set('severity')} options={SEVERITIES} />
              <Select label="Probability" value={form.probability} onChange={set('probability')} options={SEVERITIES} />
              <Select label="Detectability" value={form.detectability} onChange={set('detectability')} options={SEVERITIES} />
              <Select label="Overall Risk Level" value={form.overall_risk} onChange={set('overall_risk')} options={SEVERITIES} />
              <TextArea label="Batch Impact Assessment" value={form.batch_impact} onChange={set('batch_impact')} className="col-span-2" />
            </div>
          </FormSection>
        </div>

        {/* RIGHT: AI Assistant */}
        <div className="lg:col-span-3 card p-4 flex flex-col min-h-0">
          <h3 className="text-sm font-semibold text-navy-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" /> AI Assistant
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3">
            {!extracted && !analyzing && (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Provide incident details and click <strong>Analyze with AI</strong> to extract structured investigation data.</p>
              </div>
            )}

            {analyzing && (
              <div className="flex flex-col items-center py-8 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
                <p className="text-sm">AI is analyzing the incident...</p>
                <p className="text-xs text-slate-400 mt-1">Extracting fields, assessing risk, identifying gaps</p>
              </div>
            )}

            {extracted && !analyzing && (
              <>
                <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
                  <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold mb-2">
                    <CheckCircle2 className="w-4 h-4" /> Extraction Complete
                  </div>
                  <p className="text-xs text-teal-700">
                    {Object.values(extracted).filter(Boolean).length} fields extracted. Review and edit the form — AI suggestions require investigator confirmation.
                  </p>
                </div>

                {extracted.ai_summary && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 mb-1">AI Summary</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{extracted.ai_summary}</p>
                  </div>
                )}

                {extracted.risk_assessment && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Risk Assessment</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{extracted.risk_assessment}</p>
                  </div>
                )}

                {extracted.missing_fields?.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs font-semibold text-red-700 mb-1">Missing Information</p>
                    <ul className="text-xs text-red-700 space-y-0.5">
                      {extracted.missing_fields.map((f, i) => <li key={i}>• {f}</li>)}
                    </ul>
                  </div>
                )}

                {extracted.suggested_questions?.length > 0 && (
                  <div className="p-3 rounded-lg bg-navy-50 border border-navy-100">
                    <p className="text-xs font-semibold text-navy-800 mb-1">Suggested Investigation Questions</p>
                    <ul className="text-xs text-navy-700 space-y-1">
                      {extracted.suggested_questions.map((q, i) => <li key={i}>• {q}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {extracted && (
            <button
              onClick={() => navigate(`/investigations/${savedId || id}/rca`)}
              className="btn-navy w-full mt-3"
            >
              Continue to RCA <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function FormSection({ title, children }) {
  return (
    <div className="card p-4">
      <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wide mb-3 border-b border-slate-100 pb-2">
        {title}
      </h4>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, className = '' }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input type={type} className="input bg-slate-50 cursor-not-allowed" value={value || ''} readOnly placeholder={placeholder} />
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input bg-slate-50 cursor-not-allowed" value={value || ''} disabled>
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function TextArea({ label, value, onChange, className = '' }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <textarea className="input resize-none bg-slate-50 cursor-not-allowed" rows={2} value={value || ''} readOnly />
    </div>
  )
}
