// Espace recruteur (ATS) : pipeline Kanban, fiche candidat collaborative, CVthèque,
// modèles de messages, équipe, rapports de fin de recrutement, page carrière, assistant IA.
import { db, save, log, uid, session, api, REGIONS, SECTEURS, NIVEAUX, COMPETENCES, convComplete } from './store.js';
import { esc, num, date, pct, icon, badge, pageHead, empty, toast, modal, funnel, tableau } from './ui.js';
import { scoreLocal, trierCandidats } from './ia.js';
import { ent, off, stg, cand, actionCandidat, trace, rerender } from './views.js';

const D = () => db();
const me = () => session();
const commit = (a) => { log(me()?.nom || 'Anonyme', a); save(); };
const go = (h) => { location.hash = h; };
const jours = (a, b = new Date()) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5));
const opts = (arr, sel) => arr.map((v) => `<option${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');

// ---------- Données complémentaires (créées à la demande) ----------
const MODELES_DEFAUT = [
  { id: 'accuse', nom: 'Accusé de réception', objet: 'Votre candidature — {offre}', corps: 'Bonjour {prenom},\n\nNous avons bien reçu votre candidature au poste « {offre} ». Notre équipe l\'étudie et reviendra vers vous rapidement.\n\nCordialement,\n{entreprise}' },
  { id: 'entretien', nom: 'Invitation à un entretien', objet: 'Entretien — {offre}', corps: 'Bonjour {prenom},\n\nVotre profil a retenu notre attention. Nous vous proposons un entretien en ligne le {date} à {heure}. Le lien de connexion est disponible dans votre espace PNEC.\n\nÀ très bientôt,\n{entreprise}' },
  { id: 'relance', nom: 'Relance / complément', objet: 'Complément d\'information — {offre}', corps: 'Bonjour {prenom},\n\nPourriez-vous compléter votre profil (compétences, expériences) dans votre espace PNEC afin que nous puissions finaliser l\'étude de votre candidature ?\n\nMerci,\n{entreprise}' },
  { id: 'refus', nom: 'Réponse négative', objet: 'Votre candidature — {offre}', corps: 'Bonjour {prenom},\n\nNous vous remercions de l\'intérêt porté à notre entreprise. Après étude attentive, nous ne donnerons pas suite à votre candidature pour le poste « {offre} ». D\'autres offres du programme correspondent peut-être à votre profil : nous vous encourageons à postuler.\n\nBonne continuation,\n{entreprise}' },
  { id: 'retenu', nom: 'Proposition de stage', objet: 'Bonne nouvelle — {offre}', corps: 'Bonjour {prenom},\n\nNous avons le plaisir de vous informer que votre candidature au poste « {offre} » est retenue. Votre convention de stage vous sera proposée à la signature dans votre espace PNEC.\n\nBienvenue,\n{entreprise}' },
];
function ext(e) {
  e.equipe ??= [
    { id: 'eq-1', nom: e.contact, fonction: e.fonction, email: e.email },
    { id: 'eq-2', nom: 'Responsable du service', fonction: 'Manager opérationnel', email: e.email.replace('rh@', 'manager@') },
  ];
  e.modeles ??= MODELES_DEFAUT.map((m) => ({ ...m }));
  e.vivier ??= [];
  return e;
}
const extC = (c) => { c.notes ??= []; c.evaluations ??= []; c.messages ??= []; c.tags ??= []; c.historique ??= []; return c; };

const monEntreprise = () => (me().role === 'entreprise' ? ext(ent(me().orgId)) : null);
const peutGerer = (o) => me().role === 'admin' || (me().role === 'entreprise' && o.entrepriseId === me().orgId);

// ---------- Présentation ----------
export const etoiles = (score) => (score == null ? '' : `<span class="etoiles-ia" title="Score IA ${score}/100">★ ${(Math.round(score / 2) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 1 })}</span>`);
const initiales = (n) => n.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const masque = (o, c) => (o.aveugle && ['soumise', 'preselectionnee', 'non_retenue_ia'].includes(c.statut)) || c.statut === 'soumise' && !c.scoreIA && o.aveugle;
const nomAffiche = (o, c, s) => (masque(o, c) ? `Candidat·e ${c.id.split('-').pop().slice(-4).toUpperCase()}` : `${s.prenom} ${s.nom}`);
const moyenneEval = (c) => {
  const notes = (c.evaluations || []).map((e) => e.note);
  if (c.entretien?.note != null) notes.push(c.entretien.note);
  return notes.length ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10 : null;
};
const AVIS = { fort: ['Très favorable', 'ok'], fav: ['Favorable', 'info'], res: ['Réservé', 'attention'], def: ['Défavorable', 'rouge'] };

export function remplir(modele, { o, s, c, e }) {
  const v = {
    prenom: s.prenom, nom: s.nom, offre: o.titre, entreprise: e.raisonSociale,
    date: c.entretien ? date(c.entretien.date) : '—', heure: c.entretien?.heure || '—',
  };
  const rep = (t) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
  return { objet: rep(modele.objet), corps: rep(modele.corps) };
}
function envoyer(c, modele) {
  const o = off(c.offreId); const s = stg(c.stagiaireId); const e = ext(ent(o.entrepriseId));
  const m = remplir(modele, { o, s, c, e });
  extC(c).messages.push({ id: uid('msg'), date: new Date().toISOString(), de: e.raisonSociale, auteur: me().nom, ...m, lu: false });
  trace(c, `Message envoyé : « ${m.objet} »`);
}

// Synthèse rédigée à partir de l'analyse (style « Analyse du recruteur IA »)
export function synthese(o, s, d) {
  const req = o.competences || [];
  const ok = req.filter((k) => d.pointsForts.some((p) => p.includes(k)));
  const exp = s.experience ? `${s.experience} mois d'expérience` : 'primo-demandeur·se, sans expérience professionnelle';
  const mob = s.region === o.region ? `Réside à ${s.region}, sur le lieu du stage.` : `Réside à ${s.region} : mobilité vers ${o.region} à confirmer.`;
  return `Profil ${s.niveau} en ${s.domaine.toLowerCase()}, ${exp}. Couvre ${ok.length} des ${req.length} compétences attendues${ok.length ? ` (${ok.join(', ')})` : ''}. ${mob} ${d.recommandation}.`;
}

// =====================================================================
// Vue d'ensemble du recrutement
// =====================================================================
const COLS = [
  { id: 'nouveaux', label: 'Nouveaux', statuts: ['soumise'] },
  { id: 'presel', label: 'Présélection', statuts: ['preselectionnee'] },
  { id: 'entretien', label: 'Entretien', statuts: ['entretien_planifie'] },
  { id: 'evalues', label: 'Évalués', statuts: ['entretien_realise'] },
  { id: 'retenus', label: 'Retenus', statuts: ['retenue', 'en_stage'] },
  { id: 'ecartes', label: 'Non retenus', statuts: ['non_retenue_ia', 'refusee'] },
];
const colDe = (c) => COLS.find((k) => k.statuts.includes(c.statut))?.id;

export function vueRecrutement() {
  const u = me();
  const offres = D().offres.filter((o) => u.role === 'admin' || o.entrepriseId === u.orgId);
  const cs = D().candidatures.filter((c) => offres.some((o) => o.id === c.offreId));
  const decides = cs.filter((c) => c.dateDecision && ['retenue', 'en_stage'].includes(c.statut));
  const delai = decides.length ? Math.round(decides.reduce((a, c) => a + jours(c.date, c.dateDecision), 0) / decides.length) : null;
  const semaine = cs.filter((c) => c.statut === 'entretien_planifie' && jours(new Date(), c.entretien.date) <= 7 && new Date(c.entretien.date) >= new Date(new Date().toDateString())).length;
  const aTraiter = cs.filter((c) => ['soumise', 'preselectionnee', 'entretien_realise'].includes(c.statut)).length;
  const e = monEntreprise();
  const kpi = (v, l, s = '') => `<div class="kpi"><strong>${v}</strong><span>${l}</span>${s ? `<small>${s}</small>` : ''}</div>`;
  const html = `${pageHead('Espace recruteur', 'Pipeline, tri IA, entretiens, collaboration et rapports — tout le recrutement au même endroit',
    `${e ? `<a class="btn" href="#/carriere/${e.id}">${icon('building')} Ma page carrière</a>` : ''}<a class="btn btn--primaire" href="#/offre-nouvelle">${icon('plus')} Nouvelle offre</a>`)}
    <div class="kpis-band">
      ${kpi(offres.filter((o) => o.statut === 'publiee').length, 'offres actives', `${offres.reduce((a, o) => a + o.places, 0)} places`)}
      ${kpi(cs.length, 'candidatures', `${cs.filter((c) => c.source === 'Sourcing CVthèque').length} issues du sourcing`)}
      ${kpi(aTraiter, 'actions à mener', 'tri, entretien ou décision')}
      ${kpi(semaine, 'entretiens cette semaine')}
      ${kpi(delai != null ? `${delai} j` : '—', 'délai moyen de recrutement', 'candidature → décision')}
      ${kpi(`${pct(cs.filter((c) => ['retenue', 'en_stage'].includes(c.statut)).length, cs.length)} %`, 'taux de transformation')}
    </div>
    <nav class="raccourcis">
      <a href="#/cvtheque">${icon('search')}<span><strong>CVthèque</strong><small>${D().stagiaires.filter((s) => s.visibleCVtheque !== false).length} profils · sourcing</small></span></a>
      <a href="#/recrutement/modeles">${icon('inbox')}<span><strong>Modèles de messages</strong><small>communication en masse</small></span></a>
      <a href="#/recrutement/equipe">${icon('users')}<span><strong>Équipe de recrutement</strong><small>${e ? e.equipe.length : '—'} membres · évaluations</small></span></a>
      <a href="#/entretiens">${icon('video')}<span><strong>Agenda des entretiens</strong><small>visioconférence</small></span></a>
    </nav>
    <section class="carte"><h2>Mes recrutements</h2>
    ${offres.length ? `<div class="pipes">${offres.map((o) => {
      const oc = cs.filter((c) => c.offreId === o.id);
      const parCol = COLS.map((k) => ({ ...k, n: oc.filter((c) => k.statuts.includes(c.statut)).length }));
      const pris = oc.filter((c) => ['retenue', 'en_stage'].includes(c.statut)).length;
      const nouveaux = oc.filter((c) => c.statut === 'soumise').length;
      return `<div class="pipe">
        <div class="pipe-h"><div><a href="#/recrutement/${o.id}"><strong>${esc(o.titre)}</strong></a>
          <p class="muted petit">${esc(o.region)} · ${o.duree} mois · publiée le ${date(o.datePublication)} · ${pris}/${o.places} place(s) pourvue(s)</p></div>
          <div class="actions">${nouveaux ? badge(`${nouveaux} nouveau(x)`, 'rouge') : ''}${o.statut !== 'publiee' ? badge('Clôturée', 'gris') : ''}
          <a class="btn btn--petit" href="#/recrutement/${o.id}/rapport">${icon('file')} Rapport</a><a class="btn btn--petit btn--primaire" href="#/recrutement/${o.id}">${icon('grid')} Pipeline</a></div></div>
        <div class="pipe-bar">${parCol.map((k) => `<a href="#/recrutement/${o.id}" class="seg seg--${k.id}" style="flex:${Math.max(k.n, 0.0001)}" data-tip="${esc(k.label)} : ${k.n}">${k.n || ''}</a>`).join('')}</div>
        <div class="pipe-l">${parCol.map((k) => `<span><i class="pt pt--${k.id}"></i>${esc(k.label)} <strong>${k.n}</strong></span>`).join('')}</div>
      </div>`;
    }).join('')}</div>` : empty('Aucune offre publiée.')}</section>`;
  return html;
}

// =====================================================================
// Pipeline Kanban d'une offre
// =====================================================================
export function vuePipeline([id], q) {
  const o = off(id); if (!o) return empty('Offre introuvable');
  if (!peutGerer(o)) return empty('Accès réservé au recruteur de cette offre.');
  const e = ext(ent(o.entrepriseId)); const P = D().params;
  const txt = (q.get('q') || '').toLowerCase();
  const min = +(q.get('min') || 0);
  let cs = D().candidatures.filter((c) => c.offreId === id).map(extC);
  cs = cs.filter((c) => {
    const s = stg(c.stagiaireId);
    return (!min || (c.scoreIA ?? 0) >= min * 20) && (!txt || `${s.prenom} ${s.nom} ${s.competences.join(' ')} ${s.diplome} ${c.tags.join(' ')}`.toLowerCase().includes(txt));
  });
  const aTrier = cs.filter((c) => c.statut === 'soumise').length;
  const ouvert = q.get('c') ? cand(q.get('c')) : null;
  const carte = (c) => {
    const s = stg(c.stagiaireId); const moy = moyenneEval(c);
    return `<article class="kc" draggable="true" data-id="${c.id}" tabindex="0" aria-label="${esc(nomAffiche(o, c, s))}">
      <div class="kc-h"><span class="av${masque(o, c) ? ' av--anon' : ''}">${masque(o, c) ? icon('user') : esc(initiales(`${s.prenom} ${s.nom}`))}</span>
        <div class="kc-n"><strong>${esc(nomAffiche(o, c, s))}</strong><small>${esc(s.diplome)}</small></div>
        <input type="checkbox" class="kc-sel" data-sel="${c.id}" aria-label="Sélectionner"></div>
      <div class="kc-m">${etoiles(c.scoreIA)}${moy != null ? `<span class="kc-note" title="Moyenne des évaluations">${moy}/20</span>` : ''}<span class="muted">${esc(s.region)}</span><span class="muted">· ${jours(c.date)} j</span></div>
      ${c.tags.length ? `<div class="tags">${c.tags.map((t) => `<span class="tag tag--s">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="kc-f">${c.source === 'Sourcing CVthèque' ? `<span title="Issu du sourcing">${icon('search')}</span>` : ''}${c.entretien && c.statut === 'entretien_planifie' ? `<span>${icon('calendar')} ${date(c.entretien.date)} ${esc(c.entretien.heure)}</span>` : ''}
        ${c.notes.length ? `<span>${icon('pen')} ${c.notes.length}</span>` : ''}${c.messages.length ? `<span>${icon('inbox')} ${c.messages.length}</span>` : ''}${c.evaluations.length ? `<span>${icon('star')} ${c.evaluations.length}</span>` : ''}</div>
    </article>`;
  };
  const html = `${pageHead(o.titre, `${esc(e.raisonSociale)} · ${cs.length} candidat·e·s · seuil IA ${P.seuilIA}/100`,
    `<button class="btn" data-aveugle>${icon('shield')} ${o.aveugle ? 'Recrutement à l\'aveugle : activé' : 'Recrutement à l\'aveugle'}</button>
     <a class="btn" href="#/recrutement/${id}/rapport">${icon('file')} Rapport</a>
     <button class="btn btn--primaire" data-tri ${aTrier ? '' : 'disabled'}>${icon('sparkles')} Tri IA (${aTrier})</button>`, '#/recrutement')}
    <form class="filtres" id="f-pipe">
      <input type="search" name="q" placeholder="Nom, compétence, diplôme, étiquette…" value="${esc(q.get('q') || '')}">
      <select name="min"><option value="">Toutes les notes IA</option>${[3, 3.5, 4, 4.5].map((v) => `<option value="${v}" ${min === v ? 'selected' : ''}>★ ${v.toLocaleString('fr-FR')} et plus</option>`).join('')}</select>
      <button class="btn">Filtrer</button>
      <span class="aide-dnd muted petit">${icon('grid')} Glissez-déposez les cartes d'une colonne à l'autre</span>
    </form>
    <div class="masse" id="masse" hidden><strong id="masse-n"></strong>
      <button class="btn btn--petit" data-masse="presel">Présélectionner</button>
      <button class="btn btn--petit" data-masse="message">${icon('inbox')} Envoyer un message</button>
      <button class="btn btn--petit" data-masse="ecarter">Écarter</button>
      <button class="btn btn--petit" data-masse="annuler">Annuler</button></div>
    <div class="kanban">${COLS.map((k) => {
      const liste = cs.filter((c) => k.statuts.includes(c.statut)).sort((a, b) => (b.scoreIA ?? -1) - (a.scoreIA ?? -1));
      return `<section class="kcol kcol--${k.id}" data-col="${k.id}"><header><span class="pt pt--${k.id}"></span><h2>${k.label}</h2><span class="compte">${liste.length}</span></header>
        <div class="kcol-b">${liste.map(carte).join('') || '<p class="kcol-vide">Déposez une carte ici</p>'}</div></section>`;
    }).join('')}</div>
    ${ouvert ? ficheCandidat(ouvert, q.get('t') || 'ia') : ''}`;
  return [html, (root) => bindPipeline(root, o, e, q)];
}

function bindPipeline(root, o, e, q) {
  const base = `#/recrutement/${o.id}`;
  const keep = () => { const p = new URLSearchParams(q); p.delete('c'); p.delete('t'); return p.toString(); };
  root.querySelector('#f-pipe').onsubmit = (ev) => { ev.preventDefault(); go(`${base}?${new URLSearchParams([...new FormData(ev.target)].filter(([, v]) => v))}`); };
  root.querySelector('[data-aveugle]').onclick = () => { o.aveugle = !o.aveugle; commit(`Recrutement à l'aveugle ${o.aveugle ? 'activé' : 'désactivé'} pour « ${o.titre} »`); rerender(); };
  root.querySelector('[data-tri]')?.addEventListener('click', async (ev) => {
    const b = ev.currentTarget; b.disabled = true; b.innerHTML = `${icon('sparkles')} Analyse…`;
    const cibles = D().candidatures.filter((c) => c.offreId === o.id && c.statut === 'soumise');
    const { moteur, resultats } = await trierCandidats(o, cibles.map((c) => ({ ...stg(c.stagiaireId), id: c.id })), { autoriserDistant: D().params.iaDistante });
    let n = 0;
    cibles.forEach((c) => {
      const r = resultats.get(c.id);
      Object.assign(c, { scoreIA: r.score, detailIA: r, moteurIA: moteur, dateTri: new Date().toISOString() });
      c.statut = r.score >= D().params.seuilIA ? 'preselectionnee' : 'non_retenue_ia'; if (c.statut === 'preselectionnee') n++;
      trace(c, `Tri IA (${moteur === 'claude' ? 'Claude' : 'moteur local'}) : ${r.score}/100`);
    });
    commit(`Tri IA de ${cibles.length} candidature(s) pour « ${o.titre} »`); toast(`${cibles.length} CV analysé(s) — ${n} présélectionné(s)`); rerender();
  });
  // Ouverture de la fiche
  root.querySelectorAll('.kc').forEach((k) => {
    const ouvrir = (ev) => { if (ev.target.closest('.kc-sel')) return; go(`${base}?${keep()}${keep() ? '&' : ''}c=${k.dataset.id}`); };
    k.addEventListener('click', ouvrir);
    k.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ouvrir(ev); });
    k.addEventListener('dragstart', (ev) => { ev.dataTransfer.setData('text/plain', k.dataset.id); k.classList.add('drag'); });
    k.addEventListener('dragend', () => k.classList.remove('drag'));
  });
  root.querySelectorAll('.kcol').forEach((col) => {
    col.addEventListener('dragover', (ev) => { ev.preventDefault(); col.classList.add('survol'); });
    col.addEventListener('dragleave', () => col.classList.remove('survol'));
    col.addEventListener('drop', (ev) => { ev.preventDefault(); col.classList.remove('survol'); deplacer(ev.dataTransfer.getData('text/plain'), col.dataset.col); });
  });
  // Sélection multiple
  const masse = root.querySelector('#masse');
  const selection = () => [...root.querySelectorAll('.kc-sel:checked')].map((x) => x.dataset.sel);
  root.querySelectorAll('.kc-sel').forEach((x) => x.addEventListener('change', () => {
    const n = selection().length; masse.hidden = !n; root.querySelector('#masse-n').textContent = `${n} sélectionné(s)`;
  }));
  root.querySelectorAll('[data-masse]').forEach((b) => b.onclick = () => {
    const ids = selection(); const act = b.dataset.masse;
    if (act === 'annuler') { root.querySelectorAll('.kc-sel').forEach((x) => { x.checked = false; }); masse.hidden = true; return; }
    if (act === 'presel') {
      ids.map(cand).filter((c) => ['soumise', 'non_retenue_ia'].includes(c.statut)).forEach((c) => { c.statut = 'preselectionnee'; trace(c, 'Présélection manuelle (action groupée)'); });
      commit(`Présélection groupée de ${ids.length} candidature(s)`); toast('Candidatures présélectionnées'); return rerender();
    }
    if (act === 'message') return modalMessage(ids.map(cand), e);
    if (act === 'ecarter') return modalEcarter(ids.map(cand), e);
  });
  bindFiche(root, o, e, base, keep);
}

function deplacer(id, vers) {
  const c = cand(id); if (!c) return;
  const de = colDe(c); if (de === vers) return;
  const e = ext(ent(off(c.offreId).entrepriseId));
  const refus = (m) => toast(m, 'info');
  if (vers === 'nouveaux') return refus('Une candidature ne peut pas revenir en « Nouveaux »');
  if (vers === 'presel') {
    if (!['nouveaux', 'ecartes'].includes(de)) return refus('Seules les candidatures nouvelles ou écartées peuvent être présélectionnées');
    c.statut = 'preselectionnee'; trace(c, de === 'ecartes' ? 'Repêchage en présélection' : 'Présélection manuelle');
    commit('Présélection manuelle d\'une candidature'); toast('Candidature présélectionnée'); return rerender();
  }
  if (vers === 'entretien') {
    if (!['nouveaux', 'presel'].includes(de)) return refus('L\'entretien se planifie depuis la présélection');
    if (de === 'nouveaux') c.statut = 'preselectionnee';
    return actionCandidat('planifier', id);
  }
  if (vers === 'evalues') {
    if (de !== 'entretien') return refus('Seul un entretien planifié peut être évalué');
    return go(`#/entretien/${id}`);
  }
  if (vers === 'retenus') {
    if (de !== 'evalues') return refus('Seul un candidat évalué en entretien peut être retenu');
    return actionCandidat('retenir', id);
  }
  if (vers === 'ecartes') {
    if (de === 'retenus') return refus('Un candidat retenu ne peut plus être écarté depuis le pipeline');
    return modalEcarter([c], e);
  }
}

function modalEcarter(cs, e) {
  modal(`Écarter ${cs.length > 1 ? `${cs.length} candidatures` : 'la candidature'}`, `
    <label>Motif (interne, non communiqué)<select name="motif"><option>Compétences insuffisantes pour le poste</option><option>Niveau de formation inadapté</option><option>Mobilité impossible</option><option>Profil retenu sur une autre offre</option><option>Candidat·e désisté·e</option></select></label>
    <label class="check"><input type="checkbox" name="informer" checked> Informer le/la candidat·e avec le modèle « Réponse négative »</label>`, {
    valider: 'Écarter', onValider: ({ motif, informer }) => {
      const modele = e.modeles.find((m) => m.id === 'refus') || MODELES_DEFAUT[3];
      cs.forEach((c) => {
        c.statut = c.statut === 'soumise' ? 'non_retenue_ia' : 'refusee'; c.dateDecision = new Date().toISOString(); c.motifRefus = motif;
        trace(c, `Écarté·e — ${motif}`); if (informer) envoyer(c, modele);
      });
      commit(`${cs.length} candidature(s) écartée(s) : ${motif}`); toast(`${cs.length} candidature(s) écartée(s)${informer ? ' — candidat(s) informé(s)' : ''}`); rerender();
    },
  });
}

function modalMessage(cs, e) {
  modal(`Envoyer un message à ${cs.length} candidat·e(s)`, `
    <label>Modèle<select name="modele">${e.modeles.map((m) => `<option value="${m.id}">${esc(m.nom)}</option>`).join('')}</select></label>
    <div class="apercu" id="apercu"></div>
    <p class="note">Les variables {prenom}, {offre}, {date}… sont remplacées pour chaque destinataire. Modifiez les modèles dans <a href="#/recrutement/modeles">Modèles de messages</a>.</p>`, {
    valider: 'Envoyer', onValider: ({ modele }) => {
      const m = e.modeles.find((x) => x.id === modele);
      cs.forEach((c) => envoyer(c, m));
      commit(`Message « ${m.nom} » envoyé à ${cs.length} candidat(s)`); toast(`Message envoyé à ${cs.length} candidat·e(s)`); rerender();
    },
  });
  const sel = document.querySelector('.modal select[name=modele]');
  const maj = () => {
    const c = cs[0]; const m = e.modeles.find((x) => x.id === sel.value);
    const r = remplir(m, { o: off(c.offreId), s: stg(c.stagiaireId), c, e });
    document.getElementById('apercu').innerHTML = `<strong>${esc(r.objet)}</strong><pre>${esc(r.corps)}</pre>`;
  };
  sel.addEventListener('change', maj); maj();
}

// =====================================================================
// Fiche candidat (panneau latéral)
// =====================================================================
function ficheCandidat(c, onglet) {
  extC(c);
  const o = off(c.offreId); const s = stg(c.stagiaireId); const e = ext(ent(o.entrepriseId)); const P = D().params;
  const d = c.detailIA || scoreLocal(o, s);
  const anonyme = masque(o, c);
  const req = o.competences || [];
  const corpus = [...s.competences, s.cvTexte].join(' ').toLowerCase();
  const couverture = req.map((k) => ({ k, ok: d.pointsForts.some((p) => p.includes(k)) || corpus.includes(k.toLowerCase()) }));
  const match = pct(couverture.filter((x) => x.ok).length, req.length);
  const moy = moyenneEval(c);
  const onglets = [['ia', 'Analyse IA'], ['profil', 'Profil & CV'], ['evaluations', `Évaluations (${c.evaluations.length + (c.entretien?.note != null ? 1 : 0)})`], ['notes', `Notes (${c.notes.length})`], ['messages', `Messages (${c.messages.length})`], ['historique', 'Historique']];
  const actions = [];
  if (['soumise', 'non_retenue_ia'].includes(c.statut)) actions.push(`<button class="btn btn--petit" data-fa="presel">Présélectionner</button>`);
  if (c.statut === 'preselectionnee') actions.push(`<button class="btn btn--petit btn--primaire" data-fa="planifier">${icon('calendar')} Planifier l'entretien</button>`);
  if (c.statut === 'entretien_planifie') actions.push(`<a class="btn btn--petit btn--primaire" href="#/entretien/${c.id}">${icon('video')} Entretien & évaluation</a>`);
  if (c.statut === 'entretien_realise') actions.push(`<button class="btn btn--petit btn--primaire" data-fa="retenir">Retenir</button>`);
  if (!['retenue', 'en_stage', 'refusee', 'non_retenue_ia'].includes(c.statut)) actions.push(`<button class="btn btn--petit" data-fa="ecarter">Écarter</button>`);
  const pec = D().conventions.find((x) => x.candidatureId === c.id && x.type === 'PRISE_EN_CHARGE');
  if (pec) actions.push(`<a class="btn btn--petit" href="#/convention/${pec.id}">${icon('file')} Convention</a>`);

  let corps = '';
  if (onglet === 'ia') corps = `
    <div class="ia-tete"><div class="ia-score">${etoiles(d.score)}<small>${d.score}/100</small></div><div><strong>Analyse du recruteur IA</strong><p>${esc(synthese(o, s, d))}</p>
      <p class="muted petit">${c.moteurIA === 'claude' ? 'Analyse Claude' : 'Moteur d\'analyse local'} · profil évalué sans nom, âge ni sexe</p></div></div>
    <h3>Compétences attendues vs. actuelles <span class="match">${match} % de correspondance</span></h3>
    <ul class="couverture">${couverture.map((x) => `<li class="${x.ok ? 'ok' : 'ko'}">${icon(x.ok ? 'check' : 'x')}${esc(x.k)}</li>`).join('')}</ul>
    <h3>Détail du score</h3>
    ${[['Compétences', d.criteres?.competences, 50], ['Niveau de formation', d.criteres?.niveau, 20], ['Domaine', d.criteres?.domaine, 15], ['Expérience', d.criteres?.experience, 10], ['Mobilité', d.criteres?.mobilite, 5]].map(([l, v, m]) =>
      `<div class="crit"><span>${l}</span><span class="crit-t"><span style="width:${pct(v || 0, m)}%"></span></span><span>${v ?? '—'}/${m}</span></div>`).join('')}
    <div class="grille-2 mt-s"><div><h3>Points forts</h3><ul class="puces puces--ok">${d.pointsForts.map((x) => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul></div>
    <div><h3>À vérifier</h3><ul class="puces puces--att">${d.pointsVigilance.map((x) => `<li>${esc(x)}</li>`).join('') || '<li>Rien à signaler</li>'}</ul></div></div>`;
  if (onglet === 'profil') corps = `
    <dl class="dl"><dt>Formation</dt><dd>${esc(s.diplome)}</dd><dt>Niveau</dt><dd>${esc(s.niveau)}</dd><dt>Expérience</dt><dd>${s.experience ? `${s.experience} mois` : 'Primo-demandeur·se'}</dd>
    <dt>Région</dt><dd>${esc(s.region)}</dd><dt>Compétences</dt><dd><div class="tags">${s.competences.map((k) => `<span class="tag">${esc(k)}</span>`).join('')}</div></dd>
    <dt>Contact</dt><dd>${anonyme ? '<em class="muted">Masqué (recrutement à l\'aveugle)</em>' : `${esc(s.email)}<br>${esc(s.tel)}`}</dd><dt>Source</dt><dd>${esc(c.source || 'Candidature spontanée')}</dd><dt>Reçue le</dt><dd>${date(c.date)}</dd></dl>
    <h3>Présentation / CV</h3><p class="cv">${esc(s.cvTexte)}</p><h3>Lettre de motivation</h3><p class="cv">${esc(c.lettre || '—')}</p>
    <h3>Étiquettes</h3><div class="tags">${c.tags.map((t) => `<span class="tag">${esc(t)} <button class="tag-x" data-untag="${esc(t)}" aria-label="Retirer">×</button></span>`).join('')}</div>
    <form class="ligne-form" id="f-tag"><input name="tag" placeholder="Ajouter une étiquette (ex. Vivier, Bilingue)" maxlength="30" required><button class="btn btn--petit">Ajouter</button></form>`;
  if (onglet === 'evaluations') corps = `
    <div class="eval-moy">${moy != null ? `<strong>${moy}/20</strong><span>moyenne de ${c.evaluations.length + (c.entretien?.note != null ? 1 : 0)} évaluation(s)</span>` : '<span class="muted">Aucune évaluation pour l\'instant</span>'}</div>
    ${c.entretien?.note != null ? `<div class="eval"><div class="eval-h"><strong>${esc(c.entretien.evaluateur || 'Entretien')}</strong><span>${c.entretien.note}/20</span></div><p class="muted petit">Grille d'entretien — ${esc(c.entretien.commentaire || '')}</p></div>` : ''}
    ${c.evaluations.map((v) => `<div class="eval"><div class="eval-h"><strong>${esc(v.evaluateur)}</strong>${badge(AVIS[v.avis][0], AVIS[v.avis][1])}<span>${v.note}/20</span></div>
      <p class="muted petit">${date(v.date)} · ${Object.entries(v.criteres).map(([k, n]) => `${k} ${n}/5`).join(' · ')}</p><p>${esc(v.commentaire)}</p></div>`).join('')}
    <form id="f-eval-eq" class="form carte-int"><h3>Ajouter mon évaluation</h3>
      <label>Évaluateur·rice<select name="evaluateur">${e.equipe.map((m) => `<option>${esc(m.nom)}</option>`).join('')}</select></label>
      ${['Compétences', 'Motivation', 'Savoir-être', 'Potentiel'].map((k) => `<fieldset class="etoiles"><legend>${k}</legend>${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="${k}" value="${v}" required><span>${v}</span></label>`).join('')}</fieldset>`).join('')}
      <label>Avis<select name="avis">${Object.entries(AVIS).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <label>Commentaire<textarea name="commentaire" rows="2" required></textarea></label><div class="form-f"><button class="btn btn--primaire btn--petit">Enregistrer l'évaluation</button></div></form>`;
  if (onglet === 'notes') corps = `
    <div class="notes">${c.notes.map((n) => `<div class="note-c"><div class="note-h"><span class="av av--s">${esc(initiales(n.auteur))}</span><strong>${esc(n.auteur)}</strong><span class="muted petit">${new Date(n.date).toLocaleString('fr-FR')}</span></div>
      <p>${esc(n.texte).replace(/@([\wÀ-ÿ·'-]+(?:\s[A-ZÀ-Ý][\wÀ-ÿ·'-]+)?)/g, '<mark>@$1</mark>')}</p></div>`).join('') || '<p class="muted">Aucune note. Partagez votre avis avec l\'équipe.</p>'}</div>
    <form id="f-note" class="form"><label>Nouvelle note interne<textarea name="texte" rows="3" required placeholder="Ex. Très bon échange. @${esc(e.equipe[1]?.nom || '')} peux-tu valider la partie technique ?"></textarea></label>
      <p class="muted petit">Mentionnez un membre : ${e.equipe.map((m) => `<button type="button" class="chip chip--s" data-mention="${esc(m.nom)}">@${esc(m.nom)}</button>`).join(' ')}</p>
      <div class="form-f"><button class="btn btn--primaire btn--petit">Publier la note</button></div></form>`;
  if (onglet === 'messages') corps = `
    ${c.messages.map((m) => `<div class="msg"><div class="msg-h"><strong>${esc(m.objet)}</strong><span class="muted petit">${new Date(m.date).toLocaleString('fr-FR')} · ${m.lu ? 'lu' : 'non lu'}</span></div><pre>${esc(m.corps)}</pre></div>`).join('') || '<p class="muted">Aucun message envoyé.</p>'}
    <form id="f-msg" class="form ligne-form"><select name="modele">${e.modeles.map((m) => `<option value="${m.id}">${esc(m.nom)}</option>`).join('')}</select><button class="btn btn--primaire btn--petit">${icon('inbox')} Envoyer</button></form>`;
  if (onglet === 'historique') corps = `<ol class="histo">${[...c.historique].reverse().map((h) => `<li><span class="muted petit">${new Date(h.date).toLocaleString('fr-FR')} · ${esc(h.auteur)}</span><p>${esc(h.texte)}</p></li>`).join('') || '<li>Aucun événement enregistré.</li>'}</ol>`;

  return `<div class="tiroir-fond" data-fermer></div>
  <aside class="tiroir" role="dialog" aria-label="Fiche candidat">
    <header class="tiroir-h"><span class="av av--l${anonyme ? ' av--anon' : ''}">${anonyme ? icon('user') : esc(initiales(`${s.prenom} ${s.nom}`))}</span>
      <div><h2>${esc(nomAffiche(o, c, s))}</h2><p class="muted">${esc(s.diplome)} · ${esc(s.region)}</p>
      <div class="tiroir-m">${etoiles(d.score)} ${moy != null ? `<span class="kc-note">${moy}/20</span>` : ''} ${badge(COLS.find((k) => k.statuts.includes(c.statut))?.label || c.statut, 'neutre')}</div></div>
      <button class="btn-ico" data-fermer aria-label="Fermer">${icon('x')}</button></header>
    <div class="tiroir-a">${actions.join('')}</div>
    <nav class="onglets onglets--tiroir">${onglets.map(([k, l]) => `<a href="#" data-onglet="${k}" class="${k === onglet ? 'on' : ''}">${l}</a>`).join('')}</nav>
    <div class="tiroir-b">${corps}</div>
  </aside>`;
}

function bindFiche(root, o, e, base, keep) {
  const t = root.querySelector('.tiroir'); if (!t) return;
  const id = new URLSearchParams(location.hash.split('?')[1]).get('c');
  const c = cand(id); const k = keep();
  const fermer = () => go(`${base}${k ? `?${k}` : ''}`);
  root.querySelectorAll('[data-fermer]').forEach((x) => x.onclick = fermer);
  document.addEventListener('keydown', function esc(ev) { if (ev.key === 'Escape') { document.removeEventListener('keydown', esc); if (document.querySelector('.tiroir') && !document.querySelector('.modal-wrap')) fermer(); } });
  root.querySelectorAll('[data-onglet]').forEach((a) => a.onclick = (ev) => { ev.preventDefault(); go(`${base}?${k}${k ? '&' : ''}c=${id}&t=${a.dataset.onglet}`); });
  root.querySelectorAll('[data-fa]').forEach((b) => b.onclick = () => {
    const a = b.dataset.fa;
    if (a === 'presel') return deplacer(id, 'presel');
    if (a === 'ecarter') return modalEcarter([c], e);
    actionCandidat(a, id);
  });
  t.querySelector('#f-tag')?.addEventListener('submit', (ev) => {
    ev.preventDefault(); const v = ev.target.tag.value.trim();
    if (v && !c.tags.includes(v)) { c.tags.push(v); trace(c, `Étiquette ajoutée : ${v}`); commit('Ajout d\'une étiquette'); } rerender();
  });
  t.querySelectorAll('[data-untag]').forEach((b) => b.onclick = () => { c.tags = c.tags.filter((x) => x !== b.dataset.untag); commit('Retrait d\'une étiquette'); rerender(); });
  t.querySelector('#f-eval-eq')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(ev.target));
    const criteres = Object.fromEntries(['Compétences', 'Motivation', 'Savoir-être', 'Potentiel'].map((x) => [x, +v[x]]));
    const note = Math.round((Object.values(criteres).reduce((a, b) => a + b, 0) / 20) * 20 * 10) / 10;
    c.evaluations.push({ id: uid('ev'), date: new Date().toISOString(), evaluateur: v.evaluateur, criteres, note, avis: v.avis, commentaire: v.commentaire });
    trace(c, `Évaluation de ${v.evaluateur} : ${note}/20 (${AVIS[v.avis][0]})`); commit('Évaluation collaborative d\'une candidature'); toast('Évaluation enregistrée'); rerender();
  });
  t.querySelector('#f-note')?.addEventListener('submit', (ev) => {
    ev.preventDefault(); const texte = ev.target.texte.value.trim(); if (!texte) return;
    c.notes.push({ id: uid('note'), date: new Date().toISOString(), auteur: me().role === 'entreprise' ? e.contact : me().nom, texte });
    const cites = e.equipe.filter((m) => texte.includes(`@${m.nom}`)).map((m) => m.nom);
    trace(c, `Note ajoutée${cites.length ? ` — mention de ${cites.join(', ')}` : ''}`); commit('Note interne sur une candidature');
    toast(cites.length ? `Note publiée — ${cites.join(', ')} notifié·e(s)` : 'Note publiée'); rerender();
  });
  t.querySelectorAll('[data-mention]').forEach((b) => b.onclick = () => { const ta = t.querySelector('#f-note textarea'); ta.value += `@${b.dataset.mention} `; ta.focus(); });
  t.querySelector('#f-msg')?.addEventListener('submit', (ev) => {
    ev.preventDefault(); const m = e.modeles.find((x) => x.id === ev.target.modele.value);
    envoyer(c, m); commit(`Message « ${m.nom} » envoyé`); toast('Message envoyé au candidat'); rerender();
  });
}

// =====================================================================
// CVthèque & sourcing
// =====================================================================
export function vueCVtheque(_, q) {
  const u = me(); const e = monEntreprise();
  const offres = D().offres.filter((o) => o.statut === 'publiee' && (u.role === 'admin' || o.entrepriseId === u.orgId));
  const oSel = off(q.get('offre') || '') || null;
  const f = { q: (q.get('q') || '').toLowerCase(), niveau: q.get('niveau') || '', region: q.get('region') || '', domaine: q.get('domaine') || '', exp: q.get('exp') || '', vivier: q.get('vivier') === '1' };
  let profils = D().stagiaires.filter((s) => s.visibleCVtheque !== false).filter((s) =>
    (!f.q || `${s.competences.join(' ')} ${s.diplome} ${s.cvTexte}`.toLowerCase().includes(f.q))
    && (!f.niveau || s.niveau === f.niveau) && (!f.region || s.region === f.region) && (!f.domaine || s.domaine === f.domaine)
    && (!f.exp || (f.exp === '0' ? !s.experience : s.experience >= +f.exp)) && (!f.vivier || e?.vivier.includes(s.id)));
  const scores = new Map(oSel ? profils.map((s) => [s.id, scoreLocal(oSel, s)]) : []);
  if (oSel) profils.sort((a, b) => scores.get(b.id).score - scores.get(a.id).score);
  const total = profils.length; profils = profils.slice(0, 60);
  const html = `${pageHead('CVthèque', `${num(D().stagiaires.filter((s) => s.visibleCVtheque !== false).length)} jeunes ont rendu leur profil visible · profils anonymisés jusqu'à l'invitation`, '', '#/recrutement')}
    <form class="filtres filtres--cv" id="f-cv">
      <input type="search" name="q" placeholder="Compétence, diplôme, mot-clé…" value="${esc(q.get('q') || '')}">
      <select name="offre"><option value="">Classer selon une offre…</option>${offres.map((o) => `<option value="${o.id}" ${oSel?.id === o.id ? 'selected' : ''}>${esc(o.titre)}</option>`).join('')}</select>
      <select name="domaine"><option value="">Tous domaines</option>${opts(SECTEURS, f.domaine)}</select>
      <select name="niveau"><option value="">Tous niveaux</option>${opts(NIVEAUX, f.niveau)}</select>
      <select name="region"><option value="">Toutes régions</option>${opts(REGIONS, f.region)}</select>
      <select name="exp"><option value="">Toute expérience</option><option value="0" ${f.exp === '0' ? 'selected' : ''}>Primo-demandeurs</option><option value="6" ${f.exp === '6' ? 'selected' : ''}>6 mois et +</option><option value="12" ${f.exp === '12' ? 'selected' : ''}>12 mois et +</option></select>
      ${e ? `<label class="check check--inline"><input type="checkbox" name="vivier" value="1" ${f.vivier ? 'checked' : ''}> Mon vivier (${e.vivier.length})</label>` : ''}
      <button class="btn btn--primaire">Rechercher</button></form>
    <p class="muted petit">${total} profil(s)${total > 60 ? ' — 60 premiers affichés' : ''}${oSel ? ` · classés par adéquation avec « ${esc(oSel.titre)} »` : ''}</p>
    ${profils.length ? `<div class="cvs">${profils.map((s) => {
      const sc = scores.get(s.id); const dejaCand = oSel && D().candidatures.some((c) => c.offreId === oSel.id && c.stagiaireId === s.id);
      const auVivier = e?.vivier.includes(s.id);
      return `<article class="cvc"><div class="cvc-h"><span class="av av--anon">${icon('user')}</span><div><strong>Profil ${s.id.split('-').pop().toUpperCase().slice(-5)}</strong><small>${esc(s.diplome)}</small></div>${sc ? etoiles(sc.score) : ''}</div>
        <p class="muted petit">${icon('map')} ${esc(s.region)} · ${icon('graduation')} ${esc(s.niveau)} · ${s.experience ? `${s.experience} mois d'exp.` : 'primo-demandeur·se'}</p>
        <div class="tags">${s.competences.map((k) => `<span class="tag${oSel?.competences.some((x) => x.toLowerCase() === k.toLowerCase()) ? ' tag--ok' : ''}">${esc(k)}</span>`).join('')}</div>
        ${sc ? `<p class="petit">${esc(sc.recommandation)} — ${esc(sc.pointsForts[0] || '')}</p>` : ''}
        <div class="cvc-f">${e ? `<button class="btn btn--petit" data-vivier="${s.id}">${icon('star')} ${auVivier ? 'Dans le vivier' : 'Ajouter au vivier'}</button>` : ''}
          ${oSel ? (dejaCand ? badge('Déjà candidat·e', 'gris') : `<button class="btn btn--petit btn--primaire" data-inviter="${s.id}">${icon('arrow')} Inviter à postuler</button>`) : ''}</div></article>`;
    }).join('')}</div>` : empty('Aucun profil ne correspond à ces critères.')}`;
  return [html, (root) => {
    root.querySelector('#f-cv').onsubmit = (ev) => { ev.preventDefault(); go(`#/cvtheque?${new URLSearchParams([...new FormData(ev.target)].filter(([, v]) => v))}`); };
    root.querySelectorAll('[data-vivier]').forEach((b) => b.onclick = () => {
      const sid = b.dataset.vivier; e.vivier = e.vivier.includes(sid) ? e.vivier.filter((x) => x !== sid) : [...e.vivier, sid];
      commit('Mise à jour du vivier de talents'); rerender();
    });
    root.querySelectorAll('[data-inviter]').forEach((b) => b.onclick = () => {
      const s = stg(b.dataset.inviter); const ee = ext(ent(oSel.entrepriseId));
      const c = { id: uid('cand'), offreId: oSel.id, stagiaireId: s.id, date: new Date().toISOString(), statut: 'soumise', source: 'Sourcing CVthèque',
        lettre: '(Invitation du recruteur via la CVthèque)', notes: [], evaluations: [], messages: [], tags: ['Sourcing'], historique: [] };
      trace(c, 'Profil identifié dans la CVthèque et invité à postuler');
      D().candidatures.push(c);
      envoyer(c, { objet: 'Invitation à postuler — {offre}', corps: 'Bonjour {prenom},\n\nVotre profil dans la CVthèque PNEC correspond à notre offre « {offre} ». Nous vous invitons à confirmer votre intérêt depuis votre espace : votre candidature a été pré-enregistrée.\n\nCordialement,\n{entreprise}' });
      commit(`Invitation d'un profil de la CVthèque sur « ${oSel.titre} »`); toast('Invitation envoyée — candidature ajoutée au pipeline'); rerender();
      void ee;
    });
  }];
}

// =====================================================================
// Modèles de messages & équipe
// =====================================================================
export function vueModeles() {
  const e = monEntreprise(); if (!e) return empty('Réservé aux entreprises.');
  const html = `${pageHead('Modèles de messages', 'Variables disponibles : {prenom} {nom} {offre} {entreprise} {date} {heure}', `<button class="btn btn--primaire" data-nouveau>${icon('plus')} Nouveau modèle</button>`, '#/recrutement')}
    <div class="modeles">${e.modeles.map((m) => `<form class="carte form" data-modele="${m.id}"><div class="grille-2">
      <label>Nom<input name="nom" value="${esc(m.nom)}" required maxlength="60"></label><label>Objet<input name="objet" value="${esc(m.objet)}" required maxlength="140"></label></div>
      <label>Message<textarea name="corps" rows="6" required>${esc(m.corps)}</textarea></label>
      <div class="form-f">${MODELES_DEFAUT.some((x) => x.id === m.id) ? '' : `<button type="button" class="btn" data-suppr="${m.id}">Supprimer</button>`}<button class="btn btn--primaire">Enregistrer</button></div></form>`).join('')}</div>`;
  return [html, (root) => {
    root.querySelectorAll('[data-modele]').forEach((f) => f.onsubmit = (ev) => {
      ev.preventDefault(); Object.assign(e.modeles.find((m) => m.id === f.dataset.modele), Object.fromEntries(new FormData(f)));
      commit('Mise à jour d\'un modèle de message'); toast('Modèle enregistré');
    });
    root.querySelectorAll('[data-suppr]').forEach((b) => b.onclick = () => { e.modeles = e.modeles.filter((m) => m.id !== b.dataset.suppr); commit('Suppression d\'un modèle'); rerender(); });
    root.querySelector('[data-nouveau]').onclick = () => { e.modeles.push({ id: uid('mod'), nom: 'Nouveau modèle', objet: '{offre}', corps: 'Bonjour {prenom},\n\n\n\n{entreprise}' }); save(); rerender(); };
  }];
}

export function vueEquipe() {
  const e = monEntreprise(); if (!e) return empty('Réservé aux entreprises.');
  const html = `${pageHead('Équipe de recrutement', 'Les membres peuvent évaluer les candidats, laisser des notes et être mentionnés', '', '#/recrutement')}
    <div class="table-wrap"><table><thead><tr><th>Nom</th><th>Fonction</th><th>E-mail</th><th></th></tr></thead><tbody>
    ${e.equipe.map((m) => `<tr><td><span class="av av--s">${esc(initiales(m.nom))}</span> <strong>${esc(m.nom)}</strong></td><td>${esc(m.fonction)}</td><td>${esc(m.email)}</td>
      <td class="td-actions">${e.equipe.length > 1 ? `<button class="btn btn--petit" data-retirer="${m.id}">Retirer</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
    <form class="carte form" id="f-membre"><h2>Inviter un membre</h2><div class="grille-3">
      <label>Nom<input name="nom" required maxlength="80"></label><label>Fonction<input name="fonction" required maxlength="80" placeholder="Manager, tuteur…"></label><label>E-mail<input type="email" name="email" required></label></div>
      <div class="form-f"><button class="btn btn--primaire">Ajouter</button></div></form>`;
  return [html, (root) => {
    root.querySelector('#f-membre').onsubmit = (ev) => { ev.preventDefault(); e.equipe.push({ id: uid('eq'), ...Object.fromEntries(new FormData(ev.target)) }); commit('Ajout d\'un membre à l\'équipe de recrutement'); toast('Membre ajouté'); rerender(); };
    root.querySelectorAll('[data-retirer]').forEach((b) => b.onclick = () => { e.equipe = e.equipe.filter((m) => m.id !== b.dataset.retirer); commit('Retrait d\'un membre de l\'équipe'); rerender(); });
  }];
}

// =====================================================================
// Rapport de fin de recrutement
// =====================================================================
function donneesRapport(o) {
  const cs = D().candidatures.filter((c) => c.offreId === o.id).map(extC);
  const finalistes = cs.filter((c) => ['entretien_realise', 'retenue', 'en_stage'].includes(c.statut)).sort((a, b) => (moyenneEval(b) ?? 0) - (moyenneEval(a) ?? 0));
  const decides = cs.filter((c) => c.dateDecision && ['retenue', 'en_stage'].includes(c.statut));
  return {
    cs, finalistes,
    retenus: cs.filter((c) => ['retenue', 'en_stage'].includes(c.statut)),
    delai: decides.length ? Math.round(decides.reduce((a, c) => a + jours(o.datePublication, c.dateDecision), 0) / decides.length) : null,
    sources: Object.entries(cs.reduce((a, c) => { const k = c.source || 'Candidature spontanée'; a[k] = (a[k] || 0) + 1; return a; }, {})),
  };
}
function syntheseLocale(o, r) {
  const n = r.cs.length;
  return `Le recrutement « ${o.titre} » a reçu ${n} candidature(s), dont ${r.cs.filter((c) => c.scoreIA != null && c.statut !== 'non_retenue_ia').length} présélectionnée(s) par le tri IA. `
    + `${r.cs.filter((c) => c.entretien).length} entretien(s) ont été organisés en ligne et ${r.retenus.length} candidat·e(s) ont été retenu·e·s pour ${o.places} place(s)`
    + `${r.delai != null ? `, en ${r.delai} jours en moyenne après la publication` : ''}. `
    + (r.finalistes[0] ? `Le/la finaliste le mieux évalué·e obtient ${moyenneEval(r.finalistes[0])}/20. ` : '')
    + (r.retenus.length < o.places ? `${o.places - r.retenus.length} place(s) reste(nt) à pourvoir : élargir le sourcing via la CVthèque est recommandé.` : 'Toutes les places sont pourvues.');
}
export function vueRapport([id]) {
  const o = off(id); if (!o) return empty('Offre introuvable');
  if (!peutGerer(o) && !['mfp', 'primature'].includes(me().role)) return empty('Accès réservé.');
  const e = ent(o.entrepriseId); const r = donneesRapport(o);
  const html = `${pageHead('Rapport de fin de recrutement', `${esc(o.titre)} — ${esc(e.raisonSociale)}`, `<button class="btn" data-rapport-ia>${icon('sparkles')} Rédiger la synthèse avec l'IA</button><button class="btn" data-print>${icon('print')} Imprimer / PDF</button>`, `#/recrutement/${id}`)}
    <article class="doc doc--rapport">
      <div class="kpis kpis--4"><div><strong>${r.cs.length}</strong><span>candidatures</span></div><div><strong>${r.cs.filter((c) => c.entretien).length}</strong><span>entretiens</span></div>
        <div><strong>${r.retenus.length}/${o.places}</strong><span>places pourvues</span></div><div><strong>${r.delai != null ? `${r.delai} j` : '—'}</strong><span>délai moyen</span></div></div>
      <h3>Synthèse</h3><p id="synthese">${esc(syntheseLocale(o, r))}</p>
      <h3>Entonnoir</h3>${funnel([{ label: 'Candidatures', value: r.cs.length }, { label: 'Présélection', value: r.cs.filter((c) => c.scoreIA != null && c.statut !== 'non_retenue_ia').length }, { label: 'Entretiens', value: r.cs.filter((c) => c.entretien).length }, { label: 'Retenus', value: r.retenus.length }])}
      <h3>Finalistes</h3>${r.finalistes.length ? tableau(['Candidat·e', 'Score IA', 'Évaluation', 'Avis de l\'équipe', 'Décision'], r.finalistes.map((c) => {
        const s = stg(c.stagiaireId);
        return [`${s.prenom} ${s.nom}`, c.scoreIA != null ? `${c.scoreIA}/100` : '—', moyenneEval(c) != null ? `${moyenneEval(c)}/20` : '—',
          c.evaluations.map((v) => AVIS[v.avis][0]).join(', ') || '—', ['retenue', 'en_stage'].includes(c.statut) ? 'Retenu·e' : 'En attente'];
      })) : '<p class="muted">Aucun entretien réalisé.</p>'}
      <div id="analyses"></div>
      <h3>Sources des candidatures</h3>${tableau(['Source', 'Candidatures'], r.sources)}
      <p class="muted petit">Rapport généré le ${date(new Date())} — Plateforme PNEC. Les profils ont été évalués sans considération de genre ni d'âge.</p>
    </article>`;
  return [html, (root) => {
    root.querySelector('[data-rapport-ia]').onclick = async (ev) => {
      const b = ev.currentTarget; b.disabled = true; b.innerHTML = `${icon('sparkles')} Rédaction…`;
      const donnees = {
        offre: { titre: o.titre, places: o.places, competences: o.competences },
        candidatures: r.cs.length, delaiMoyenJours: r.delai,
        finalistes: r.finalistes.map((c) => ({ ref: c.id, scoreIA: c.scoreIA, evaluation: moyenneEval(c), appreciations: [c.entretien?.commentaire, ...c.evaluations.map((v) => v.commentaire)].filter(Boolean), retenu: ['retenue', 'en_stage'].includes(c.statut) })),
      };
      const { ok, data } = await api('assistant', { type: 'rapport', donnees }).catch(() => ({ ok: false, data: {} }));
      if (ok) {
        root.querySelector('#synthese').textContent = data.synthese;
        root.querySelector('#analyses').innerHTML = `<h3>Analyse des finalistes (IA)</h3><ul class="puces">${data.finalistes.map((f) => { const c = cand(f.ref); const s = c && stg(c.stagiaireId); return `<li><strong>${s ? esc(`${s.prenom} ${s.nom}`) : esc(f.ref)}</strong> — ${esc(f.analyse)}</li>`; }).join('')}</ul>
          <h3>Recommandations</h3><ul class="puces">${data.recommandations.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
        toast('Synthèse rédigée par Claude');
      } else toast('Assistant IA non configuré : synthèse automatique conservée', 'info');
      b.disabled = false; b.innerHTML = `${icon('sparkles')} Rédiger la synthèse avec l'IA`;
    };
  }];
}

// =====================================================================
// Fiche de poste assistée
// =====================================================================
export async function genererFiche({ titre, domaine, niveau, entreprise, region }) {
  try {
    const { ok, data } = await api('assistant', { type: 'fiche', donnees: { titre, domaine, niveau, entreprise, region, programme: 'Stage citoyen professionnalisant du PNEC' } });
    if (ok && data.description) return { ...data, moteur: 'claude' };
  } catch { /* repli local */ }
  const comp = (COMPETENCES[domaine] || []).slice(0, 4);
  return {
    moteur: 'local',
    description: `${entreprise} recrute un·e ${titre} en stage citoyen professionnalisant à ${region}. Accompagné·e par un tuteur, vous contribuerez aux activités du service et développerez des compétences reconnues dans le secteur ${domaine.toLowerCase()}.`,
    missions: [
      `Participer aux opérations quotidiennes liées au poste de ${titre.toLowerCase()}`,
      'Appliquer les procédures qualité, hygiène et sécurité de l\'entreprise',
      `Contribuer à un projet d'amélioration du service avec votre tuteur`,
      'Assurer le reporting de vos activités et le suivi des indicateurs',
      'Participer aux actions d\'engagement citoyen du programme',
    ],
    competences: [...comp, 'Travail en équipe'].slice(0, 5),
    profil: `Titulaire d'un ${niveau} ou équivalent dans le domaine ${domaine.toLowerCase()}, rigoureux·se et motivé·e.`,
  };
}

// =====================================================================
// Page carrière publique d'une entreprise
// =====================================================================
export function vueCarriere([id]) {
  const e = ent(id); if (!e || e.statut !== 'validee') return `<main class="page">${empty('Page carrière introuvable.')}</main>`;
  const offres = D().offres.filter((o) => o.entrepriseId === id && o.statut === 'publiee' && new Date(o.dateLimite) >= new Date());
  const enStage = D().candidatures.filter((c) => c.statut === 'en_stage' && off(c.offreId)?.entrepriseId === id).length;
  const cadre = D().conventions.find((c) => c.type === 'CADRE' && c.entrepriseId === id);
  return `<section class="carriere-hero"><div class="section-c">
      <p class="sur-titre">Entreprise engagée · PNEC</p><h1>${esc(e.raisonSociale)}</h1>
      <p class="hero-p">${esc(e.secteur)} · ${esc(e.region)} · ${num(e.effectif)} collaborateurs</p>
      ${cadre && convComplete(cadre) ? `<span class="label-pnec">${icon('shield')} Convention cadre PNEC signée</span>` : ''}</div></section>
    <section class="section"><div class="section-c grille-2-1">
      <div><h2 class="titre-section">Nous rejoindre</h2>
        <p>${esc(e.raisonSociale)} s'engage aux côtés de l'État dans le Programme national d'Engagement citoyen : nous accueillons des jeunes en stage citoyen professionnalisant, avec un tuteur dédié et une indemnité cofinancée à 50 % par la Direction de l'Emploi.</p>
        <h3 class="mt">Offres ouvertes (${offres.length})</h3>
        ${offres.length ? `<div class="offres">${offres.map((o) => `<a class="offre" href="#/offre/${o.id}"><div class="offre-h"><span class="offre-ent">${esc(o.volet || 'Stage citoyen professionnalisant')}</span></div><h3>${esc(o.titre)}</h3>
          <p class="offre-meta">${icon('map')} ${esc(o.region)} · ${icon('clock')} ${o.duree} mois · ${icon('graduation')} ${esc(o.niveau)}</p>
          <div class="tags">${o.competences.map((k) => `<span class="tag">${esc(k)}</span>`).join('')}</div><div class="offre-f"><span>Jusqu'au ${date(o.dateLimite)}</span><span>Postuler ${icon('arrow')}</span></div></a>`).join('')}</div>` : empty('Aucune offre ouverte pour le moment.')}</div>
      <aside class="carte"><h2>En bref</h2><dl class="dl"><dt>Secteur</dt><dd>${esc(e.secteur)}</dd><dt>Siège</dt><dd>${esc(e.region)}</dd><dt>Effectif</dt><dd>${num(e.effectif)}</dd><dt>Jeunes accueillis</dt><dd>${enStage} en stage actuellement</dd></dl>
        <a class="btn btn--primaire" href="#/inscription/stagiaire">Créer mon profil pour postuler</a></aside></div></section>`;
}

// =====================================================================
// Messagerie du stagiaire
// =====================================================================
export function messagesDe(stagiaireId) {
  return D().candidatures.filter((c) => c.stagiaireId === stagiaireId).flatMap((c) => (c.messages || []).map((m) => ({ ...m, c })))
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function vueMessages() {
  const msgs = messagesDe(me().orgId);
  const html = `${pageHead('Messagerie', `${msgs.filter((m) => !m.lu).length} message(s) non lu(s)`)}
    ${msgs.length ? msgs.map((m) => `<article class="carte msg${m.lu ? '' : ' msg--nonlu'}"><div class="msg-h"><div><strong>${esc(m.objet)}</strong><p class="muted petit">${esc(m.de)} · ${new Date(m.date).toLocaleString('fr-FR')} · <a href="#/offre/${m.c.offreId}">${esc(off(m.c.offreId).titre)}</a></p></div>${m.lu ? '' : badge('Nouveau', 'rouge')}</div><pre>${esc(m.corps)}</pre></article>`).join('') : empty('Aucun message pour le moment.')}`;
  return [html, () => {
    let change = false;
    D().candidatures.filter((c) => c.stagiaireId === me().orgId).forEach((c) => (c.messages || []).forEach((m) => { if (!m.lu) { m.lu = true; change = true; } }));
    if (change) save();
  }];
}
