import { Link, useParams } from 'react-router-dom'

/** Gabarit Fiori « List Report » : barre de filtres, tableau, pied avec actions. Vide au Sprint 0. */
export default function ListReport() {
  const { module } = useParams()
  return (
    <>
      <div className="hello"><h1>{module}</h1><span className="muted">List Report</span></div>
      <div className="filterbar" style={{ marginTop: 16 }}>
        <label>Recherche<input placeholder="Nom, identifiant…" /></label>
        <label>Statut<select><option>Tous</option><option>Actif</option><option>Suspendu</option></select></label>
        <button className="primary">Rechercher</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Identifiant</th><th>Nom</th><th>Statut</th><th className="num">Montant</th></tr></thead>
          <tbody>
            <tr><td colSpan={4}>
              <div className="message"><div className="big">▦</div><h3>Aucune donnée pour l’instant</h3>
                <div>Ce module est livré au sprint prévu dans la feuille de route. <Link to={`/m/${module}/exemple`}>Voir le gabarit de fiche</Link>.</div></div>
            </td></tr>
          </tbody>
        </table>
        <div className="table-foot">0 élément<div className="actions"><button>Exporter</button><button className="primary">Créer</button></div></div>
      </div>
    </>
  )
}
