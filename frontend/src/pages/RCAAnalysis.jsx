import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import {
  GitBranch,
  Network,
  AlertTriangle,
  FileQuestion,
  ShieldCheck,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react'
import { PageHeader, Card, CardHeader, Badge } from '../components/common/UI'
import {
  runFiveWhys,
  runFishbone,
  runRootCause,
  runMissingEvidence,
  runCAPA,
  fetchAnalyses,
} from '../redux/slices/rcaSlice'
import { fetchInvestigation } from '../redux/slices/investigationSlice'

const FISHBONE_CATEGORIES = ['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment']

export default function RCAAnalysis() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const { fiveWhys, fishbone, rootCauses, missingEvidence, capa } = useSelector((state) => state.rca)
  const { current } = useSelector((state) => state.investigation)
  const [activeTab, setActiveTab] = useState('whys')
  const [running, setRunning] = useState(null)

  useEffect(() => {
    dispatch(fetchInvestigation(id))
    dispatch(fetchAnalyses(id))
  }, [dispatch, id])

  const run = async (key, thunk) => {
    setRunning(key)
    try {
      await dispatch(thunk(id)).unwrap()
    } catch (e) {
      console.error(e)
    } finally {
      setRunning(null)
    }
  }

  const tabs = [
    { key: 'whys', label: '5 Whys Analysis', icon: GitBranch },
    { key: 'fishbone', label: 'Fishbone Diagram', icon: Network },
    { key: 'causes', label: 'Root Causes', icon: AlertTriangle },
    { key: 'missing', label: 'Missing Evidence', icon: FileQuestion },
    { key: 'capa', label: 'CAPA Recommendations', icon: ShieldCheck },
  ]

  return (
    <div>
      <PageHeader
        title={`RCA — ${current?.investigation_id || `Investigation #${id}`}`}
        subtitle={current?.deviation_title || 'Root cause analysis workspace'}
        actions={
          <Link to={`/investigations/${id}`} className="btn-outline">View Full Report</Link>
        }
      />

      {/* Analysis action bar */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-2">Run AI Analysis:</span>
          <AnalysisButton label="5 Whys" running={running === 'whys'} onClick={() => run('whys', runFiveWhys)} />
          <AnalysisButton label="Fishbone" running={running === 'fishbone'} onClick={() => run('fishbone', runFishbone)} />
          <AnalysisButton label="Root Causes" running={running === 'causes'} onClick={() => run('causes', runRootCause)} />
          <AnalysisButton label="Missing Evidence" running={running === 'missing'} onClick={() => run('missing', runMissingEvidence)} />
          <AnalysisButton label="CAPA" running={running === 'capa'} onClick={() => run('capa', runCAPA)} primary />
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === key
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'whys' && <FiveWhysPanel data={fiveWhys} running={running === 'whys'} />}
      {activeTab === 'fishbone' && <FishbonePanel data={fishbone} running={running === 'fishbone'} />}
      {activeTab === 'causes' && <RootCausesPanel data={rootCauses} running={running === 'causes'} />}
      {activeTab === 'missing' && <MissingEvidencePanel data={missingEvidence} running={running === 'missing'} />}
      {activeTab === 'capa' && <CAPAPanel data={capa} running={running === 'capa'} investigationId={id} />}
    </div>
  )
}

function AnalysisButton({ label, running, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={running}
      className={`btn text-xs ${primary ? 'btn-primary' : 'btn-outline'}`}
    >
      {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SparklesIcon />}
      {label}
    </button>
  )
}

function SparklesIcon() {
  return <GitBranch className="w-3.5 h-3.5 opacity-60" />
}

/* ---------- 5 Whys ---------- */
function FiveWhysPanel({ data, running }) {
  if (running) return <LoadingPanel text="Generating 5 Whys analysis..." />
  if (!data) return <EmptyPanel text="Run the 5 Whys analysis to generate a hypothesis chain. Each level represents a 'why' question with AI-suggested answers — these are hypotheses requiring evidence verification." />

  const levels = data.levels || data.whys || []
  return (
    <Card>
      <CardHeader
        title="5 Whys Analysis"
        subtitle="Iterative questioning to drill down to potential root causes. AI suggestions are hypotheses, not confirmed findings."
      />
      <div className="space-y-0">
        {levels.map((level, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </div>
              {i < levels.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
            </div>
            <div className="pb-6 flex-1">
              <p className="text-sm font-semibold text-navy-900">Why {i + 1}: {level.question}</p>
              <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-700">{level.answer}</p>
                {level.evidence && (
                  <p className="text-xs text-teal-700 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Supporting: {level.evidence}
                  </p>
                )}
                {level.confidence && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Evidence strength:</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} className={`w-4 h-1.5 rounded-full ${n <= level.confidence ? 'bg-teal-500' : 'bg-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {level.investigator_comment && (
                <p className="text-xs text-slate-500 mt-1 italic">Investigator: {level.investigator_comment}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ---------- Fishbone ---------- */
function FishbonePanel({ data, running }) {
  const [categories, setCategories] = useState(null)

  useEffect(() => {
    if (data) {
      setCategories(data.categories || data.fishbone || FISHBONE_CATEGORIES.map((name) => ({ name, factors: [] })))
    }
  }, [data])

  if (running) return <LoadingPanel text="Generating fishbone analysis..." />
  if (!categories) return <EmptyPanel text="Run the Fishbone analysis to identify potential contributing factors across Man, Machine, Method, Material, Measurement, and Environment." />

  const addFactor = (catIdx) => {
    setCategories((prev) => prev.map((c, i) => (i === catIdx ? { ...c, factors: [...c.factors, { text: '', ai_generated: false }] } : c)))
  }
  const updateFactor = (catIdx, fIdx, text) => {
    setCategories((prev) => prev.map((c, i) => (i === catIdx ? { ...c, factors: c.factors.map((f, j) => (j === fIdx ? { ...f, text } : f)) } : c)))
  }
  const removeFactor = (catIdx, fIdx) => {
    setCategories((prev) => prev.map((c, i) => (i === catIdx ? { ...c, factors: c.factors.filter((_, j) => j !== fIdx) } : c)))
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {categories.map((cat, ci) => (
        <Card key={cat.name}>
          <CardHeader
            title={cat.name}
            subtitle={`${cat.factors.length} potential factor${cat.factors.length !== 1 ? 's' : ''}`}
            action={
              <button onClick={() => addFactor(ci)} className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            }
          />
          <div className="space-y-2">
            {cat.factors.map((factor, fi) => (
              <div key={fi} className="flex items-start gap-2 group">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${factor.ai_generated ? 'bg-teal-500' : 'bg-slate-300'}`} />
                <input
                  className="flex-1 text-sm bg-transparent border-b border-transparent hover:border-slate-200 focus:border-teal-500 focus:outline-none py-0.5"
                  value={factor.text || factor}
                  onChange={(e) => updateFactor(ci, fi, e.target.value)}
                  placeholder="Describe potential factor..."
                />
                <button onClick={() => removeFactor(ci, fi)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {cat.factors.length === 0 && (
              <p className="text-xs text-slate-400 italic">No factors identified yet</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

/* ---------- Root Causes ---------- */
function RootCausesPanel({ data, running }) {
  if (running) return <LoadingPanel text="Evaluating potential root causes..." />
  if (!data || data.length === 0) return <EmptyPanel text="Run Root Cause analysis to evaluate potential causes against collected evidence." />

  return (
    <div className="space-y-3">
      {data.map((cause, i) => (
        <Card key={i}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-navy-900">{cause.description || cause.title}</h4>
                <Badge>{cause.status || 'Under Review'}</Badge>
                {cause.confidence && <Badge color="bg-teal-100 text-teal-700">{cause.confidence}% confidence</Badge>}
              </div>
              {cause.reasoning && <p className="text-sm text-slate-600">{cause.reasoning}</p>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <EvidenceBlock title="Supporting Evidence" items={cause.supporting_evidence} icon={CheckCircle2} color="text-green-600" />
                <EvidenceBlock title="Contradictory Evidence" items={cause.contradictory_evidence} icon={XCircle} color="text-red-600" />
                <EvidenceBlock title="Missing Evidence" items={cause.missing_evidence} icon={HelpCircle} color="text-amber-600" />
              </div>

              {cause.recommendation && (
                <p className="text-xs text-slate-500 mt-3 italic">Recommendation: {cause.recommendation}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function EvidenceBlock({ title, items, icon: Icon, color }) {
  return (
    <div className="p-2.5 rounded-lg bg-slate-50">
      <p className={`text-xs font-semibold ${color} flex items-center gap-1 mb-1`}>
        <Icon className="w-3.5 h-3.5" /> {title}
      </p>
      {items?.length > 0 ? (
        <ul className="text-xs text-slate-600 space-y-0.5">
          {items.map((item, i) => <li key={i}>• {item}</li>)}
        </ul>
      ) : (
        <p className="text-xs text-slate-400">None identified</p>
      )}
    </div>
  )
}

/* ---------- Missing Evidence ---------- */
function MissingEvidencePanel({ data, running }) {
  if (running) return <LoadingPanel text="Identifying evidence gaps..." />
  if (!data || data.length === 0) return <EmptyPanel text="Run Missing Evidence analysis to identify documentation gaps that must be addressed before root cause confirmation." />

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Missing Evidence Checklist" subtitle="Items required to confirm or rule out potential root causes" />
        <div className="space-y-2">
          {data.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
              <input type="checkbox" className="mt-1 rounded border-slate-300" />
              <div className="flex-1">
                <p className="text-sm font-medium text-navy-900">{item.evidence || item.description || item}</p>
                {item.reason && <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>}
                {item.related_cause && <p className="text-xs text-teal-600 mt-0.5">Related to: {item.related_cause}</p>}
              </div>
              {item.priority && <Badge>{item.priority}</Badge>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Generate Investigation Questions" subtitle="AI-generated questions to guide evidence collection" />
        <div className="space-y-2">
          {(data.questions || data.investigation_questions || []).map((q, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-navy-50">
              <HelpCircle className="w-4 h-4 text-navy-600 mt-0.5 shrink-0" />
              <p className="text-sm text-navy-800">{q}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ---------- CAPA ---------- */
function CAPAPanel({ data, running, investigationId }) {
  if (running) return <LoadingPanel text="Generating CAPA recommendations..." />
  if (!data) return <EmptyPanel text="Run CAPA analysis to generate corrective and preventive action recommendations based on investigation findings." />

  const corrective = data.corrective_actions || []
  const preventive = data.preventive_actions || []

  return (
    <div className="space-y-4">
      <CAPATable title="Corrective Actions" subtitle="Actions to address the existing problem" actions={corrective} type="corrective" investigationId={investigationId} />
      <CAPATable title="Preventive Actions" subtitle="Actions to reduce possibility of recurrence" actions={preventive} type="preventive" investigationId={investigationId} />
    </div>
  )
}

function CAPATable({ title, subtitle, actions, type, investigationId }) {
  const [items, setItems] = useState(actions)

  useEffect(() => setItems(actions), [actions])

  const updateStatus = (idx, status) => {
    setItems((prev) => prev.map((a, i) => (i === idx ? { ...a, status } : a)))
  }

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
              <th className="pb-2 font-medium">Action</th>
              <th className="pb-2 font-medium">Responsible</th>
              <th className="pb-2 font-medium">Priority</th>
              <th className="pb-2 font-medium">Target Date</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((action, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-4">
                  <p className="font-medium text-navy-900">{action.action || action.description}</p>
                  {action.reason && <p className="text-xs text-slate-500">{action.reason}</p>}
                </td>
                <td className="py-2.5 text-slate-600">{action.responsible_department || action.responsible || '—'}</td>
                <td className="py-2.5"><Badge>{action.priority || 'Medium'}</Badge></td>
                <td className="py-2.5 text-slate-600">{action.target_date || action.due_date || '—'}</td>
                <td className="py-2.5">
                  <select
                    className="input w-auto text-xs py-1"
                    value={action.status || 'Proposed'}
                    onChange={(e) => updateStatus(i, e.target.value)}
                  >
                    {['Proposed', 'Approved', 'In Progress', 'Implemented', 'Verified', 'Closed'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">No {type} actions generated</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function LoadingPanel({ text }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
      <p className="text-sm text-slate-600">{text}</p>
    </Card>
  )
}

function EmptyPanel({ text }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16">
      <GitBranch className="w-10 h-10 text-slate-300 mb-3" />
      <p className="text-sm text-slate-500 text-center max-w-md">{text}</p>
    </Card>
  )
}
