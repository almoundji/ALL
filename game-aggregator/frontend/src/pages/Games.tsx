import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, money, post, type Game } from '../lib/api'
import { t, useLang } from '../lib/i18n'

/** List Report « Jeux » (S1-11) : filtres catégorie / fournisseur / activation, action Activer. */
export default function Games() {
  const [l] = useLang()
  const [games, setGames] = useState<Game[]>([])
  const [cat, setCat] = useState(''); const [prov, setProv] = useState(''); const [act, setAct] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const load = () => {
    const q = new URLSearchParams(); if (cat) q.set('category', cat); if (prov) q.set('provider', prov); if (act) q.set('active', act)
    api<Game[]>(`/api/catalog/games?${q}`).then(setGames).catch(() => setGames([]))
  }
  useEffect(load, [cat, prov, act])
  const providers = Array.from(new Map(games.map((g) => [g.provider?.key, g.provider])).values()).filter(Boolean) as NonNullable<Game['provider']>[]
  const toggle = async (g: Game) => { setBusy(g.id); try { await post(`/api/catalog/games/${g.id}/${g.active ? 'deactivate' : 'activate'}`, {}); load() } finally { setBusy(null) } }
  return (
    <>
      <div className="hello"><h1>{t(l, 'Jeux', 'Games')}</h1><span className="muted">{t(l, 'Catalogue unifié', 'Unified catalogue')}</span></div>
      <div className="filterbar" style={{ marginTop: 16 }}>
        <label>{t(l, 'Catégorie', 'Category')}<select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">{t(l, 'Toutes', 'All')}</option>{['dice', 'slots', 'table', 'instant', 'crash', 'lottery'].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>{t(l, 'Fournisseur', 'Provider')}<select value={prov} onChange={(e) => setProv(e.target.value)}><option value="">{t(l, 'Tous', 'All')}</option>{providers.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</select></label>
        <label>{t(l, 'Activation', 'Activation')}<select value={act} onChange={(e) => setAct(e.target.value)}><option value="">{t(l, 'Tous', 'All')}</option><option value="true">{t(l, 'Actifs', 'Active')}</option><option value="false">{t(l, 'Inactifs', 'Inactive')}</option></select></label>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t(l, 'Jeu', 'Game')}</th><th>{t(l, 'Fournisseur', 'Provider')}</th><th>{t(l, 'Catégorie', 'Category')}</th><th className="num">RTP</th><th>{t(l, 'Volatilité', 'Volatility')}</th><th className="num">{t(l, 'Mise min – max', 'Min – max stake')}</th><th>{t(l, 'Statut', 'Status')}</th><th></th></tr></thead>
          <tbody>
            {games.length === 0 && <tr><td colSpan={8}><div className="message"><div className="big">▦</div><h3>{t(l, 'Aucun jeu', 'No games')}</h3><div>{t(l, 'Modifiez les filtres.', 'Change the filters.')}</div></div></td></tr>}
            {games.map((g) => (
              <tr key={g.id}>
                <td data-label="Jeu"><Link to={`/m/catalog/${g.id}`} style={{ fontWeight: 600, color: 'var(--brand)' }}>{g.name}</Link><div className="muted mono" style={{ fontSize: 11 }}>{g.key}</div></td>
                <td data-label="Fournisseur">{g.provider?.name}</td>
                <td data-label="Catégorie">{g.category}</td>
                <td data-label="RTP" className="num">{g.rtp_percent.toFixed(2)} %</td>
                <td data-label="Volatilité">{g.volatility}</td>
                <td data-label="Mise" className="num mono">{money(g.min_stake_minor, g.currency)} – {money(g.max_stake_minor, g.currency)}</td>
                <td data-label="Statut"><span className={`status ${g.active ? 'ok' : 'muted'}`}>{g.active ? t(l, 'Actif', 'Active') : t(l, 'Inactif', 'Inactive')}</span></td>
                <td data-label=""><button className={g.active ? '' : 'primary'} disabled={busy === g.id} onClick={() => toggle(g)}>{g.active ? t(l, 'Désactiver', 'Deactivate') : t(l, 'Activer', 'Activate')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-foot">{games.length} {t(l, 'jeu(x)', 'game(s)')}</div>
      </div>
    </>
  )
}
