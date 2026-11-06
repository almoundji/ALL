import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { del, fmtDate, get, patch, post, TYPE_LABEL } from '../lib/api'
import type { Alert, Meta, User, Watchlist } from '../lib/types'

export default function Alerts({ user }: { user: User }) {
  const [tab, setTab] = useState('NEW')
  const [alerts, setAlerts] = useState<Alert[]>([]); const [wls, setWls] = useState<Watchlist[]>([]); const [meta, setMeta] = useState<Meta | null>(null)
  const [form, setForm] = useState({ name: '', entity_type: '', field: 'label', operator: 'contains', value: '', severity: 'MEDIUM' })
  const [msg, setMsg] = useState('')
  const load = () => { get<Alert[]>('/api/alerts').then(setAlerts); get<Watchlist[]>('/api/watchlists').then(setWls) }
  useEffect(() => { load(); get<Meta>('/api/auth/meta').then(setMeta) }, [])
  const upd = async (id: number, body: any) => { await patch(`/api/alerts/${id}`, body); load() }
  const create = async (e: FormEvent) => { e.preventDefault(); const w = await post<Watchlist>('/api/watchlists', { ...form, entity_type: form.entity_type || null }); setMsg(`Règle « ${w.name} » créée et évaluée sur l'existant.`); setForm({ ...form, name: '', value: '' }); load() }
  const canWrite = user.role !== 'viewer'
  const shown = alerts.filter((a) => a.status === tab)
  return (
    <div className="col" style={{ gap: 14 }}>
      <h1>Alertes & veille</h1>
      <div className="grid" style={{ gridTemplateColumns: '1fr 380px' }}>
        <div className="card">
          <div className="tabs">{[['NEW', 'Nouvelles'], ['ACK', 'Prises en compte'], ['CLOSED', 'Closes']].map(([k, l]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l} ({alerts.filter((a) => a.status === k).length})</button>)}</div>
          <table><thead><tr><th>Sévérité</th><th>Alerte</th><th>Date</th><th>Assignée</th>{canWrite && <th></th>}</tr></thead>
            <tbody>{shown.map((a) => <tr key={a.id}><td><b className={`sev-${a.severity}`}>{a.severity}</b></td><td><b>{a.title}</b><div className="small muted">{a.message}</div>{a.entity_id && <Link className="small" to={`/entities/${a.entity_id}`}>Voir l'entité →</Link>}</td><td className="small">{fmtDate(a.created_at)}</td><td className="small">{a.assigned_to || '—'}</td>
              {canWrite && <td><div className="row">{a.status === 'NEW' && <button className="small" onClick={() => upd(a.id, { status: 'ACK', assigned_to: user.username })}>Prendre</button>}{a.status !== 'CLOSED' && <button className="small" onClick={() => upd(a.id, { status: 'CLOSED' })}>Clore</button>}</div></td>}</tr>)}
              {shown.length === 0 && <tr><td colSpan={5} className="muted">Aucune alerte dans cet état.</td></tr>}</tbody></table>
        </div>
        <div className="col">
          {canWrite && <form className="card col" onSubmit={create}><h2>Nouvelle règle de veille</h2>
            <input placeholder="Nom de la règle" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value })}><option value="">Tout type</option>{meta?.entity_types.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select>
            <div className="row"><input placeholder="Champ (label ou attributes.cle)" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} /><select style={{ width: 120 }} value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })}>{['contains', 'equals', 'fuzzy', 'regex'].map((o) => <option key={o}>{o}</option>)}</select></div>
            <input placeholder="Valeur recherchée" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s}>{s}</option>)}</select>
            <button className="primary">Créer et évaluer</button>{msg && <div className="ok-msg small">{msg}</div>}</form>}
          <div className="card"><h2>Règles actives ({wls.filter((w) => w.is_active).length}/{wls.length})</h2>
            <div className="col" style={{ gap: 6 }}>{wls.map((w) => <div key={w.id} className="small" style={{ opacity: w.is_active ? 1 : .5 }}><div className="row"><b>{w.name}</b><span className={`sev-${w.severity}`}>{w.severity}</span>{canWrite && <button className="small right" onClick={async () => { await patch(`/api/watchlists/${w.id}/toggle`, {}); load() }}>{w.is_active ? 'désactiver' : 'activer'}</button>}{user.role === 'admin' && <button className="small danger" onClick={async () => { await del(`/api/watchlists/${w.id}`); load() }}>×</button>}</div><div className="fine mono">{w.entity_type || '*'} · {w.field} {w.operator} "{w.value}"</div></div>)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
