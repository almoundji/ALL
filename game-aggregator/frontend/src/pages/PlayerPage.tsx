import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, idem, money, post, type Ledger, type Player } from '../lib/api'
import { t, useLang } from '../lib/i18n'

/** Object Page « Joueur » : solde, crédit / débit idempotent (S1-6), grand livre. */
export default function PlayerPage() {
  const [l] = useLang()
  const { id } = useParams()
  const [p, setP] = useState<Player | null>(null)
  const [ledger, setLedger] = useState<Ledger[]>([])
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<'credit' | 'debit'>('credit')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const load = () => { api<Player>(`/api/players/${id}`).then(setP); api<Ledger[]>(`/api/wallet/players/${id}/ledger`).then(setLedger) }
  useEffect(load, [id])
  if (!p) return <div className="message">…</div>
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null)
    const n = Number(amount)
    if (!Number.isInteger(n) || n <= 0) { setMsg({ ok: false, text: t(l, 'Montant entier positif en unités mineures', 'Positive integer amount in minor units') }); return }
    try {
      const r = await post<Ledger & { replayed: boolean }>('/api/wallet/transactions', { player_id: p.id, kind, amount_minor: n, idempotency_key: idem(), reference: 'backoffice' })
      setMsg({ ok: true, text: `${t(l, 'Écriture', 'Entry')} #${r.id} · ${t(l, 'solde', 'balance')} ${money(r.balance_after_minor, r.currency)}` }); setAmount(''); load()
    } catch (ex: any) { setMsg({ ok: false, text: ex.message }) }
  }
  const sections = [t(l, 'Général', 'General'), t(l, 'Portefeuille', 'Wallet'), t(l, 'Grand livre', 'Ledger')]
  return (
    <>
      <div className="object-head">
        <div>
          <div className="muted" style={{ fontSize: 12 }}>{t(l, 'Joueur', 'Player')} · <span className="mono">{p.external_id}</span></div>
          <h1>{p.display_name || p.external_id}</h1>
          <div style={{ marginTop: 8 }}><span className={`status ${p.status === 'active' ? 'ok' : 'neg'}`}>{p.status}</span></div>
        </div>
        <div className="kpis">
          <div className="kpi"><div className="v num">{money(p.balance_minor, p.currency)}</div><div className="l">{t(l, 'Solde', 'Balance')}</div></div>
          <div className="kpi"><div className="v num">{ledger.length}</div><div className="l">{t(l, 'Écritures', 'Entries')}</div></div>
        </div>
      </div>
      <nav className="anchors">{sections.map((s, i) => <a key={s} href={`#s${i}`} className={i === 0 ? 'active' : ''}>{s}</a>)}</nav>
      <section id="s0" className="section"><h2>{sections[0]}</h2>
        <div className="fields">
          <div className="field"><div className="l">{t(l, 'Date de naissance', 'Birth date')}</div><div className="v">{p.birth_date}</div></div>
          <div className="field"><div className="l">{t(l, 'Devise', 'Currency')}</div><div className="v">{p.currency}</div></div>
          <div className="field"><div className="l">{t(l, 'Créé le', 'Created')}</div><div className="v">{new Date(p.created_at).toLocaleString()}</div></div>
        </div>
      </section>
      <section id="s1" className="section"><h2>{sections[1]}</h2>
        <form className="filterbar" style={{ margin: 0 }} onSubmit={submit}>
          <label>{t(l, 'Opération', 'Operation')}<select value={kind} onChange={(e) => setKind(e.target.value as 'credit' | 'debit')}><option value="credit">{t(l, 'Crédit (dépôt)', 'Credit (deposit)')}</option><option value="debit">{t(l, 'Débit (retrait)', 'Debit (withdrawal)')}</option></select></label>
          <label>{t(l, 'Montant', 'Amount')} ({p.currency})<input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" /></label>
          <button className="primary" type="submit">{t(l, 'Enregistrer', 'Post')}</button>
          {msg && <span className={`status ${msg.ok ? 'ok' : 'neg'}`}>{msg.text}</span>}
        </form>
        <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>{t(l, 'Chaque écriture porte une clé d’idempotence : rejouer la même requête ne débite pas deux fois.', 'Every entry carries an idempotency key: replaying the same request never debits twice.')}</p>
      </section>
      <section id="s2" className="section"><h2>{sections[2]}</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>#</th><th>{t(l, 'Date', 'Date')}</th><th>{t(l, 'Type', 'Type')}</th><th className="num">{t(l, 'Montant', 'Amount')}</th><th className="num">{t(l, 'Solde après', 'Balance after')}</th><th>{t(l, 'Référence', 'Reference')}</th></tr></thead>
          <tbody>
            {ledger.length === 0 && <tr><td colSpan={6} className="muted">{t(l, 'Aucune écriture', 'No entries')}</td></tr>}
            {ledger.map((e) => (
              <tr key={e.id}><td data-label="#" className="mono">{e.id}</td><td data-label="Date">{new Date(e.created_at).toLocaleString()}</td><td data-label="Type">{e.kind}</td>
                <td data-label="Montant" className={`num mono ${e.amount_minor < 0 ? '' : ''}`} style={{ color: e.amount_minor < 0 ? 'var(--neg)' : 'var(--ok)' }}>{e.amount_minor > 0 ? '+' : ''}{money(e.amount_minor, e.currency)}</td>
                <td data-label="Solde" className="num mono">{money(e.balance_after_minor, e.currency)}</td><td data-label="Référence" className="mono">{e.reference}</td></tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </>
  )
}
