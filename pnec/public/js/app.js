// Point d'entrée : routeur, en-tête, page publique, connexion, accueil à tuiles.
import { load, save, db, session, setSession, chargerSession, api, finishSeed, log, uid, ROLES, REGIONS, SECTEURS, NIVEAUX, convComplete } from './store.js';
import { esc, num, fcfa, dateLongue, date, icon, tile, tileCreer, toast, initTooltips, empty, badge } from './ui.js';
import { scoreLocal } from './ia.js';
import * as V from './views.js';
import * as R from './recrutement.js';
import * as A from './agenda.js';
import { vueVisio } from './visio.js';

load();
finishSeed(db(), scoreLocal);
save();

const D = () => db();
const app = document.getElementById('app');

// ---------- Routes ----------
const ROUTES = [
  ['', vueAccueilPublic, null],
  ['connexion', vueConnexion, null],
  ['portail-agents', vuePortailAgents, null],
  ['carriere/:id', R.vueCarriere, null],
  ['recrutement', R.vueRecrutement, ['entreprise', 'admin']],
  ['recrutement/modeles', R.vueModeles, ['entreprise']],
  ['recrutement/equipe', R.vueEquipe, ['entreprise']],
  ['recrutement/:id/rapport', R.vueRapport, ['entreprise', 'admin', 'mfp', 'primature']],
  ['recrutement/:id', R.vuePipeline, ['entreprise', 'admin']],
  ['cvtheque', R.vueCVtheque, ['entreprise', 'admin']],
  ['messages', R.vueMessages, ['stagiaire']],
  ['inscription/entreprise', vueInscriptionEntreprise, null],
  ['inscription/stagiaire', vueInscriptionStagiaire, null],
  ['accueil', vueAccueil, '*'],
  ['entreprises', V.vueEntreprises, ['mfp', 'admin', 'de', 'primature']],
  ['entreprise/:id', V.vueEntreprise, ['mfp', 'admin', 'de', 'primature']],
  ['offres', V.vueOffres, '*'],
  ['offre-nouvelle', V.vueOffreNouvelle, ['entreprise']],
  ['offre/:id/candidats', V.vueCandidats, ['entreprise', 'admin', 'mfp']],
  ['offre/:id', V.vueOffre, '*'],
  ['candidatures', V.vueMesCandidatures, ['stagiaire']],
  ['selection', V.vueSelection, ['entreprise', 'admin']],
  ['entretiens', (p, q) => (session().role === 'stagiaire' ? A.vueMesEntretiens(p, q) : V.vueEntretiens(p, q)), ['entreprise', 'stagiaire', 'admin']],
  ['agenda', A.vueAgenda, ['entreprise']],
  ['visio/:salle', vueVisio, ['entreprise', 'stagiaire']],
  ['entretien/:id', V.vueEntretien, ['entreprise', 'admin']],
  ['conventions', V.vueConventions, '*'],
  ['convention/:id', V.vueConvention, '*'],
  ['profil', V.vueProfil, ['stagiaire']],
  ['pilotage', V.vuePilotage, ['primature', 'mfp', 'de', 'admin']],
  ['admin/utilisateurs', V.vueUtilisateurs, ['admin']],
  ['admin/roles', V.vueRoles, ['admin']],
  ['admin/parametres', V.vueParametres, ['admin']],
  ['admin/journal', V.vueJournal, ['admin', 'primature']],
];

function match(path) {
  for (const [pat, view, roles] of ROUTES) {
    const a = pat.split('/'), b = path.split('/');
    if (a.length !== b.length) continue;
    const params = [];
    if (a.every((s, i) => (s.startsWith(':') ? (params.push(decodeURIComponent(b[i])), true) : s === b[i]))) return { view, roles, params };
  }
  return null;
}

function render() {
  const [rawPath, qs = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const path = rawPath.replace(/\/$/, '');
  const q = new URLSearchParams(qs);
  const u = session();
  const m = match(path);
  // Libère la caméra, le micro et la connexion en quittant une salle d'entretien
  if (window.__nettoyage && !path.startsWith('visio/')) { window.__nettoyage(); window.__nettoyage = null; }
  let html, bind;
  if (!m) html = `<main class="page">${empty('Page introuvable.')}</main>`;
  else if (m.roles && !u) { location.hash = '#/connexion'; return; }
  else if (!m.roles && u && ['connexion', 'portail-agents'].includes(path)) { location.hash = '#/accueil'; return; }
  else if (m.roles && m.roles !== '*' && !m.roles.includes(u.role)) html = `<main class="page">${empty('Cette page n\'est pas accessible avec votre profil.')}</main>`;
  else {
    const out = m.view(m.params, q);
    [html, bind] = Array.isArray(out) ? out : [out];
    html = m.roles ? `<main class="page">${html}</main>` : html;
  }
  app.innerHTML = header(u, path) + html + footer();
  bind?.(app);
  cartesMobiles(app);
  bindHeader();
  if (path !== dernierChemin) window.scrollTo(0, 0);
  dernierChemin = path;
  document.title = `${document.querySelector('h1')?.textContent || 'Accueil'} — PNEC`;
}
let dernierChemin = null;

// Sur téléphone, chaque ligne de tableau devient une carte : on recopie l'en-tête de colonne sur chaque cellule.
function cartesMobiles(racine) {
  const traiter = (r) => r.querySelectorAll('.table-wrap').forEach((w) => {
    const t = w.querySelector('table'); if (!t || t.classList.contains('tab-doc')) return;
    const entetes = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    if (!entetes.length) return;
    w.classList.add('tab-cartes');
    t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => {
      td.dataset.label = entetes[i] || '';
      if (i === 0) td.classList.add('td-titre');
      if (!td.textContent.trim() && !td.querySelector('button, a, select, input, svg')) td.classList.add('td-vide');
    }));
  });
  traiter(racine);
  // Un seul observateur pour les contenus chargés après coup (agenda, mes entretiens)
  if (!cartesMobiles.obs) {
    cartesMobiles.obs = new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) traiter(n.parentElement || n); })));
    cartesMobiles.obs.observe(racine, { childList: true, subtree: true });
  }
}
window.addEventListener('hashchange', render);
// Impression (sans gestionnaire inline, compatible avec la politique de sécurité du contenu)
document.addEventListener('click', (e) => { if (e.target.closest('[data-print]')) window.print(); });

// ---------- En-tête & pied ----------
const NAV = {
  entreprise: [['accueil', 'Accueil'], ['recrutement', 'Recrutement'], ['agenda', 'Agenda'], ['cvtheque', 'CVthèque'], ['offres', 'Offres'], ['conventions', 'Conventions']],
  stagiaire: [['accueil', 'Accueil'], ['offres', 'Offres'], ['candidatures', 'Candidatures'], ['entretiens', 'Entretiens'], ['messages', 'Messages'], ['profil', 'Profil']],
  mfp: [['accueil', 'Accueil'], ['entreprises', 'Entreprises'], ['conventions', 'Conventions'], ['offres', 'Offres'], ['pilotage', 'Pilotage']],
  de: [['accueil', 'Accueil'], ['conventions', 'Prises en charge'], ['entreprises', 'Entreprises'], ['pilotage', 'Pilotage']],
  primature: [['accueil', 'Accueil'], ['pilotage', 'Tableau de bord'], ['entreprises', 'Entreprises'], ['conventions', 'Conventions']],
  admin: [['accueil', 'Accueil'], ['entreprises', 'Entreprises'], ['recrutement', 'Recrutement'], ['conventions', 'Conventions'], ['pilotage', 'Pilotage'], ['admin/utilisateurs', 'Administration']],
};

function header(u, path) {
  const nav = u ? NAV[u.role] : [['', 'Le programme'], ['inscription/entreprise', 'Entreprises'], ['inscription/stagiaire', 'Jeunes']];
  const initiales = u ? u.nom.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() : '';
  return `<div class="bandeau-drapeau" aria-hidden="true"><i></i><i></i><i></i></div>
  <header class="header"><div class="header-c">
    <a class="logo" href="${u ? '#/accueil' : '#/'}" aria-label="PNEC — accueil">
      <span class="logo-embleme" aria-hidden="true"><svg viewBox="0 0 40 40"><rect width="13.3" height="40" fill="#008f36"/><rect x="13.3" width="13.4" height="40" fill="#ffeb00"/><rect x="26.7" width="13.3" height="40" fill="#e1001a"/><path d="M20 13l2 5.6h5.9l-4.8 3.5 1.8 5.7L20 24.3l-4.9 3.5 1.8-5.7-4.8-3.5H18z" fill="#008f36"/></svg></span>
      <span class="logo-t"><strong>PNEC</strong><small>Programme national<br>d'Engagement citoyen</small></span></a>
    <button class="btn-ico burger" aria-label="Menu" data-burger>${icon('menu')}</button>
    <nav class="nav" id="nav"><ul>${nav.map(([h, l]) => `<li><a href="#/${h}" ${h === 'messages' && nonLus(u) ? `data-badge="${nonLus(u)}"` : ''} class="${path === h || (h && path.startsWith(h.split('/')[0] + '/') && h !== 'accueil') ? 'on' : ''}">${l}</a></li>`).join('')}</ul></nav>
    <div class="outils">
      ${u ? `<button class="pill" data-recherche>${icon('search')}<span>Rechercher</span><kbd>Ctrl K</kbd></button>
        <span class="avatar" title="${esc(u.nom)} — ${esc(ROLES[u.role].label)}">${esc(initiales)}</span>
        <button class="pill" data-deco>${icon('logout')}<span>Déconnexion</span></button>`
      : `<a class="pill" href="#/connexion">${icon('user')}<span>Connexion</span></a>`}
    </div></div></header>`;
}

const nonLus = (u) => (u?.role === 'stagiaire' ? R.messagesDe(u.orgId).filter((m) => !m.lu).length : 0);

function footer() {
  return `<footer class="footer"><div class="footer-c">
    <div class="footer-cols">
      <div><strong>PNEC</strong><p>Le Programme national d'Engagement citoyen fédère la mobilisation de la jeunesse au service de l'Agenda national de transformation.</p></div>
      <div><strong>Parcours</strong><ul><li><a href="#/inscription/entreprise">Engager mon entreprise</a></li><li><a href="#/inscription/stagiaire">Je cherche un stage</a></li><li><a href="#/connexion">Connexion</a></li></ul></div>
      <div><strong>Partenaires institutionnels</strong><ul><li>Primature</li><li>Ministère de la Formation professionnelle</li><li>Direction de l'Emploi</li></ul></div>
    </div>
    <div class="footer-b"><span>République du Sénégal — Un Peuple, Un But, Une Foi</span><span>Prototype de démonstration · données fictives</span></div>
  </div></footer>`;
}

function bindHeader() {
  app.querySelector('[data-deco]')?.addEventListener('click', async () => {
    await api('auth/deconnexion', {}).catch(() => {});
    setSession(null); location.hash = '#/'; render();
  });
  app.querySelector('[data-burger]')?.addEventListener('click', () => app.querySelector('#nav').classList.toggle('ouvert'));
  app.querySelector('[data-recherche]')?.addEventListener('click', ouvrirRecherche);
}

// ---------- Recherche globale (Ctrl K) ----------
function ouvrirRecherche() {
  const u = session(); if (!u || document.querySelector('.recherche')) return;
  const w = document.createElement('div');
  w.className = 'modal-wrap recherche';
  w.innerHTML = `<div class="modal"><div class="rech-in">${icon('search')}<input type="search" placeholder="Offre, entreprise, convention, candidat…" aria-label="Rechercher partout" autofocus></div><div class="rech-res"></div></div>`;
  document.body.appendChild(w);
  const input = w.querySelector('input'); const res = w.querySelector('.rech-res');
  const close = () => w.remove();
  w.addEventListener('click', (e) => { if (e.target === w || e.target.closest('a')) close(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  input.addEventListener('input', () => {
    const t = input.value.trim().toLowerCase();
    if (t.length < 2) { res.innerHTML = ''; return; }
    const items = [];
    const offres = D().offres.filter((o) => u.role !== 'entreprise' || o.entrepriseId === u.orgId);
    offres.filter((o) => `${o.titre} ${o.competences.join(' ')}`.toLowerCase().includes(t)).slice(0, 6)
      .forEach((o) => items.push(['briefcase', o.titre, V.ent(o.entrepriseId).raisonSociale, `#/offre/${o.id}`]));
    if (['admin', 'mfp', 'de', 'primature'].includes(u.role)) {
      D().entreprises.filter((e) => e.raisonSociale.toLowerCase().includes(t)).slice(0, 5)
        .forEach((e) => items.push(['building', e.raisonSociale, `${e.secteur} · ${e.region}`, `#/entreprise/${e.id}`]));
    }
    V.conventionsVisibles().filter((c) => c.reference.toLowerCase().includes(t)).slice(0, 5)
      .forEach((c) => items.push(['file', c.reference, V.ent(c.entrepriseId).raisonSociale, `#/convention/${c.id}`]));
    res.innerHTML = items.length ? items.map(([i, a, b, h]) => `<a href="${h}">${icon(i)}<span><strong>${esc(a)}</strong><small>${esc(b)}</small></span></a>`).join('') : '<p class="muted">Aucun résultat</p>';
  });
}
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ouvrirRecherche(); } });

// =====================================================================
// Page publique
// =====================================================================
function vueAccueilPublic() {
  const S = V.stats();
  const dernieres = D().offres.filter((o) => o.statut === 'publiee' && new Date(o.dateLimite) >= new Date())
    .sort((a, b) => b.datePublication.localeCompare(a.datePublication)).slice(0, 6);
  const etapes = [
    ['building', 'Inscription des entreprises', 'Les entreprises volontaires s\'inscrivent en ligne.'],
    ['handshake', 'Convention cadre', 'Le Ministère de la Formation professionnelle valide et signe la convention.'],
    ['briefcase', 'Publication des offres', 'Les entreprises publient leurs offres de stage.'],
    ['pen', 'Candidatures', 'Les jeunes postulent depuis leur téléphone.'],
    ['sparkles', 'Pré-tri par IA', 'Un moteur d\'aide à la décision classe les CV, sans biais de nom, d\'âge ou de sexe.'],
    ['video', 'Entretiens en ligne', 'Planification et visioconférence intégrées.'],
    ['check', 'Sélection finale', 'L\'entreprise retient ses stagiaires.'],
    ['coins', 'Prise en charge 50/50', 'L\'État, via la Direction de l\'Emploi, finance 50 % de l\'indemnité.'],
    ['file', 'Convention de stage', 'Le stagiaire et l\'entreprise signent électroniquement.'],
  ];
  return `<section class="hero"><div class="hero-c">
      <p class="sur-titre">République du Sénégal · Primature · Agenda national de Transformation</p>
      <h1>Programme national d'Engagement citoyen</h1>
      <p class="hero-p">Un pilier de l'Agenda national de Transformation « Sénégal 2050 » pour mobiliser la jeunesse et faire du Masterplan 2025–2034 une véritable école de responsabilité et de compétences.</p>
      <div class="hero-cta"><a class="cta cta--jaune" href="#/inscription/stagiaire">Je m'engage ${icon('arrow')}</a><a class="cta cta--blanc" href="#/inscription/entreprise">J'engage mon entreprise ${icon('arrow')}</a></div>
    </div></section>
    <section class="section"><div class="section-c programme">
      <div><h2 class="titre-section">Le programme</h2>
        <p class="lead">Le Programme national d'Engagement citoyen est intégré à l'Agenda national de Transformation (Sénégal 2050). Il est coordonné par la Primature et mis en œuvre par un groupe de travail interministériel chargé de l'architecture du dispositif, de la plateforme numérique, de la certification des compétences et du financement.</p>
        <p>Il s'inscrit dans le référentiel national pour un Sénégal souverain, juste et prospère à l'horizon 2050.</p>
        <p class="petit muted">Source : <a href="https://primature.sn/publications/actualites/sante-et-engagement-citoyen-les-orientations-du-premier-ministre-ahmadou-al" target="_blank" rel="noopener">Primature du Sénégal</a> · <a href="https://www.presidence.sn/fr/assets/documents/Vision_Senegal-2050_Brochure.pdf" target="_blank" rel="noopener">Vision Sénégal 2050</a></p></div>
      <div class="chiffre-cle"><strong>+ 1 million</strong><span>d'emplois attendus de l'Agenda national de Transformation d'ici 2029</span></div>
    </div></section>
    <section class="section section--gris"><div class="section-c"><h2 class="titre-section">Objectifs</h2>
      <div class="cartes-3">
        <article class="carte-obj">${icon('graduation')}<h3>Un continuum école – citoyenneté – emploi</h3><p>Relier l'école, la citoyenneté active et le monde socio-professionnel.</p></article>
        <article class="carte-obj">${icon('briefcase')}<h3>L'employabilité des jeunes</h3><p>S'appuyer sur le potentiel d'emplois généré par l'Agenda national de Transformation.</p></article>
        <article class="carte-obj">${icon('handshake')}<h3>La jeunesse au cœur du développement</h3><p>Impliquer les jeunes dans les grandes missions de développement national.</p></article>
      </div></div></section>
    <section class="section"><div class="section-c"><h2 class="titre-section">Trois volets</h2>
      <div class="volets">
        <article><span class="volet-n">1</span><h3>Saison d'Engagement citoyen</h3><p>Des actions collectives et communautaires au service des territoires.</p></article>
        <article><span class="volet-n">2</span><h3>Stage citoyen professionnalisant</h3><p>Des stages en entreprise, avec une indemnité financée à 50 % par l'État via la Direction de l'Emploi.</p></article>
        <article><span class="volet-n">3</span><h3>Service civique professionnalisant</h3><p>Des missions d'intérêt général qui développent des compétences certifiées.</p></article>
      </div></div></section>
    <section class="bandeau-photo" aria-label="Mobilisation de la jeunesse"><div class="section-c"><p>« Faire de chaque jeune un acteur de la transformation du pays »</p></div></section>
    <section class="chiffres"><div class="chiffres-c">
      <div><strong>${num(S.entreprises)}</strong><span>entreprises engagées</span></div>
      <div><strong>${num(S.places)}</strong><span>places de stage</span></div>
      <div><strong>${num(S.inscrits)}</strong><span>jeunes inscrits</span></div>
      <div><strong>50 %</strong><span>de l'indemnité pris en charge par l'État</span></div>
    </div></section>
    <section class="section"><div class="section-c"><h2 class="titre-section">Comment ça marche</h2>
      <ol class="parcours">${etapes.map(([i, t, d], k) => `<li><span class="parcours-n">${k + 1}</span>${icon(i)}<h3>${t}</h3><p>${d}</p></li>`).join('')}</ol></div></section>
    <section class="section section--gris"><div class="section-c"><h2 class="titre-section">Dernières offres</h2>
      <div class="offres">${dernieres.map((o) => `<a class="offre" href="#/connexion"><div class="offre-h"><span class="offre-ent">${esc(V.ent(o.entrepriseId).raisonSociale)}</span></div>
        <h3>${esc(o.titre)}</h3><p class="offre-meta">${icon('map')} ${esc(o.region)} · ${icon('clock')} ${o.duree} mois</p>
        <div class="tags">${o.competences.slice(0, 3).map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
        <div class="offre-f"><span>${fcfa(o.salaire)} / mois</span><span>Jusqu'au ${date(o.dateLimite)}</span></div></a>`).join('')}</div>
      <p class="centre"><a class="cta" href="#/inscription/stagiaire">Créer mon profil pour postuler ${icon('arrow')}</a></p></div></section>`;
}

// =====================================================================
// Connexion — portail public (jeunes, entreprises) et portail privé (agents de l'État)
// =====================================================================
// Garantit que le compte connecté dispose de sa fiche dans les données locales du prototype.
function rattacher(u) {
  if (!D().users.some((x) => x.id === u.id)) D().users.push({ ...u, actif: true });
  if (u.role === 'entreprise' && !V.ent(u.orgId)) {
    u.orgId ||= uid('ent');
    D().entreprises.push({ id: u.orgId, raisonSociale: u.nom, secteur: SECTEURS[0], region: 'Dakar', effectif: 1, ninea: '—', rccm: '—', contact: u.nom, fonction: '—', email: u.email, tel: '—', adresse: '—', statut: 'en_attente', dateInscription: new Date().toISOString() });
  }
  if (u.role === 'stagiaire' && !V.stg(u.orgId)) {
    u.orgId ||= uid('stg');
    const [prenom, ...nom] = u.nom.split(' ');
    D().stagiaires.push({ id: u.orgId, prenom, nom: nom.join(' '), sexe: '', email: u.email, tel: '—', dateNaissance: '', region: 'Dakar', niveau: NIVEAUX[1], domaine: SECTEURS[0], diplome: '—', competences: [], experience: 0, cvTexte: '', dateInscription: new Date().toISOString() });
  }
  save();
}

function formulaireConnexion(portail, titre, aide) {
  return `<form class="carte form connexion-f" id="f-connexion" data-portail="${portail}" novalidate>
    <h2>${titre}</h2><p class="muted petit">${aide}</p>
    <label>Adresse e-mail<input type="email" name="email" autocomplete="username" required autofocus></label>
    <label>Mot de passe<span class="mdp-champ"><input type="password" name="motDePasse" autocomplete="current-password" required minlength="8"><button type="button" class="btn-ico" data-voir aria-label="Afficher le mot de passe">${icon('eye')}</button></span></label>
    <p class="erreur" id="erreur" role="alert"></p>
    <button class="btn btn--primaire btn--large">Se connecter</button>
    <p class="petit muted centre-t">Mot de passe oublié ? ${portail === 'agents' ? 'Contactez l\'administrateur de la plateforme.' : 'Écrivez à <a href="mailto:assistance@pnec.sn">assistance@pnec.sn</a>.'}</p>
  </form>`;
}

function bindFormulaireConnexion(root) {
  const f = root.querySelector('#f-connexion');
  root.querySelector('[data-voir]').onclick = () => { f.motDePasse.type = f.motDePasse.type === 'password' ? 'text' : 'password'; };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = root.querySelector('#erreur'); err.textContent = '';
    if (!f.email.value || !f.motDePasse.value) { err.textContent = 'Saisissez votre e-mail et votre mot de passe.'; return; }
    const b = f.querySelector('button.btn--primaire'); b.disabled = true; b.textContent = 'Vérification…';
    const { ok, data, status } = await api('auth/connexion', { email: f.email.value.trim(), motDePasse: f.motDePasse.value, portail: f.dataset.portail })
      .catch(() => ({ ok: false, data: { error: 'Service de connexion injoignable.' } }));
    b.disabled = false; b.textContent = 'Se connecter';
    if (!ok) { err.textContent = data.error || (status === 429 ? 'Trop de tentatives.' : 'Connexion impossible.'); f.motDePasse.value = ''; return; }
    setSession(data.utilisateur); rattacher(data.utilisateur);
    log(data.utilisateur.nom, `Connexion (portail ${f.dataset.portail === 'agents' ? 'des agents' : 'public'})`); save();
    location.hash = '#/accueil';
  });
}

function vueConnexion(_, q) {
  const profil = q.get('profil') === 'entreprise' ? 'entreprise' : 'stagiaire';
  return [`<section class="connexion"><div class="connexion-c connexion-c--2">
    <div class="connexion-intro"><p class="sur-titre vert">Espace public</p><h1>Connexion</h1>
      <p class="muted">Jeunes et entreprises partenaires du Programme national d'Engagement citoyen.</p>
      <nav class="bascule">
        <a href="#/connexion?profil=stagiaire" class="${profil === 'stagiaire' ? 'on' : ''}">${icon('graduation')} Je suis un·e jeune</a>
        <a href="#/connexion?profil=entreprise" class="${profil === 'entreprise' ? 'on' : ''}">${icon('building')} Je suis une entreprise</a></nav>
      <ul class="puces puces--ok petit">${profil === 'stagiaire'
        ? '<li>Postulez aux stages et au service civique</li><li>Suivez vos candidatures et vos entretiens</li><li>Signez votre convention en ligne</li>'
        : '<li>Publiez vos offres et triez les CV avec l\'IA</li><li>Gérez votre pipeline de recrutement</li><li>Bénéficiez de la prise en charge de 50 %</li>'}</ul>
      <p>Pas encore de compte ? <a href="#/inscription/${profil}">${profil === 'stagiaire' ? 'Créer mon profil' : 'Inscrire mon entreprise'}</a></p></div>
    ${formulaireConnexion('public', profil === 'stagiaire' ? 'Espace jeune' : 'Espace entreprise', 'Connexion sécurisée — vos identifiants ne sont jamais stockés en clair.')}
  </div></section>`, bindFormulaireConnexion];
}

function vuePortailAgents() {
  return [`<section class="connexion connexion--agents"><div class="connexion-c connexion-c--2">
    <div class="connexion-intro"><p class="sur-titre">Accès restreint</p><h1>Portail des agents</h1>
      <p>Réservé aux agents habilités de la Primature, du Ministère de la Formation professionnelle, de la Direction de l'Emploi et à l'administration de la plateforme.</p>
      <ul class="puces petit"><li>Sessions limitées à 2 heures</li><li>Verrouillage après 5 tentatives échouées</li><li>Toutes les actions sont tracées dans le journal d'audit</li></ul>
      <p class="petit">Toute tentative d'accès non autorisée est passible de poursuites (loi n° 2008-11 sur la cybercriminalité).</p></div>
    ${formulaireConnexion('agents', 'Identification agent', 'Utilisez l\'adresse professionnelle fournie par l\'administrateur.')}
  </div></section>`, bindFormulaireConnexion];
}

// =====================================================================
// Inscriptions
// =====================================================================
function vueInscriptionEntreprise() {
  return [`<main class="page page--etroite">
    <div class="page-head"><div><p class="sur-titre vert">Entreprises volontaires</p><h1>Engager mon entreprise</h1>
    <p class="muted">Votre inscription est examinée par le Ministère de la Formation professionnelle. Après signature de la convention cadre, vous publiez vos offres et l'État prend en charge 50 % de l'indemnité de chaque stagiaire retenu.</p></div></div>
    <form class="carte form" id="f-insc">
      <div class="grille-2">
        <label>Raison sociale<input name="raisonSociale" required></label>
        <label>Secteur d'activité<select name="secteur">${SECTEURS.map((s) => `<option>${esc(s)}</option>`).join('')}</select></label>
        <label>NINEA<input name="ninea" required pattern="[0-9A-Za-z ]{7,15}" placeholder="0012345672G3"></label>
        <label>RCCM<input name="rccm" required placeholder="SN-DKR-2020-B-1234"></label>
        <label>Région du siège<select name="region">${REGIONS.map((s) => `<option>${esc(s)}</option>`).join('')}</select></label>
        <label>Effectif<input name="effectif" type="number" min="1" required></label>
        <label>Nom du contact<input name="contact" required></label>
        <label>Fonction<input name="fonction" required placeholder="DRH"></label>
        <label>E-mail professionnel<input name="email" type="email" required></label>
        <label>Téléphone<input name="tel" required placeholder="+221 33 …"></label>
      </div>
      <label>Adresse<input name="adresse" required></label>
      <div class="grille-2">
        <label>Mot de passe<input type="password" name="motDePasse" required minlength="10" autocomplete="new-password" placeholder="10 caractères min., lettres et chiffres"></label>
        <label>Confirmation<input type="password" name="confirmation" required minlength="10" autocomplete="new-password"></label>
      </div>
      <p class="erreur" id="erreur" role="alert"></p>
      <label class="check"><input type="checkbox" required> Je certifie l'exactitude des informations et m'engage à respecter la charte du PNEC.</label>
      <div class="form-f"><button class="btn btn--primaire">Envoyer l'inscription</button></div></form></main>`,
  (root) => root.querySelector('#f-insc').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { motDePasse, confirmation, ...v } = Object.fromEntries(new FormData(e.target));
    const err = root.querySelector('#erreur');
    if (motDePasse !== confirmation) { err.textContent = 'Les deux mots de passe ne correspondent pas.'; return; }
    const entId = uid('ent');
    const { ok, data } = await api('auth/inscription', { email: v.email, motDePasse, nom: v.raisonSociale, role: 'entreprise', orgId: entId })
      .catch(() => ({ ok: false, data: { error: 'Service injoignable.' } }));
    if (!ok) { err.textContent = data.error || 'Inscription impossible.'; return; }
    D().entreprises.push({ id: entId, ...v, effectif: +v.effectif, statut: 'en_attente', dateInscription: new Date().toISOString() });
    setSession(data.utilisateur); rattacher(data.utilisateur);
    log(v.raisonSociale, 'Inscription de l\'entreprise sur la plateforme'); save();
    toast('Inscription envoyée au Ministère'); location.hash = '#/accueil';
  })];
}

function vueInscriptionStagiaire() {
  return [`<main class="page page--etroite">
    <div class="page-head"><div><p class="sur-titre vert">Jeunes</p><h1>Je cherche un stage</h1>
    <p class="muted">Créez votre profil en quelques minutes : les offres sont ensuite classées selon votre adéquation.</p></div></div>
    <form class="carte form" id="f-insc">
      <div class="grille-2">
        <label>Prénom<input name="prenom" required></label><label>Nom<input name="nom" required></label>
        <label>Date de naissance<input name="dateNaissance" type="date" required></label>
        <label>Sexe<select name="sexe"><option value="F">Femme</option><option value="M">Homme</option></select></label>
        <label>E-mail<input name="email" type="email" required></label><label>Téléphone<input name="tel" required placeholder="+221 7…"></label>
        <label>Région de résidence<select name="region">${REGIONS.map((s) => `<option>${esc(s)}</option>`).join('')}</select></label>
        <label>Niveau de formation<select name="niveau">${NIVEAUX.map((s) => `<option>${esc(s)}</option>`).join('')}</select></label>
        <label>Domaine<select name="domaine">${SECTEURS.map((s) => `<option>${esc(s)}</option>`).join('')}</select></label>
        <label>Expérience (mois)<input name="experience" type="number" min="0" value="0"></label>
      </div>
      <label>Diplôme<input name="diplome" required placeholder="BTS Électrotechnique"></label>
      <label>Compétences (séparées par des virgules)<input name="competences" required placeholder="Excel, Maintenance, Anglais"></label>
      <label>Présentation / CV<textarea name="cvTexte" rows="4" placeholder="Parcours, stages, projets…"></textarea></label>
      <div class="grille-2">
        <label>Mot de passe<input type="password" name="motDePasse" required minlength="10" autocomplete="new-password" placeholder="10 caractères min., lettres et chiffres"></label>
        <label>Confirmation<input type="password" name="confirmation" required minlength="10" autocomplete="new-password"></label>
      </div>
      <p class="note">Le sexe et la date de naissance servent uniquement aux statistiques du programme ; ils ne sont jamais utilisés par le moteur de tri.</p>
      <label class="check"><input type="checkbox" name="cvtheque" checked> Rendre mon profil visible (de façon anonyme) dans la CVthèque des entreprises partenaires</label>
      <label class="check"><input type="checkbox" required> J'accepte le traitement de mes données dans le cadre du PNEC (loi n° 2008-12).</label>
      <p class="erreur" id="erreur" role="alert"></p>
      <div class="form-f"><button class="btn btn--primaire">Créer mon profil</button></div></form></main>`,
  (root) => root.querySelector('#f-insc').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { motDePasse, confirmation, cvtheque, ...v } = Object.fromEntries(new FormData(e.target));
    const err = root.querySelector('#erreur');
    if (motDePasse !== confirmation) { err.textContent = 'Les deux mots de passe ne correspondent pas.'; return; }
    const stgId = uid('stg');
    const { ok, data } = await api('auth/inscription', { email: v.email, motDePasse, nom: `${v.prenom} ${v.nom}`, role: 'stagiaire', orgId: stgId })
      .catch(() => ({ ok: false, data: { error: 'Service injoignable.' } }));
    if (!ok) { err.textContent = data.error || 'Inscription impossible.'; return; }
    D().stagiaires.push({ id: stgId, ...v, experience: +v.experience, visibleCVtheque: Boolean(cvtheque), competences: v.competences.split(',').map((x) => x.trim()).filter(Boolean), dateInscription: new Date().toISOString() });
    setSession(data.utilisateur); rattacher(data.utilisateur);
    log(`${v.prenom} ${v.nom}`, 'Création du profil stagiaire'); save();
    toast('Profil créé — bienvenue !'); location.hash = '#/offres';
  })];
}

// =====================================================================
// Accueil à tuiles (selon le rôle)
// =====================================================================
function sections(u) {
  const d = D(); const S = V.stats(); const today = new Date().toISOString().slice(0, 10);
  const convs = V.conventionsVisibles();
  const aSigner = convs.filter((c) => V.partiePourMoi(c)).length;
  if (u.role === 'entreprise') {
    const e = V.ent(u.orgId);
    const cadre = V.cadreDe(u.orgId);
    const offres = d.offres.filter((o) => o.entrepriseId === u.orgId);
    const cs = d.candidatures.filter((c) => offres.some((o) => o.id === c.offreId));
    const atrier = cs.filter((c) => c.statut === 'soumise');
    const offreTri = offres.find((o) => atrier.some((c) => c.offreId === o.id));
    const entAvenir = cs.filter((c) => c.statut === 'entretien_planifie');
    const enRetard = entAvenir.filter((c) => c.entretien.date < today).length;
    const cadreTxt = e.statut === 'en_attente' ? 'En cours d\'examen' : !cadre ? '—' : convComplete(cadre) ? 'Signée' : V.partiePourMoi(cadre) ? 'À signer' : 'Signature Ministère';
    return [
      ['Engagement', [
        tile({ titre: 'Convention cadre', sous: 'Ministère de la Formation professionnelle', ico: 'handshake', valeur: cadreTxt, legende: cadre ? cadre.reference : 'inscription', href: cadre ? `#/convention/${cadre.id}` : '#/accueil', alerte: cadre && V.partiePourMoi(cadre) }),
        tile({ titre: 'Conventions à signer', sous: 'Prise en charge et stage', ico: 'pen', valeur: aSigner, legende: 'en attente de votre signature', href: '#/conventions?etat=asigner', alerte: aSigner > 0 }),
        tile({ titre: 'Stagiaires en poste', sous: 'Indemnité cofinancée à 50 %', ico: 'users', valeur: cs.filter((c) => c.statut === 'en_stage').length, legende: 'stagiaires', href: '#/conventions?type=STAGE&etat=signee' }),
      ]],
      ['Recrutement', [
        tile({ titre: 'Espace recruteur', sous: 'Pipeline Kanban par offre', ico: 'grid', valeur: cs.filter((c) => !['refusee', 'non_retenue_ia', 'en_stage'].includes(c.statut)).length, legende: 'candidats en cours', href: '#/recrutement' }),
        tile({ titre: 'CVthèque', sous: 'Sourcing de profils', ico: 'search', valeur: d.stagiaires.filter((s) => s.visibleCVtheque !== false).length, legende: 'profils disponibles', href: '#/cvtheque' }),
        tile({ titre: 'Mes offres', sous: 'Offres publiées', ico: 'briefcase', valeur: offres.filter((o) => o.statut === 'publiee').length, legende: `${offres.reduce((a, o) => a + o.places, 0)} places`, href: '#/offres' }),
        tile({ titre: 'Trier les candidatures', sous: 'Pré-tri par le moteur IA', ico: 'sparkles', valeur: atrier.length, legende: 'à trier', href: offreTri ? `#/offre/${offreTri.id}/candidats?f=atrier` : '#/offres', alerte: atrier.length > 0 }),
        tile({ titre: 'Agenda des entretiens', sous: enRetard ? `${enRetard} entretien(s) à évaluer` : 'Entretiens vidéo dans la plateforme', ico: 'calendar', valeur: entAvenir.length, legende: 'planifiés', href: '#/agenda', alerte: enRetard > 0 }),
        tile({ titre: 'Sélection finale', sous: 'Après entretien', ico: 'check', valeur: cs.filter((c) => c.statut === 'entretien_realise').length, legende: 'décisions à prendre', href: '#/selection' }),
        tile({ titre: 'Rapports', sous: 'Fin de recrutement, rédigés par l\'IA', ico: 'file', valeur: offres.length, legende: 'recrutements', href: '#/recrutement' }),
        tileCreer({ titre: 'Publier une offre', sous: 'Fiche de poste assistée par IA', href: '#/offre-nouvelle' }),
      ]],
    ];
  }
  if (u.role === 'stagiaire') {
    const s = V.stg(u.orgId);
    const cs = d.candidatures.filter((c) => c.stagiaireId === u.orgId);
    const ouvertes = d.offres.filter((o) => o.statut === 'publiee' && new Date(o.dateLimite) >= new Date());
    const adaptees = ouvertes.filter((o) => scoreLocal(o, s).score >= d.params.seuilIA).length;
    const prochain = cs.filter((c) => c.statut === 'entretien_planifie').sort((a, b) => a.entretien.date.localeCompare(b.entretien.date))[0];
    return [
      ['Ma recherche', [
        tile({ titre: 'Offres pour moi', sous: 'Classées selon mon profil', ico: 'sparkles', valeur: adaptees, legende: `sur ${ouvertes.length} offres ouvertes`, href: '#/offres' }),
        tile({ titre: 'Mes candidatures', sous: 'Suivi étape par étape', ico: 'inbox', valeur: cs.length, legende: 'envoyées', href: '#/candidatures' }),
        tile({ titre: 'Mes entretiens', sous: prochain ? `Prochain : ${date(prochain.entretien.date)} à ${prochain.entretien.heure}` : 'En vidéo, depuis la plateforme', ico: 'video', valeur: cs.filter((c) => c.statut === 'entretien_planifie').length, legende: 'à venir', href: '#/entretiens', alerte: Boolean(prochain) }),
        tile({ titre: 'Messagerie', sous: 'Messages des recruteurs', ico: 'inbox', valeur: R.messagesDe(u.orgId).filter((m) => !m.lu).length, legende: 'non lu(s)', href: '#/messages', alerte: R.messagesDe(u.orgId).some((m) => !m.lu) }),
        tile({ titre: 'Mon profil & CV', sous: 'Améliorer mon adéquation', ico: 'user', valeur: s.competences.length, legende: 'compétences déclarées', href: '#/profil' }),
      ]],
      ['Mon stage', [
        tile({ titre: 'Conventions', sous: 'Convention de stage', ico: 'pen', valeur: aSigner, legende: 'à signer', href: '#/conventions?etat=asigner', alerte: aSigner > 0 }),
        tile({ titre: 'Statut', sous: 'Programme PNEC', ico: 'graduation', valeur: cs.some((c) => c.statut === 'en_stage') ? 'En stage' : cs.some((c) => c.statut === 'retenue') ? 'Retenu·e' : 'En recherche', legende: '', href: '#/candidatures' }),
      ]],
    ];
  }
  if (u.role === 'mfp') {
    const cadresASigner = convs.filter((c) => c.type === 'CADRE' && V.partiePourMoi(c)).length;
    return [
      ['Entreprises', [
        tile({ titre: 'Inscriptions à valider', sous: 'Entreprises volontaires', ico: 'inbox', valeur: S.entAttente, legende: 'en attente', href: '#/entreprises?statut=en_attente', alerte: S.entAttente > 0 }),
        tile({ titre: 'Conventions cadre', sous: 'Ministère – Entreprise', ico: 'pen', valeur: cadresASigner, legende: 'à signer', href: '#/conventions?type=CADRE&etat=asigner', alerte: cadresASigner > 0 }),
        tile({ titre: 'Entreprises partenaires', sous: 'Convention signée', ico: 'building', valeur: S.entreprises, legende: 'entreprises', href: '#/entreprises?statut=validee' }),
      ]],
      ['Programme', [
        tile({ titre: 'Offres publiées', sous: 'Toutes régions', ico: 'briefcase', valeur: S.offres, legende: `${S.places} places`, href: '#/offres' }),
        tile({ titre: 'Jeunes en stage', sous: 'Conventions signées', ico: 'users', valeur: S.enStage, legende: 'stagiaires', href: '#/conventions?type=STAGE&etat=signee' }),
        tile({ titre: 'Pilotage', sous: 'Tableau de bord national', ico: 'chart', valeur: S.candidatures, legende: 'candidatures', href: '#/pilotage' }),
      ]],
    ];
  }
  if (u.role === 'de') {
    return [
      ['Prise en charge', [
        tile({ titre: 'Conventions à signer', sous: 'Prise en charge 50 %', ico: 'pen', valeur: aSigner, legende: 'en attente de la DE', href: '#/conventions?type=PRISE_EN_CHARGE&etat=asigner', alerte: aSigner > 0 }),
        tile({ titre: 'Engagement de l\'État', sous: 'Conventions signées', ico: 'coins', valeur: fcfa(S.engageEtat, true), legende: 'FCFA engagés', href: '#/pilotage' }),
        tile({ titre: 'Décaissement mensuel', sous: 'Quote-part DE', ico: 'calendar', valeur: fcfa(S.mensuelEtat, true), legende: 'FCFA / mois', href: '#/conventions?type=PRISE_EN_CHARGE&etat=signee' }),
        tile({ titre: 'Stagiaires pris en charge', sous: 'En poste', ico: 'users', valeur: S.enStage, legende: 'jeunes', href: '#/conventions?type=STAGE&etat=signee' }),
      ]],
      ['Suivi', [tile({ titre: 'Tableau de bord', sous: 'Indicateurs nationaux', ico: 'chart', valeur: S.retenus, legende: 'jeunes retenus', href: '#/pilotage' })]],
    ];
  }
  if (u.role === 'primature') {
    return [
      ['Pilotage national', [
        tile({ titre: 'Tableau de bord', sous: 'Indicateurs du programme', ico: 'chart', valeur: S.enStage, legende: 'jeunes en stage', href: '#/pilotage' }),
        tile({ titre: 'Entreprises engagées', sous: 'Conventions cadre', ico: 'building', valeur: S.entreprises, legende: 'entreprises', href: '#/entreprises?statut=validee' }),
        tile({ titre: 'Places offertes', sous: 'Offres publiées', ico: 'briefcase', valeur: S.places, legende: `${S.offres} offres`, href: '#/pilotage' }),
        tile({ titre: 'Engagement de l\'État', sous: '50 % des indemnités', ico: 'coins', valeur: fcfa(S.engageEtat, true), legende: 'FCFA', href: '#/pilotage' }),
        tile({ titre: 'Conventions en attente', sous: 'Toutes parties', ico: 'file', valeur: S.convAttente, legende: 'à finaliser', href: '#/conventions?etat=attente' }),
        tile({ titre: 'Journal d\'audit', sous: 'Traçabilité', ico: 'shield', valeur: d.audit.length, legende: 'événements', href: '#/admin/journal' }),
      ]],
    ];
  }
  // admin
  return [
    ['Administration', [
      tile({ titre: 'Utilisateurs', sous: 'Comptes et accès', ico: 'users', valeur: d.users.length, legende: 'comptes', href: '#/admin/utilisateurs' }),
      tile({ titre: 'Rôles & habilitations', sous: 'Matrice des droits', ico: 'shield', valeur: Object.keys(ROLES).length, legende: 'profils', href: '#/admin/roles' }),
      tile({ titre: 'Paramètres', sous: 'Taux, seuil IA, visio', ico: 'settings', valeur: `${d.params.tauxEtat} %`, legende: 'prise en charge État', href: '#/admin/parametres' }),
      tile({ titre: 'Journal d\'audit', sous: 'Toutes les actions', ico: 'list', valeur: d.audit.length, legende: 'événements', href: '#/admin/journal' }),
    ]],
    ['Programme', [
      tile({ titre: 'Entreprises', sous: 'Inscriptions', ico: 'building', valeur: S.entAttente, legende: 'à valider', href: '#/entreprises', alerte: S.entAttente > 0 }),
      tile({ titre: 'Offres', sous: 'Publiées', ico: 'briefcase', valeur: S.offres, legende: `${S.places} places`, href: '#/offres' }),
      tile({ titre: 'Conventions', sous: 'En attente de signature', ico: 'file', valeur: S.convAttente, legende: 'conventions', href: '#/conventions?etat=attente' }),
      tile({ titre: 'Pilotage', sous: 'Tableau de bord national', ico: 'chart', valeur: S.enStage, legende: 'jeunes en stage', href: '#/pilotage' }),
    ]],
  ];
}

function vueAccueil(_, q) {
  const u = session();
  const secs = sections(u);
  const m = q.get('m') || '';
  const visibles = m ? secs.filter(([n]) => n === m) : secs;
  let alerte = '';
  if (u.role === 'entreprise') {
    const e = V.ent(u.orgId);
    if (e.statut === 'en_attente') alerte = `<div class="alerte">${icon('clock')}<div><strong>Inscription en cours d'examen</strong><p>Le Ministère de la Formation professionnelle vérifie votre dossier. Vous serez notifié·e dès la génération de votre convention cadre.</p></div></div>`;
    if (e.statut === 'rejetee') alerte = `<div class="alerte alerte--rouge">${icon('alert')}<div><strong>Inscription non retenue</strong><p>${esc(e.motifRejet || '')}</p></div></div>`;
  }
  return `<div class="bonjour"><h1>Bonjour ${esc(u.role === 'stagiaire' ? u.nom.split(' ')[0] : u.nom)}</h1><span>${dateLongue(new Date())}</span>${badge(ROLES[u.role].court, 'vert')}</div>
    <nav class="onglets onglets--accueil"><a href="#/accueil" class="${!m ? 'on' : ''}">Mon accueil</a>${secs.map(([n]) => `<a href="#/accueil?m=${encodeURIComponent(n)}" class="${m === n ? 'on' : ''}">${esc(n)}</a>`).join('')}</nav>
    ${alerte}
    ${visibles.map(([n, tiles]) => `<section class="tuiles-s"><h2>${esc(n)}</h2><div class="tuiles">${tiles.join('')}</div></section>`).join('')}`;
}

initTooltips();
chargerSession().then((u) => { if (u) rattacher(u); render(); });
