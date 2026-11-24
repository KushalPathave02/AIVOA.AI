import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, GitBranch, FileText, ShieldCheck, Download, Edit } from 'lucide-react'
import { PageHeader, Card, CardHeader, Badge } from '../components/common/UI'
import { fetchInvestigation } from '../redux/slices/investigationSlice'
import api from '../services/api'

export default function InvestigationReport() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const { current } = useSelector((state) => state.investigation)
  const [evidence, setEvidence] = useState([])
  const [rca, setRca] = useState(null)

  useEffect(() => {
    dispatch(fetchInvestigation(id))
    api.get(`/evidence?investigation_id=${id}`).then(({ data }) => setEvidence(data)).catch(() => {})
    api.get(`/investigations/${id}/rca`).then(({ data }) => setRca(data)).catch(() => {})
  }, [dispatch, id])

  if (!current) {
    return <div className="text-center py-20 text-slate-400">Loading investigation...</div>
  }

  const inv = current

  return (
    <div>
      <PageHeader
        title={`Investigation Report — ${inv.investigation_id || `RCA-${inv.id}`}`}
        subtitle={inv.deviation_title || inv.title}
        actions={
          <div className="flex gap-2">
            <Link to={`/investigations/${id}/workspace`} className="btn-outline"><Edit className="w-4 h-4" /> Edit</Link>
            <Link to={`/investigations/${id}/rca`} className="btn-outline"><GitBranch className="w-4 h-4" /> RCA Analysis</Link>
            <button className="btn-primary"><Download className="w-4 h-4" /> Export PDF</button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Incident Info */}
          <Card>
            <CardHeader title="1. Incident Information" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoItem label="Investigation ID" value={inv.investigation_id} />
              <InfoItem label="Status" value={<Badge>{inv.status}</Badge>} />
              <InfoItem label="Severity" value={<Badge>{inv.severity}</Badge>} />
              <InfoItem label="Date of Occurrence" value={inv.date_of_occurrence} />
              <InfoItem label="Date of Discovery" value={inv.date_of_discovery} />
              <InfoItem label="Department" value={inv.department} />
              <InfoItem label="Reported By" value={inv.reported_by} />
              <InfoItem label="Assigned Investigator" value={inv.assigned_investigator} />
            </div>
          </Card>

          {/* Product Info */}
          <Card>
            <CardHeader title="2. Product & Batch Information" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoItem label="Product" value={inv.product_name} />
              <InfoItem label="Batch Number" value={inv.batch_number} />
              <InfoItem label="Manufacturing Stage" value={inv.manufacturing_stage} />
              <InfoItem label="Equipment ID" value={inv.equipment_id} />
              <InfoItem label="Location" value={inv.manufacturing_location} />
              <InfoItem label="Deviation Type" value={inv.deviation_type} />
            </div>
          </Card>

          {/* Deviation Details */}
          <Card>
            <CardHeader title="3. Deviation Details" />
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-4">
                <InfoItem label="Parameter" value={inv.parameter} />
                <InfoItem label="Expected" value={inv.expected_value || inv.expected_specification} />
                <InfoItem label="Actual" value={inv.actual_value || inv.actual_observation} />
              </div>
              {inv.deviation_description && <TextBlock label="Description" value={inv.deviation_description} />}
              {inv.immediate_actions && <TextBlock label="Immediate Actions" value={inv.immediate_actions} />}
              {inv.product_impact && <TextBlock label="Product Impact" value={inv.product_impact} />}
            </div>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader title="4. Risk Assessment" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <InfoItem label="Severity" value={inv.severity} />
              <InfoItem label="Probability" value={inv.probability} />
              <InfoItem label="Detectability" value={inv.detectability} />
              <InfoItem label="Overall Risk" value={inv.overall_risk} />
            </div>
            {inv.batch_impact && <TextBlock label="Batch Impact" value={inv.batch_impact} />}
          </Card>

          {/* Evidence */}
          <Card>
            <CardHeader
              title="5. Evidence Documents"
              action={<Link to={`/investigations/${id}/evidence`} className="text-xs text-teal-600 hover:underline">Manage →</Link>}
            />
            {evidence.length > 0 ? (
              <div className="space-y-2">
                {evidence.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-navy-900">{ev.file_name || ev.filename}</p>
                      <p className="text-xs text-slate-500">{ev.evidence_type}</p>
                    </div>
                    {ev.ai_analyzed && <Badge color="bg-teal-100 text-teal-700">AI Analyzed</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No evidence documents uploaded.</p>
            )}
          </Card>

          {/* RCA Summary */}
          {rca && (
            <Card>
              <CardHeader title="6. Root Cause Analysis Summary" />
              <div className="space-y-4 text-sm">
                {rca.five_whys?.levels && (
                  <div>
                    <p className="font-semibold text-navy-900 mb-2">5 Whys Chain</p>
                    <div className="space-y-1">
                      {rca.five_whys.levels.map((l, i) => (
                        <p key={i} className="text-slate-600"><span className="font-medium">Why {i + 1}:</span> {l.answer}</p>
                      ))}
                    </div>
                  </div>
                )}
                {rca.root_causes?.length > 0 && (
                  <div>
                    <p className="font-semibold text-navy-900 mb-2">Potential Root Causes</p>
                    {rca.root_causes.map((c, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-50 mb-2">
                        <p className="font-medium text-navy-900">{c.description || c.title}</p>
                        <p className="text-xs text-slate-500">{c.status} · {c.confidence}% confidence</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status card */}
          <Card>
            <CardHeader title="Investigation Status" />
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Current Status</span><Badge>{inv.status}</Badge></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Severity</span><Badge>{inv.severity}</Badge></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Risk Level</span><Badge>{inv.overall_risk}</Badge></div>
            </div>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader title="Investigation Tools" />
            <div className="space-y-2">
              <Link to={`/investigations/${id}/workspace`} className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 text-sm text-navy-800">
                <Edit className="w-4 h-4 text-teal-600" /> Edit Investigation
              </Link>
              <Link to={`/investigations/${id}/evidence`} className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 text-sm text-navy-800">
                <FileText className="w-4 h-4 text-teal-600" /> Evidence ({evidence.length})
              </Link>
              <Link to={`/investigations/${id}/rca`} className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 text-sm text-navy-800">
                <GitBranch className="w-4 h-4 text-teal-600" /> RCA Analysis
              </Link>
              <Link to="/capa" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 text-sm text-navy-800">
                <ShieldCheck className="w-4 h-4 text-teal-600" /> CAPA Management
              </Link>
            </div>
          </Card>

          {/* Audit trail placeholder */}
          <Card>
            <CardHeader title="Audit Trail" subtitle="Recent activity" />
            <div className="space-y-2 text-xs text-slate-500">
              <p>• Investigation created — {inv.created_at?.slice(0, 10)}</p>
              <p>• AI extraction completed</p>
              {evidence.length > 0 && <p>• {evidence.length} evidence document(s) uploaded</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-navy-900 mt-0.5">{value || '—'}</p>
    </div>
  )
}

function TextBlock({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-slate-700 mt-1 leading-relaxed">{value}</p>
    </div>
  )
}
