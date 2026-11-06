import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ClassBadge } from '../components/Badges'
import { CLASS, CLASS_COLOR, fmtDate, get, TYPE_COLOR, TYPE_LABEL } from '../lib/api'

export default function Dashboard() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => { get('/api/dashboard').then(setD).catch((e) => setErr(e.message)) }, [])
  if (err) return <div className="alert-msg">{err}</div>
  if (!d) return <div className="muted">Chargement…</div>
  const cases = Object.fromEntries(d.cases_by_status.map((c: any) => [c.status, c.count]))
  return (
    <div className="col" style={{ gap: 14 }}>
      <div><h1>Décisionnel</h1><div className="muted">Vue consolidée du périmètre accessible à votre habilitation.</div></div>
      <div className="grid grid-4">
        <div className="card kpi"><span className="v">{d.entities}</span><span className="l">Entités visibles</span></div>
        <div className="card kpi"><span className="v">{d.relations}</span><span className="l">Relations</span></div>
        <div className="card kpi"><span className="v" style={{ color: d.open_alerts ? 'var(--warn)' : undefined }}>{d.open_alerts}</span><span className="l">Alertes ouvertes</span></div>
        <div className="card kpi"><span className="v">{(cases.OPEN || 0) + (cases.IN_PROGRESS || 0)}</span><span className="l">Dossiers actifs · {d.communities} communautés</span></div>
      </div>
      <div className="grid grid-3">
        <div className="card"><h2>Entités par type</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.by_type.map((b: any) => ({ ...b, name: TYPE_LABEL[b.type] || b.type }))}>
              <XAxis dataKey="name" tick={{ fill: '#5c5c5c', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fill: '#5c5c5c', fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e3e3e3' }} />
              <Bar dataKey="count">{d.by_type.map((b: any) => <Cell key={b.type} fill={TYPE_COLOR[b.type] || '#999'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card"><h2>Par classification</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={d.by_classification.map((c: any) => ({ name: CLASS[c.level], value: c.count, level: c.level }))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} label={(p: any) => `${p.name} ${p.value}`}>
              {d.by_classification.map((c: any) => <Cell key={c.level} fill={CLASS_COLOR[c.level]} />)}
            </Pie><Tooltip contentStyle={{ background: '#fff', border: '1px solid #e3e3e3' }} /></PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card"><h2>Alertes à traiter</h2>
          {d.recent_alerts.length === 0 && <div className="muted">Aucune alerte nouvelle.</div>}
          <div className="col" style={{ gap: 6 }}>
            {d.recent_alerts.map((a: any) => <div key={a.id} className="row small"><span className={`badge sev-${a.severity}`} style={{ background: 'var(--bg-3)', color: 'inherit' }}>{a.severity}</span><Link to={a.entity_id ? `/entities/${a.entity_id}` : '/alerts'} className="grow">{a.title}</Link><span className="muted">{fmtDate(a.created_at)}</span></div>)}
          </div>
          <div style={{ marginTop: 10 }}><Link to="/alerts">Toutes les alertes →</Link></div>
        </div>
      </div>
      <div className="grid grid-3">
        <div className="card"><h2>Nœuds les plus influents (PageRank)</h2>
          <table><tbody>{d.top_pagerank.map((n: any) => <tr key={n.id}><td><Link to={`/entities/${n.id}`}>{n.label}</Link><div className="fine">{TYPE_LABEL[n.type]}</div></td><td className="mono" style={{ textAlign: 'right' }}>{n.score}</td></tr>)}</tbody></table>
        </div>
        <div className="card"><h2>Intermédiaires clés (betweenness)</h2>
          <div className="fine" style={{ marginBottom: 6 }}>Entités qui relient des groupes autrement séparés : cibles prioritaires d'investigation.</div>
          <table><tbody>{d.top_betweenness.map((n: any) => <tr key={n.id}><td><Link to={`/entities/${n.id}`}>{n.label}</Link><div className="fine">{TYPE_LABEL[n.type]}</div></td><td className="mono" style={{ textAlign: 'right' }}>{n.score}</td></tr>)}</tbody></table>
        </div>
        <div className="card"><h2>Ingestions récentes</h2>
          {d.recent_jobs.length === 0 && <div className="muted">Aucune ingestion sur 30 jours.</div>}
          <table><tbody>{d.recent_jobs.map((j: any) => <tr key={j.id}><td>{j.filename}<div className="fine">{fmtDate(j.created_at)}</div></td><td className="mono">{j.rows} lignes</td><td><span className={`st-${j.status === 'DONE' ? 'ACK' : 'NEW'}`}>{j.status}</span></td></tr>)}</tbody></table>
          <div style={{ marginTop: 10 }}><Link to="/ingest">Ingestion →</Link></div>
        </div>
      </div>
      <div className="fine">Classification de la session : <ClassBadge level={d.by_classification.reduce((m: number, c: any) => Math.max(m, c.level), 0)} /> maximum visible dans ce périmètre.</div>
    </div>
  )
}
