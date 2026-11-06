import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { api, type Health } from '../lib/api'

/** Shell bar Fiori : logo, recherche globale (Ctrl K), rôle, notifications, profil, fil d'Ariane. */
export default function Shell() {
  const ref = useRef<HTMLInputElement>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const loc = useLocation()
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])
  useEffect(() => { api<Health>('/api/health').then(setHealth).catch(() => setHealth(null)) }, [])
  const parts = loc.pathname.split('/').filter(Boolean)
  return (
    <div className="shell">
      <header className="shellbar">
        <div className="shellbar-in">
          <Link className="logo" to="/"><span>yo<span className="n">on</span></span><small>{health ? `${health.environment} · v${health.version}` : 'hors ligne'}</small></Link>
          <div className="search">
            <span className="i"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg></span>
            <input ref={ref} placeholder="Rechercher un jeu, un joueur, une transaction…" />
            <kbd>Ctrl K</kbd>
          </div>
          <span className="pill">Opérateur ▾</span>
          <span className={`status ${health ? 'ok' : 'neg'}`}>{health ? 'API' : 'API injoignable'}</span>
          <span className="avatar" title="Profil">Y</span>
        </div>
        {parts.length > 0 && (
          <nav className="crumbs"><Link to="/">Accueil</Link>{parts.filter((p) => p !== 'm').map((p, i, a) => <span key={i}>› {i === a.length - 1 ? p : <Link to={`/m/${a.slice(0, i + 1).join('/')}`}>{p}</Link>}</span>)}</nav>
        )}
      </header>
      <main className="page"><Outlet /></main>
    </div>
  )
}
