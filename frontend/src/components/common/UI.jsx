export function Card({ children, className = '' }) {
  return <div className={`card p-5 ${className}`}>{children}</div>
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const statusColors = {
  Open: 'bg-blue-100 text-blue-700',
  'Under Investigation': 'bg-amber-100 text-amber-700',
  'RCA In Progress': 'bg-purple-100 text-purple-700',
  'CAPA Proposed': 'bg-indigo-100 text-indigo-700',
  'Pending QA Approval': 'bg-orange-100 text-orange-700',
  Approved: 'bg-green-100 text-green-700',
  'Effectiveness Review': 'bg-teal-100 text-teal-700',
  Closed: 'bg-slate-100 text-slate-600',
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
}

export function Badge({ children, color }) {
  const cls = color || statusColors[children] || 'bg-slate-100 text-slate-600'
  return <span className={`badge ${cls}`}>{children}</span>
}

export function StatCard({ label, value, icon: Icon, trend, trendUp }) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-navy-900 mt-1">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>{trend}</p>
        )}
      </div>
      {Icon && (
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-teal-600" />
        </div>
      )}
    </Card>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
