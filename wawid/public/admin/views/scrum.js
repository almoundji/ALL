// Pilotage Scrum du projet WawID : sprints, backlog produit, vélocité. (Source : docs/SCRUM.md)
import { esc, fmtNum, icon } from "../../shared/ui.js";
import { barChart, bindTooltips, pageHead } from "./common.js";

export const SPRINTS = [
  { n: 0, name: "Cadrage & fondations", goal: "Vision produit, architecture, design system Fiori × WAW, chaîne de déploiement Netlify.", state: "Terminé", stories: [
    ["Vision produit et parité fonctionnelle avec Securiport (BCS, TMS, APIS, TAS, SES)", 3, "done"], ["Design system (Fiori Horizon, couleurs WAW, mode sombre)", 5, "done"], ["Architecture serverless + stockage + API unique", 5, "done"], ["Déploiement continu Netlify", 2, "done"]] },
  { n: 1, name: "MVP contrôle guichet", goal: "Un agent contrôle un passeport de bout en bout avec un score de risque explicable.", state: "Terminé", stories: [
    ["Lecture MRZ ICAO 9303 (TD3/TD1) et chiffres de contrôle", 5, "done"], ["Capture faciale caméra, 4 empreintes, iris", 8, "done"], ["Moteur de risque explicable", 8, "done"], ["Décision motivée et enregistrement du passage", 3, "done"], ["Historique des passages (List Report / Object Page)", 5, "done"], ["Tableau de bord entrées / sorties / fraude", 8, "done"]] },
  { n: 2, name: "eGates & ABC", goal: "Passage automatisé avec orientation vers les guichets et pilotage à distance.", state: "Terminé", stories: [
    ["Kiosque eGate / ABC (parcours voyageur)", 8, "done"], ["Règles d'éligibilité et seuils par porte", 5, "done"], ["Supervision temps réel et commandes à distance", 5, "done"], ["Authentification des équipements par clé", 2, "done"]] },
  { n: 3, name: "e-Visa & portail voyageur", goal: "Demande, paiement, suivi et contrôle du e-Visa ; taxe de sécurité en ligne.", state: "Terminé", stories: [
    ["Formulaire e-Visa multi-étapes avec déclaration sanitaire", 8, "done"], ["Instruction VMS (approbation, refus, demande d'info)", 5, "done"], ["QR signé e-Visa / WawPass et vérification", 5, "done"], ["Pré-enrôlement eGate", 3, "done"]] },
  { n: 4, name: "Renseignement & APIS", goal: "Threat Monitor, dossiers, listes multi-sources, règles de ciblage, pré-contrôle des manifestes.", state: "Terminé", stories: [
    ["Threat Monitor maître-détail", 5, "done"], ["Dossiers et entretiens structurés", 5, "done"], ["Listes Interpol / FPR / WAPIS / POI / SLTD", 5, "done"], ["Règles de ciblage paramétrables", 5, "done"], ["APIS Monitor + Gateway CSV + conformité transporteurs", 8, "done"], ["Connecteurs externes (contrat REST + mode dégradé)", 5, "done"], ["Recherche voyageur 360° (résolution d'identité)", 5, "done"]] },
  { n: 5, name: "Intégrations réelles", goal: "Brancher les vrais fichiers et matériels.", state: "En cours", stories: [
    ["Interpol I-24/7 FIND/MIND via le BCN Dakar", 13, "doing"], ["WAPIS (plateforme nationale)", 8, "todo"], ["Fichier national des personnes recherchées (API mTLS)", 5, "doing"], ["SDK biométrique certifié (NIST FRTE) + liveness ISO 30107-3", 13, "todo"], ["Lecteurs de documents (puce RFID, PA/AA, UV/IR)", 8, "todo"], ["Pilotes eGate du constructeur retenu", 8, "todo"], ["Réception PAXLST / PNRGOV (MQ)", 8, "todo"]] },
  { n: 6, name: "Sécurité & conformité", goal: "Prêt pour la production étatique.", state: "À venir", stories: [
    ["SSO / MFA agents (carte agent + PIN)", 8, "todo"], ["Base relationnelle chiffrée (PostgreSQL) et sauvegardes", 8, "todo"], ["Mode hors-ligne du poste (serveur local, synchro)", 13, "todo"], ["Audit de sécurité, test d'intrusion", 5, "todo"], ["Conformité CDP (déclaration, durées de conservation)", 3, "todo"]] },
  { n: 7, name: "Pilote AIBD", goal: "Mise en service pilote, formation, recette en conditions réelles.", state: "À venir", stories: [
    ["Recette fonctionnelle et charge (pointe 3 000 pax/h)", 8, "todo"], ["Formation agents et superviseurs", 5, "todo"], ["Support et maintien en condition opérationnelle", 5, "todo"]] },
  { n: 8, name: "Généralisation", goal: "Postes terrestres et maritimes, VRS, CCTV, BI avancée.", state: "À venir", stories: [
    ["Déploiement Rosso, Kidira, Karang, Port de Dakar", 13, "todo"], ["VRS : lecteurs de plaques ANPR", 8, "todo"], ["CCTV à reconnaissance faciale (zones définies)", 13, "todo"], ["Rapports BI et analyse prédictive", 8, "todo"]] },
];

const COLS = [["todo", "À faire"], ["doing", "En cours"], ["done", "Terminé"]];

export function render(el, _ctx, _rest, query) {
  const current = SPRINTS.find((s) => s.state === "En cours") || SPRINTS[SPRINTS.length - 1];
  const sel = SPRINTS.find((s) => String(s.n) === query.sprint) || current;
  const pts = (s, st) => s.stories.filter((x) => !st || x[2] === st).reduce((a, x) => a + x[1], 0);
  const total = SPRINTS.reduce((a, s) => a + pts(s), 0), done = SPRINTS.reduce((a, s) => a + pts(s, "done"), 0);
  el.innerHTML = `${pageHead({ title: "Projet WawID — Scrum", sub: "Sprints de 2 semaines · Product Owner (WAW Telecom / DPAF), Scrum Master, équipe de développement. Revue et rétrospective à chaque fin de sprint.", crumbs: [[null, "Administration"]] })}
  <div class="kpis">
    <div class="card kpi"><div class="kpi-label">Avancement global</div><div class="kpi-value">${fmtNum((done / total) * 100, 0)} %</div><div class="progress" style="margin-top:8px"><span style="width:${(done / total) * 100}%"></span></div></div>
    <div class="card kpi"><div class="kpi-label">Points livrés</div><div class="kpi-value">${done} / ${total}</div><div class="kpi-delta">story points</div></div>
    <div class="card kpi"><div class="kpi-label">Sprint en cours</div><div class="kpi-value">S${current.n}</div><div class="kpi-delta">${esc(current.name)}</div></div>
    <div class="card kpi"><div class="kpi-label">Vélocité moyenne</div><div class="kpi-value">${Math.round(SPRINTS.filter((s) => s.state === "Terminé").reduce((a, s) => a + pts(s, "done"), 0) / SPRINTS.filter((s) => s.state === "Terminé").length)}</div><div class="kpi-delta">points / sprint</div></div>
  </div>
  <div class="grid-main">
    <section class="card"><div class="card-head"><h3>Sprint ${sel.n} — ${esc(sel.name)}</h3><span class="status ${sel.state === "Terminé" ? "good" : sel.state === "En cours" ? "warning" : ""}" style="margin-left:auto">${esc(sel.state)}</span></div>
      <div class="card-body"><p class="muted" style="margin-top:0">Objectif : ${esc(sel.goal)}</p>
      <div class="board">${COLS.map(([k, l]) => { const st = sel.stories.filter((x) => x[2] === k); return `<div class="board-col"><h3><span>${l}</span><span>${st.length}</span></h3>${st.map(([t, p]) => `<div class="story"><span>${esc(t)}</span><span class="row"><span class="pts">${p} pts</span></span></div>`).join("")}</div>`; }).join("")}</div></div></section>
    <div class="stack">
      <section class="card"><div class="card-head"><h3>Vélocité par sprint</h3></div><div class="card-body">${barChart({ labels: SPRINTS.map((s) => `S${s.n}`), series: [{ name: "Points livrés", color: "var(--series-1)", values: SPRINTS.map((s) => pts(s, "done")) }], height: 180 })}</div></section>
      <section class="card"><div class="card-head"><h3>Sprints</h3></div><div>${SPRINTS.map((s) => `<a class="feed-item" style="text-decoration:none;color:inherit;${s === sel ? "background:var(--surface-2)" : ""}" href="#/projet?sprint=${s.n}"><b>S${s.n}</b><span>${esc(s.name)}<br><span class="small muted">${pts(s, "done")} / ${pts(s)} pts</span></span><span class="status ${s.state === "Terminé" ? "good" : s.state === "En cours" ? "warning" : ""}">${esc(s.state)}</span></a>`).join("")}</div></section>
    </div>
  </div>`;
  bindTooltips(el);
}
