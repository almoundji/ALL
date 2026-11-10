import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, money, post, type Game, type GameSession, type Player } from '../lib/api'
import { t, useLang } from '../lib/i18n'

/** Object Page « Jeu » (S1-11) : en-tête avec indicateurs, action principale Activer, section Essayer (S1-7). */
export default function GamePage() {
  const [l] = useLang()
  const { id } = useParams()
  const nav = useNavigate()
  const [g, setG] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [pid, setPid] = useState<number | ''>('')
  const [mode, setMode] = useState<'demo' | 'real'>('demo')
  const [err, setErr] = useState<string | null>(null)
  const load = () => api<Game>(`/api/catalog/games/${id}`).then(setG).catch((e) => setErr(e.message))
  useEffect(() => { load(); api<Player[]>('/api/players').then(setPlayers).catch(() => setPlayers([])) }, [id])
  if (err) return <div className="message"><div className="big">⚠</div><h3>{err}</h3></div>
  if (!g) return <div className="message">…</div>
  const toggle = async () => { await post(`/api/catalog/games/${g.id}/${g.active ? 'deactivate' : 'activate'}`, {}); load() }
  const launch = async () => {
    setErr(null)
    try { const s = await post<GameSession>('/api/sessions', { player_id: pid, game_id: g.id, mode }); nav(s.launch_url) } catch (e: any) { setErr(e.message) }
  }
  const sections = [t(l, 'Général', 'General'), t(l, 'Essayer', 'Try it'), t(l, 'Fournisseur', 'Provider')]
  return (
    <>
      <div className="object-head">
        <div>
          <div className="muted" style={{ fontSize: 12 }}>{g.provider?.name} · <span className="mono">{g.key}</span></div>
          <h1>{g.name}</h1>
          <div style={{ marginTop: 8 }}><span className={`status ${g.active ? 'ok' : 'muted'}`}>{g.active ? t(l, 'Actif pour mon compte', 'Active for my account') : t(l, 'Non activé', 'Not activated')}</span></div>
        </div>
        <div className="kpis">
          <div className="kpi"><div className="v num">{g.rtp_percent.toFixed(2)} %</div><div className="l">RTP</div></div>
          <div className="kpi"><div className="v">{g.volatility}</div><div className="l">{t(l, 'Volatilité', 'Volatility')}</div></div>
          <div className="kpi"><div className="v num" style={{ fontSize: 18, marginTop: 6 }}>{money(g.min_stake_minor, g.currency)}<br />{money(g.max_stake_minor, g.currency)}</div><div className="l">{t(l, 'Mise min / max', 'Min / max stake')}</div></div>
        </div>
      </div>
      <nav className="anchors">{sections.map((s, i) => <a key={s} href={`#s${i}`} className={i === 0 ? 'active' : ''}>{s}</a>)}</nav>
      <section id="s0" className="section"><h2>{sections[0]}</h2>
        <div className="fields">
          <div className="field"><div className="l">{t(l, 'Catégorie', 'Category')}</div><div className="v">{g.category}</div></div>
          <div className="field"><div className="l">{t(l, 'Devise', 'Currency')}</div><div className="v">{g.currency}</div></div>
          <div className="field"><div className="l">{t(l, 'Statut catalogue', 'Catalogue status')}</div><div className="v">{g.status}</div></div>
          <div className="field"><div className="l">{t(l, 'Identifiant', 'Identifier')}</div><div className="v mono">#{g.id}</div></div>
        </div>
      </section>
      <section id="s1" className="section"><h2>{sections[1]}</h2>
        {!g.active ? <p className="muted">{t(l, 'Activez le jeu pour lancer une session.', 'Activate the game to launch a session.')}</p> : (
          <div className="filterbar" style={{ margin: 0 }}>
            <label>{t(l, 'Joueur', 'Player')}<select value={pid} onChange={(e) => setPid(Number(e.target.value))}><option value="">—</option>{players.map((p) => <option key={p.id} value={p.id}>{p.display_name || p.external_id} · {money(p.balance_minor, p.currency)}</option>)}</select></label>
            <label>{t(l, 'Mode', 'Mode')}<select value={mode} onChange={(e) => setMode(e.target.value as 'demo' | 'real')}><option value="demo">{t(l, 'Démo (sans argent)', 'Demo (no money)')}</option><option value="real">{t(l, 'Argent réel', 'Real money')}</option></select></label>
            <button className="primary" disabled={!pid} onClick={launch}>{t(l, 'Lancer une session', 'Launch a session')}</button>
            {players.length === 0 && <span className="muted">{t(l, 'Créez d’abord un joueur.', 'Create a player first.')}</span>}
            {err && <span className="status neg">{err}</span>}
          </div>
        )}
      </section>
      <section id="s2" className="section"><h2>{sections[2]}</h2>
        <div className="fields">
          <div className="field"><div className="l">{t(l, 'Nom', 'Name')}</div><div className="v">{g.provider?.name}</div></div>
          <div className="field"><div className="l">{t(l, 'Clé', 'Key')}</div><div className="v mono">{g.provider?.key}</div></div>
        </div>
      </section>
      <button className={`fab ${g.active ? '' : 'primary'}`} onClick={toggle}>{g.active ? t(l, 'Désactiver', 'Deactivate') : t(l, 'Activer', 'Activate')}</button>
    </>
  )
}
