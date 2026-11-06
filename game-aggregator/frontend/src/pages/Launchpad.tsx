import { useEffect, useState } from 'react'
import Tile from '../components/Tile'
import { api, type ModuleInfo } from '../lib/api'

const ICON: Record<string, string> = { operators: '◆', providers: '⬡', catalog: '▦', players: '◉', wallet: '◈', sessions: '◎', rounds: '↻', rng: '⚄', audit: '≡', responsible: '⛨', bonus: '✦', reporting: '▤' }
const SUB: Record<string, string> = {
  operators: 'Comptes B2B, clés d’API', providers: 'Adaptateurs de studios', catalog: 'Jeux normalisés', players: 'Comptes rattachés',
  wallet: 'Grand livre, idempotence', sessions: 'Jetons de lancement', rounds: 'Mise → gain → clôture', rng: 'Prouvablement équitable',
  audit: 'Journal chaîné', responsible: 'Limites, auto-exclusion', bonus: 'Campagnes, tours gratuits', reporting: 'GGR, partage de revenus',
}

/** Lanceur Fiori. Au Sprint 0, les tuiles affichent l'état de chaque module ; dès le Sprint 1 leurs chiffres réels. */
export default function Launchpad() {
  const [mods, setMods] = useState<ModuleInfo[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { api<ModuleInfo[]>('/api/modules').then(setMods).catch((e) => setErr(String(e))) }, [])
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  if (err) return <div className="message"><div className="big">⚠</div><h3>L’API ne répond pas</h3><div>Lancez l’API (<span className="mono">make api</span>) puis rechargez.</div><p><button className="primary" onClick={() => location.reload()}>Recharger</button></p></div>
  const groups: [string, number[]][] = [['Sprint 1 — une partie de bout en bout', [1]], ['Sprints suivants', [2, 3, 4, 5, 6, 7, 8]]]
  return (
    <>
      <div className="hello"><h1>Bonjour</h1><span className="muted">{date}</span></div>
      {groups.map(([label, sprints]) => (
        <section key={label}>
          <div className="overline">{label}</div>
          <div className="tiles">
            {(mods ?? []).filter((m) => sprints.includes(m.sprint)).map((m) => (
              <Tile key={m.key} to={`/m/${m.key}`} title={m.name} sub={SUB[m.key] ?? ''} icon={ICON[m.key] ?? '•'}
                value={`S${m.sprint}`} caption={m.status} tone={m.status === 'livré' ? 'ok' : m.status === 'en cours' ? 'warn' : undefined} off={m.status === 'planifié'} />
            ))}
          </div>
        </section>
      ))}
      <button className="primary fab">+ Activer des jeux</button>
    </>
  )
}
