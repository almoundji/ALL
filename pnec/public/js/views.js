// Écrans métier du PNEC.
import {
  db, save, log, uid, session, api, ROLES, STATUTS_CAND, TYPES_CONV, PARTIES, REGIONS, SECTEURS, NIVEAUX, VOLETS,
  convComplete, coutConvention, nextReference, reset,
} from './store.js';
import {
  esc, num, fcfa, date, pct, icon, badge, scorePill, pageHead, empty, toast, modal,
  barsH, funnel, columns, tableau,
} from './ui.js';
import { scoreLocal, trierCandidats, moteurDistantDisponible } from './ia.js';

// ---------- Accès aux données ----------
const D = () => db();
export const ent = (id) => D().entreprises.find((x) => x.id === id);
export const off = (id) => D().offres.find((x) => x.id === id);
export const stg = (id) => D().stagiaires.find((x) => x.id === id);
export const cand = (id) => D().candidatures.find((x) => x.id === id);
export const conv = (id) => D().conventions.find((x) => x.id === id);
export const me = () => session();
const qui = () => me()?.nom || 'Anonyme';
const commit = (action) => { log(qui(), action); save(); };
const go = (h) => { location.hash = h; };
export const rerender = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
// Historique d'une candidature (affiché dans la fiche candidat de l'espace recruteur)
export function trace(c, texte) { (c.historique ??= []).push({ date: new Date().toISOString(), auteur: qui(), texte }); }

export const cadreDe = (entId) => D().conventions.find((c) => c.type === 'CADRE' && c.entrepriseId === entId);
export const peutPublier = (entId) => { const c = cadreDe(entId); return Boolean(c && convComplete(c)); };
const nomCand = (c, s) => (['soumise', 'non_retenue_ia'].includes(c.statut) ? `Candidat·e n° ${c.id.split('-')[1]}` : `${s.prenom} ${s.nom}`);

// Partie que l'utilisateur courant peut signer sur une convention
export function partiePourMoi(c) {
  const u = me(); if (!u) return null;
  const map = { mfp: 'MFP', de: 'DE' };
  let role = map[u.role];
  if (u.role === 'entreprise' && c.entrepriseId === u.orgId) role = 'ENTREPRISE';
  if (u.role === 'stagiaire' && c.stagiaireId === u.orgId) role = 'STAGIAIRE';
  const p = c.parties.find((x) => x.role === role);
  return p && !p.signe ? p : null;
}

export function conventionsVisibles() {
  const u = me();
  return D().conventions.filter((c) => {
    if (['admin', 'primature', 'mfp'].includes(u.role)) return true;
    if (u.role === 'de') return c.type !== 'CADRE';
    if (u.role === 'entreprise') return c.entrepriseId === u.orgId;
    if (u.role === 'stagiaire') return c.stagiaireId === u.orgId;
    return false;
  });
}

const statutCand = (s) => { const x = STATUTS_CAND[s] || { label: s, ton: 'neutre' }; return badge(x.label, x.ton); };
function statutConv(c) {
  if (convComplete(c)) return badge('Signée', 'ok');
  const manque = c.parties.filter((p) => !p.signe).map((p) => (p.role === 'ENTREPRISE' ? 'entreprise' : p.role === 'STAGIAIRE' ? 'stagiaire' : p.role === 'DE' ? 'DE' : 'Ministère'));
  return badge(`En attente : ${manque.join(', ')}`, 'attention');
}
const statutEnt = (e) => ({ validee: badge('Validée', 'ok'), en_attente: badge('À valider', 'attention'), rejetee: badge('Rejetée', 'gris') }[e.statut]);

const opts = (arr, sel) => arr.map((v) => `<option${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');

// =====================================================================
// Entreprises
// =====================================================================
export function vueEntreprises(_, q) {
  const onglet = q.get('statut') || 'en_attente';
  const liste = D().entreprises.filter((e) => e.statut === onglet);
  const peutValider = ['mfp', 'admin'].includes(me().role);
  const n = (s) => D().entreprises.filter((e) => e.statut === s).length;
  const html = `${pageHead('Entreprises volontaires', 'Inscriptions, validation par le Ministère et conventions cadre')}
    <nav class="onglets">${[['en_attente', 'À valider'], ['validee', 'Partenaires'], ['rejetee', 'Rejetées']].map(([k, l]) =>
      `<a href="#/entreprises?statut=${k}" class="${k === onglet ? 'on' : ''}">${l} <span class="compte">${n(k)}</span></a>`).join('')}</nav>
    ${liste.length ? `<div class="table-wrap"><table><thead><tr><th>Raison sociale</th><th>Secteur</th><th>Région</th><th>Effectif</th><th>NINEA</th><th>Inscription</th><th>Statut</th><th></th></tr></thead><tbody>
    ${liste.map((e) => `<tr><td><a href="#/entreprise/${e.id}"><strong>${esc(e.raisonSociale)}</strong></a></td><td>${esc(e.secteur)}</td><td>${esc(e.region)}</td>
      <td>${num(e.effectif)}</td><td class="mono">${esc(e.ninea)}</td><td>${date(e.dateInscription)}</td><td>${statutEnt(e)}</td>
      <td class="td-actions">${peutValider && e.statut === 'en_attente' ? `<button class="btn btn--petit btn--primaire" data-valider="${e.id}">Valider</button><button class="btn btn--petit" data-rejeter="${e.id}">Rejeter</button>` : `<a class="btn btn--petit" href="#/entreprise/${e.id}">Voir</a>`}</td></tr>`).join('')}
    </tbody></table></div>` : empty('Aucune entreprise dans cette catégorie.')}`;
  return [html, (root) => {
    root.querySelectorAll('[data-valider]').forEach((b) => b.onclick = () => validerEntreprise(b.dataset.valider));
    root.querySelectorAll('[data-rejeter]').forEach((b) => b.onclick = () => rejeterEntreprise(b.dataset.rejeter));
  }];
}

function validerEntreprise(id) {
  const e = ent(id);
  modal(`Valider ${e.raisonSociale}`, `<p>La validation crée la <strong>convention cadre Ministère – Entreprise</strong>, à signer par les deux parties. L'entreprise pourra publier ses offres une fois la convention signée.</p>
    <label class="check"><input type="checkbox" required> J'ai vérifié le NINEA (${esc(e.ninea)}) et le RCCM (${esc(e.rccm)}).</label>`, {
    valider: 'Valider et générer la convention',
    onValider: () => {
      e.statut = 'validee'; e.dateValidation = new Date().toISOString();
      D().conventions.push({
        id: uid('cv'), reference: nextReference('CADRE'), type: 'CADRE', entrepriseId: e.id, dateCreation: new Date().toISOString(),
        parties: [{ role: 'MFP', signe: false }, { role: 'ENTREPRISE', signe: false }],
      });
      commit(`Validation de l'entreprise ${e.raisonSociale} et génération de la convention cadre`);
      toast('Entreprise validée — convention cadre générée'); rerender();
    },
  });
}
function rejeterEntreprise(id) {
  const e = ent(id);
  modal(`Rejeter ${e.raisonSociale}`, `<label>Motif communiqué à l'entreprise<textarea name="motif" required rows="3"></textarea></label>`, {
    valider: 'Rejeter', onValider: ({ motif }) => {
      e.statut = 'rejetee'; e.motifRejet = motif;
      commit(`Rejet de l'inscription de ${e.raisonSociale} : ${motif}`); toast('Inscription rejetée', 'info'); rerender();
    },
  });
}

export function vueEntreprise([id]) {
  const e = ent(id); if (!e) return empty('Entreprise introuvable');
  const offres = D().offres.filter((o) => o.entrepriseId === id);
  const convs = D().conventions.filter((c) => c.entrepriseId === id);
  const enStage = D().candidatures.filter((c) => c.statut === 'en_stage' && off(c.offreId)?.entrepriseId === id).length;
  const peutValider = ['mfp', 'admin'].includes(me().role) && e.statut === 'en_attente';
  const html = `${pageHead(e.raisonSociale, `${esc(e.secteur)} · ${esc(e.region)} · ${statutEnt(e)}`, peutValider ? `<button class="btn btn--primaire" data-valider>Valider</button><button class="btn" data-rejeter>Rejeter</button>` : '', '#/entreprises?statut=' + e.statut)}
    <div class="grille-2">
      <section class="carte"><h2>Identification</h2><dl class="dl">
        <dt>NINEA</dt><dd class="mono">${esc(e.ninea)}</dd><dt>RCCM</dt><dd class="mono">${esc(e.rccm)}</dd>
        <dt>Effectif</dt><dd>${num(e.effectif)} salariés</dd><dt>Adresse</dt><dd>${esc(e.adresse)}</dd>
        <dt>Contact</dt><dd>${esc(e.contact)} — ${esc(e.fonction)}</dd><dt>E-mail</dt><dd>${esc(e.email)}</dd><dt>Téléphone</dt><dd>${esc(e.tel)}</dd>
        <dt>Inscription</dt><dd>${date(e.dateInscription)}</dd>${e.motifRejet ? `<dt>Motif de rejet</dt><dd>${esc(e.motifRejet)}</dd>` : ''}</dl></section>
      <section class="carte"><h2>Engagement</h2><div class="kpis kpis--3">
        <div><strong>${offres.length}</strong><span>offres</span></div><div><strong>${offres.reduce((a, o) => a + o.places, 0)}</strong><span>places</span></div><div><strong>${enStage}</strong><span>stagiaires en poste</span></div></div>
        <h3>Conventions</h3>${convs.length ? `<ul class="liste">${convs.map((c) => `<li><a href="#/convention/${c.id}">${esc(TYPES_CONV[c.type].court)} — ${esc(c.reference)}</a> ${statutConv(c)}</li>`).join('')}</ul>` : '<p class="muted">Aucune convention.</p>'}
      </section></div>
    <section class="carte"><h2>Offres de stage</h2>${listeOffres(offres)}</section>`;
  return [html, (root) => {
    root.querySelector('[data-valider]')?.addEventListener('click', () => validerEntreprise(id));
    root.querySelector('[data-rejeter]')?.addEventListener('click', () => rejeterEntreprise(id));
  }];
}

// =====================================================================
// Offres
// =====================================================================
function listeOffres(offres, { candidat } = {}) {
  if (!offres.length) return empty('Aucune offre.');
  return `<div class="offres">${offres.map((o) => {
    const e = ent(o.entrepriseId);
    const nC = D().candidatures.filter((c) => c.offreId === o.id).length;
    const expiree = new Date(o.dateLimite) < new Date();
    const adeq = candidat ? scoreLocal(o, candidat).score : null;
    return `<a class="offre" href="#/offre/${o.id}">
      <div class="offre-h"><span class="offre-ent">${esc(e.raisonSociale)}</span><span class="volet">${esc((o.volet || 'Stage citoyen professionnalisant').split(' ')[0] === 'Service' ? 'Service civique' : (o.volet || '').startsWith('Saison') ? 'Saison citoyenne' : 'Stage citoyen')}</span>${adeq != null ? scorePill(adeq, D().params.seuilIA) : ''}</div>
      <h3>${esc(o.titre)}</h3>
      <p class="offre-meta">${icon('map')} ${esc(o.region)} · ${icon('clock')} ${o.duree} mois · ${icon('graduation')} ${esc(o.niveau)}</p>
      <div class="tags">${o.competences.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
      <div class="offre-f"><span>${fcfa(o.salaire)} / mois</span><span>${expiree || o.statut === 'cloturee' ? badge('Clôturée', 'gris') : `Jusqu'au ${date(o.dateLimite)}`}</span>
      ${candidat ? '' : `<span class="muted">${nC} candidature(s)</span>`}</div></a>`;
  }).join('')}</div>`;
}

export function vueOffres(_, q) {
  const u = me();
  const txt = (q.get('q') || '').toLowerCase();
  const region = q.get('region') || '';
  const secteur = q.get('secteur') || '';
  let offres = D().offres;
  if (u.role === 'entreprise') offres = offres.filter((o) => o.entrepriseId === u.orgId);
  if (u.role === 'stagiaire') offres = offres.filter((o) => o.statut === 'publiee' && new Date(o.dateLimite) >= new Date());
  offres = offres.filter((o) => (!region || o.region === region) && (!secteur || o.domaine === secteur)
    && (!txt || `${o.titre} ${o.competences.join(' ')} ${ent(o.entrepriseId).raisonSociale}`.toLowerCase().includes(txt)));
  const candidat = u.role === 'stagiaire' ? stg(u.orgId) : null;
  if (candidat) offres = [...offres].sort((a, b) => scoreLocal(b, candidat).score - scoreLocal(a, candidat).score);
  const peutCreer = u.role === 'entreprise';
  const html = `${pageHead(u.role === 'entreprise' ? 'Mes offres de stage' : 'Offres de stage', candidat ? 'Triées selon l\'adéquation avec votre profil' : `${offres.length} offre(s)`,
    peutCreer ? `<a class="btn btn--primaire" href="#/offre-nouvelle">${icon('plus')} Publier une offre</a>` : '')}
    <form class="filtres" id="filtres">
      <input type="search" name="q" placeholder="Métier, compétence, entreprise…" value="${esc(q.get('q') || '')}">
      <select name="region"><option value="">Toutes les régions</option>${opts(REGIONS, region)}</select>
      <select name="secteur"><option value="">Tous les secteurs</option>${opts(SECTEURS, secteur)}</select>
      <button class="btn">Filtrer</button></form>
    ${listeOffres(offres, { candidat })}`;
  return [html, (root) => {
    root.querySelector('#filtres').onsubmit = (e) => {
      e.preventDefault();
      const p = new URLSearchParams([...new FormData(e.target)].filter(([, v]) => v));
      go(`#/offres?${p}`);
    };
  }];
}

export function vueOffreNouvelle() {
  const u = me();
  if (u.role !== 'entreprise') return empty('Réservé aux entreprises partenaires.');
  if (!peutPublier(u.orgId)) {
    const c = cadreDe(u.orgId);
    return `${pageHead('Publier une offre', '', '', '#/offres')}<div class="alerte">${icon('alert')}<div><strong>Convention cadre requise.</strong>
      <p>${c ? `Votre convention cadre <a href="#/convention/${c.id}">${esc(c.reference)}</a> doit être signée par votre entreprise et par le Ministère avant de publier des offres.` : 'Votre inscription est en cours de validation par le Ministère de la Formation professionnelle.'}</p></div></div>`;
  }
  const e = ent(u.orgId); const P = D().params;
  const html = `${pageHead('Publier une offre de stage', `${esc(e.raisonSociale)} — l'État prend en charge ${P.tauxEtat} % de l'indemnité mensuelle`, '', '#/offres')}
    <form class="carte form" id="f-offre">
      <div class="grille-3">
        <label>Intitulé du poste<input name="titre" required placeholder="Ex. Technicien·ne de maintenance"></label>
        <label>Domaine<select name="domaine">${opts(SECTEURS, e.secteur)}</select></label>
        <label>Volet du programme<select name="volet">${opts(VOLETS, VOLETS[0])}</select></label>
      </div>
      <div class="assistant-ia">${icon('sparkles')}<div><strong>Fiche de poste assistée par IA</strong><p class="muted petit">Saisissez l'intitulé, le domaine et le niveau : l'assistant rédige la description, les missions et les compétences, que vous pouvez modifier.</p></div>
        <button type="button" class="btn" data-fiche-ia>${icon('sparkles')} Rédiger avec l'IA</button></div>
      <label>Description<textarea name="description" rows="3" required>Au sein de ${esc(e.raisonSociale)}, vous serez accompagné·e par un tuteur…</textarea></label>
      <label>Missions (une par ligne)<textarea name="missions" rows="3" required></textarea></label>
      <label>Compétences recherchées (séparées par des virgules)<input name="competences" required placeholder="Excel, Relation client, Anglais"></label>
      <div class="grille-3">
        <label>Niveau requis<select name="niveau">${opts(NIVEAUX, 'BT / BTS')}</select></label>
        <label>Région<select name="region">${opts(REGIONS, e.region)}</select></label>
        <label>Nombre de places<input name="places" type="number" min="1" max="50" value="1" required></label>
        <label>Durée (mois)<input name="duree" type="number" min="3" max="${P.dureeMax}" value="6" required></label>
        <label>Indemnité mensuelle (FCFA)<input name="salaire" type="number" min="${P.salaireMin}" step="5000" value="150000" required></label>
        <label>Date limite de candidature<input name="dateLimite" type="date" required value="${new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)}"></label>
      </div>
      <div class="repartition" id="repartition"></div>
      <div class="form-f"><a class="btn" href="#/offres">Annuler</a><button class="btn btn--primaire">Publier l'offre</button></div>
    </form>`;
  return [html, (root) => {
    const f = root.querySelector('#f-offre');
    const maj = () => {
      const s = +f.salaire.value || 0, d = +f.duree.value || 0, n = +f.places.value || 0;
      const etat = Math.round(s * P.tauxEtat / 100);
      root.querySelector('#repartition').innerHTML = `<div><span>Part État (Direction de l'Emploi)</span><strong>${fcfa(etat)} / mois</strong></div>
        <div><span>Part entreprise</span><strong>${fcfa(s - etat)} / mois</strong></div>
        <div><span>Coût total pour ${n} stagiaire(s) sur ${d} mois</span><strong>${fcfa(s * d * n)}</strong></div>`;
    };
    f.addEventListener('input', maj); maj();
    root.querySelector('[data-fiche-ia]').onclick = async (ev) => {
      const b = ev.currentTarget;
      if (!f.titre.value.trim()) { f.titre.focus(); return toast("Saisissez d'abord l'intitulé du poste", 'info'); }
      b.disabled = true; b.innerHTML = `${icon('sparkles')} Rédaction…`;
      const { genererFiche } = await import('./recrutement.js');
      const r = await genererFiche({ titre: f.titre.value, domaine: f.domaine.value, niveau: f.niveau.value, entreprise: e.raisonSociale, region: f.region.value });
      f.description.value = r.description; f.missions.value = r.missions.join('\n'); f.competences.value = r.competences.join(', ');
      b.disabled = false; b.innerHTML = `${icon('sparkles')} Rédiger à nouveau`;
      toast(r.moteur === 'claude' ? 'Fiche rédigée par Claude' : 'Fiche proposée par l\'assistant local');
    };
    f.onsubmit = (ev) => {
      ev.preventDefault();
      const v = Object.fromEntries(new FormData(f));
      const o = {
        id: uid('off'), entrepriseId: u.orgId, titre: v.titre.trim(), description: v.description.trim(),
        missions: v.missions.split('\n').map((x) => x.trim()).filter(Boolean),
        competences: v.competences.split(',').map((x) => x.trim()).filter(Boolean),
        niveau: v.niveau, domaine: v.domaine, region: v.region, volet: v.volet, duree: +v.duree, places: +v.places, salaire: +v.salaire,
        dateLimite: new Date(v.dateLimite + 'T23:59:00').toISOString(), datePublication: new Date().toISOString(), statut: 'publiee',
      };
      D().offres.push(o); commit(`Publication de l'offre « ${o.titre} »`);
      toast('Offre publiée'); go(`#/offre/${o.id}`);
    };
  }];
}

export function vueOffre([id]) {
  const o = off(id); if (!o) return empty('Offre introuvable');
  const e = ent(o.entrepriseId); const u = me();
  const proprio = u.role === 'entreprise' && u.orgId === o.entrepriseId;
  const cands = D().candidatures.filter((c) => c.offreId === id);
  const dejaPostule = u.role === 'stagiaire' && cands.find((c) => c.stagiaireId === u.orgId);
  const ouverte = o.statut === 'publiee' && new Date(o.dateLimite) >= new Date();
  const candidat = u.role === 'stagiaire' ? stg(u.orgId) : null;
  const adeq = candidat ? scoreLocal(o, candidat) : null;
  const P = D().params;
  let actions = '';
  if (u.role === 'stagiaire') actions = dejaPostule ? `<a class="btn" href="#/candidatures">Candidature envoyée — suivre</a>` : ouverte ? `<button class="btn btn--primaire" data-postuler>${icon('pen')} Postuler</button>` : badge('Candidatures closes', 'gris');
  if (proprio || ['admin', 'mfp'].includes(u.role)) actions = `${proprio || u.role === 'admin' ? `<a class="btn" href="#/recrutement/${id}">${icon('grid')} Pipeline</a>` : ''}<a class="btn btn--primaire" href="#/offre/${id}/candidats">${icon('users')} Candidatures (${cands.length})</a>${proprio && o.statut === 'publiee' ? '<button class="btn" data-cloturer>Clôturer</button>' : ''}`;
  const html = `${pageHead(o.titre, `<a href="#/carriere/${e.id}">${esc(e.raisonSociale)}</a> · ${esc(o.region)}`, actions, u.role === 'entreprise' || u.role === 'stagiaire' ? '#/offres' : `#/entreprise/${e.id}`)}
    <div class="grille-2-1">
      <section class="carte"><h2>Le stage</h2><p>${esc(o.description)}</p>
        <h3>Missions</h3><ul class="puces">${o.missions.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
        <h3>Compétences recherchées</h3><div class="tags">${o.competences.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div></section>
      <aside class="carte"><dl class="dl">
        <dt>Volet</dt><dd>${esc(o.volet || 'Stage citoyen professionnalisant')}</dd><dt>Domaine</dt><dd>${esc(o.domaine)}</dd><dt>Niveau</dt><dd>${esc(o.niveau)}</dd><dt>Durée</dt><dd>${o.duree} mois</dd>
        <dt>Places</dt><dd>${o.places}</dd><dt>Indemnité</dt><dd>${fcfa(o.salaire)} / mois<br><small class="muted">dont ${fcfa(o.salaire * P.tauxEtat / 100)} pris en charge par l'État</small></dd>
        <dt>Publication</dt><dd>${date(o.datePublication)}</dd><dt>Date limite</dt><dd>${date(o.dateLimite)}</dd><dt>Statut</dt><dd>${ouverte ? badge('Ouverte', 'ok') : badge('Clôturée', 'gris')}</dd></dl>
        ${adeq ? `<div class="adeq"><h3>Votre adéquation estimée ${scorePill(adeq.score, P.seuilIA)}</h3>
          <ul class="puces puces--ok">${adeq.pointsForts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          ${adeq.pointsVigilance.length ? `<ul class="puces puces--att">${adeq.pointsVigilance.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          <p class="note">Estimation indicative. Complétez <a href="#/profil">votre profil</a> pour l'améliorer.</p></div>` : ''}
      </aside></div>`;
  return [html, (root) => {
    root.querySelector('[data-postuler]')?.addEventListener('click', () => {
      const s = stg(u.orgId);
      modal(`Postuler — ${o.titre}`, `<p class="muted">Votre profil (${esc(s.diplome)}, compétences : ${esc(s.competences.join(', '))}) sera transmis avec votre candidature.
        Le premier tri est réalisé par un moteur d'aide à la décision, <strong>sans tenir compte de votre nom, âge ou sexe</strong>.</p>
        <label>Lettre de motivation<textarea name="lettre" rows="6" required minlength="40" placeholder="Présentez votre motivation…"></textarea></label>
        <label class="check"><input type="checkbox" required> J'accepte le traitement de mes données dans le cadre du PNEC (loi n° 2008-12 sur la protection des données personnelles).</label>`, {
        valider: 'Envoyer ma candidature', onValider: ({ lettre }) => {
          const nc = { id: uid('cand'), offreId: o.id, stagiaireId: s.id, date: new Date().toISOString(), lettre, statut: 'soumise', source: 'Candidature spontanée' };
          trace(nc, 'Candidature reçue'); D().candidatures.push(nc);
          commit(`Candidature de ${s.prenom} ${s.nom} à l'offre « ${o.titre} »`); toast('Candidature envoyée'); go('#/candidatures');
        },
      });
    });
    root.querySelector('[data-cloturer]')?.addEventListener('click', () => {
      o.statut = 'cloturee'; commit(`Clôture de l'offre « ${o.titre} »`); toast('Offre clôturée', 'info'); rerender();
    });
  }];
}

// =====================================================================
// Candidatures d'une offre : tri IA, entretiens, décision
// =====================================================================
export function vueCandidats([id], q) {
  const o = off(id); if (!o) return empty('Offre introuvable');
  const u = me(); const P = D().params;
  const proprio = u.role === 'entreprise' && u.orgId === o.entrepriseId;
  if (!proprio && !['admin', 'mfp'].includes(u.role)) return empty('Accès réservé.');
  const filtre = q.get('f') || 'tous';
  const toutes = D().candidatures.filter((c) => c.offreId === id);
  const groupes = {
    tous: () => true,
    atrier: (c) => c.statut === 'soumise',
    presel: (c) => ['preselectionnee', 'entretien_planifie', 'entretien_realise'].includes(c.statut),
    decides: (c) => ['retenue', 'refusee', 'en_stage'].includes(c.statut),
    ecartes: (c) => c.statut === 'non_retenue_ia',
  };
  const liste = toutes.filter(groupes[filtre]).sort((a, b) => (b.entretien?.note ?? -1) - (a.entretien?.note ?? -1) || (b.scoreIA ?? -1) - (a.scoreIA ?? -1));
  const aTrier = toutes.filter((c) => c.statut === 'soumise').length;
  const retenus = toutes.filter((c) => ['retenue', 'en_stage'].includes(c.statut)).length;
  const html = `${pageHead(`Candidatures — ${o.titre}`, `${toutes.length} candidature(s) · ${retenus}/${o.places} place(s) pourvue(s) · seuil de présélection ${P.seuilIA}/100`,
    proprio || u.role === 'admin' ? `<button class="btn btn--primaire" data-tri ${aTrier ? '' : 'disabled'}>${icon('sparkles')} Lancer le tri IA (${aTrier})</button>` : '', `#/offre/${id}`)}
    <div class="info-ia" id="info-ia">${icon('shield')}<p>Le tri IA classe les candidatures selon l'adéquation au poste (compétences, formation, expérience, mobilité).
      Les noms restent masqués jusqu'à la présélection. <strong>La décision finale appartient toujours à l'entreprise</strong> : un·e candidat·e écarté·e peut être repêché·e.</p></div>
    <nav class="onglets">${[['tous', 'Toutes'], ['atrier', 'À trier'], ['presel', 'Présélection & entretiens'], ['decides', 'Décisions'], ['ecartes', 'Écartées au tri']].map(([k, l]) =>
      `<a href="#/offre/${id}/candidats?f=${k}" class="${k === filtre ? 'on' : ''}">${l} <span class="compte">${toutes.filter(groupes[k]).length}</span></a>`).join('')}</nav>
    ${liste.length ? `<div class="cands">${liste.map((c) => carteCandidat(c, o, proprio || u.role === 'admin')).join('')}</div>` : empty('Aucune candidature dans cette catégorie.')}`;
  return [html, (root) => {
    root.querySelector('[data-tri]')?.addEventListener('click', async (ev) => {
      const b = ev.currentTarget; b.disabled = true; b.innerHTML = `${icon('sparkles')} Analyse en cours…`;
      const cibles = toutes.filter((c) => c.statut === 'soumise');
      const { moteur, resultats } = await trierCandidats(o, cibles.map((c) => ({ ...stg(c.stagiaireId), id: c.id })), { autoriserDistant: P.iaDistante });
      let presel = 0;
      cibles.forEach((c) => {
        const r = resultats.get(c.id);
        c.scoreIA = r.score; c.detailIA = r; c.moteurIA = moteur; c.dateTri = new Date().toISOString();
        c.statut = r.score >= P.seuilIA ? 'preselectionnee' : 'non_retenue_ia';
        trace(c, `Tri IA (${moteur === 'claude' ? 'Claude' : 'moteur local'}) : ${r.score}/100 — ${c.statut === 'preselectionnee' ? 'présélection' : 'sous le seuil'}`);
        if (c.statut === 'preselectionnee') presel++;
      });
      commit(`Tri IA (${moteur === 'claude' ? 'Claude' : 'moteur local'}) de ${cibles.length} candidature(s) pour « ${o.titre} » : ${presel} présélectionnée(s)`);
      toast(`${cibles.length} candidature(s) analysée(s) — ${presel} présélectionnée(s)`);
      go(`#/offre/${id}/candidats?f=presel`);
    });
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => actionCandidat(b.dataset.act, b.dataset.id));
  }];
}

function carteCandidat(c, o, gestion) {
  const s = stg(c.stagiaireId); const P = D().params; const d = c.detailIA;
  const actions = [];
  if (gestion) {
    if (c.statut === 'preselectionnee') actions.push(`<button class="btn btn--petit btn--primaire" data-act="planifier" data-id="${c.id}">${icon('calendar')} Planifier l'entretien</button>`);
    if (c.statut === 'non_retenue_ia') actions.push(`<button class="btn btn--petit" data-act="repecher" data-id="${c.id}">Repêcher</button>`);
    if (c.statut === 'entretien_planifie') actions.push(`<a class="btn btn--petit btn--primaire" href="#/entretien/${c.id}">${icon('video')} Entretien & évaluation</a>`);
    if (c.statut === 'entretien_realise') actions.push(`<button class="btn btn--petit btn--primaire" data-act="retenir" data-id="${c.id}">Retenir</button><button class="btn btn--petit" data-act="refuser" data-id="${c.id}">Ne pas retenir</button>`);
    const pec = D().conventions.find((x) => x.candidatureId === c.id && x.type === 'PRISE_EN_CHARGE');
    if (pec) actions.push(`<a class="btn btn--petit" href="#/convention/${pec.id}">${icon('file')} Convention</a>`);
  }
  const anonyme = ['soumise', 'non_retenue_ia'].includes(c.statut);
  return `<article class="cand">
    <div class="cand-score">${scorePill(c.scoreIA, P.seuilIA)}${c.entretien?.note != null ? `<span class="note-ent" title="Note d'entretien">${c.entretien.note}<small>/20</small></span>` : ''}</div>
    <div class="cand-main">
      <div class="cand-h"><h3>${esc(nomCand(c, s))}</h3>${statutCand(c.statut)}${c.moteurIA ? `<span class="muted petit">tri ${c.moteurIA === 'claude' ? 'IA Claude' : 'moteur local'}</span>` : ''}</div>
      <p class="muted">${esc(s.diplome)} · ${esc(s.region)} · ${s.experience ? `${s.experience} mois d'expérience` : 'primo-demandeur'}${anonyme ? '' : ` · ${esc(s.email)} · ${esc(s.tel)}`}</p>
      ${d ? `<div class="cand-ia"><ul class="puces puces--ok">${d.pointsForts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        ${d.pointsVigilance.length ? `<ul class="puces puces--att">${d.pointsVigilance.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>` : ''}
      ${c.entretien ? `<p class="petit">${icon('calendar')} Entretien le ${date(c.entretien.date)} à ${esc(c.entretien.heure)}${c.entretien.commentaire ? ` — « ${esc(c.entretien.commentaire)} »` : ''}</p>` : ''}
      <details><summary>Lettre de motivation</summary><p>${esc(c.lettre)}</p></details>
    </div>
    <div class="cand-act">${actions.join('')}</div></article>`;
}

export function actionCandidat(act, id, apres) {
  const c = cand(id); const o = off(c.offreId); const s = stg(c.stagiaireId); const e = ent(o.entrepriseId);
  if (act === 'repecher') {
    c.statut = 'preselectionnee'; c.repeche = true; trace(c, 'Repêchage manuel en présélection');
    commit(`Repêchage manuel d'une candidature pour « ${o.titre} »`); toast('Candidature repêchée'); return (apres || rerender)();
  }
  if (act === 'planifier') {
    const demain = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    return modal(`Planifier l'entretien — ${s.prenom} ${s.nom}`, `<div class="grille-2">
      <label>Date<input type="date" name="date" required value="${demain}" min="${new Date().toISOString().slice(0, 10)}"></label>
      <label>Heure<input type="time" name="heure" required value="10:00"></label>
      <label>Durée (min)<select name="duree"><option>20</option><option selected>30</option><option>45</option><option>60</option></select></label>
      <label>Évaluateur<input name="evaluateur" required value="${esc(e.contact)}"></label></div>
      <p class="note">${icon('video')} Une salle de visioconférence sécurisée est générée automatiquement ; le lien est transmis au candidat dans son espace.</p>`, {
      valider: 'Planifier', onValider: (v) => {
        c.entretien = { ...v, duree: +v.duree, salle: `PNEC-${Math.random().toString(36).slice(2, 10)}-${c.id}`.replace(/[^A-Za-z0-9-]/g, '') };
        c.statut = 'entretien_planifie'; trace(c, `Entretien planifié le ${v.date} à ${v.heure} (${v.evaluateur})`);
        commit(`Entretien planifié le ${v.date} à ${v.heure} avec ${s.prenom} ${s.nom} (« ${o.titre} »)`); toast('Entretien planifié'); rerender();
      },
    });
  }
  if (act === 'retenir') {
    const pris = D().candidatures.filter((x) => x.offreId === o.id && ['retenue', 'en_stage'].includes(x.statut)).length;
    if (pris >= o.places) return toast(`Toutes les places (${o.places}) sont déjà pourvues`, 'erreur');
    const P = D().params;
    return modal(`Retenir ${s.prenom} ${s.nom}`, `<p>La sélection génère la <strong>convention de prise en charge</strong> entre ${esc(e.raisonSociale)} et la Direction de l'Emploi :
      l'État verse ${P.tauxEtat} % de l'indemnité, l'entreprise ${100 - P.tauxEtat} %. La convention de stage sera ensuite proposée au stagiaire.</p>
      <div class="grille-2"><label>Date de début<input type="date" name="dateDebut" required value="${new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10)}"></label>
      <label>Tuteur·rice<input name="tuteur" required value="${esc(e.contact)}"></label></div>
      <div class="repartition"><div><span>Indemnité</span><strong>${fcfa(o.salaire)} / mois</strong></div><div><span>Part État</span><strong>${fcfa(o.salaire * P.tauxEtat / 100)} / mois</strong></div><div><span>Durée</span><strong>${o.duree} mois</strong></div></div>`, {
      valider: 'Retenir et générer la convention', onValider: (v) => {
        c.statut = 'retenue'; c.dateDecision = new Date().toISOString(); trace(c, 'Retenu·e — convention de prise en charge générée');
        D().conventions.push({
          id: uid('cv'), reference: nextReference('PRISE_EN_CHARGE'), type: 'PRISE_EN_CHARGE', entrepriseId: e.id, stagiaireId: s.id, candidatureId: c.id, offreId: o.id,
          salaire: o.salaire, duree: o.duree, tauxEtat: P.tauxEtat, dateDebut: v.dateDebut, tuteur: v.tuteur, dateCreation: new Date().toISOString(),
          parties: [{ role: 'ENTREPRISE', signe: false }, { role: 'DE', signe: false }],
        });
        commit(`Sélection finale de ${s.prenom} ${s.nom} pour « ${o.titre} » — convention de prise en charge générée`); toast('Candidat·e retenu·e — convention générée'); rerender();
      },
    });
  }
  if (act === 'refuser') {
    c.statut = 'refusee'; c.dateDecision = new Date().toISOString(); trace(c, 'Non retenu·e après entretien');
    commit(`Candidature de ${s.prenom} ${s.nom} non retenue (« ${o.titre} »)`); toast('Décision enregistrée', 'info'); rerender();
  }
}

// =====================================================================
// Sélection finale (vue entreprise, toutes offres)
// =====================================================================
export function vueSelection() {
  const u = me();
  const offres = D().offres.filter((o) => u.role !== 'entreprise' || o.entrepriseId === u.orgId);
  const blocs = offres.map((o) => {
    const cs = D().candidatures.filter((c) => c.offreId === o.id && ['entretien_realise', 'retenue', 'en_stage'].includes(c.statut))
      .sort((a, b) => (b.entretien?.note ?? 0) - (a.entretien?.note ?? 0));
    if (!cs.length) return '';
    const pris = cs.filter((c) => c.statut !== 'entretien_realise').length;
    return `<section class="carte"><div class="carte-h"><h2><a href="#/offre/${o.id}">${esc(o.titre)}</a></h2><span>${pris}/${o.places} place(s) pourvue(s)</span></div>
      <div class="cands">${cs.map((c) => carteCandidat(c, o, u.role === 'entreprise' || u.role === 'admin')).join('')}</div></section>`;
  }).join('');
  return [`${pageHead('Sélection finale', 'Candidat·e·s ayant passé l\'entretien, classé·e·s par note')}${blocs || empty('Aucun entretien réalisé pour le moment.')}`,
    (root) => root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => actionCandidat(b.dataset.act, b.dataset.id))];
}

// =====================================================================
// Candidatures du stagiaire
// =====================================================================
const ETAPES = ['Candidature', 'Tri IA', 'Entretien', 'Sélection', 'Conventions', 'Stage'];
function etapeIndex(c) {
  return { soumise: 0, preselectionnee: 1, non_retenue_ia: 1, entretien_planifie: 2, entretien_realise: 2, refusee: 3, retenue: 4, en_stage: 5 }[c.statut] ?? 0;
}
export function vueMesCandidatures() {
  const u = me();
  const cs = D().candidatures.filter((c) => c.stagiaireId === u.orgId).sort((a, b) => b.date.localeCompare(a.date));
  const P = D().params;
  const html = `${pageHead('Mes candidatures', `${cs.length} candidature(s)`, `<a class="btn btn--primaire" href="#/offres">${icon('search')} Trouver une offre</a>`)}
    ${cs.length ? cs.map((c) => {
      const o = off(c.offreId); const e = ent(o.entrepriseId); const i = etapeIndex(c);
      const echec = ['non_retenue_ia', 'refusee'].includes(c.statut);
      const convs = D().conventions.filter((x) => x.candidatureId === c.id);
      return `<article class="carte suivi">
        <div class="carte-h"><div><h2><a href="#/offre/${o.id}">${esc(o.titre)}</a></h2><p class="muted">${esc(e.raisonSociale)} · envoyée le ${date(c.date)}</p></div>${statutCand(c.statut)}</div>
        <ol class="etapes">${ETAPES.map((l, k) => `<li class="${k < i || (k === i && !echec) ? 'fait' : ''}${k === i ? ' cour' : ''}${k === i && echec ? ' echec' : ''}">${l}</li>`).join('')}</ol>
        ${c.statut === 'entretien_planifie' ? `<div class="rdv">${icon('video')}<div><strong>Entretien en ligne le ${date(c.entretien.date)} à ${esc(c.entretien.heure)}</strong><p class="muted">Durée ${c.entretien.duree} min · avec ${esc(c.entretien.evaluateur)}</p></div>
          <a class="btn btn--primaire" href="${esc(P.visioBase + c.entretien.salle)}" target="_blank" rel="noopener">Rejoindre la salle</a></div>` : ''}
        ${c.statut === 'non_retenue_ia' ? '<p class="note">Votre profil ne correspond pas suffisamment aux compétences demandées pour cette offre. Consultez les offres les plus adaptées à votre profil.</p>' : ''}
        ${convs.length ? `<ul class="liste">${convs.map((x) => `<li><a href="#/convention/${x.id}">${esc(TYPES_CONV[x.type].court)} — ${esc(x.reference)}</a> ${statutConv(x)} ${partiePourMoi(x) ? badge('À signer', 'rouge') : ''}</li>`).join('')}</ul>` : ''}
      </article>`;
    }).join('') : empty('Vous n\'avez pas encore postulé.')}`;
  return html;
}

// =====================================================================
// Entretiens
// =====================================================================
export function vueEntretiens() {
  const u = me(); const P = D().params;
  let cs = D().candidatures.filter((c) => c.entretien);
  if (u.role === 'entreprise') cs = cs.filter((c) => off(c.offreId).entrepriseId === u.orgId);
  if (u.role === 'stagiaire') cs = cs.filter((c) => c.stagiaireId === u.orgId);
  const today = new Date().toISOString().slice(0, 10);
  const avenir = cs.filter((c) => c.statut === 'entretien_planifie').sort((a, b) => (a.entretien.date + a.entretien.heure).localeCompare(b.entretien.date + b.entretien.heure));
  const passes = cs.filter((c) => c.statut !== 'entretien_planifie').sort((a, b) => b.entretien.date.localeCompare(a.entretien.date));
  const ligne = (c) => {
    const o = off(c.offreId); const s = stg(c.stagiaireId);
    const retard = c.entretien.date < today && c.statut === 'entretien_planifie';
    return `<tr><td><strong>${date(c.entretien.date)}</strong><br><span class="muted">${esc(c.entretien.heure)} · ${c.entretien.duree} min</span></td>
      <td>${u.role === 'stagiaire' ? esc(ent(o.entrepriseId).raisonSociale) : `${esc(s.prenom)} ${esc(s.nom)}`}</td><td><a href="#/offre/${o.id}">${esc(o.titre)}</a></td>
      <td>${retard ? badge('À évaluer', 'rouge') : statutCand(c.statut)}${c.entretien.note != null ? ` <strong>${c.entretien.note}/20</strong>` : ''}</td>
      <td class="td-actions">${c.statut === 'entretien_planifie' ? `<a class="btn btn--petit" href="${esc(P.visioBase + c.entretien.salle)}" target="_blank" rel="noopener">${icon('video')} Visio</a>` : ''}
      ${u.role !== 'stagiaire' ? `<a class="btn btn--petit btn--primaire" href="#/entretien/${c.id}">${c.statut === 'entretien_planifie' ? 'Évaluer' : 'Voir'}</a>` : ''}</td></tr>`;
  };
  const tab = (rows) => `<div class="table-wrap"><table><thead><tr><th>Date</th><th>${u.role === 'stagiaire' ? 'Entreprise' : 'Candidat·e'}</th><th>Offre</th><th>Statut</th><th></th></tr></thead><tbody>${rows.map(ligne).join('')}</tbody></table></div>`;
  return `${pageHead('Entretiens en ligne', 'Planification et visioconférence intégrée')}
    <section class="carte"><h2>À venir (${avenir.length})</h2>${avenir.length ? tab(avenir) : empty('Aucun entretien planifié.')}</section>
    <section class="carte"><h2>Réalisés (${passes.length})</h2>${passes.length ? tab(passes) : empty('Aucun entretien réalisé.')}</section>`;
}

export function vueEntretien([id]) {
  const c = cand(id); if (!c?.entretien) return empty('Entretien introuvable');
  const o = off(c.offreId); const s = stg(c.stagiaireId); const u = me(); const P = D().params;
  const peutEvaluer = (u.role === 'entreprise' && u.orgId === o.entrepriseId) || u.role === 'admin';
  const n = c.entretien.notes || {};
  const crit = [['motivation', 'Motivation et engagement citoyen'], ['technique', 'Compétences techniques'], ['communication', 'Communication'], ['adequation', 'Adéquation au poste']];
  const lien = P.visioBase + c.entretien.salle;
  const html = `${pageHead(`Entretien — ${s.prenom} ${s.nom}`, `${esc(o.titre)} · ${date(c.entretien.date)} à ${esc(c.entretien.heure)}`, '', `#/offre/${o.id}/candidats?f=presel`)}
    <div class="grille-2-1">
      <section class="carte visio">
        <div class="visio-ecran">${icon('video')}<p><strong>Salle ${esc(c.entretien.salle)}</strong></p><p class="muted">Visioconférence chiffrée, sans installation, accessible depuis un téléphone.</p>
          <a class="btn btn--primaire" href="${esc(lien)}" target="_blank" rel="noopener">Ouvrir la salle d'entretien</a>
          <button class="btn btn--clair" data-copier>Copier le lien</button></div>
        ${peutEvaluer ? `<form id="f-eval" class="form"><h2>Grille d'évaluation</h2>
          ${crit.map(([k, l]) => `<fieldset class="etoiles"><legend>${l}</legend>${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="${k}" value="${v}" required ${n[k] === v ? 'checked' : ''}><span>${v}</span></label>`).join('')}</fieldset>`).join('')}
          <label>Appréciation<textarea name="commentaire" rows="3" required>${esc(c.entretien.commentaire || '')}</textarea></label>
          <div class="form-f"><button class="btn btn--primaire">${c.statut === 'entretien_planifie' ? 'Enregistrer l\'évaluation' : 'Mettre à jour'}</button></div></form>` : ''}
      </section>
      <aside class="carte"><h2>Profil</h2><dl class="dl">
        <dt>Formation</dt><dd>${esc(s.diplome)}</dd><dt>Compétences</dt><dd>${esc(s.competences.join(', '))}</dd>
        <dt>Expérience</dt><dd>${s.experience ? `${s.experience} mois` : 'Primo-demandeur'}</dd><dt>Région</dt><dd>${esc(s.region)}</dd>
        <dt>Contact</dt><dd>${esc(s.email)}<br>${esc(s.tel)}</dd><dt>Score IA</dt><dd>${scorePill(c.scoreIA, P.seuilIA)}</dd>
        ${c.entretien.note != null ? `<dt>Note d'entretien</dt><dd><strong>${c.entretien.note}/20</strong></dd>` : ''}</dl>
        <details open><summary>Lettre de motivation</summary><p>${esc(c.lettre)}</p></details></aside></div>`;
  return [html, (root) => {
    root.querySelector('[data-copier]').onclick = () => { navigator.clipboard?.writeText(lien); toast('Lien copié'); };
    const f = root.querySelector('#f-eval');
    if (f) f.onsubmit = (ev) => {
      ev.preventDefault();
      const v = Object.fromEntries(new FormData(f));
      const notes = Object.fromEntries(crit.map(([k]) => [k, +v[k]]));
      const total = Object.values(notes).reduce((a, b) => a + b, 0);
      c.entretien.notes = notes; c.entretien.note = Math.round((total / 20) * 20 * 10) / 10; c.entretien.commentaire = v.commentaire;
      if (c.statut === 'entretien_planifie') c.statut = 'entretien_realise';
      trace(c, `Entretien évalué : ${c.entretien.note}/20`);
      commit(`Évaluation de l'entretien de ${s.prenom} ${s.nom} : ${c.entretien.note}/20`);
      toast(`Évaluation enregistrée : ${c.entretien.note}/20`); go('#/selection');
    };
  }];
}

// =====================================================================
// Conventions
// =====================================================================
export function vueConventions(_, q) {
  const u = me();
  const type = q.get('type') || '';
  const etat = q.get('etat') || (['entreprise', 'stagiaire', 'mfp', 'de'].includes(u.role) ? 'asigner' : '');
  let cs = conventionsVisibles();
  const compte = (t, e) => cs.filter((c) => (!t || c.type === t) && filtreEtat(c, e)).length;
  function filtreEtat(c, e) { return !e || (e === 'asigner' ? Boolean(partiePourMoi(c)) : e === 'attente' ? !convComplete(c) : convComplete(c)); }
  cs = cs.filter((c) => (!type || c.type === type) && filtreEtat(c, etat)).sort((a, b) => b.dateCreation.localeCompare(a.dateCreation));
  const lien = (t, e) => `#/conventions?type=${t}&etat=${e}`;
  const html = `${pageHead('Conventions', 'Cadre Ministère – Entreprise · Prise en charge 50/50 avec la Direction de l\'Emploi · Stage')}
    <nav class="onglets">${[['', 'Toutes'], ['CADRE', 'Cadre MFPAI'], ['PRISE_EN_CHARGE', 'Prise en charge'], ['STAGE', 'Stage']].filter(([k]) => !(u.role === 'de' && k === 'CADRE')).map(([k, l]) =>
      `<a href="${lien(k, etat)}" class="${k === type ? 'on' : ''}">${l}</a>`).join('')}</nav>
    <div class="puces-filtre">${[['', 'Tous états'], ['asigner', 'À signer par moi'], ['attente', 'En attente'], ['signee', 'Signées']].map(([k, l]) =>
      `<a href="${lien(type, k)}" class="chip ${k === etat ? 'on' : ''}">${l} <span>${compte(type, k)}</span></a>`).join('')}</div>
    ${cs.length ? `<div class="table-wrap"><table><thead><tr><th>Référence</th><th>Type</th><th>Entreprise</th><th>Stagiaire</th><th>Montant État</th><th>Création</th><th>État</th><th></th></tr></thead><tbody>
    ${cs.map((c) => { const s = c.stagiaireId ? stg(c.stagiaireId) : null; const k = c.salaire ? coutConvention(c) : null; return `<tr>
      <td class="mono"><a href="#/convention/${c.id}">${esc(c.reference)}</a></td><td>${esc(TYPES_CONV[c.type].court)}</td><td>${esc(ent(c.entrepriseId).raisonSociale)}</td>
      <td>${s ? `${esc(s.prenom)} ${esc(s.nom)}` : '—'}</td><td>${k ? fcfa(k.etat) : '—'}</td><td>${date(c.dateCreation)}</td><td>${statutConv(c)}</td>
      <td class="td-actions">${partiePourMoi(c) ? `<a class="btn btn--petit btn--primaire" href="#/convention/${c.id}">${icon('pen')} Signer</a>` : `<a class="btn btn--petit" href="#/convention/${c.id}">Ouvrir</a>`}</td></tr>`; }).join('')}
    </tbody></table></div>` : empty('Aucune convention dans cette sélection.')}`;
  return html;
}

function articles(c) {
  const e = ent(c.entrepriseId); const s = c.stagiaireId ? stg(c.stagiaireId) : null; const o = c.offreId ? off(c.offreId) : null;
  const k = c.salaire ? coutConvention(c) : null;
  if (c.type === 'CADRE') return `
    <p>Entre <strong>le Ministère de la Formation professionnelle et de l'Apprentissage</strong>, représenté par le Directeur de la Formation professionnelle, ci-après « le Ministère »,</p>
    <p>et <strong>${esc(e.raisonSociale)}</strong>, NINEA ${esc(e.ninea)}, RCCM ${esc(e.rccm)}, sise à ${esc(e.adresse)}, représentée par ${esc(e.contact)}, ${esc(e.fonction)}, ci-après « l'Entreprise ».</p>
    <h3>Article 1 — Objet</h3><p>La présente convention fixe le cadre de la participation volontaire de l'Entreprise au Programme national d'Engagement citoyen (PNEC), par l'accueil de jeunes en stage d'insertion professionnelle.</p>
    <h3>Article 2 — Engagements de l'Entreprise</h3><p>L'Entreprise s'engage à publier ses offres sur la plateforme PNEC, à désigner un tuteur pour chaque stagiaire, à assurer des conditions d'accueil conformes au Code du travail et à verser la part de l'indemnité de stage qui lui incombe.</p>
    <h3>Article 3 — Engagements du Ministère</h3><p>Le Ministère assure la promotion des offres, l'accompagnement des stagiaires, le suivi pédagogique et la coordination avec la Direction de l'Emploi pour la prise en charge financière.</p>
    <h3>Article 4 — Prise en charge</h3><p>Pour chaque stagiaire retenu, une convention de prise en charge est conclue avec la Direction de l'Emploi, qui supporte ${D().params.tauxEtat} % de l'indemnité mensuelle de stage.</p>
    <h3>Article 5 — Durée</h3><p>La convention est conclue pour une durée de deux (2) ans à compter de sa signature, renouvelable par tacite reconduction.</p>`;
  if (c.type === 'PRISE_EN_CHARGE') return `
    <p>Entre <strong>la Direction de l'Emploi</strong>, ci-après « la DE », et <strong>${esc(e.raisonSociale)}</strong>, NINEA ${esc(e.ninea)}, représentée par ${esc(e.contact)}, ${esc(e.fonction)}, ci-après « l'Entreprise ».</p>
    <h3>Article 1 — Objet</h3><p>La présente convention organise la prise en charge partagée de l'indemnité de stage de <strong>${esc(s.prenom)} ${esc(s.nom)}</strong>, retenu·e pour le poste « ${esc(o?.titre || '')} » à l'issue de la procédure de sélection PNEC.</p>
    <h3>Article 2 — Durée</h3><p>Le stage débute le ${date(c.dateDebut)} pour une durée de ${c.duree} mois.</p>
    <h3>Article 3 — Répartition financière</h3>
    <table class="tab-doc"><tr><th></th><th>Mensuel</th><th>Total (${c.duree} mois)</th></tr>
      <tr><td>Indemnité de stage</td><td>${fcfa(k.mensuel)}</td><td>${fcfa(k.total)}</td></tr>
      <tr><td>Part DE (${c.tauxEtat} %)</td><td>${fcfa(k.etatMensuel)}</td><td>${fcfa(k.etat)}</td></tr>
      <tr><td>Part Entreprise (${100 - c.tauxEtat} %)</td><td>${fcfa(k.mensuel - k.etatMensuel)}</td><td>${fcfa(k.entreprise)}</td></tr></table>
    <p>L'Entreprise verse l'intégralité de l'indemnité au stagiaire et la DE rembourse sa quote-part chaque mois, sur présentation de l'attestation de présence validée par le tuteur.</p>
    <h3>Article 4 — Suivi</h3><p>L'Entreprise signale sans délai toute interruption du stage. La prise en charge cesse à la date de l'interruption.</p>`;
  return `
    <p>Entre <strong>${esc(e.raisonSociale)}</strong>, représentée par ${esc(e.contact)}, ${esc(e.fonction)}, ci-après « l'Entreprise »,</p>
    <p>et <strong>${esc(s.prenom)} ${esc(s.nom)}</strong>, né·e le ${date(s.dateNaissance)}, titulaire d'un ${esc(s.diplome)}, ci-après « le/la Stagiaire ».</p>
    <h3>Article 1 — Objet</h3><p>Le/la Stagiaire est accueilli·e en stage d'insertion professionnelle au poste « ${esc(o?.titre || '')} », dans le cadre du PNEC.</p>
    <h3>Article 2 — Durée et lieu</h3><p>Du ${date(c.dateDebut)} pour ${c.duree} mois, à ${esc(o?.region || e.region)}. Tuteur·rice : ${esc(c.tuteur || e.contact)}.</p>
    <h3>Article 3 — Indemnité</h3><p>Le/la Stagiaire perçoit une indemnité mensuelle de <strong>${fcfa(k.mensuel)}</strong>, financée à ${c.tauxEtat} % par l'État (Direction de l'Emploi) et à ${100 - c.tauxEtat} % par l'Entreprise.</p>
    <h3>Article 4 — Obligations</h3><p>Le/la Stagiaire respecte le règlement intérieur et la confidentialité. L'Entreprise assure l'encadrement, la sécurité et délivre une attestation de stage en fin de période.</p>
    <h3>Article 5 — Engagement citoyen</h3><p>Le/la Stagiaire participe aux actions d'engagement citoyen du programme (sessions de formation civique, actions communautaires).</p>`;
}

export function vueConvention([id]) {
  const c = conv(id); if (!c) return empty('Convention introuvable');
  if (!conventionsVisibles().includes(c)) return empty('Accès non autorisé à cette convention.');
  const moi = partiePourMoi(c);
  const html = `${pageHead(TYPES_CONV[c.type].label, `Référence ${esc(c.reference)} · ${statutConv(c)}`,
    `${moi ? `<button class="btn btn--primaire" data-signer>${icon('pen')} Signer électroniquement</button>` : ''}<button class="btn" data-print>${icon('print')} Imprimer</button>`, '#/conventions')}
    <article class="doc">
      <header class="doc-h"><div class="doc-rep"><strong>RÉPUBLIQUE DU SÉNÉGAL</strong><span>Un Peuple — Un But — Une Foi</span></div>
        <div class="drapeau"><i></i><i></i><i></i></div><p class="doc-prog">Programme national d'Engagement citoyen</p>
        <h2>${esc(TYPES_CONV[c.type].label)}</h2><p class="mono">N° ${esc(c.reference)}</p></header>
      ${articles(c)}
      <h3>Signatures</h3>
      <div class="signatures">${c.parties.map((p) => `<div class="sig ${p.signe ? 'sig--ok' : ''}">
        <span class="sig-r">${esc(p.role === 'ENTREPRISE' ? ent(c.entrepriseId).raisonSociale : p.role === 'STAGIAIRE' ? 'Le/la Stagiaire' : PARTIES[p.role])}</span>
        ${p.signe ? `${icon('check')}<strong>${esc(p.signataire)}</strong><span>Signé électroniquement le ${date(p.date)}</span>${p.empreinte ? `<span class="mono petit">Empreinte ${esc(p.empreinte)}</span>` : ''}` : '<em>En attente de signature</em>'}
      </div>`).join('')}</div>
    </article>`;
  return [html, (root) => {
    root.querySelector('[data-signer]')?.addEventListener('click', () => {
      const u = me();
      modal('Signature électronique', `<p>Vous signez la convention <strong>${esc(c.reference)}</strong> en qualité de <strong>${esc(PARTIES[moi.role])}</strong>.</p>
        <label>Nom et qualité du signataire<input name="signataire" required value="${esc(u.role === 'stagiaire' ? u.nom : u.role === 'entreprise' ? `${ent(u.orgId).contact}, ${ent(u.orgId).fonction}` : u.nom)}"></label>
        <label>Code de confirmation reçu par SMS<input name="otp" required inputmode="numeric" pattern="[0-9]{6}" placeholder="6 chiffres" maxlength="6"></label>
        <p class="note">Démonstration : saisissez n'importe quel code à 6 chiffres.</p>
        <label class="check"><input type="checkbox" required> J'ai lu la convention et j'en accepte les termes.</label>`, {
        valider: 'Signer', onValider: ({ signataire }) => {
          moi.signe = true; moi.date = new Date().toISOString(); moi.signataire = signataire;
          moi.empreinte = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
          let msg = 'Convention signée';
          if (convComplete(c)) {
            if (c.type === 'PRISE_EN_CHARGE' && !D().conventions.some((x) => x.type === 'STAGE' && x.candidatureId === c.candidatureId)) {
              D().conventions.push({
                id: uid('cv'), reference: nextReference('STAGE'), type: 'STAGE', entrepriseId: c.entrepriseId, stagiaireId: c.stagiaireId, candidatureId: c.candidatureId, offreId: c.offreId,
                salaire: c.salaire, duree: c.duree, tauxEtat: c.tauxEtat, dateDebut: c.dateDebut, tuteur: c.tuteur, dateCreation: new Date().toISOString(),
                parties: [{ role: 'ENTREPRISE', signe: false }, { role: 'STAGIAIRE', signe: false }],
              });
              msg = 'Convention signée — la convention de stage a été générée';
            }
            if (c.type === 'STAGE') { const k = cand(c.candidatureId); if (k) { k.statut = 'en_stage'; trace(k, 'Convention de stage signée — stage démarré'); } msg = 'Convention de stage signée — le stage peut démarrer'; }
          }
          commit(`Signature de la convention ${c.reference} (${PARTIES[moi.role]})`); toast(msg); rerender();
        },
      });
    });
  }];
}

// =====================================================================
// Profil stagiaire
// =====================================================================
export function vueProfil() {
  const u = me(); const s = stg(u.orgId); if (!s) return empty('Profil introuvable');
  const html = `${pageHead('Mon profil et mon CV', 'Ces informations servent au calcul de votre adéquation avec les offres')}
    <form class="carte form" id="f-profil">
      <div class="grille-3"><label>Prénom<input name="prenom" required value="${esc(s.prenom)}"></label><label>Nom<input name="nom" required value="${esc(s.nom)}"></label>
        <label>Téléphone<input name="tel" required value="${esc(s.tel)}"></label>
        <label>Région de résidence<select name="region">${opts(REGIONS, s.region)}</select></label>
        <label>Niveau de formation<select name="niveau">${opts(NIVEAUX, s.niveau)}</select></label>
        <label>Domaine<select name="domaine">${opts(SECTEURS, s.domaine)}</select></label>
        <label>Expérience (mois)<input type="number" name="experience" min="0" max="120" value="${s.experience}"></label></div>
      <label>Diplôme<input name="diplome" required value="${esc(s.diplome)}"></label>
      <label>Compétences (séparées par des virgules)<input name="competences" required value="${esc(s.competences.join(', '))}"></label>
      <label>Présentation / CV<textarea name="cvTexte" rows="5">${esc(s.cvTexte)}</textarea></label>
      <div class="form-f"><button class="btn btn--primaire">Enregistrer</button></div></form>`;
  return [html, (root) => {
    const f = root.querySelector('#f-profil');
    f.onsubmit = (ev) => {
      ev.preventDefault();
      const v = Object.fromEntries(new FormData(f));
      Object.assign(s, v, { experience: +v.experience, competences: v.competences.split(',').map((x) => x.trim()).filter(Boolean) });
      const usr = D().users.find((x) => x.orgId === s.id); if (usr) usr.nom = `${s.prenom} ${s.nom}`;
      commit(`Mise à jour du profil de ${s.prenom} ${s.nom}`); toast('Profil enregistré');
    };
  }];
}

// =====================================================================
// Pilotage national (Primature, Ministère, DE, Admin)
// =====================================================================
export function stats() {
  const d = D();
  const cs = d.candidatures;
  const pec = d.conventions.filter((c) => c.type === 'PRISE_EN_CHARGE');
  const pecSignees = pec.filter(convComplete);
  const enStage = cs.filter((c) => c.statut === 'en_stage');
  const engageEtat = pecSignees.reduce((a, c) => a + coutConvention(c).etat, 0);
  const mensuelEtat = pecSignees.reduce((a, c) => a + coutConvention(c).etatMensuel, 0);
  const totalEnt = pecSignees.reduce((a, c) => a + coutConvention(c).entreprise, 0);
  const stagiairesDe = (liste) => liste.map((c) => stg(c.stagiaireId));
  const femmes = stagiairesDe(enStage).filter((s) => s.sexe === 'F').length;
  return {
    entreprises: d.entreprises.filter((e) => e.statut === 'validee').length,
    entAttente: d.entreprises.filter((e) => e.statut === 'en_attente').length,
    offres: d.offres.filter((o) => o.statut === 'publiee').length,
    places: d.offres.reduce((a, o) => a + o.places, 0),
    inscrits: d.stagiaires.length,
    candidatures: cs.length,
    preselection: cs.filter((c) => c.scoreIA != null && c.statut !== 'non_retenue_ia').length,
    entretiens: cs.filter((c) => c.entretien).length,
    retenus: cs.filter((c) => ['retenue', 'en_stage'].includes(c.statut)).length,
    enStage: enStage.length, femmes, engageEtat, mensuelEtat, totalEnt,
    pecAttente: pec.filter((c) => !convComplete(c)).length,
    convAttente: d.conventions.filter((c) => !convComplete(c)).length,
  };
}

export function vuePilotage() {
  const d = D(); const S = stats();
  const parRegion = REGIONS.map((r) => ({
    label: r,
    value: d.candidatures.filter((c) => ['retenue', 'en_stage'].includes(c.statut) && off(c.offreId).region === r).length,
    extra: `${d.offres.filter((o) => o.region === r).reduce((a, o) => a + o.places, 0)} places offertes`,
  })).sort((a, b) => b.value - a.value);
  const parSecteur = SECTEURS.map((s) => ({ label: s, value: d.offres.filter((o) => o.domaine === s).reduce((a, o) => a + o.places, 0) }))
    .filter((r) => r.value).sort((a, b) => b.value - a.value);
  const mois = [...Array(6)].map((_, i) => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() - 5 + i); return x; });
  const parMois = mois.map((m) => ({
    label: m.toLocaleDateString('fr-FR', { month: 'short' }),
    value: d.candidatures.filter((c) => { const x = new Date(c.date); return x.getMonth() === m.getMonth() && x.getFullYear() === m.getFullYear(); }).length,
  }));
  const budgetSecteur = SECTEURS.map((s) => ({
    label: s, value: d.conventions.filter((c) => c.type === 'PRISE_EN_CHARGE' && convComplete(c) && ent(c.entrepriseId).secteur === s).reduce((a, c) => a + coutConvention(c).etat, 0),
  })).filter((r) => r.value).sort((a, b) => b.value - a.value);
  const kpi = (v, l, s = '') => `<div class="kpi"><strong>${v}</strong><span>${l}</span>${s ? `<small>${s}</small>` : ''}</div>`;
  const html = `${pageHead('Tableau de bord national', `Suivi du Programme national d'Engagement citoyen — données au ${date(new Date())}`, `<button class="btn" data-print>${icon('print')} Exporter</button>`)}
    <div class="kpis-band">
      ${kpi(num(S.entreprises), 'entreprises engagées', `${S.entAttente} en attente de validation`)}
      ${kpi(num(S.places), 'places de stage offertes', `${S.offres} offres publiées`)}
      ${kpi(num(S.candidatures), 'candidatures', `${num(S.inscrits)} jeunes inscrits`)}
      ${kpi(num(S.enStage), 'jeunes en stage', `${pct(S.femmes, S.enStage)} % de femmes`)}
      ${kpi(fcfa(S.engageEtat, true), 'FCFA engagés par l\'État', `${fcfa(S.mensuelEtat, true)} FCFA / mois`)}
      ${kpi(fcfa(S.totalEnt, true), 'FCFA apportés par les entreprises', 'effet de levier 1 pour 1')}
    </div>
    <div class="grille-2">
      <section class="carte"><h2>Parcours des candidatures</h2><p class="muted petit">Taux de passage d'une étape à l'autre</p>
        ${funnel([{ label: 'Candidatures', value: S.candidatures }, { label: 'Présélection IA', value: S.preselection }, { label: 'Entretiens', value: S.entretiens }, { label: 'Retenus', value: S.retenus }, { label: 'En stage', value: S.enStage }])}</section>
      <section class="carte"><h2>Candidatures par mois</h2><p class="muted petit">6 derniers mois</p>${columns(parMois)}</section>
      <section class="carte"><h2>Jeunes retenus par région</h2><p class="muted petit">Survolez une barre pour voir les places offertes</p>${barsH(parRegion)}
        <details class="table-alt"><summary>Voir le tableau</summary>${tableau(['Région', 'Retenus', 'Places offertes'], parRegion.map((r) => [r.label, r.value, r.extra]))}</details></section>
      <section class="carte"><h2>Places offertes par secteur</h2>${barsH(parSecteur)}
        <h2 class="mt">Engagement de l'État par secteur</h2>${barsH(budgetSecteur, { format: (v) => fcfa(v, true) })}</section>
    </div>
    <section class="carte"><h2>Points d'attention</h2><ul class="liste">
      <li>${icon('building')} ${S.entAttente} inscription(s) d'entreprise en attente de validation par le Ministère</li>
      <li>${icon('file')} ${S.pecAttente} convention(s) de prise en charge en attente de signature</li>
      <li>${icon('alert')} ${d.candidatures.filter((c) => c.statut === 'entretien_planifie' && c.entretien.date < new Date().toISOString().slice(0, 10)).length} entretien(s) passé(s) non évalué(s)</li>
      <li>${icon('map')} ${parRegion.filter((r) => !r.value).length} région(s) sans jeune retenu : ${esc(parRegion.filter((r) => !r.value).map((r) => r.label).join(', ') || '—')}</li></ul></section>`;
  return html;
}

// =====================================================================
// Administration
// =====================================================================
export function vueUtilisateurs(_, q) {
  const role = q.get('role') || '';
  const txt = (q.get('q') || '').toLowerCase();
  const us = D().users.filter((u) => (!role || u.role === role) && (!txt || `${u.nom} ${u.email}`.toLowerCase().includes(txt)));
  const html = `${pageHead('Utilisateurs', `${D().users.length} comptes`, `<button class="btn btn--primaire" data-ajout>${icon('plus')} Ajouter un compte</button>`, '#/accueil')}
    <form class="filtres" id="filtres"><input type="search" name="q" placeholder="Nom ou e-mail" value="${esc(q.get('q') || '')}">
      <select name="role"><option value="">Tous les rôles</option>${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${k === role ? 'selected' : ''}>${esc(r.court)}</option>`).join('')}</select><button class="btn">Filtrer</button></form>
    <div class="table-wrap"><table><thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Statut</th><th></th></tr></thead><tbody>
    ${us.slice(0, 200).map((u) => `<tr><td><strong>${esc(u.nom)}</strong></td><td>${esc(u.email)}</td>
      <td><select data-role="${u.id}" ${u.orgId ? 'disabled title="Rôle lié à une fiche entreprise ou stagiaire"' : ''}>${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${k === u.role ? 'selected' : ''}>${esc(r.court)}</option>`).join('')}</select></td>
      <td>${u.actif ? badge('Actif', 'ok') : badge('Suspendu', 'gris')}</td>
      <td class="td-actions"><button class="btn btn--petit" data-actif="${u.id}" ${u.id === me().id ? 'disabled' : ''}>${u.actif ? 'Suspendre' : 'Réactiver'}</button></td></tr>`).join('')}
    </tbody></table></div>`;
  return [html, (root) => {
    root.querySelector('#filtres').onsubmit = (e) => { e.preventDefault(); go(`#/admin/utilisateurs?${new URLSearchParams([...new FormData(e.target)].filter(([, v]) => v))}`); };
    root.querySelectorAll('[data-role]').forEach((s) => s.onchange = () => {
      const u = D().users.find((x) => x.id === s.dataset.role); u.role = s.value;
      commit(`Changement de rôle de ${u.nom} : ${ROLES[s.value].court}`); toast('Rôle mis à jour');
    });
    root.querySelectorAll('[data-actif]').forEach((b) => b.onclick = () => {
      const u = D().users.find((x) => x.id === b.dataset.actif); u.actif = !u.actif;
      commit(`${u.actif ? 'Réactivation' : 'Suspension'} du compte ${u.nom}`); rerender();
    });
    root.querySelector('[data-ajout]').onclick = () => modal('Nouveau compte institutionnel', `
      <label>Nom / service<input name="nom" required maxlength="120"></label><label>E-mail professionnel<input type="email" name="email" required></label>
      <label>Rôle<select name="role">${['admin', 'mfp', 'de', 'primature'].map((k) => `<option value="${k}">${esc(ROLES[k].label)}</option>`).join('')}</select></label>
      <p class="note">Un mot de passe provisoire est généré et affiché une seule fois. Il se connecte par le portail des agents. Les comptes entreprise et jeune sont créés par l'inscription en ligne.</p>`, {
      valider: 'Créer', onValider: async (v) => {
        const lettres = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
        const r8 = crypto.getRandomValues(new Uint8Array(12));
        const mdp = `Pnec-${Array.from(r8.slice(0, 8), (b) => lettres[b % lettres.length]).join('')}-${Array.from(r8.slice(8), (b) => b % 10).join('')}`;
        const { ok, data } = await api('auth/inscription', { ...v, motDePasse: mdp });
        if (!ok) { toast(data.error || 'Création impossible', 'erreur'); return false; }
        D().users.push({ id: data.utilisateur.id, nom: v.nom, email: v.email.toLowerCase(), role: v.role, actif: true });
        commit(`Création du compte ${v.nom} (${ROLES[v.role].court})`); rerender();
        setTimeout(() => modal('Compte créé', `<p>Transmettez ce mot de passe provisoire par un canal sûr à <strong>${esc(v.email)}</strong> :</p><p class="mdp">${esc(mdp)}</p><p class="note">Il ne sera plus affiché.</p>`, { valider: 'J\'ai noté le mot de passe', annuler: '' }), 50);
      },
    });
  }];
}

export const HABILITATIONS = [
  ['Valider les inscriptions d\'entreprises', ['mfp', 'admin']],
  ['Signer la convention cadre (côté État)', ['mfp']],
  ['Publier des offres de stage', ['entreprise']],
  ['Postuler aux offres', ['stagiaire']],
  ['Lancer le tri IA, planifier et évaluer les entretiens', ['entreprise', 'admin']],
  ['Sélection finale des stagiaires', ['entreprise']],
  ['Signer la convention de prise en charge (côté État)', ['de']],
  ['Signer la convention de stage', ['entreprise', 'stagiaire']],
  ['Consulter le tableau de bord national', ['primature', 'mfp', 'de', 'admin']],
  ['Gérer les comptes, rôles et paramètres', ['admin']],
  ['Consulter le journal d\'audit', ['admin', 'primature']],
];
export function vueRoles() {
  const roles = Object.keys(ROLES);
  return `${pageHead('Rôles et habilitations', 'Matrice des droits par profil', '', '#/accueil')}
    <div class="table-wrap"><table class="matrice"><thead><tr><th>Action</th>${roles.map((r) => `<th>${esc(ROLES[r].court)}</th>`).join('')}</tr></thead><tbody>
    ${HABILITATIONS.map(([a, rs]) => `<tr><td>${esc(a)}</td>${roles.map((r) => `<td class="c">${rs.includes(r) ? `<span class="oui" aria-label="autorisé">${icon('check')}</span>` : '<span class="non" aria-label="non autorisé">—</span>'}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`;
}

export function vueParametres() {
  const P = D().params;
  const html = `${pageHead('Paramètres du programme', '', '', '#/accueil')}
    <form class="carte form" id="f-param"><div class="grille-2">
      <label>Taux de prise en charge par l'État (%)<input type="number" name="tauxEtat" min="0" max="100" value="${P.tauxEtat}" required></label>
      <label>Seuil de présélection IA (/100)<input type="number" name="seuilIA" min="0" max="100" value="${P.seuilIA}" required></label>
      <label>Indemnité mensuelle minimale (FCFA)<input type="number" name="salaireMin" min="0" step="5000" value="${P.salaireMin}" required></label>
      <label>Durée maximale d'un stage (mois)<input type="number" name="dureeMax" min="1" max="24" value="${P.dureeMax}" required></label>
      <label>Service de visioconférence (URL de base)<input type="url" name="visioBase" value="${esc(P.visioBase)}" required></label>
      <label class="check check--bloc"><input type="checkbox" name="iaDistante" ${P.iaDistante ? 'checked' : ''}> Utiliser le moteur IA Claude lorsqu'il est configuré <small class="muted" id="etat-ia"></small></label>
    </div><p class="note">Le taux s'applique aux nouvelles conventions ; les conventions déjà générées conservent leur taux.</p>
    <div class="form-f"><button class="btn btn--primaire">Enregistrer</button></div></form>
    <section class="carte danger"><h2>Données de démonstration</h2><p>Réinitialise toutes les données (entreprises, offres, candidatures, conventions) stockées dans ce navigateur.</p>
      <button class="btn btn--rouge" data-reset>Réinitialiser la démonstration</button></section>`;
  return [html, async (root) => {
    const f = root.querySelector('#f-param');
    f.onsubmit = (ev) => {
      ev.preventDefault();
      const v = Object.fromEntries(new FormData(f));
      Object.assign(P, { tauxEtat: +v.tauxEtat, seuilIA: +v.seuilIA, salaireMin: +v.salaireMin, dureeMax: +v.dureeMax, visioBase: v.visioBase.endsWith('/') ? v.visioBase : v.visioBase + '/', iaDistante: Boolean(v.iaDistante) });
      commit('Mise à jour des paramètres du programme'); toast('Paramètres enregistrés');
    };
    root.querySelector('[data-reset]').onclick = () => modal('Réinitialiser ?', '<p>Toutes les modifications faites dans ce navigateur seront perdues.</p>', {
      valider: 'Réinitialiser', onValider: () => { reset(); window.location.hash = '#/'; window.location.reload(); },
    });
    const dispo = await moteurDistantDisponible();
    const el = root.querySelector('#etat-ia'); if (el) el.textContent = dispo ? '(moteur Claude disponible)' : '(non configuré : moteur local utilisé)';
  }];
}

export function vueJournal() {
  const a = D().audit;
  return `${pageHead('Journal d\'audit', `${a.length} événement(s) tracé(s)`, '', '#/accueil')}
    <div class="table-wrap"><table><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th></tr></thead><tbody>
    ${a.map((x) => `<tr><td class="nowrap">${new Date(x.date).toLocaleString('fr-FR')}</td><td>${esc(x.user)}</td><td>${esc(x.action)}</td></tr>`).join('')}</tbody></table></div>`;
}
