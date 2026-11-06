import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ClassBadge, TypeChip } from '../components/Badges'
import GraphView from '../components/GraphView'
import { del, fmtDate, get, patch, post } from '../lib/api'
import type { CaseDetail, Entity, Graph, User } from '../lib/types'

const KIND: Record<string, string> = { NOTE: 'Note', HYPOTHESIS: 'Hypothèse', DECISION: 'Décision', ACTION: 'Action' }
const ROLE: Record<string, string> = { SUBJECT: 'Objectif', WITNESS: 'Témoin', ASSOCIATE: 'Associé', ASSET: 'Moyen' }

export default function CaseDetailPage({ user }: { user: User }) {
  const { id } = useParams()
  const [c, setC] = useState<CaseDetail | null>(null)
  const [g, setG] = useState<Graph>({ nodes: [], edges: [] })
  const [note, setNote] = useState(''); const [kind, setKind] = useState('NOTE')
  const [q, setQ] = useState(''); const [hits, setHits] = useState<Entity[]>([]); const [role, setRole] = useState('SUBJECT')
  const [err, setErr] = useState('')
  const load = () => get<CaseDetail>(`/api/cases/${id}`).then((d) => { setC(d); const ids = d.entities.filter((e) => e.entity).map((e) => e.entity_id); if (ids.length) get<Graph>(`/api/graph/expand?ids=${ids.join(',')}&depth=1&limit=150`).then(setG) }).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [id])
  if (err) return <div className="alert-msg">{err}</div>
  if (!c) return <div className="muted">Chargement…</div>
  const canEdit = user.role !== 'viewer'
  const addNote = async () => { if (!note.trim()) return; setC(await post(`/api/cases/${id}/notes`, { content: note, kind })); setNote('') }
  const search = async () => { setHits((await get<{ items: Entity[] }>(`/api/entities?q=${encodeURIComponent(q)}&limit=8`)).items) }
  const addEnt = async (eid: number) => { await post(`/api/cases/${id}/entities`, { entity_id: eid, role }); setHits([]); setQ(''); load() }
  const removeEnt = async (eid: number) => { await del(`/api/cases/${id}/entities/${eid}`); load() }
  const setStatus = async (status: string) => { await patch(`/api/cases/${id}`, { status }); load() }
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row"><div className="grow"><div className="row"><span className="mono muted">{c.reference}</span><ClassBadge level={c.classification} compartment={c.compartment} /><span className="chip">{c.priority}</span><span className={`chip st-${c.status}`}>{c.status}</span></div>
        <h1 style={{ marginTop: 6 }}>{c.title}</h1><div className="muted">{c.description}</div><div className="fine">Responsable : {c.owner} · ouvert le {fmtDate(c.created_at)}</div></div>
        {canEdit && <div className="row">{c.status !== 'IN_PROGRESS' && c.status !== 'CLOSED' && <button onClick={() => setStatus('IN_PROGRESS')}>Démarrer</button>}{c.status !== 'CLOSED' ? <button className="danger" onClick={() => setStatus('CLOSED')}>Clore</button> : <button onClick={() => setStatus('OPEN')}>Rouvrir</button>}
          <Link to={`/graph?ids=${c.entities.map((e) => e.entity_id).join(',')}`}><button className="primary">⬡ Graphe complet</button></Link></div>}
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="col">
          <div className="card"><h2>Entités du dossier ({c.entities.length})</h2>
            <table><tbody>{c.entities.map((ce) => <tr key={ce.id}><td>{ce.entity ? <TypeChip type={ce.entity.type} /> : <span className="muted">hors habilitation</span>}</td><td>{ce.entity ? <Link to={`/entities/${ce.entity.id}`}><b>{ce.entity.label}</b></Link> : '—'}</td><td className="small">{ROLE[ce.role] || ce.role}</td><td className="fine">{ce.added_by}</td>{canEdit && <td><button className="small danger" onClick={() => removeEnt(ce.entity_id)}>retirer</button></td>}</tr>)}</tbody></table>
            {canEdit && <div style={{ marginTop: 10 }}><div className="row"><input placeholder="Ajouter une entité…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} /><select style={{ width: 130 }} value={role} onChange={(e) => setRole(e.target.value)}>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><button onClick={search}>Chercher</button></div>
              {hits.map((h) => <div key={h.id} className="row small" style={{ marginTop: 4 }}><TypeChip type={h.type} /><span>{h.label}</span><button className="small right" onClick={() => addEnt(h.id)}>+ ajouter</button></div>)}</div>}
          </div>
          <div className="card"><h2>Journal d'analyse</h2>
            <div className="timeline">{c.notes.map((n) => <div key={n.id} className="item"><div className="row small"><span className="chip">{KIND[n.kind] || n.kind}</span><b>{n.author}</b><span className="muted">{fmtDate(n.created_at)}</span></div><div style={{ marginTop: 4 }}>{n.content}</div></div>)}{c.notes.length === 0 && <div className="muted">Aucune note.</div>}</div>
            {canEdit && <div className="col" style={{ marginTop: 12 }}><textarea rows={3} placeholder="Nouvelle entrée (hypothèse, décision, action, observation)…" value={note} onChange={(e) => setNote(e.target.value)} /><div className="row"><select style={{ width: 160 }} value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><button className="primary" onClick={addNote}>Consigner</button></div></div>}
          </div>
        </div>
        <div style={{ minHeight: 600 }}><GraphView graph={g} highlight={c.entities.map((e) => e.entity_id)} /></div>
      </div>
    </div>
  )
}
