import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Eye, GitBranch, FileText } from 'lucide-react'
import { PageHeader, Badge } from '../components/common/UI'
import { fetchInvestigations } from '../redux/slices/investigationSlice'

const STATUSES = ['All', 'Open', 'Under Investigation', 'RCA In Progress', 'CAPA Proposed', 'Pending QA Approval', 'Approved', 'Closed']
const SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low']

export default function Investigations() {
  const dispatch = useDispatch()
  const { items, status } = useSelector((state) => state.investigation)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [severityFilter, setSeverityFilter] = useState('All')

  useEffect(() => {
    dispatch(fetchInvestigations())
  }, [dispatch])

  const filtered = items.filter((inv) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      (inv.investigation_id || '').toLowerCase().includes(q) ||
      (inv.batch_number || '').toLowerCase().includes(q) ||
      (inv.deviation_title || inv.title || '').toLowerCase().includes(q) ||
      (inv.product_name || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || inv.status === statusFilter
    const matchSeverity = severityFilter === 'All' || inv.severity === severityFilter
    return matchSearch && matchStatus && matchSeverity
  })

  return (
    <div>
      <PageHeader
        title="Investigations"
        subtitle="Manage pharmaceutical quality deviation investigations"
        actions={
          <Link to="/investigations/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Create New Investigation
          </Link>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by ID, batch, product, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input w-auto" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500 uppercase">
                <th className="px-4 py-3 font-medium">Investigation</th>
                <th className="px-4 py-3 font-medium">Batch</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Investigator</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/investigations/${inv.id}`} className="font-medium text-teal-600 hover:underline">
                      {inv.investigation_id || `RCA-${String(inv.id).padStart(4, '0')}`}
                    </Link>
                    <div className="text-xs text-slate-500 max-w-[200px] truncate">{inv.deviation_title || inv.title}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inv.batch_number || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.product_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.department || '—'}</td>
                  <td className="px-4 py-3"><Badge>{inv.severity || 'Medium'}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{inv.assigned_investigator || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.investigation_date || inv.created_at?.slice(0, 10) || '—'}</td>
                  <td className="px-4 py-3"><Badge>{inv.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link to={`/investigations/${inv.id}/workspace`} title="AI Workspace" className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded">
                        <GitBranch className="w-4 h-4" />
                      </Link>
                      <Link to={`/investigations/${inv.id}`} title="View report" className="p-1.5 text-slate-400 hover:text-navy-700 hover:bg-slate-100 rounded">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link to={`/investigations/${inv.id}/evidence`} title="Evidence" className="p-1.5 text-slate-400 hover:text-navy-700 hover:bg-slate-100 rounded">
                        <FileText className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    {status === 'loading'
                      ? 'Loading investigations...'
                      : 'No investigations yet — use the AIVOA.ai Copilot in the header to create one from a PDF or text'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
