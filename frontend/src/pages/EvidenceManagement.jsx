import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import { Upload, FileText, Sparkles, Loader2, CheckCircle2, AlertCircle, ArrowLeft, FileQuestion } from 'lucide-react'
import { PageHeader, Card, CardHeader, Badge } from '../components/common/UI'
import { fetchEvidence, uploadEvidence, analyzeEvidence, clearEvidence } from '../redux/slices/evidenceSlice'
import { fetchInvestigation } from '../redux/slices/investigationSlice'
import api from '../services/api'

const EVIDENCE_TYPES = [
  'Batch Manufacturing Record',
  'Equipment Calibration Report',
  'Temperature Log',
  'Raw Material COA',
  'Operator Training Record',
  'Laboratory Report',
  'Equipment Maintenance Log',
  'SOP Document',
  'Other',
]

export default function EvidenceManagement() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const { items, analyzingId } = useSelector((state) => state.evidence)
  const { current } = useSelector((state) => state.investigation)
  const fileRef = useRef(null)
  const [evidenceType, setEvidenceType] = useState(EVIDENCE_TYPES[0])
  const [uploading, setUploading] = useState(false)
  const [missingEvidence, setMissingEvidence] = useState([])

  useEffect(() => {
    dispatch(clearEvidence())
    dispatch(fetchInvestigation(id))
    dispatch(fetchEvidence(id))
    api.get(`/ai/analyses/${id}`)
      .then(({ data }) => setMissingEvidence(data.missing_evidence || []))
      .catch(() => {})
  }, [dispatch, id])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await dispatch(uploadEvidence({ investigationId: id, file, evidenceType })).unwrap()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleAnalyze = async (evidenceId) => {
    await dispatch(analyzeEvidence(evidenceId)).unwrap().catch(() => {})
  }

  return (
    <div>
      <PageHeader
        title={`Evidence — ${current?.investigation_id || `Investigation #${id}`}`}
        subtitle="Upload and analyze supporting documentation for the investigation"
        actions={
          <Link to={`/investigations/${id}/rca`} className="btn-primary">
            Continue to RCA <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        }
      />

      {/* Upload area */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Evidence Type</label>
            <select className="input" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}>
              {EVIDENCE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.png,.jpg,.jpeg,.docx,.xlsx,.csv" className="hidden" onChange={handleUpload} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload Evidence
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Supported: PDF, TXT, images, Office documents. AI will extract findings, identify contradictions, and flag missing documentation.
        </p>
      </Card>

      {/* AI-identified missing evidence */}
      {missingEvidence.length > 0 && (
        <Card className="mb-4">
          <CardHeader
            title="Missing Evidence — identified by AI"
            subtitle={`${missingEvidence.length} item${missingEvidence.length !== 1 ? 's' : ''} required to confirm or rule out root causes`}
          />
          <div className="space-y-2">
            {missingEvidence.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                <FileQuestion className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-900">{item.evidence}</p>
                  {item.reason && <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>}
                  {item.related_cause && <p className="text-xs text-teal-600 mt-0.5">Related to: {item.related_cause}</p>}
                </div>
                {item.priority && <Badge>{item.priority}</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Evidence list */}
      <div className="space-y-3">
        {items.map((ev) => (
          <Card key={ev.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-navy-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-navy-900">{ev.file_name || ev.filename}</h4>
                    <Badge>{ev.evidence_type || 'Other'}</Badge>
                    {ev.ai_analyzed && <Badge color="bg-teal-100 text-teal-700">AI Analyzed</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Uploaded {ev.upload_date || ev.created_at?.slice(0, 10)} by {ev.uploaded_by || 'QA Team'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleAnalyze(ev.id)}
                disabled={analyzingId === ev.id}
                className="btn-outline text-xs"
              >
                {analyzingId === ev.id ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> Analyze with AI</>
                )}
              </button>
            </div>

            {/* AI analysis results */}
            {ev.ai_summary && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
                  <p className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> AI Findings
                  </p>
                  <p className="text-sm text-teal-800">{ev.ai_summary}</p>
                </div>

                {ev.contradictions?.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs font-semibold text-red-700 flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Contradictions Detected
                    </p>
                    <ul className="text-sm text-red-800 space-y-0.5">
                      {ev.contradictions.map((c, i) => <li key={i}>• {c}</li>)}
                    </ul>
                  </div>
                )}

                {ev.supports_cause && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Supports hypothesis:</span> {ev.supports_cause}
                  </p>
                )}
              </div>
            )}
          </Card>
        ))}

        {items.length === 0 && (
          <Card className="text-center py-12">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No evidence uploaded yet.</p>
            <p className="text-xs text-slate-400 mt-1">Upload batch records, logs, COAs, and calibration reports to support the investigation.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
