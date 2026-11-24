import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { FileSearch, GitBranch, ShieldCheck, Sparkles } from 'lucide-react'
import api from '../services/api'
import { PageHeader, StatCard, Card } from '../components/common/UI'
import { fetchInvestigations } from '../redux/slices/investigationSlice'

export default function Dashboard() {
  const dispatch = useDispatch()
  const { items } = useSelector((state) => state.investigation)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    dispatch(fetchInvestigations())
    api.get('/dashboard/stats').then(({ data }) => setStats(data)).catch(() => {})
  }, [dispatch])

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Deviation investigation overview" />

      {/* Key stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Investigations" value={stats?.total ?? items.length} icon={FileSearch} />
        <StatCard label="Under RCA" value={stats?.under_rca ?? 0} icon={GitBranch} />
        <StatCard label="CAPA In Progress" value={stats?.capa_in_progress ?? 0} icon={ShieldCheck} />
      </div>

      {/* Empty state — investigations are created via Copilot */}
      <Card className="text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-teal-600" />
        </div>
        <h3 className="text-lg font-semibold text-navy-900 mb-1">No investigations yet</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Create your first deviation investigation using the AIVOA.ai Copilot —
          paste an incident report or upload a PDF and the AI will extract and fill everything.
        </p>
        <p className="text-xs text-slate-400">
          Click <span className="font-medium text-teal-600">AIVOA.ai Copilot</span> in the top header to get started
        </p>
      </Card>
    </div>
  )
}
