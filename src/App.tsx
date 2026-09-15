import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import ProjectsPage from './pages/ProjectsPage'
import PersonnelPage from './pages/PersonnelPage'
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
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/schedule" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/personnel" element={<PersonnelPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/schedule" replace />} />
      </Route>
    </Routes>
  )
}
