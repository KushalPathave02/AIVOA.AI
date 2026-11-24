import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { Hexagon, Mail, Lock, User, ArrowRight } from 'lucide-react'
import api from '../services/api'
import { loginSuccess } from '../redux/slices/authSlice'

const ROLES = ['QA Investigator', 'QA Manager', 'QC Analyst', 'Production Supervisor', 'Admin']

export default function Signup() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: ROLES[0] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      dispatch(loginSuccess({ token: data.access_token, user: data.user }))
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-teal-500" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-teal-700" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
            <Hexagon className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-bold text-lg">PharmaRoot AI</span>
        </div>
        <div className="relative">
          <h1 className="text-3xl font-bold text-white leading-tight">
            Create your account
          </h1>
          <p className="text-navy-300 mt-4 max-w-md">
            Join the Pharmaceutical Quality Management System. Your investigations, RCA analyses, evidence and CAPA data will be private to your account.
          </p>
        </div>
        <p className="relative text-xs text-navy-400">
          Compliant with ICH Q10 Pharmaceutical Quality System principles
        </p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
              <Hexagon className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-navy-900 text-lg">PharmaRoot AI</span>
          </div>

          <div className="card p-8">
            <h2 className="text-xl font-bold text-navy-900">Create account</h2>
            <p className="text-sm text-slate-500 mt-1">Sign up to access the Quality Management System</p>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" className="input pl-9" value={form.name} onChange={set('name')} required />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" className="input pl-9" value={form.email} onChange={set('email')} required />
                </div>
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={set('role')}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" className="input pl-9" value={form.password} onChange={set('password')} required minLength={6} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? 'Creating account...' : 'Create account'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
