import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { LookupsProvider } from './lib/lookups'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import PersonnelPage from './pages/PersonnelPage'
import PersonnelDetailPage from './pages/PersonnelDetailPage'
import EquipmentPage from './pages/EquipmentPage'
import SchedulePage from './pages/SchedulePage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { loading, session, profile } = useAuth()

  if (loading) {
    return <div className="center-screen muted">Loading…</div>
  }

  if (!session) {
    return <LoginPage />
  }

  if (profile && !profile.is_active) {
    return (
      <div className="center-screen">
        <div className="card">
          <p>Your account has been deactivated. Contact an administrator.</p>
        </div>
      </div>
    )
  }

  return (
    <LookupsProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/schedule" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<ProjectDetailPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/personnel" element={<PersonnelPage />} />
          <Route path="/personnel/new" element={<PersonnelDetailPage />} />
          <Route path="/personnel/:id" element={<PersonnelDetailPage />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Route>
      </Routes>
    </LookupsProvider>
  )
}
