import { FormEvent, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { CLASS, CLASS_COLOR, CLASS_LABEL, setToken } from '../lib/api'
import type { User } from '../lib/types'

const TABS = (admin: boolean) => [
  ['/', 'Mon accueil'], ['/search', 'Recherche'], ['/graph', 'Analyse de liens'], ['/map', 'Carte'],
  ['/cases', 'Dossiers'], ['/alerts', 'Alertes & veille'], ['/ingest', 'Ingestion'], ['/dashboard', 'Décisionnel (BI)'],
  ...(admin ? [['/users', 'Administration'], ['/audit', "Journal d'audit"]] : []),
]

export default function Layout({ user }: { user: User }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])
  const submit = (e: FormEvent) => { e.preventDefault(); if (q.trim()) { nav(`/search?q=${encodeURIComponent(q.trim())}`); setQ('') } }
  const logout = () => { setToken(null); nav('/login') }
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const initial = (user.full_name || user.username).trim().charAt(0).toUpperCase()
  return (
    <div className="shell">
      <header className="header">
        <div className="header-inner">
          <div className="header-logo"><img src="/embleme.svg" alt="" /><div><div className="t1">République du Sénégal</div><div className="t2">Centre de Fusion National · Renseignement</div></div></div>
          <form className="header-search" onSubmit={submit}>
            <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input ref={ref} placeholder="Rechercher partout" value={q} onChange={(e) => setQ(e.target.value)} />
            <kbd>Ctrl K</kbd>
          </form>
          <a className="pill" href="/docs" target="_blank" rel="noreferrer">? Aide</a>
          <span className="pill">FR ▾</span>
          <span className="avatar" title={`${user.full_name} · ${user.unit}`}>{initial}</span>
          <button onClick={logout}>Déconnexion</button>
        </div>
        <div className="tricolor" />
        <div className="banner" style={{ background: CLASS_COLOR[user.clearance] }}>{CLASS_LABEL[user.clearance]} · session {CLASS[user.clearance]}{user.compartments ? ` · ${user.compartments}` : ''} · toute action est journalisée</div>
      </header>
      <main className="page">
        <div className="greeting"><h1>Bonjour {user.full_name?.split(' (')[0] || user.username}</h1><span className="date">{date}</span><span className="right fine">{user.unit} · rôle {user.role}</span></div>
        <nav className="tabs-nav">{TABS(user.role === 'admin').map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
        <Outlet />
      </main>
      <footer className="footer"><span><b>Centre de Fusion National</b> · Direction du Renseignement National</span><span>Usage réservé aux personnels habilités · v0.1</span></footer>
    </div>
  )
}
