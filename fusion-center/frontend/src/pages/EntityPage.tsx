import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ClassBadge, Confidence, TypeChip } from '../components/Badges'
import GraphView from '../components/GraphView'
import MapView from '../components/MapView'
import { del, fmtDate, get, post, REL_LABEL, TYPE_LABEL } from '../lib/api'
import type { Case, EntityDetail, Graph, User } from '../lib/types'

export default function EntityPage({ user }: { user: User }) {
  const { id } = useParams()
  const nav = useNavigate()
  const [e, setE] = useState<EntityDetail | null>(null)
  const [g, setG] = useState<Graph>({ nodes: [], edges: [] })
  const [cases, setCases] = useState<Case[]>([])
  const [caseId, setCaseId] = useState('')
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  useEffect(() => {
    setErr(''); setMsg('')
    get<EntityDetail>(`/api/entities/${id}`).then(setE).catch((x) => setErr(x.message))
    get<Graph>(`/api/entities/${id}/graph?depth=1`).then(setG).catch(() => undefined)
    get<Case[]>('/api/cases').then(setCases).catch(() => undefined)
  }, [id])
  if (err) return <div className="alert-msg">{err}</div>
  if (!e) return <div className="muted">Chargement…</div>
  const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]))
  const addToCase = async () => { if (!caseId) return; await post(`/api/cases/${caseId}/entities`, { entity_id: e.id, role: 'SUBJECT' }); setMsg('Entité ajoutée au dossier.') }
  const remove = async () => { if (!confirm(`Supprimer définitivement « ${e.label} » ? Cette action est journalisée.`)) return; await del(`/api/entities/${e.id}`); nav('/search') }
  const attrs = Object.entries(e.attributes).filter(([k]) => k !== '_variants')
  const variants = e.attributes._variants as Record<string, string[]> | undefined
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row">
        <div className="grow"><div className="row"><TypeChip type={e.type} /><ClassBadge level={e.classification} compartment={e.compartment} /><span className="muted small">#{e.id}</span></div>
          <h1 style={{ marginTop: 6 }}>{e.label}</h1>
          <div className="muted small">Confiance <Confidence value={e.confidence} /> · {e.degree} relation(s) · {e.provenance.length} source(s) · créé par {e.created_by} le {fmtDate(e.created_at)}</div></div>
        <div className="col" style={{ gap: 6 }}>
          <Link to={`/graph?ids=${e.id}`}><button className="primary" style={{ width: '100%' }}>⬡ Explorer le graphe</button></Link>
          {user.role !== 'viewer' && <div className="row"><select value={caseId} onChange={(x) => setCaseId(x.target.value)} style={{ width: 220 }}><option value="">Ajouter à un dossier…</option>{cases.filter((c) => c.status !== 'CLOSED').map((c) => <option key={c.id} value={c.id}>{c.reference} · {c.title}</option>)}</select><button onClick={addToCase} disabled={!caseId}>OK</button></div>}
          {user.role === 'admin' && <button className="danger small" onClick={remove}>Supprimer</button>}
        </div>
      </div>
      {msg && <div className="ok-msg">{msg}</div>}
      <div className="grid grid-3">
        <div className="card"><h2>Attributs</h2>
          <dl className="kv">{attrs.map(([k, v]) => <><dt key={k + 'k'}>{k}</dt><dd key={k + 'v'}>{String(v)}{variants?.[k] && <div className="fine">variantes : {variants[k].join(', ')}</div>}</dd></>)}
            {e.lat != null && <><dt>coordonnées</dt><dd className="mono">{e.lat.toFixed(4)}, {e.lon?.toFixed(4)}</dd></>}</dl>
          {attrs.length === 0 && <div className="muted">Aucun attribut.</div>}
        </div>
        <div className="card"><h2>Relations ({g.edges.length})</h2>
          <div className="col" style={{ gap: 4, maxHeight: 320, overflow: 'auto' }}>
            {g.edges.map((r) => { const out = r.source_id === e.id; const other = byId[out ? r.target_id : r.source_id]; if (!other) return null
              return <div key={r.id} className="row small" style={{ gap: 6 }}><span className="muted" style={{ minWidth: 90 }}>{out ? REL_LABEL[r.type] : `← ${REL_LABEL[r.type]}`}</span><Link to={`/entities/${other.id}`}>{other.label}</Link><span className="fine">{TYPE_LABEL[other.type]}</span>
                {Object.keys(r.attributes).filter((k) => k !== '_variants').length > 0 && <span className="fine right">{Object.entries(r.attributes).filter(([k]) => k !== '_variants').map(([k, v]) => `${k}=${v}`).join(' ')}</span>}</div> })}
          </div>
        </div>
        <div className="card"><h2>Provenance</h2>
          <div className="fine" style={{ marginBottom: 6 }}>Chaque affirmation est tracée à sa source (cotation OTAN A–F).</div>
          <div className="timeline">{e.provenance.map((p) => <div key={p.id} className="item small"><b>{p.source.name}</b> <span className="chip">{p.source.type} · {p.source.reliability}</span><div className="muted">{fmtDate(p.observed_at)} · réf. {p.external_ref || '—'} · appariement {Math.round(p.match_score)}%</div><div className="fine mono">{JSON.stringify(p.asserted)}</div></div>)}</div>
        </div>
      </div>
      <div className="grid grid-2" style={{ minHeight: 420 }}>
        <div style={{ minHeight: 420 }}><GraphView graph={g} selected={e.id} onSelect={(sid) => sid && sid !== e.id && nav(`/entities/${sid}`)} onExpand={(x) => nav(`/graph?ids=${x}`)} /></div>
        {e.lat != null ? <MapView entities={[e, ...g.nodes.filter((n) => n.id !== e.id)]} center={[e.lat, e.lon!]} zoom={11} /> : <div className="card muted">Pas de géolocalisation pour cette entité. Voisinage géolocalisé : {g.nodes.filter((n) => n.lat != null).length} entité(s).{g.nodes.some((n) => n.lat != null) && <div style={{ height: 380, marginTop: 10 }}><MapView entities={g.nodes} /></div>}</div>}
      </div>
    </div>
  )
}
