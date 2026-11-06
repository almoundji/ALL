import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { get, getToken } from './lib/api'
import type { User } from './lib/types'
import Alerts from './pages/Alerts'
import Audit from './pages/Audit'
import CaseDetailPage from './pages/CaseDetail'
import Cases from './pages/Cases'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import EntityPage from './pages/EntityPage'
import GraphExplorer from './pages/GraphExplorer'
import Ingest from './pages/Ingest'
import Login from './pages/Login'
import MapPage from './pages/MapPage'
import Search from './pages/Search'
import Users from './pages/Users'

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const loc = useLocation()
  useEffect(() => {
    if (!getToken()) { setUser(null); return }
    get<User>('/api/auth/me').then(setUser).catch(() => setUser(null))
  }, [loc.pathname === '/login'])
  if (user === undefined) return <div className="login"><div className="muted">Chargement…</div></div>
  if (!user) return <Routes><Route path="/login" element={<Login onLogin={setUser} />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout user={user} />}>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/entities/:id" element={<EntityPage user={user} />} />
        <Route path="/graph" element={<GraphExplorer />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/cases" element={<Cases user={user} />} />
        <Route path="/cases/:id" element={<CaseDetailPage user={user} />} />
        <Route path="/alerts" element={<Alerts user={user} />} />
        <Route path="/ingest" element={<Ingest user={user} />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/users" element={<Users />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
