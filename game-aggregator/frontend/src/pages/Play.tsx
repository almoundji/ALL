import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, money, post, type GameSession, type Round } from '../lib/api'
import { t, useLang } from '../lib/i18n'

/** Client de jeu de démonstration « Dés de Yoon » (S1-8). Le jeton de session vaut authentification ; aucune clé d'API ici. */
export default function Play() {
  const [l] = useLang()
  const { token } = useParams()
  const [s, setS] = useState<GameSession | null>(null)
  const [stake, setStake] = useState(500)
  const [rounds, setRounds] = useState<Round[]>([])
  const [balance, setBalance] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { api<GameSession>(`/api/sessions/${token}`).then((x) => { setS(x); if (x.game) setStake(Math.max(x.game.min_stake_minor, Math.min(500, x.game.max_stake_minor))) }).catch((e) => setErr(e.message)) }, [token])
  const play = async () => {
    setBusy(true); setErr(null)
    try { const r = await post<Round>('/api/rounds', { session_token: token, stake_minor: stake, client_seed: `web-${Date.now()}` }); setRounds((xs) => [r, ...xs].slice(0, 20)); setBalance(r.balance_minor) }
    catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const g = s?.game
  const last = rounds[0]
  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
      <header className="shellbar"><div className="shellbar-in"><span className="logo"><span>yo<span className="n">on</span></span><small>{t(l, 'client de jeu', 'game client')} · {s?.mode === 'real' ? t(l, 'argent réel', 'real money') : t(l, 'démo', 'demo')}</small></span>
        <span className="pill" style={{ marginLeft: 'auto' }}>{g?.name ?? '…'}</span>{balance !== null && <span className="pill mono">{money(balance, g?.currency)}</span>}</div></header>
      <main className="page" style={{ maxWidth: 820 }}>
        {err && !s && <div className="message"><div className="big">⚠</div><h3>{err}</h3></div>}
        {g && (
          <>
            <div className="object-head" style={{ alignItems: 'center' }}>
              <div><div className="muted" style={{ fontSize: 12 }}>{t(l, 'Tirage dans [0, 10 000) · gagné si < 5 000 · gain 1,92 × la mise · RTP 96 %', 'Roll in [0, 10,000) · win if < 5,000 · payout 1.92 × stake · RTP 96%')}</div>
                <h1 style={{ fontSize: 34 }}>{g.name}</h1></div>
              <div className="kpis">
                <div className="kpi" style={{ textAlign: 'right' }}><div className="v num" style={{ fontSize: 56, color: last ? (last.result.won ? 'var(--ok)' : 'var(--neg)') : 'var(--muted)' }}>{last ? last.result.roll.toLocaleString('fr-FR') : '—'}</div><div className="l">{last ? (last.result.won ? `${t(l, 'Gagné', 'Won')} +${money(last.win_minor, last.currency)}` : t(l, 'Perdu', 'Lost')) : t(l, 'Dernier tirage', 'Last roll')}</div></div>
              </div>
            </div>
            <div className="section" style={{ marginTop: 16 }}>
              <div className="filterbar" style={{ margin: 0 }}>
                <label>{t(l, 'Mise', 'Stake')} ({g.currency})<input inputMode="numeric" value={stake} onChange={(e) => setStake(Number(e.target.value))} /></label>
                {[g.min_stake_minor, 500, 1000, 5000].filter((v, i, a) => v >= g.min_stake_minor && v <= g.max_stake_minor && a.indexOf(v) === i).map((v) => <button key={v} className="ghost" onClick={() => setStake(v)}>{money(v, g.currency)}</button>)}
                <button className="primary" disabled={busy} onClick={play} style={{ marginLeft: 'auto', padding: '10px 22px' }}>{busy ? '…' : t(l, 'Jouer', 'Play')}</button>
              </div>
              {err && s && <div className="status neg" style={{ marginTop: 10 }}>{err}</div>}
            </div>
            <div className="section">
              <h2>{t(l, 'Historique et vérification', 'History and verification')}</h2>
              <div className="table-wrap"><table>
                <thead><tr><th>#</th><th className="num">{t(l, 'Mise', 'Stake')}</th><th className="num">{t(l, 'Tirage', 'Roll')}</th><th className="num">{t(l, 'Gain', 'Win')}</th><th>{t(l, 'Engagement serveur', 'Server commitment')}</th><th></th></tr></thead>
                <tbody>
                  {rounds.length === 0 && <tr><td colSpan={6} className="muted">{t(l, 'Aucun tour joué dans cette session.', 'No rounds played in this session yet.')}</td></tr>}
                  {rounds.map((r) => (
                    <tr key={r.id}><td className="mono">{r.id}</td><td className="num mono">{money(r.stake_minor, r.currency)}</td><td className="num mono">{r.result.roll}</td>
                      <td className="num mono" style={{ color: r.win_minor ? 'var(--ok)' : 'var(--muted)' }}>{money(r.win_minor, r.currency)}</td>
                      <td className="mono" title={r.server_seed_hash}>{r.server_seed_hash.slice(0, 16)}…</td>
                      <td><a className="mono" href={`/api/rounds/${r.id}/verify`} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)' }}>{t(l, 'vérifier', 'verify')}</a></td></tr>
                  ))}
                </tbody>
              </table></div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>{t(l, 'Avant chaque tour, le serveur s’engage sur sha256(graine). Après clôture, la graine est révélée et n’importe qui peut recalculer le tirage.', 'Before each round the server commits to sha256(seed). After closing, the seed is revealed and anyone can recompute the roll.')}</p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
