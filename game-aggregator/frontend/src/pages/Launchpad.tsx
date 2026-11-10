import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Tile from '../components/Tile'
import { api, money, type ModuleInfo, type Operator, type Stats } from '../lib/api'
import { t, useLang } from '../lib/i18n'

const ICON: Record<string, string> = { operators: '◆', providers: '⬡', catalog: '▦', players: '◉', wallet: '◈', sessions: '◎', rounds: '↻', rng: '⚄', audit: '≡', responsible: '⛨', bonus: '✦', reporting: '▤' }

/** Lanceur Fiori (S1-10) : tuiles à chiffres réels de l'opérateur connecté, puis feuille de route des modules à venir. */
export default function Launchpad() {
  const [l] = useLang()
  const { op } = useOutletContext<{ op: Operator | null }>()
  const [mods, setMods] = useState<ModuleInfo[]>([])
  const [st, setSt] = useState<Stats | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { api<ModuleInfo[]>('/api/modules').then(setMods).catch((e) => setErr(String(e))) }, [])
  useEffect(() => { if (op) api<Stats>('/api/operators/me/stats').then(setSt).catch(() => setSt(null)) }, [op])
  const date = new Date().toLocaleDateString(l === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  if (err) return <div className="message"><div className="big">⚠</div><h3>{t(l, 'L’API ne répond pas', 'The API is not responding')}</h3><p><button className="primary" onClick={() => location.reload()}>{t(l, 'Recharger', 'Reload')}</button></p></div>
  const cur = st?.currency ?? op?.currency ?? 'XOF'
  const ggrTone = st ? (st.ggr_today_minor > 0 ? 'ok' : st.ggr_today_minor < 0 ? 'neg' : undefined) : undefined
  return (
    <>
      <div className="hello"><h1>{t(l, 'Bonjour', 'Hello')}{op ? `, ${op.name}` : ''}</h1><span className="muted">{date}</span></div>

      <div className="overline">{t(l, 'Activité', 'Activity')}</div>
      <div className="tiles">
        <Tile to="/m/sessions" title={t(l, 'Sessions en cours', 'Open sessions')} sub={t(l, 'Joueurs connectés à un jeu', 'Players connected to a game')} icon="◎" value={st?.sessions_open} />
        <Tile to="/m/rounds" title={t(l, 'GGR du jour', 'Today’s GGR')} sub={t(l, 'Mises − gains', 'Stakes − winnings')} icon="◈" value={st ? money(st.ggr_today_minor, cur) : undefined} tone={ggrTone}
          caption={st ? `${t(l, 'mises', 'stakes')} ${money(st.stake_today_minor, cur)} · ${t(l, 'gains', 'winnings')} ${money(st.win_today_minor, cur)}` : undefined} />
        <Tile to="/m/rounds" title={t(l, 'Tours joués', 'Rounds played')} sub={t(l, 'Depuis minuit (UTC)', 'Since midnight (UTC)')} icon="↻" value={st?.rounds_today} />
      </div>

      <div className="overline">{t(l, 'Catalogue et joueurs', 'Catalogue and players')}</div>
      <div className="tiles">
        <Tile to="/m/catalog" title={t(l, 'Mes jeux actifs', 'My active games')} sub={t(l, 'Catalogue unifié', 'Unified catalogue')} icon="▦" value={st?.games_active} caption={t(l, 'activer des jeux →', 'activate games →')} />
        <Tile to="/m/players" title={t(l, 'Joueurs', 'Players')} sub={t(l, 'Comptes rattachés', 'Linked accounts')} icon="◉" value={st?.players} />
        <Tile to="/documentation" title={t(l, 'Documentation', 'Documentation')} sub={t(l, 'FR / EN, API, feuille de route', 'FR / EN, API, roadmap')} icon="?" value="FR·EN" />
      </div>

      <div className="overline">{t(l, 'Feuille de route', 'Roadmap')}</div>
      <div className="tiles">
        {mods.filter((m) => m.status !== 'livré').map((m) => (
          <Tile key={m.key} to={`/m/${m.key}`} title={t(l, m.name, m.name_en)} sub={t(l, 'Module planifié', 'Planned module')} icon={ICON[m.key] ?? '•'} value={`S${m.sprint}`} caption={t(l, m.status, 'planned')} off />
        ))}
      </div>
    </>
  )
}
