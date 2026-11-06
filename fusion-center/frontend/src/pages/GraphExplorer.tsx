import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClassBadge, TypeChip } from '../components/Badges'
import GraphView from '../components/GraphView'
import { get, TYPE_LABEL } from '../lib/api'
import type { Entity, Graph } from '../lib/types'

export default function GraphExplorer() {
  const [params, setParams] = useSearchParams()
  const ids = params.get('ids') || ''
  const [depth, setDepth] = useState(1)
  const [g, setG] = useState<Graph>({ nodes: [], edges: [] })
  const [sel, setSel] = useState<number | null>(null)
  const [q, setQ] = useState(''); const [hits, setHits] = useState<Entity[]>([])
  const [pathA, setPathA] = useState<number | null>(null); const [pathB, setPathB] = useState<number | null>(null); const [path, setPath] = useState<number[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    if (!ids) { setG({ nodes: [], edges: [] }); return }
    get<Graph>(`/api/graph/expand?ids=${ids}&depth=${depth}`).then((x) => { setG(x); setErr('') }).catch((e) => setErr(e.message))
  }, [ids, depth])
  useEffect(() => { get('/api/graph/analytics?top=8').then(setAnalytics).catch(() => undefined) }, [])
  const search = async () => { if (!q.trim()) return; setHits((await get<{ items: Entity[] }>(`/api/entities?q=${encodeURIComponent(q)}&limit=12`)).items) }
  const addRoot = (id: number) => { const set = new Set(ids.split(',').filter(Boolean).map(Number)); set.add(id); setParams({ ids: [...set].join(',') }) }
  const expand = async (id: number) => {
    const more = await get<Graph>(`/api/graph/expand?ids=${id}&depth=1`)
    const nodeIds = new Set(g.nodes.map((n) => n.id)); const edgeIds = new Set(g.edges.map((e) => e.id))
    setG({ nodes: [...g.nodes, ...more.nodes.filter((n) => !nodeIds.has(n.id))], edges: [...g.edges, ...more.edges.filter((e) => !edgeIds.has(e.id))] })
  }
  const findPath = async () => {
    if (!pathA || !pathB) return
    const r = await get<any>(`/api/graph/path?a=${pathA}&b=${pathB}`)
    if (!r.found) { setErr('Aucun chemin accessible entre ces deux entités (dans votre périmètre).'); setPath([]); return }
    setErr(''); setPath(r.path)
    const nodeIds = new Set(g.nodes.map((n) => n.id)); const edgeIds = new Set(g.edges.map((e) => e.id))
    setG({ nodes: [...g.nodes, ...r.graph.nodes.filter((n: Entity) => !nodeIds.has(n.id))], edges: [...g.edges, ...r.graph.edges.filter((e: any) => !edgeIds.has(e.id))] })
  }
  const selected = g.nodes.find((n) => n.id === sel)
  return (
    <div className="col" style={{ height: 'calc(100% - 60px)' }}>
      <div className="row"><div className="grow"><h1>Analyse de liens</h1><div className="muted small">Double-clic sur un nœud : étendre d'un cran. Clic : détails. Les objets hors habilitation n'apparaissent jamais.</div></div>
        <label className="row small">Profondeur <select style={{ width: 70 }} value={depth} onChange={(e) => setDepth(Number(e.target.value))}>{[1, 2, 3].map((d) => <option key={d}>{d}</option>)}</select></label>
        <span className="chip">{g.nodes.length} nœuds · {g.edges.length} liens</span>
        <button className="small" onClick={() => { setParams({}); setPath([]); setSel(null) }}>Vider</button></div>
      {err && <div className="alert-msg">{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, flex: 1, minHeight: 540 }}>
        <GraphView graph={g} highlight={path} selected={sel} onSelect={setSel} onExpand={expand} />
        <div className="col" style={{ overflow: 'auto' }}>
          <div className="card"><h2>Ajouter une racine</h2>
            <div className="row"><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Rechercher…" /><button onClick={search}>OK</button></div>
            <div className="col" style={{ gap: 3, marginTop: 6, maxHeight: 180, overflow: 'auto' }}>{hits.map((h) => <div key={h.id} className="row small"><a href="#" onClick={(e) => { e.preventDefault(); addRoot(h.id) }}>{h.label}</a><span className="fine">{TYPE_LABEL[h.type]}</span></div>)}</div>
          </div>
          {selected && <div className="card"><h2>Sélection</h2><div className="row"><TypeChip type={selected.type} /><ClassBadge level={selected.classification} compartment={selected.compartment} /></div><h3 style={{ marginTop: 8 }}>{selected.label}</h3>
            <dl className="kv small">{Object.entries(selected.attributes).filter(([k]) => k !== '_variants').slice(0, 6).map(([k, v]) => <><dt key={k}>{k}</dt><dd key={k + 'v'}>{String(v)}</dd></>)}</dl>
            <div className="row" style={{ marginTop: 8 }}><Link to={`/entities/${selected.id}`}><button className="small">Fiche</button></Link><button className="small" onClick={() => expand(selected.id)}>Étendre</button><button className="small" onClick={() => setPathA(selected.id)}>Chemin : A</button><button className="small" onClick={() => setPathB(selected.id)}>Chemin : B</button></div></div>}
          <div className="card"><h2>Plus court chemin</h2>
            <div className="small">A : {g.nodes.find((n) => n.id === pathA)?.label || <span className="muted">—</span>}</div>
            <div className="small">B : {g.nodes.find((n) => n.id === pathB)?.label || <span className="muted">—</span>}</div>
            <button className="small" style={{ marginTop: 6 }} disabled={!pathA || !pathB} onClick={findPath}>Calculer</button>
            {path.length > 0 && <div className="fine" style={{ marginTop: 6 }}>{path.length - 1} saut(s) : {path.map((p) => g.nodes.find((n) => n.id === p)?.label).join(' → ')}</div>}
          </div>
          {analytics && <div className="card"><h2>Analytique globale</h2><div className="fine">{analytics.nodes} nœuds, {analytics.edges} liens, {analytics.communities?.length} communautés détectées.</div>
            <h3 style={{ marginTop: 8 }}>Intermédiaires clés</h3>{analytics.betweenness.map((n: any) => <div key={n.id} className="row small"><a href="#" onClick={(e) => { e.preventDefault(); addRoot(n.id) }}>{n.label}</a><span className="mono right">{n.score}</span></div>)}
            <h3 style={{ marginTop: 8 }}>Communautés</h3>{analytics.communities.slice(0, 5).map((c: any) => <div key={c.id} className="small" style={{ marginBottom: 4 }}><span className="chip">#{c.id + 1} · {c.size}</span> <span className="fine">{c.members.slice(0, 4).map((m: any) => m.label).join(', ')}…</span> <a href="#" onClick={(e) => { e.preventDefault(); setParams({ ids: c.members.slice(0, 6).map((m: any) => m.id).join(',') }) }}>voir</a></div>)}</div>}
        </div>
      </div>
    </div>
  )
}
