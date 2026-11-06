import { useParams } from 'react-router-dom'
import { money } from '../lib/api'

/** Gabarit Fiori « Object Page » : en-tête avec indicateurs, ancres, sections. Vide au Sprint 0. */
export default function ObjectPage() {
  const { module, id } = useParams()
  const sections = ['Général', 'Transactions', 'Historique', 'Audit']
  return (
    <>
      <div className="object-head">
        <div>
          <div className="muted" style={{ fontSize: 12 }}>{module}</div>
          <h1>{id}</h1>
          <div style={{ marginTop: 8 }}><span className="status muted">Gabarit — aucune donnée</span></div>
        </div>
        <div className="kpis">
          <div className="kpi"><div className="v num">{money(0)}</div><div className="l">Solde</div></div>
          <div className="kpi"><div className="v num">0</div><div className="l">Tours</div></div>
        </div>
      </div>
      <nav className="anchors">{sections.map((s, i) => <a key={s} href={`#${s}`} className={i === 0 ? 'active' : ''}>{s}</a>)}</nav>
      {sections.map((s) => (
        <section key={s} id={s} className="section">
          <h2>{s}</h2>
          <div className="fields">
            <div className="field"><div className="l">Champ</div><div className="v">—</div></div>
            <div className="field"><div className="l">Champ</div><div className="v">—</div></div>
            <div className="field"><div className="l">Champ</div><div className="v">—</div></div>
          </div>
        </section>
      ))}
      <button className="primary fab">Modifier</button>
    </>
  )
}
