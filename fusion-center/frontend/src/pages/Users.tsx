import { FormEvent, useEffect, useState } from 'react'
import { ClassBadge } from '../components/Badges'
import { CLASS_LABEL, get, patch, post } from '../lib/api'
import type { User } from '../lib/types'

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'analyst', clearance: 1, compartments: '', unit: '' })
  const [err, setErr] = useState('')
  const load = () => get<User[]>('/api/users').then(setUsers)
  useEffect(() => { load() }, [])
  const create = async (e: FormEvent) => { e.preventDefault(); setErr(''); try { await post('/api/users', form); setForm({ ...form, username: '', password: '', full_name: '' }); load() } catch (x: any) { setErr(x.message) } }
  const upd = async (id: number, body: any) => { await patch(`/api/users/${id}`, body); load() }
  return (
    <div className="col" style={{ gap: 14 }}>
      <h1>Utilisateurs & habilitations</h1>
      <div className="grid" style={{ gridTemplateColumns: '1fr 360px' }}>
        <div className="card"><table><thead><tr><th>Identifiant</th><th>Nom</th><th>Unité</th><th>Rôle</th><th>Habilitation</th><th>Compartiments</th><th>Actif</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td className="mono">{u.username}</td><td>{u.full_name}</td><td className="small">{u.unit}</td>
            <td><select value={u.role} onChange={(e) => upd(u.id, { role: e.target.value })} style={{ width: 110 }}>{['admin', 'analyst', 'viewer'].map((r) => <option key={r}>{r}</option>)}</select></td>
            <td><div className="row"><ClassBadge level={u.clearance} /><select value={u.clearance} onChange={(e) => upd(u.id, { clearance: Number(e.target.value) })} style={{ width: 60 }}>{[0, 1, 2, 3].map((c) => <option key={c} value={c}>{c}</option>)}</select></div></td>
            <td><input defaultValue={u.compartments} onBlur={(e) => e.target.value !== u.compartments && upd(u.id, { compartments: e.target.value.toUpperCase() })} style={{ width: 140 }} /></td>
            <td><button className="small" onClick={() => upd(u.id, { is_active: !u.is_active })}>{u.is_active ? 'oui' : 'non'}</button></td></tr>)}</tbody></table></div>
        <form className="card col" onSubmit={create}><h2>Nouvel utilisateur</h2>
          <input placeholder="Identifiant" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input placeholder="Mot de passe (8+ caractères)" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input placeholder="Nom complet" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input placeholder="Unité / service" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <div className="row"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{['admin', 'analyst', 'viewer'].map((r) => <option key={r}>{r}</option>)}</select>
            <select value={form.clearance} onChange={(e) => setForm({ ...form, clearance: Number(e.target.value) })}>{CLASS_LABEL.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></div>
          <input placeholder="Compartiments (ex. OPS,FIN)" value={form.compartments} onChange={(e) => setForm({ ...form, compartments: e.target.value.toUpperCase() })} />
          {err && <div className="alert-msg">{err}</div>}
          <button className="primary">Créer</button>
        </form>
      </div>
    </div>
  )
}
