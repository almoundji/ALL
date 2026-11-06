import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ClassBadge, Confidence, TypeChip } from '../components/Badges'
import { fmtDate, get, TYPE_LABEL } from '../lib/api'
import type { Entity, Meta } from '../lib/types'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''; const type = params.get('type') || ''
  const [meta, setMeta] = useState<Meta | null>(null)
  const [res, setRes] = useState<{ total: number; items: Entity[] } | null>(null)
  const [local, setLocal] = useState(q)
  const nav = useNavigate()
  useEffect(() => { get<Meta>('/api/auth/meta').then(setMeta) }, [])
  useEffect(() => { setLocal(q); get<{ total: number; items: Entity[] }>(`/api/entities?q=${encodeURIComponent(q)}&type=${type}&limit=100`).then(setRes) }, [q, type])
  return (
    <div className="col">
      <h1>Recherche</h1>
      <div className="card row">
        <input className="grow" value={local} onChange={(e) => setLocal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setParams({ q: local, type })} placeholder="Nom, alias, numéro, plaque, IBAN, lieu, attribut…" />
        <select style={{ width: 200 }} value={type} onChange={(e) => setParams({ q: local, type: e.target.value })}>
          <option value="">Tous les types</option>{meta?.entity_types.map((t) => <option key={t} value={t}>{TYPE_LABEL[t] || t}</option>)}
        </select>
        <button className="primary" onClick={() => setParams({ q: local, type })}>Rechercher</button>
      </div>
      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }}>{res ? `${res.total} résultat(s)` : '…'}</h2>
          {res && res.items.length > 1 && <Link className="right" to={`/graph?ids=${res.items.slice(0, 8).map((e) => e.id).join(',')}`}>Ouvrir les 8 premiers dans le graphe →</Link>}</div>
        <table>
          <thead><tr><th>Type</th><th>Libellé</th><th>Attributs</th><th>Classif.</th><th>Confiance</th><th>Mis à jour</th></tr></thead>
          <tbody>
            {res?.items.map((e) => (
              <tr key={e.id} className="click" onClick={() => nav(`/entities/${e.id}`)}>
                <td><TypeChip type={e.type} /></td>
                <td><b>{e.label}</b></td>
                <td className="small muted">{Object.entries(e.attributes).filter(([k]) => !k.startsWith('_')).slice(0, 4).map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`).join(' · ')}</td>
                <td><ClassBadge level={e.classification} compartment={e.compartment} /></td>
                <td><Confidence value={e.confidence} /></td>
                <td className="small muted">{fmtDate(e.updated_at)}</td>
              </tr>
            ))}
            {res && res.items.length === 0 && <tr><td colSpan={6} className="muted">Aucun résultat dans votre périmètre d'habilitation.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
