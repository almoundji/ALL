import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, login } from '../lib/api'
import type { User } from '../lib/types'

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { await login(u, p); onLogin(await get<User>('/api/auth/me')); nav('/') } catch { setErr('Identifiants incorrects ou compte désactivé.') } finally { setBusy(false) }
  }
  return (
    <div className="login">
      <form className="card col" onSubmit={submit}>
        <div><div style={{ fontSize: 22, fontWeight: 700 }}>◈ Centre de Fusion National</div><div className="muted">Accès réservé aux personnels habilités. Toute connexion est journalisée.</div></div>
        <input placeholder="Identifiant" value={u} onChange={(e) => setU(e.target.value)} autoFocus />
        <input placeholder="Mot de passe" type="password" value={p} onChange={(e) => setP(e.target.value)} />
        {err && <div className="alert-msg">{err}</div>}
        <button className="primary" disabled={busy}>Se connecter</button>
        <div className="fine">Comptes de démonstration : admin / admin123 (SD) · analyste / analyste123 (CD, OPS+FIN) · officier / officier123 (DR) · lecteur / lecteur123 (NP)</div>
      </form>
    </div>
  )
}
