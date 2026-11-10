import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api, getApiKey, setApiKey, type Health, type Operator } from '../lib/api'
import { t, useLang } from '../lib/i18n'

const PUBLIC = ['/login', '/documentation']

/** Shell bar Fiori : logo, recherche globale (Ctrl K), documentation, langue, opérateur connecté, fil d'Ariane. */
export default function Shell() {
  const ref = useRef<HTMLInputElement>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [op, setOp] = useState<Operator | null>(null)
  const loc = useLocation()
  const nav = useNavigate()
  const [lang, setLang] = useLang()
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])
  useEffect(() => { api<Health>('/api/health').then(setHealth).catch(() => setHealth(null)) }, [])
  useEffect(() => {
    if (!getApiKey()) { setOp(null); if (!PUBLIC.includes(loc.pathname)) nav('/login', { replace: true }); return }
    api<Operator>('/api/operators/me').then(setOp).catch(() => { setApiKey(null); setOp(null); if (!PUBLIC.includes(loc.pathname)) nav('/login', { replace: true }) })
  }, [loc.pathname, nav])
  const logout = () => { setApiKey(null); setOp(null); nav('/login') }
  const parts = loc.pathname.split('/').filter(Boolean)
  return (
    <div className="shell">
      <header className="shellbar">
        <div className="shellbar-in">
          <Link className="logo" to="/"><span>yo<span className="n">on</span></span><small>{health ? `${health.environment} · v${health.version}` : t(lang, 'hors ligne', 'offline')}</small></Link>
          <div className="search">
            <span className="i"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg></span>
            <input ref={ref} placeholder={t(lang, 'Rechercher un jeu, un joueur, une transaction…', 'Search a game, a player, a transaction…')} />
            <kbd>Ctrl K</kbd>
          </div>
          <Link className="pill" to="/documentation">{t(lang, 'Documentation', 'Documentation')}</Link>
          <button className="pill" onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} title={t(lang, 'Switch to English', 'Passer en français')}>{lang.toUpperCase()} ▾</button>
          {op ? <span className="pill" title={`${t(lang, 'Clé', 'Key')} ${op.api_key_prefix}…`}>{op.name}</span> : <Link className="pill" to="/login">{t(lang, 'Connexion', 'Sign in')}</Link>}
          <span className={`status ${health ? 'ok' : 'neg'}`}>{health ? 'API' : t(lang, 'API injoignable', 'API unreachable')}</span>
          {op && <button className="avatar" title={t(lang, 'Se déconnecter', 'Sign out')} onClick={logout} style={{ border: 0, padding: 0 }}>{op.name.charAt(0).toUpperCase()}</button>}
        </div>
        {parts.length > 0 && (
          <nav className="crumbs"><Link to="/">{t(lang, 'Accueil', 'Home')}</Link>{parts.filter((p) => p !== 'm').map((p, i, a) => <span key={i}>› {i === a.length - 1 ? p : <Link to={`/m/${a.slice(0, i + 1).join('/')}`}>{p}</Link>}</span>)}</nav>
        )}
      </header>
      <main className="page"><Outlet context={{ op, health }} /></main>
    </div>
  )
}
