// Point d'entrée : routeur, en-tête, page publique, connexion, accueil à tuiles.
import { load, save, db, session, setSession, finishSeed, log, uid, ROLES, REGIONS, SECTEURS, NIVEAUX, convComplete } from './store.js';
import { esc, num, fcfa, dateLongue, date, icon, tile, tileCreer, toast, initTooltips, empty, badge } from './ui.js';
import { scoreLocal } from './ia.js';
import * as V from './views.js';

load();
finishSeed(db(), scoreLocal);
save();

const D = () => db();
const app = document.getElementById('app');

// ---------- Routes ----------
const ROUTES = [
  ['', vueAccueilPublic, null],
  ['connexion', vueConnexion, null],
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
  ['entretiens', V.vueEntretiens, ['entreprise', 'stagiaire', 'admin']],
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
  let html, bind;
  if (!m) html = `<main class="page">${empty('Page introuvable.')}</main>`;
  else if (m.roles && !u) { location.hash = '#/connexion'; return; }
  else if (m.roles && m.roles !== '*' && !m.roles.includes(u.role)) html = `<main class="page">${empty('Cette page n\'est pas accessible avec votre profil.')}</main>`;
  else {
    const out = m.view(m.params, q);
    [html, bind] = Array.isArray(out) ? out : [out];
    html = m.roles ? `<main class="page">${html}</main>` : html;
  }
  app.innerHTML = header(u, path) + html + footer();
  bind?.(app);
  bindHeader();
  window.scrollTo(0, 0);
  document.title = `${document.querySelector('h1')?.textContent || 'Accueil'} — PNEC`;
}
window.addEventListener('hashchange', render);

// ---------- En-tête & pied ----------
const NAV = {
  entreprise: [['accueil', 'Accueil'], ['offres', 'Mes offres'], ['entretiens', 'Entretiens'], ['selection', 'Sélection'], ['conventions', 'Conventions']],
  stagiaire: [['accueil', 'Accueil'], ['offres', 'Offres'], ['candidatures', 'Candidatures'], ['conventions', 'Conventions'], ['profil', 'Mon profil']],
  mfp: [['accueil', 'Accueil'], ['entreprises', 'Entreprises'], ['conventions', 'Conventions'], ['offres', 'Offres'], ['pilotage', 'Pilotage']],
  de: [['accueil', 'Accueil'], ['conventions', 'Prises en charge'], ['entreprises', 'Entreprises'], ['pilotage', 'Pilotage']],
  primature: [['accueil', 'Accueil'], ['pilotage', 'Tableau de bord'], ['entreprises', 'Entreprises'], ['conventions', 'Conventions']],
  admin: [['accueil', 'Accueil'], ['entreprises', 'Entreprises'], ['offres', 'Offres'], ['conventions', 'Conventions'], ['pilotage', 'Pilotage'], ['admin/utilisateurs', 'Administration']],
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
    <nav class="nav" id="nav"><ul>${nav.map(([h, l]) => `<li><a href="#/${h}" class="${path === h || (h && path.startsWith(h.split('/')[0] + '/') && h !== 'accueil') ? 'on' : ''}">${l}</a></li>`).join('')}</ul></nav>
    <div class="outils">
      ${u ? `<button class="pill" data-recherche>${icon('search')}<span>Rechercher</span><kbd>Ctrl K</kbd></button>
        <span class="avatar" title="${esc(u.nom)} — ${esc(ROLES[u.role].label)}">${esc(initiales)}</span>
        <button class="pill" data-deco>${icon('logout')}<span>Déconnexion</span></button>`
      : `<a class="pill" href="#/connexion">${icon('user')}<span>Connexion</span></a>`}
    </div></div></header>`;
}

function footer() {
  return `<footer class="footer"><div class="footer-c">
    <div class="footer-cols">
      <div><strong>PNEC</strong><p>Le Programme national d'Engagement citoyen fédère la mobilisation de la jeunesse au service de l'Agenda national de transformation.</p></div>
      <div><strong>Parcours</strong><ul><li><a href="#/inscription/entreprise">Engager mon entreprise</a></li><li><a href="#/inscription/stagiaire">Je cherche un stage</a></li><li><a href="#/connexion">Espace partenaires</a></li></ul></div>
      <div><strong>Partenaires institutionnels</strong><ul><li>Primature</li><li>Ministère de la Formation professionnelle</li><li>Direction de l'Emploi</li></ul></div>
    </div>
    <div class="footer-b"><span>République du Sénégal — Un Peuple, Un But, Une Foi</span><span>Prototype de démonstration · données fictives</span></div>
  </div></footer>`;
}

function bindHeader() {
  app.querySelector('[data-deco]')?.addEventListener('click', () => { setSession(null); location.hash = '#/'; });
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
      <p class="sur-titre">République du Sénégal · Primature</p>
      <h1>Programme national d'Engagement citoyen</h1>
      <p class="hero-p">Le cadre fédérateur de la mobilisation de la jeunesse au service de l'Agenda national de transformation : des entreprises volontaires ouvrent leurs portes, l'État prend en charge la moitié de l'indemnité de stage.</p>
      <div class="hero-cta"><a class="cta cta--jaune" href="#/inscription/stagiaire">Je cherche un stage ${icon('arrow')}</a><a class="cta cta--blanc" href="#/inscription/entreprise">J'engage mon entreprise ${icon('arrow')}</a></div>
    </div></section>
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
// Connexion (démonstration : choix du profil)
// =====================================================================
function vueConnexion() {
  const ents = D().users.filter((u) => u.role === 'entreprise' && u.actif).reverse();
  const stgs = D().users.filter((u) => u.role === 'stagiaire' && u.actif).reverse();
  const inst = D().users.filter((u) => ['admin', 'mfp', 'de', 'primature'].includes(u.role) && u.actif);
  const carte = (role, ico, sel) => `<form class="profil-carte" data-role="${role}">
      <span class="profil-ico">${icon(ico)}</span><h3>${esc(ROLES[role].label)}</h3>
      ${sel ? `<select name="u" aria-label="Compte">${sel.map((u) => `<option value="${u.id}">${esc(u.nom)}</option>`).join('')}</select>` : `<input type="hidden" name="u" value="${inst.find((u) => u.role === role)?.id || ''}">`}
      <button class="btn btn--primaire">Entrer</button></form>`;
  return [`<section class="connexion"><div class="connexion-c">
    <h1>Espace PNEC</h1>
    <p class="muted">Prototype de démonstration : choisissez un profil pour découvrir la plateforme. En production, l'accès se fait par identifiant, mot de passe et code SMS.</p>
    <div class="profils">
      ${carte('stagiaire', 'graduation', stgs)}
      ${carte('entreprise', 'building', ents)}
      ${carte('mfp', 'handshake')}
      ${carte('de', 'coins')}
      ${carte('primature', 'chart')}
      ${carte('admin', 'settings')}
    </div>
    <p class="centre">Pas encore inscrit·e ? <a href="#/inscription/stagiaire">Créer un profil jeune</a> · <a href="#/inscription/entreprise">Inscrire mon entreprise</a></p>
  </div></section>`, bindConnexion];
}
function bindConnexion() {
  app.querySelectorAll('.profil-carte').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = D().users.find((x) => x.id === f.u.value);
    if (!u) return toast('Compte introuvable', 'erreur');
    setSession(u); log(u.nom, 'Connexion'); save();
    location.hash = '#/accueil';
  }));
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
      <label class="check"><input type="checkbox" required> Je certifie l'exactitude des informations et m'engage à respecter la charte du PNEC.</label>
      <div class="form-f"><button class="btn btn--primaire">Envoyer l'inscription</button></div></form></main>`,
  (root) => root.querySelector('#f-insc').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    const ent = { id: uid('ent'), ...v, effectif: +v.effectif, statut: 'en_attente', dateInscription: new Date().toISOString() };
    D().entreprises.push(ent);
    const u = { id: uid('u'), nom: ent.raisonSociale, email: ent.email, role: 'entreprise', orgId: ent.id, actif: true };
    D().users.push(u); setSession(u);
    log(u.nom, 'Inscription de l\'entreprise sur la plateforme'); save();
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
      <p class="note">Le sexe et la date de naissance servent uniquement aux statistiques du programme ; ils ne sont jamais utilisés par le moteur de tri.</p>
      <label class="check"><input type="checkbox" required> J'accepte le traitement de mes données dans le cadre du PNEC (loi n° 2008-12).</label>
      <div class="form-f"><button class="btn btn--primaire">Créer mon profil</button></div></form></main>`,
  (root) => root.querySelector('#f-insc').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    const s = { id: uid('stg'), ...v, experience: +v.experience, competences: v.competences.split(',').map((x) => x.trim()).filter(Boolean), dateInscription: new Date().toISOString() };
    D().stagiaires.push(s);
    const u = { id: uid('u'), nom: `${s.prenom} ${s.nom}`, email: s.email, role: 'stagiaire', orgId: s.id, actif: true };
    D().users.push(u); setSession(u);
    log(u.nom, 'Création du profil stagiaire'); save();
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
        tile({ titre: 'Mes offres', sous: 'Offres publiées', ico: 'briefcase', valeur: offres.filter((o) => o.statut === 'publiee').length, legende: `${offres.reduce((a, o) => a + o.places, 0)} places`, href: '#/offres' }),
        tile({ titre: 'Trier les candidatures', sous: 'Pré-tri par le moteur IA', ico: 'sparkles', valeur: atrier.length, legende: 'à trier', href: offreTri ? `#/offre/${offreTri.id}/candidats?f=atrier` : '#/offres', alerte: atrier.length > 0 }),
        tile({ titre: 'Entretiens en ligne', sous: enRetard ? `${enRetard} entretien(s) à évaluer` : 'Visioconférence intégrée', ico: 'video', valeur: entAvenir.length, legende: 'planifiés', href: '#/entretiens', alerte: enRetard > 0 }),
        tile({ titre: 'Sélection finale', sous: 'Après entretien', ico: 'check', valeur: cs.filter((c) => c.statut === 'entretien_realise').length, legende: 'décisions à prendre', href: '#/selection' }),
        tileCreer({ titre: 'Publier une offre', sous: 'Saisie guidée', href: '#/offre-nouvelle' }),
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
        tile({ titre: 'Mes entretiens', sous: prochain ? `Prochain : ${date(prochain.entretien.date)} à ${prochain.entretien.heure}` : 'En ligne, depuis mon téléphone', ico: 'video', valeur: cs.filter((c) => c.statut === 'entretien_planifie').length, legende: 'à venir', href: '#/candidatures', alerte: Boolean(prochain) }),
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
render();
