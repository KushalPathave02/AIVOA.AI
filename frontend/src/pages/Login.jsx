import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { Hexagon, Mail, Lock, ArrowRight } from 'lucide-react'
import api from '../services/api'
import { loginStart, loginSuccess, loginFailure } from '../redux/slices/authSlice'

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [email, setEmail] = useState('qa.manager@pharmaroot.ai')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    dispatch(loginStart())
    try {
      const { data } = await api.post('/auth/login', { email, password })
      dispatch(loginSuccess({ token: data.access_token, user: data.user }))
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Please try again.'
      setError(msg)
      dispatch(loginFailure(msg))
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
            Intelligent Root Cause Analysis for Pharmaceutical Manufacturing
          </h1>
          <p className="text-navy-300 mt-4 max-w-md">
            AI-assisted deviation investigations, evidence analysis, and CAPA recommendations — with human QA oversight at every step.
          </p>
          <div className="mt-8 space-y-3">
            {['AI-powered document extraction', '5 Whys & Fishbone RCA', 'Missing evidence detection', 'CAPA recommendations'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-navy-200">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                {f}
              </div>
            ))}
          </div>
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
            <h2 className="text-xl font-bold text-navy-900">Sign in</h2>
            <p className="text-sm text-slate-500 mt-1">Access the Quality Management System</p>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    className="input pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    className="input pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input type="checkbox" className="rounded border-slate-300" defaultChecked />
                  Remember me
                </label>
                <button type="button" className="text-teal-600 hover:text-teal-700 font-medium">
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-teal-600 hover:text-teal-700 font-medium">
                Create one
              </Link>
            </p>

            <div className="mt-6 p-3 rounded-lg bg-navy-50 border border-navy-100">
              <p className="text-xs text-navy-700 font-medium">Demo credentials</p>
              <p className="text-xs text-navy-600 mt-0.5">qa.manager@pharmaroot.ai / password123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
