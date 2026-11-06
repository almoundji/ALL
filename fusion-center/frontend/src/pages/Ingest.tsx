import { useEffect, useState } from 'react'
import { ClassBadge } from '../components/Badges'
import { CLASS_LABEL, fmtDate, get, post } from '../lib/api'
import type { IngestJob, Meta, Source, User } from '../lib/types'

export default function Ingest({ user }: { user: User }) {
  const [sources, setSources] = useState<Source[]>([]); const [jobs, setJobs] = useState<IngestJob[]>([]); const [templates, setTemplates] = useState<Record<string, any>>({}); const [meta, setMeta] = useState<Meta | null>(null)
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState<any>(null)
  const [sourceId, setSourceId] = useState(''); const [mapping, setMapping] = useState(''); const [cls, setCls] = useState(1); const [comp, setComp] = useState('')
  const [newSrc, setNewSrc] = useState({ name: '', type: 'CSV', reliability: 'C', description: '' })
  const [result, setResult] = useState<IngestJob | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const load = () => { get<Source[]>('/api/ingest/sources').then(setSources); get<IngestJob[]>('/api/ingest/jobs').then(setJobs) }
  useEffect(() => { load(); get('/api/ingest/templates').then((t: any) => setTemplates(t)); get<Meta>('/api/auth/meta').then(setMeta) }, [])
  const onFile = async (f: File | null) => {
    setFile(f); setPreview(null); setResult(null); if (!f) return
    const fd = new FormData(); fd.append('file', f)
    try { setPreview(await post('/api/ingest/preview', fd)) } catch (e: any) { setErr(e.message) }
  }
  const createSource = async () => { try { const s = await post<Source>('/api/ingest/sources', newSrc); setSourceId(String(s.id)); setNewSrc({ name: '', type: 'CSV', reliability: 'C', description: '' }); load() } catch (e: any) { setErr(e.message) } }
  const run = async () => {
    if (!file || !sourceId || !mapping) return
    setBusy(true); setErr(''); setResult(null)
    try { JSON.parse(mapping) } catch { setErr('Le mapping JSON est invalide.'); setBusy(false); return }
    const fd = new FormData(); fd.append('file', file); fd.append('source_id', sourceId); fd.append('mapping', mapping); fd.append('classification', String(cls)); if (comp) fd.append('compartment', comp)
    try { setResult(await post<IngestJob>('/api/ingest/upload', fd)); load() } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const canWrite = user.role !== 'viewer'
  return (
    <div className="col" style={{ gap: 14 }}>
      <div><h1>Ingestion de données</h1><div className="muted small">Fichiers CSV / JSON → entités et relations, avec résolution d'identité automatique, provenance et évaluation des règles de veille.</div></div>
      {err && <div className="alert-msg">{err}</div>}
      {canWrite && <div className="grid grid-3">
        <div className="card col"><h2>1. Source</h2>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}><option value="">Choisir une source…</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.type}, fiabilité {s.reliability})</option>)}</select>
          <div className="fine">ou créer :</div>
          <input placeholder="Nom de la source" value={newSrc.name} onChange={(e) => setNewSrc({ ...newSrc, name: e.target.value })} />
          <div className="row"><select value={newSrc.type} onChange={(e) => setNewSrc({ ...newSrc, type: e.target.value })}>{meta?.source_types.map((t) => <option key={t}>{t}</option>)}</select>
            <select value={newSrc.reliability} onChange={(e) => setNewSrc({ ...newSrc, reliability: e.target.value })} title="Fiabilité de la source (A fiable … F inconnue)">{['A', 'B', 'C', 'D', 'E', 'F'].map((r) => <option key={r}>{r}</option>)}</select></div>
          <button className="small" disabled={!newSrc.name} onClick={createSource}>Créer la source</button>
          <h2 style={{ marginTop: 8 }}>2. Fichier</h2>
          <input type="file" accept=".csv,.json,.txt" onChange={(e) => onFile(e.target.files?.[0] || null)} />
          {preview && <div className="small"><b>{preview.total}</b> lignes · colonnes : <span className="mono">{preview.columns.join(', ')}</span></div>}
          <h2 style={{ marginTop: 8 }}>3. Protection</h2>
          <div className="row"><select value={cls} onChange={(e) => setCls(Number(e.target.value))}>{CLASS_LABEL.slice(0, user.clearance + 1).map((l, i) => <option key={i} value={i}>{l}</option>)}</select><input placeholder="Compartiment" value={comp} onChange={(e) => setComp(e.target.value.toUpperCase())} style={{ width: 140 }} /></div>
        </div>
        <div className="card col" style={{ gridColumn: 'span 2' }}><h2>4. Mapping colonnes → ontologie</h2>
          <div className="row">{Object.entries(templates).map(([k, t]) => <button key={k} className="small" title={t.description} onClick={() => setMapping(JSON.stringify(t.mapping, null, 2))}>{k}</button>)}</div>
          <textarea className="code" value={mapping} onChange={(e) => setMapping(e.target.value)} placeholder='{"entities": [{"ref": "p", "type": "PERSON", "label": "{prenom} {nom}", "attributes": {"birth_date": "{naissance}"}}], "relations": [...]}' />
          {preview && preview.rows.length > 0 && <div style={{ overflow: 'auto', maxHeight: 160 }}><table><thead><tr>{preview.columns.map((c: string) => <th key={c}>{c}</th>)}</tr></thead><tbody>{preview.rows.slice(0, 5).map((r: any, i: number) => <tr key={i}>{preview.columns.map((c: string) => <td key={c} className="small">{String(r[c] ?? '')}</td>)}</tr>)}</tbody></table></div>}
          <button className="primary" disabled={!file || !sourceId || !mapping || busy} onClick={run}>{busy ? 'Traitement…' : 'Lancer l’ingestion'}</button>
          {result && <div className={result.status === 'DONE' ? 'ok-msg' : 'alert-msg'}><b>{result.status}</b> — {result.rows_total} lignes · {result.entities_created} entités créées · {result.entities_merged} fusionnées avec l'existant · {result.relations_created} relations · {result.alerts_raised} alerte(s) levée(s){result.errors.length > 0 && <ul>{result.errors.slice(0, 5).map((e, i) => <li key={i} className="small">{e}</li>)}</ul>}</div>}
        </div>
      </div>}
      <div className="card"><h2>Historique des ingestions</h2>
        <table><thead><tr><th>Date</th><th>Fichier</th><th>Source</th><th>Lignes</th><th>Créées</th><th>Fusionnées</th><th>Relations</th><th>Alertes</th><th>Statut</th><th>Par</th></tr></thead>
          <tbody>{jobs.map((j) => <tr key={j.id}><td className="small">{fmtDate(j.created_at)}</td><td>{j.filename}</td><td>{sources.find((s) => s.id === j.source_id)?.name || j.source_id}</td><td className="mono">{j.rows_total}</td><td className="mono">{j.entities_created}</td><td className="mono">{j.entities_merged}</td><td className="mono">{j.relations_created}</td><td className="mono">{j.alerts_raised}</td><td className={j.status === 'DONE' ? 'st-ACK' : 'st-NEW'}>{j.status}</td><td>{j.started_by}</td></tr>)}{jobs.length === 0 && <tr><td colSpan={10} className="muted">Aucune ingestion.</td></tr>}</tbody></table>
      </div>
      <div className="card"><h2>Sources référencées</h2><div className="row">{sources.map((s) => <span key={s.id} className="chip">{s.name} · {s.type} · {s.reliability} <ClassBadge level={s.classification} /></span>)}</div></div>
    </div>
  )
}
