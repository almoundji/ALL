import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, money, post, type Player } from '../lib/api'
import { t, useLang } from '../lib/i18n'

/** List Report « Joueurs » (S1-5) avec création : identifiant externe, nom, date de naissance (18 ans minimum). */
export default function Players() {
  const [l] = useLang()
  const [rows, setRows] = useState<Player[]>([])
  const [form, setForm] = useState({ external_id: '', display_name: '', birth_date: '' })
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const load = () => api<Player[]>('/api/players').then(setRows).catch(() => setRows([]))
  useEffect(() => { load() }, [])
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    try { await post('/api/players', form); setForm({ external_id: '', display_name: '', birth_date: '' }); setOpen(false); load() } catch (ex: any) { setErr(ex.message) }
  }
  return (
    <>
      <div className="hello"><h1>{t(l, 'Joueurs', 'Players')}</h1><span className="muted">{rows.length} {t(l, 'compte(s) rattaché(s)', 'linked account(s)')}</span></div>
      {open && (
        <form className="filterbar" style={{ marginTop: 16 }} onSubmit={submit}>
          <label>{t(l, 'Identifiant chez l’opérateur', 'Operator-side ID')}<input required value={form.external_id} onChange={(e) => setForm({ ...form, external_id: e.target.value })} /></label>
          <label>{t(l, 'Nom affiché', 'Display name')}<input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></label>
          <label>{t(l, 'Date de naissance', 'Birth date')}<input type="date" required value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></label>
          <button className="primary" type="submit">{t(l, 'Créer', 'Create')}</button>
          <button type="button" className="ghost" onClick={() => setOpen(false)}>{t(l, 'Annuler', 'Cancel')}</button>
          {err && <span className="status neg">{err}</span>}
        </form>
      )}
      <div className="table-wrap" style={{ marginTop: open ? 0 : 16 }}>
        <table>
          <thead><tr><th>{t(l, 'Joueur', 'Player')}</th><th>{t(l, 'Identifiant externe', 'External ID')}</th><th>{t(l, 'Naissance', 'Birth date')}</th><th>{t(l, 'Statut', 'Status')}</th><th className="num">{t(l, 'Solde', 'Balance')}</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5}><div className="message"><div className="big">◉</div><h3>{t(l, 'Aucun joueur', 'No players')}</h3><div>{t(l, 'Créez le premier joueur avec le bouton en bas à droite.', 'Create the first player with the button at bottom right.')}</div></div></td></tr>}
            {rows.map((p) => (
              <tr key={p.id}>
                <td data-label="Joueur"><Link to={`/m/players/${p.id}`} style={{ fontWeight: 600, color: 'var(--brand)' }}>{p.display_name || p.external_id}</Link></td>
                <td data-label="Identifiant" className="mono">{p.external_id}</td>
                <td data-label="Naissance">{p.birth_date}</td>
                <td data-label="Statut"><span className={`status ${p.status === 'active' ? 'ok' : 'neg'}`}>{p.status}</span></td>
                <td data-label="Solde" className="num mono">{money(p.balance_minor, p.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!open && <button className="primary fab" onClick={() => setOpen(true)}>+ {t(l, 'Nouveau joueur', 'New player')}</button>}
    </>
  )
}
