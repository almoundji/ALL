import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../lib/api'
import type { User } from '../lib/types'

interface TileProps { to: string; title: string; sub: string; icon: string; value?: number | string; caption?: string; tone?: 'warn' | 'ok'; accent?: string }

const Tile = ({ to, title, sub, icon, value, caption, tone, accent }: TileProps) => (
  <Link to={to} className="tile" style={{ ['--tile-accent' as any]: accent || 'transparent' }}>
    <div className="tt">{title}</div><div className="ts">{sub}</div>
    <div className="tb"><span className="ti">{icon}</span><span className={`tv ${tone || ''}`}>{value ?? '—'}</span></div>
    {caption && <div className="tc">{caption}</div>}
  </Link>
)

const Create = ({ to, title, sub }: { to: string; title: string; sub: string }) => (
  <Link to={to} className="tile create"><div className="tt">{title}</div><div className="ts">{sub}</div><div className="tplus">+</div></Link>
)

const fmt = (n?: number) => (n == null ? '—' : n.toLocaleString('fr-FR'))

export default function Home({ user }: { user: User }) {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => { get('/api/dashboard').then(setD).catch((e) => setErr(e.message)) }, [])
  if (err) return <div className="alert-msg">{err}</div>
  const cases = d ? Object.fromEntries(d.cases_by_status.map((c: any) => [c.status, c.count])) : {}
  const active = (cases.OPEN || 0) + (cases.IN_PROGRESS || 0)
  const critical = d?.alerts_by_severity?.filter((a: any) => a.severity === 'HIGH' || a.severity === 'CRITICAL').reduce((s: number, a: any) => s + a.count, 0) || 0
  const persons = d?.by_type?.find((b: any) => b.type === 'PERSON')?.count || 0
  const canWrite = user.role !== 'viewer'
  return (
    <div>
      <div className="section-title">Analyse</div>
      <div className="tiles">
        <Tile to="/search" title="Recherche" sub="Personnes, téléphones, véhicules, lieux…" icon="⌕" value={fmt(d?.entities)} caption={`entités visibles · ${fmt(persons)} personnes`} />
        <Tile to="/graph" title="Analyse de liens" sub="Réseaux, chemins, intermédiaires" icon="⬡" value={fmt(d?.relations)} caption={`relations · ${fmt(d?.communities)} communautés détectées`} />
        <Tile to="/map" title="Carte opérationnelle" sub="Entités géolocalisées" icon="◎" value={fmt(d?.geo_entities)} caption="objets positionnés" />
        <Tile to="/dashboard" title="Décisionnel" sub="Indicateurs et acteurs clés" icon="▦" value={fmt(d?.by_type?.length)} caption={d?.top_betweenness?.[0] ? `types d'objets · acteur clé : ${d.top_betweenness[0].label}` : "types d'objets"} />
      </div>

      <div className="section-title">Opérations</div>
      <div className="tiles">
        <Tile to="/cases" title="Dossiers d'enquête" sub={`${fmt(cases.CLOSED || 0)} clos · ${fmt(cases.IN_PROGRESS || 0)} en cours`} icon="▤" value={fmt(active)} caption="dossiers actifs" accent={active ? 'var(--green)' : undefined} />
        <Tile to="/alerts" title="Alertes & veille" sub={`${fmt(d?.watchlists_active)} règle(s) active(s)`} icon="▲" value={fmt(d?.open_alerts)} caption={critical ? `dont ${critical} haute(s) / critique(s)` : 'alertes ouvertes'} tone={d?.open_alerts ? 'warn' : 'ok'} accent={d?.open_alerts ? 'var(--red)' : undefined} />
        <Tile to="/ingest" title="Ingestion" sub={`${fmt(d?.sources)} source(s) référencée(s)`} icon="⇪" value={fmt(d?.jobs_30d)} caption="imports sur 30 jours" />
        {canWrite && <Create to="/cases" title="Créer un dossier" sub="Nouvelle enquête" />}
        {canWrite && <Create to="/ingest" title="Importer un fichier" sub="CSV ou JSON, avec modèle" />}
      </div>

      {user.role === 'admin' && <>
        <div className="section-title">Administration</div>
        <div className="tiles">
          <Tile to="/users" title="Utilisateurs" sub="Rôles, niveaux, compartiments" icon="⚇" value={fmt(d?.users)} caption="comptes" />
          <Tile to="/audit" title="Journal d'audit" sub="Chaîne SHA-256 vérifiable" icon="≡" value={fmt(d?.audit_today)} caption={`actions sur 24 h · ${fmt(d?.audit_entries)} au total`} />
          <Tile to="/docs" title="API & documentation" sub="OpenAPI interactive" icon="{ }" value="REST" caption="/docs" />
        </div>
      </>}

      {d?.recent_alerts?.length > 0 && <>
        <div className="section-title">À traiter en priorité</div>
        <div className="card">
          <table><tbody>{d.recent_alerts.slice(0, 5).map((a: any) => <tr key={a.id} className="click" onClick={() => (location.href = a.entity_id ? `/entities/${a.entity_id}` : '/alerts')}><td style={{ width: 90 }}><b className={`sev-${a.severity}`}>{a.severity}</b></td><td>{a.title}</td><td className="small muted" style={{ textAlign: 'right' }}>{new Date(a.created_at).toLocaleString('fr-FR')}</td></tr>)}</tbody></table>
        </div>
      </>}
    </div>
  )
}
