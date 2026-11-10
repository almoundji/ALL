import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setApiKey, type Health, type Operator } from '../lib/api'
import { t, useLang } from '../lib/i18n'

const DEMO_KEY = 'yk_demo-operator-key-change-me'

/** Connexion opérateur par clé d'API (S1-2). La clé de démonstration n'est proposée qu'en dehors de la production. */
export default function Login() {
  const [l] = useLang()
  const nav = useNavigate()
  const [key, setKey] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [env, setEnv] = useState<string>('')
  useEffect(() => { api<Health>('/api/health').then((h) => setEnv(h.environment)).catch(() => setEnv('')) }, [])
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    setApiKey(key.trim())
    try { await api<Operator>('/api/operators/me'); nav('/') } catch (ex: any) { setApiKey(null); setErr(ex.message) }
  }
  return (
    <div style={{ maxWidth: 480, margin: '48px auto' }}>
      <div className="section">
        <div className="overline" style={{ marginTop: 0 }}>{t(l, 'Espace opérateur', 'Operator area')}</div>
        <h1 style={{ marginBottom: 6 }}>{t(l, 'Connexion', 'Sign in')}</h1>
        <p className="muted">{t(l, 'Saisissez la clé d’API remise à la création de votre compte opérateur. Elle n’est jamais affichée deux fois.',
          'Enter the API key issued when your operator account was created. It is never shown twice.')}</p>
        <form onSubmit={submit} className="col" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t(l, 'Clé d’API', 'API key')}
            <input className="mono" value={key} onChange={(e) => setKey(e.target.value)} placeholder="yk_…" autoFocus required />
          </label>
          {err && <div className="status neg">{err}</div>}
          <button className="primary" type="submit">{t(l, 'Se connecter', 'Sign in')}</button>
        </form>
        {env && env !== 'production' && (
          <p className="muted small" style={{ marginTop: 18, fontSize: 12 }}>{t(l, 'Environnement de démonstration', 'Demo environment')} ({env}) — <button className="ghost" style={{ padding: 0, fontWeight: 600, color: 'var(--brand)' }} onClick={() => setKey(DEMO_KEY)}>{t(l, 'utiliser la clé de l’opérateur démo', 'use the demo operator key')}</button></p>
        )}
      </div>
    </div>
  )
}
