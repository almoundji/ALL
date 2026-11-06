import { useEffect, useState } from 'react'
import { fmtDate, get } from '../lib/api'
import type { AuditEntry } from '../lib/types'

export default function Audit() {
  const [rows, setRows] = useState<AuditEntry[]>([]); const [user, setUser] = useState(''); const [action, setAction] = useState('')
  const [verify, setVerify] = useState<any>(null); const [err, setErr] = useState('')
  const load = () => get<AuditEntry[]>(`/api/audit?username=${user}&action=${action}&limit=300`).then(setRows).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row"><div className="grow"><h1>Journal d'audit</h1><div className="muted small">Chaîne de hachage SHA-256 : chaque entrée scelle la précédente. Toute altération a posteriori est détectable.</div></div>
        <button onClick={() => get('/api/audit/verify').then(setVerify)}>Vérifier l'intégrité</button></div>
      {verify && <div className={verify.valid ? 'ok-msg' : 'alert-msg'}>{verify.valid ? `Chaîne intègre : ${verify.checked} entrées vérifiées.` : `RUPTURE DE CHAÎNE à l'entrée #${verify.broken_at} (après ${verify.checked} entrées valides).`}</div>}
      {err && <div className="alert-msg">{err}</div>}
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}><input placeholder="Utilisateur" value={user} onChange={(e) => setUser(e.target.value)} style={{ width: 200 }} /><input placeholder="Action (ex. ENTITY_VIEW)" value={action} onChange={(e) => setAction(e.target.value.toUpperCase())} style={{ width: 240 }} /><button onClick={load}>Filtrer</button></div>
        <table><thead><tr><th>#</th><th>Horodatage</th><th>Utilisateur</th><th>Action</th><th>Ressource</th><th>Détails</th><th>IP</th><th>Hachage</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td className="mono">{r.id}</td><td className="small">{fmtDate(r.ts)}</td><td>{r.username}</td><td className="mono small">{r.action}</td><td className="small">{r.resource_type} {r.resource_id}</td><td className="fine mono">{JSON.stringify(r.details)}</td><td className="fine">{r.ip}</td><td className="fine mono" title={`précédent : ${r.prev_hash}`}>{r.hash.slice(0, 12)}…</td></tr>)}</tbody></table>
      </div>
    </div>
  )
}
