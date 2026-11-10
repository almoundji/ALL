import { useEffect, useState } from 'react'
import { api, type ModuleInfo } from '../lib/api'
import { t, useLang, type Lang } from '../lib/i18n'

type Section = { id: string; title: [string, string]; body: (l: Lang, mods: ModuleInfo[]) => JSX.Element }

const SPRINTS: [number, string, string][] = [
  [0, 'Socle : dépôt, CI, recette, montants entiers, charte', 'Foundation: repo, CI, staging, integer money, design tokens'],
  [1, 'Une partie de bout en bout (opérateur → joueur → mise → gain)', 'One game end to end (operator → player → stake → win)'],
  [2, 'Annulations, transactions tardives, jeu responsable', 'Rollbacks, late transactions, responsible gaming'],
  [3, 'Callbacks signés pour un vrai fournisseur', 'Signed callbacks for a real provider'],
  [4, 'Seamless wallet (solde chez l’opérateur)', 'Seamless wallet (balance held by the operator)'],
  [5, 'Bonus et tours gratuits', 'Bonuses and free spins'],
  [6, 'Reporting GGR et facturation', 'GGR reporting and invoicing'],
  [7, 'Back-office et lobby', 'Back office and lobby'],
  [8, 'Durcissement, sécurité, certification', 'Hardening, security, certification'],
]

const SECTIONS: Section[] = [
  {
    id: 'intro', title: ['Présentation', 'Overview'],
    body: (l) => (
      <>
        <p>{t(l, 'Yoon (« le chemin » en wolof) est un agrégateur de jeux de hasard : une seule intégration relie les opérateurs (casinos, sites de paris) à tous les fournisseurs de jeux.',
          'Yoon (“the path” in Wolof) is a gaming aggregator: a single integration connects operators (casinos, betting sites) to every game provider.')}</p>
        <p>{t(l, 'Il fournit un catalogue unifié, un portefeuille à grand livre idempotent, le lancement de sessions, les tours de jeu, le jeu responsable, un journal d’audit chaîné et le reporting.',
          'It provides a unified catalogue, an idempotent ledger wallet, session launch, game rounds, responsible gaming, a hash‑chained audit log and reporting.')}</p>
        <p className="muted">{t(l, 'État actuel : Sprint 1 livré — une partie se joue de bout en bout (opérateur → joueur → mise → gain), vérifiable publiquement. Cette documentation évolue à chaque sprint.', 'Current state: Sprint 1 delivered — a game is played end to end (operator → player → stake → win) and is publicly verifiable. This documentation grows with every sprint.')}</p>
      </>
    ),
  },
  {
    id: 'modules', title: ['Modules', 'Modules'],
    body: (l, mods) => (
      <div className="table-wrap"><table>
        <thead><tr><th>{t(l, 'Clé', 'Key')}</th><th>{t(l, 'Module', 'Module')}</th><th>{t(l, 'Sprint', 'Sprint')}</th><th>{t(l, 'État', 'Status')}</th></tr></thead>
        <tbody>{mods.map((m) => (
          <tr key={m.key}><td data-label="Clé" className="mono">{m.key}</td><td data-label="Module">{t(l, m.name, m.name_en)}</td><td data-label="Sprint">S{m.sprint}</td>
            <td data-label="État"><span className={`status ${m.status === 'livré' ? 'ok' : m.status === 'en cours' ? 'warn' : 'muted'}`}>{t(l, m.status, m.status === 'livré' ? 'delivered' : m.status === 'en cours' ? 'in progress' : 'planned')}</span></td></tr>
        ))}</tbody>
      </table></div>
    ),
  },
  {
    id: 'roadmap', title: ['Feuille de route Scrum', 'Scrum roadmap'],
    body: (l) => (
      <>
        <p>{t(l, 'Sprints de deux semaines. Chaque sprint livre une tranche verticale démontrable en Sprint Review.', 'Two‑week sprints. Each sprint ships a vertical slice demonstrated at the Sprint Review.')}</p>
        <div className="table-wrap"><table>
          <thead><tr><th>Sprint</th><th>{t(l, 'Objectif', 'Goal')}</th></tr></thead>
          <tbody>{SPRINTS.map(([n, fr, en]) => <tr key={n}><td data-label="Sprint">S{n}</td><td data-label="Objectif">{t(l, fr, en)}</td></tr>)}</tbody>
        </table></div>
      </>
    ),
  },
  {
    id: 'api', title: ['API', 'API'],
    body: (l) => (
      <>
        <p>{t(l, 'API REST en JSON. Les montants sont des entiers en unité mineure accompagnés d’un code devise ISO 4217 (le XOF n’a pas de subdivision). Toute écriture financière porte une clé d’idempotence.',
          'JSON REST API. Amounts are integers in minor units with an ISO 4217 currency code (XOF has no subdivision). Every financial write carries an idempotency key.')}</p>
        <div className="table-wrap"><table>
          <thead><tr><th>{t(l, 'Route', 'Route')}</th><th>{t(l, 'Description', 'Description')}</th><th>Sprint</th></tr></thead>
          <tbody>
            <tr><td className="mono">GET /api/health</td><td>{t(l, 'État du service, version, environnement', 'Service status, version, environment')}</td><td>S0</td></tr>
            <tr><td className="mono">GET /api/modules</td><td>{t(l, 'Modules et avancement', 'Modules and progress')}</td><td>S0</td></tr>
            <tr><td className="mono">POST /api/operators</td><td>{t(l, 'Créer un opérateur, clé d’API affichée une seule fois (admin, en-tête X-Admin-Key)', 'Create an operator, API key shown once (admin, X-Admin-Key header)')}</td><td>S1</td></tr>
            <tr><td className="mono">GET /api/operators/me/stats</td><td>{t(l, 'Chiffres du lanceur de l’opérateur (X-Api-Key)', 'Operator launchpad figures (X-Api-Key)')}</td><td>S1</td></tr>
            <tr><td className="mono">GET /api/catalog/games</td><td>{t(l, 'Catalogue unifié', 'Unified catalogue')}</td><td>S1</td></tr>
            <tr><td className="mono">POST /api/wallet/transactions</td><td>{t(l, 'Crédit / débit idempotent', 'Idempotent credit / debit')}</td><td>S1</td></tr>
            <tr><td className="mono">POST /api/sessions</td><td>{t(l, 'Lancer une session de jeu', 'Launch a game session')}</td><td>S1</td></tr>
            <tr><td className="mono">POST /api/rounds</td><td>{t(l, 'Jouer un tour : mise → gain → clôture (jeton de session)', 'Play a round: stake → win → close (session token)')}</td><td>S1</td></tr>
            <tr><td className="mono">GET /api/rounds/{'{id}'}/verify</td><td>{t(l, 'Vérification publique d’un tour (graines révélées)', 'Public verification of a round (revealed seeds)')}</td><td>S1</td></tr>
            <tr><td className="mono">GET /api/audit/verify</td><td>{t(l, 'Vérifier l’intégrité du journal chaîné', 'Verify the hash‑chained audit log')}</td><td>S1</td></tr>
          </tbody>
        </table></div>
        <p className="muted">{t(l, 'En local, la documentation interactive OpenAPI est servie sur /api/docs par FastAPI.', 'Locally, FastAPI serves the interactive OpenAPI documentation at /api/docs.')}</p>
      </>
    ),
  },
  {
    id: 'ux', title: ['Interface et charte', 'Interface and design'],
    body: (l) => (
      <>
        <p>{t(l, 'L’interface suit les principes SAP Fiori : lanceur en tuiles par rôle, shell bar avec recherche globale (Ctrl K), gabarits List Report et Object Page, couleurs sémantiques réservées aux statuts.',
          'The interface follows SAP Fiori principles: role‑based tile launchpad, shell bar with global search (Ctrl K), List Report and Object Page floorplans, semantic colours reserved for statuses.')}</p>
        <div className="fields">
          {[['--brand', t(l, 'Marque', 'Brand')], ['--accent', t(l, 'Action principale', 'Primary action')], ['--ok', t(l, 'Positif', 'Positive')], ['--warn', t(l, 'À surveiller', 'Warning')], ['--neg', t(l, 'Négatif', 'Negative')], ['--info', t(l, 'Information', 'Information')]].map(([v, label]) => (
            <div className="field" key={v}><div className="l">{label}</div><div className="v" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 18, height: 18, borderRadius: 4, background: `var(${v})`, border: '1px solid var(--line)' }} /><span className="mono">{v}</span></div></div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'glossary', title: ['Glossaire', 'Glossary'],
    body: (l) => (
      <div className="fields">
        {[
          ['GGR', t(l, 'Produit brut des jeux : mises moins gains.', 'Gross Gaming Revenue: stakes minus winnings.')],
          ['RTP', t(l, 'Taux de retour au joueur, en pourcentage des mises.', 'Return to Player, as a percentage of stakes.')],
          ['RNG', t(l, 'Générateur de nombres aléatoires, ici prouvablement équitable (graines serveur et client, nonce).', 'Random Number Generator, here provably fair (server and client seeds, nonce).')],
          [t(l, 'Idempotence', 'Idempotency'), t(l, 'Rejouer la même requête ne produit pas de second effet (pas de double débit).', 'Replaying the same request has no second effect (no double debit).')],
          [t(l, 'Seamless wallet', 'Seamless wallet'), t(l, 'Le solde reste chez l’opérateur ; Yoon l’interroge par callback à chaque mise.', 'The balance stays with the operator; Yoon calls back on every stake.')],
          [t(l, 'Jeu responsable', 'Responsible gaming'), t(l, 'Limites de mise et de perte, auto-exclusion, délai de réflexion.', 'Stake and loss limits, self‑exclusion, cooling‑off period.')],
        ].map(([k, v]) => <div className="field" key={k}><div className="l">{k}</div><div className="v" style={{ fontWeight: 400 }}>{v}</div></div>)}
      </div>
    ),
  },
]

/** Onglet Documentation, bilingue FR / EN dès le Sprint 0. */
export default function Docs() {
  const [l, setLang] = useLang()
  const [mods, setMods] = useState<ModuleInfo[]>([])
  useEffect(() => { api<ModuleInfo[]>('/api/modules').then(setMods).catch(() => setMods([])) }, [])
  return (
    <>
      <div className="hello" style={{ justifyContent: 'space-between' }}>
        <div><h1>{t(l, 'Documentation', 'Documentation')}</h1><span className="muted">{t(l, 'Yoon · Sprint 1', 'Yoon · Sprint 1')}</span></div>
        <div className="row" style={{ display: 'flex', gap: 6 }}>
          <button className={l === 'fr' ? 'primary' : ''} onClick={() => setLang('fr')} aria-pressed={l === 'fr'}>Français</button>
          <button className={l === 'en' ? 'primary' : ''} onClick={() => setLang('en')} aria-pressed={l === 'en'}>English</button>
        </div>
      </div>
      <nav className="anchors">{SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`}>{t(l, s.title[0], s.title[1])}</a>)}</nav>
      {SECTIONS.map((s) => <section key={s.id} id={s.id} className="section"><h2>{t(l, s.title[0], s.title[1])}</h2>{s.body(l, mods)}</section>)}
    </>
  )
}
