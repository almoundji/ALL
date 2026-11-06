import { FormEvent, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { CLASS, CLASS_COLOR, CLASS_LABEL, setToken } from '../lib/api'
import type { User } from '../lib/types'

export default function Layout({ user }: { user: User }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`) }
  const logout = () => { setToken(null); nav('/login') }
  return (
    <div className="shell" style={{ ['--c-banner' as any]: CLASS_COLOR[user.clearance] }}>
      <div className="banner">{CLASS_LABEL[user.clearance]} — session habilitée {CLASS[user.clearance]}{user.compartments ? ` · ${user.compartments}` : ''} — toute action est journalisée</div>
      <div className="body">
        <aside className="sidebar">
          <div className="brand">◈ CENTRE DE FUSION<small>Renseignement national · v0.1</small></div>
          <nav className="nav col" style={{ gap: 2 }}>
            <NavLink to="/" end>▦ Tableau de bord</NavLink>
            <NavLink to="/search">⌕ Recherche</NavLink>
            <NavLink to="/graph">⬡ Analyse de liens</NavLink>
            <NavLink to="/map">◎ Carte</NavLink>
            <div className="sep">Opérations</div>
            <NavLink to="/cases">▤ Dossiers</NavLink>
            <NavLink to="/alerts">▲ Alertes & veille</NavLink>
            <NavLink to="/ingest">⇪ Ingestion</NavLink>
            {user.role === 'admin' && <><div className="sep">Administration</div><NavLink to="/audit">≡ Journal d'audit</NavLink><NavLink to="/users">⚇ Utilisateurs</NavLink></>}
          </nav>
          <div className="userbox">
            <b>{user.full_name || user.username}</b><br /><span className="muted">{user.unit || user.role}</span><br />
            <span className="muted">Rôle : {user.role} · {CLASS[user.clearance]}</span><br />
            <button className="small" style={{ marginTop: 8 }} onClick={logout}>Déconnexion</button>
          </div>
        </aside>
        <main className="main">
          <form className="topbar" onSubmit={submit}>
            <input placeholder="Recherche globale : nom, téléphone, plaque, IBAN, lieu…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit">Rechercher</button>
          </form>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
