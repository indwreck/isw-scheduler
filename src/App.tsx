import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProjectsPage from './pages/ProjectsPage'
import PersonnelPage from './pages/PersonnelPage'
import EquipmentPage from './pages/EquipmentPage'
import SchedulePage from './pages/SchedulePage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
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
