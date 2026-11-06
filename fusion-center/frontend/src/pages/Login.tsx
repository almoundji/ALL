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
      <header className="header"><div className="header-inner"><div className="header-logo"><img src="/embleme.svg" alt="" /><div><div className="t1">République du Sénégal</div><div className="t2">Centre de Fusion National · Renseignement</div></div></div><span className="pill right">FR ▾</span></div><div className="tricolor" /></header>
      <div className="login-body">
        <form className="card col" onSubmit={submit} style={{ gap: 14 }}>
          <div><h1 style={{ fontSize: 22 }}>Accès sécurisé</h1><div className="muted">Réservé aux personnels habilités. Toute connexion est journalisée.</div></div>
          <label className="col" style={{ gap: 4 }}><span className="fine">IDENTIFIANT</span><input value={u} onChange={(e) => setU(e.target.value)} autoFocus /></label>
          <label className="col" style={{ gap: 4 }}><span className="fine">MOT DE PASSE</span><input type="password" value={p} onChange={(e) => setP(e.target.value)} /></label>
          {err && <div className="alert-msg">{err}</div>}
          <button className="primary" disabled={busy}>Se connecter</button>
          <div className="fine">Démonstration : admin / admin123 (SD) · analyste / analyste123 (CD, OPS+FIN) · officier / officier123 (DR) · lecteur / lecteur123 (NP)</div>
        </form>
      </div>
      <footer className="footer"><span><b>Centre de Fusion National</b> · Direction du Renseignement National</span><span>Usage réservé aux personnels habilités</span></footer>
    </div>
  )
}
