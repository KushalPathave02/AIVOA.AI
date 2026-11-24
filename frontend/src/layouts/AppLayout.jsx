import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  LayoutDashboard,
  FileSearch,
  FlaskConical,
  GitBranch,
  ShieldCheck,
  LogOut,
  Bell,
  Search,
  Hexagon,
  Sparkles,
} from 'lucide-react'
import { logout } from '../redux/slices/authSlice'
import CopilotPanel from '../components/copilot/CopilotPanel'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/investigations', label: 'Investigations', icon: FileSearch },
  { to: '/capa', label: 'CAPA Management', icon: ShieldCheck },
]

export default function AppLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const [copilotOpen, setCopilotOpen] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-navy-900 text-white flex flex-col shrink-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-800">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
            <Hexagon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">PharmaRoot AI</div>
            <div className="text-[11px] text-navy-300">Quality Intelligence</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-teal-600 text-white' : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-navy-800">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold">
              {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'QA'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.name || 'QA User'}</div>
              <div className="text-[11px] text-navy-300 truncate">{user?.role || 'Investigator'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-navy-200 hover:bg-navy-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search investigations, batches, deviations..."
              className="w-full text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCopilotOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AIVOA.ai Copilot</span>
            </button>
            <button className="relative p-2 text-slate-500 hover:text-slate-700">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-sm text-slate-600">
              <span className="font-medium text-navy-900">{user?.name || 'QA User'}</span>
              <span className="text-slate-400 ml-2">{user?.role || 'Investigator'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  )
}
