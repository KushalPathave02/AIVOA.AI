import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Investigations from './pages/Investigations'
import InvestigationWorkspace from './pages/InvestigationWorkspace'
import EvidenceManagement from './pages/EvidenceManagement'
import RCAAnalysis from './pages/RCAAnalysis'
import CAPAManagement from './pages/CAPAManagement'
import InvestigationReport from './pages/InvestigationReport'

function ProtectedRoute({ children }) {
  const token = useSelector((state) => state.auth.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="investigations" element={<Investigations />} />
        <Route path="investigations/new" element={<InvestigationWorkspace />} />
        <Route path="investigations/:id" element={<InvestigationReport />} />
        <Route path="investigations/:id/workspace" element={<InvestigationWorkspace />} />
        <Route path="investigations/:id/evidence" element={<EvidenceManagement />} />
        <Route path="investigations/:id/rca" element={<RCAAnalysis />} />
        <Route path="capa" element={<CAPAManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
