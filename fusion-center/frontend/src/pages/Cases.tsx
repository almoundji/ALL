import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClassBadge } from '../components/Badges'
import { CLASS_LABEL, fmtDate, get, post } from '../lib/api'
import type { Case, User } from '../lib/types'

const STATUS: Record<string, string> = { OPEN: 'Ouvert', IN_PROGRESS: 'En cours', CLOSED: 'Clos' }

export default function Cases({ user }: { user: User }) {
  const [cases, setCases] = useState<Case[]>([])
  const [form, setForm] = useState({ title: '', description: '', priority: 'P2', classification: Math.min(2, user.clearance), compartment: '' })
  const [err, setErr] = useState('')
  const nav = useNavigate()
  const load = () => get<Case[]>('/api/cases').then(setCases)
  useEffect(() => { load() }, [])
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    try { const c = await post<Case>('/api/cases', { ...form, compartment: form.compartment || null }); nav(`/cases/${c.id}`) } catch (x: any) { setErr(x.message) }
  }
  return (
    <div className="col" style={{ gap: 14 }}>
      <h1>Dossiers d'enquête</h1>
      <div className="grid" style={{ gridTemplateColumns: '1fr 340px' }}>
        <div className="card">
          <table><thead><tr><th>Référence</th><th>Titre</th><th>Statut</th><th>Priorité</th><th>Classif.</th><th>Entités</th><th>Responsable</th><th>Mis à jour</th></tr></thead>
            <tbody>{cases.map((c) => <tr key={c.id} className="click" onClick={() => nav(`/cases/${c.id}`)}><td className="mono">{c.reference}</td><td><b>{c.title}</b></td><td className={`st-${c.status}`}>{STATUS[c.status]}</td><td className="mono">{c.priority}</td><td><ClassBadge level={c.classification} compartment={c.compartment} /></td><td className="mono">{c.entity_count}</td><td>{c.owner}</td><td className="small muted">{fmtDate(c.updated_at)}</td></tr>)}
              {cases.length === 0 && <tr><td colSpan={8} className="muted">Aucun dossier accessible.</td></tr>}</tbody></table>
        </div>
        {user.role !== 'viewer' && <form className="card col" onSubmit={submit}><h2>Nouveau dossier</h2>
          <input placeholder="Titre" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Description / objet" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="row"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{['P0', 'P1', 'P2', 'P3'].map((p) => <option key={p}>{p}</option>)}</select>
            <select value={form.classification} onChange={(e) => setForm({ ...form, classification: Number(e.target.value) })}>{CLASS_LABEL.slice(0, user.clearance + 1).map((l, i) => <option key={i} value={i}>{l}</option>)}</select></div>
          <input placeholder="Compartiment (optionnel, ex. OPS)" value={form.compartment} onChange={(e) => setForm({ ...form, compartment: e.target.value.toUpperCase() })} />
          {err && <div className="alert-msg">{err}</div>}
          <button className="primary">Créer</button></form>}
      </div>
    </div>
  )
}
