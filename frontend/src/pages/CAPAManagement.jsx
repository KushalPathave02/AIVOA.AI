import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Plus, Filter, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import api from '../services/api'
import { PageHeader, Card, Badge } from '../components/common/UI'

const STATUS_FLOW = ['Proposed', 'Approved', 'In Progress', 'Implemented', 'Verified', 'Closed']

export default function CAPAManagement() {
  const [capas, setCapas] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/capa').then(({ data }) => setCapas(data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'All' ? capas : capas.filter((c) => c.status === filter)

  const stats = {
    total: capas.length,
    inProgress: capas.filter((c) => c.status === 'In Progress').length,
    overdue: capas.filter((c) => c.status === 'Overdue' || (c.due_date && new Date(c.due_date) < new Date() && c.status !== 'Closed')).length,
    closed: capas.filter((c) => c.status === 'Closed').length,
  }

  return (
    <div>
      <PageHeader
        title="CAPA Management"
        subtitle="Corrective and Preventive Actions tracking"
        actions={
          <button className="btn-primary">
            <Plus className="w-4 h-4" /> New CAPA
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-navy-700" /></div>
          <div><p className="text-xs text-slate-500">Total CAPAs</p><p className="text-xl font-bold text-navy-900">{stats.total}</p></div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-slate-500">In Progress</p><p className="text-xl font-bold text-navy-900">{stats.inProgress}</p></div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-slate-500">Overdue</p><p className="text-xl font-bold text-navy-900">{stats.overdue}</p></div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-slate-500">Closed</p><p className="text-xl font-bold text-navy-900">{stats.closed}</p></div>
        </Card>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {['All', ...STATUS_FLOW].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* CAPA table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500 uppercase">
                <th className="px-4 py-3 font-medium">CAPA ID</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Investigation</th>
                <th className="px-4 py-3 font-medium">Responsible</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((capa) => (
                <tr key={capa.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-teal-600">{capa.capa_id || `CAPA-${capa.id}`}</td>
                  <td className="px-4 py-3"><Badge color={capa.action_type === 'Corrective' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>{capa.action_type || 'Corrective'}</Badge></td>
                  <td className="px-4 py-3 text-slate-700 max-w-[240px] truncate">{capa.action_description || capa.description}</td>
                  <td className="px-4 py-3">
                    {capa.investigation_id ? (
                      <Link to={`/investigations/${capa.investigation_id}`} className="text-teal-600 hover:underline">
                        {capa.investigation_id}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{capa.responsible_person || capa.responsible_department || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{capa.target_date || capa.due_date || '—'}</td>
                  <td className="px-4 py-3"><Badge>{capa.status}</Badge></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  {loading ? 'Loading CAPAs...' : 'No CAPAs found. Generate CAPA recommendations from an investigation RCA.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
