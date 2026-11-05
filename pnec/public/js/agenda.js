// Agenda des entretiens (entreprises) et liste des entretiens (candidats).
// Les entretiens sont enregistrés côté serveur (/api/entretiens) pour être partagés entre
// le recruteur et le candidat, quel que soit l'appareil utilisé.
import { db, save, log, session, api } from './store.js';
import { esc, date, icon, badge, pageHead, empty, toast, modal } from './ui.js';
import { ent, off, stg, cand, trace, rerender } from './views.js';

const D = () => db();
const me = () => session();
const commit = (a) => { log(me()?.nom || 'Anonyme', a); save(); };
const go = (h) => { location.hash = h; };
const pad = (n) => String(n).padStart(2, '0');
const jourIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const debut = (e) => new Date(`${e.date}T${e.heure}:00`);
const fin = (e) => new Date(debut(e).getTime() + (e.duree || 30) * 60000);
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const nouvelleSalle = () => `pnec-${crypto.randomUUID()}`;

// ---------- Synchronisation avec le serveur ----------
export async function publierEntretien(c, statut = 'planifie') {
  if (!c?.entretien) return { ok: false };
  const o = off(c.offreId); const s = stg(c.stagiaireId);
  return api('entretiens', {
    salle: c.entretien.salle, date: c.entretien.date, heure: c.entretien.heure, duree: c.entretien.duree,
    statut, offreId: o.id, offreTitre: o.titre, candidatureId: c.id, candidatEmail: s.email,
    candidatNom: `${s.prenom} ${s.nom}`, evaluateur: c.entretien.evaluateur,
  }).catch(() => ({ ok: false }));
}

// Entretiens visibles : registre serveur + entretiens locaux (données de démonstration), sans doublon.
export async function chargerEntretiens() {
  const u = me();
  const { ok, data } = await api('entretiens').catch(() => ({ ok: false, data: {} }));
  const serveur = ok ? data.entretiens : [];
  const vus = new Set(serveur.map((e) => e.salle));
  const locaux = [];
  if (u.role === 'entreprise') {
    D().candidatures.filter((c) => c.entretien && off(c.offreId)?.entrepriseId === u.orgId && !vus.has(c.entretien.salle)).forEach((c) => {
      const s = stg(c.stagiaireId); const o = off(c.offreId);
      locaux.push({ salle: c.entretien.salle, date: c.entretien.date, heure: c.entretien.heure, duree: c.entretien.duree || 30,
        statut: c.statut === 'entretien_planifie' ? 'planifie' : 'realise', offreId: o.id, offreTitre: o.titre, candidatureId: c.id,
        candidatEmail: s.email, candidatNom: `${s.prenom} ${s.nom}`, entrepriseNom: ent(o.entrepriseId).raisonSociale, evaluateur: c.entretien.evaluateur, local: true });
    });
  }
  return { entretiens: [...serveur, ...locaux].sort((a, b) => debut(a) - debut(b)), serveurOk: ok };
}

export function conflits(liste, dateStr, heure, duree, salleExclue) {
  const d0 = new Date(`${dateStr}T${heure}:00`); const d1 = new Date(d0.getTime() + duree * 60000);
  return liste.filter((e) => e.statut === 'planifie' && e.salle !== salleExclue && debut(e) < d1 && fin(e) > d0);
}

function ics(e) {
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lien = `${location.origin}/#/visio/${e.salle}`;
  const contenu = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PNEC//Entretiens//FR', 'BEGIN:VEVENT',
    `UID:${e.salle}@pnec`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(debut(e))}`, `DTEND:${f(fin(e))}`,
    `SUMMARY:Entretien PNEC — ${e.offreTitre} (${e.candidatNom})`, `DESCRIPTION:Entretien vidéo sur la plateforme PNEC : ${lien}`,
    `LOCATION:${lien}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenu], { type: 'text/calendar' }));
  a.download = `entretien-${e.date}-${e.heure.replace(':', 'h')}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
}

const statutBadge = (e) => ({ planifie: badge('Planifié', 'ok'), realise: badge('Réalisé', 'gris'), annule: badge('Annulé', 'rouge') }[e.statut]);
const enCours = (e) => e.statut === 'planifie' && Date.now() >= debut(e).getTime() - 15 * 60000 && Date.now() <= fin(e).getTime() + 30 * 60000;

// =====================================================================
// Agenda (entreprise)
// =====================================================================
export function vueAgenda(_, q) {
  const vue = q.get('vue') || 'semaine';
  const ref = q.get('d') ? new Date(`${q.get('d')}T12:00:00`) : new Date();
  const lien = (v, d) => `#/agenda?vue=${v}&d=${jourIso(d)}`;
  const decal = (n) => { const d = new Date(ref); if (vue === 'mois') d.setMonth(d.getMonth() + n); else d.setDate(d.getDate() + 7 * n); return d; };
  const titre = vue === 'mois' ? ref.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : (() => { const l = lundi(ref); const dim = new Date(l); dim.setDate(l.getDate() + 6); return `Semaine du ${l.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${dim.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`; })();
  const html = `${pageHead('Agenda des entretiens', 'Entretiens vidéo intégrés à la plateforme — partagés avec les candidats', `<button class="btn btn--primaire" data-planifier>${icon('plus')} Planifier un entretien</button>`)}
    <div class="agenda-barre">
      <div class="actions"><a class="btn btn--petit" href="${lien(vue, decal(-1))}" aria-label="Précédent">${icon('back')}</a>
        <a class="btn btn--petit" href="${lien(vue, new Date())}">Aujourd'hui</a>
        <a class="btn btn--petit" href="${lien(vue, decal(1))}" aria-label="Suivant">${icon('arrow')}</a></div>
      <h2>${esc(titre)}</h2>
      <nav class="bascule bascule--s">${[['semaine', 'Semaine'], ['mois', 'Mois'], ['liste', 'Liste']].map(([k, l]) => `<a href="${lien(k, ref)}" class="${k === vue ? 'on' : ''}">${l}</a>`).join('')}</nav>
    </div>
    <div id="agenda-corps"><p class="muted">Chargement de l'agenda…</p></div>`;
  return [html, async (root) => {
    const { entretiens, serveurOk } = await chargerEntretiens();
    const corps = root.querySelector('#agenda-corps'); if (!corps) return;
    corps.innerHTML = (serveurOk ? '' : `<div class="alerte">${icon('alert')}<div><strong>Agenda partagé indisponible</strong><p>Seuls les entretiens enregistrés dans ce navigateur sont affichés.</p></div></div>`)
      + (vue === 'mois' ? grilleMois(ref, entretiens) : vue === 'liste' ? listeAgenda(entretiens) : grilleSemaine(ref, entretiens));
    corps.querySelectorAll('[data-ent]').forEach((b) => b.addEventListener('click', () => detail(entretiens.find((e) => e.salle === b.dataset.ent), entretiens)));
    root.querySelector('[data-planifier]').onclick = () => planifierDepuisAgenda(entretiens);
  }];
}

function lundi(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

function grilleSemaine(ref, liste) {
  const l = lundi(ref); const H0 = 8, H1 = 19, PX = 64;
  const jours = [...Array(7)].map((_, i) => { const d = new Date(l); d.setDate(l.getDate() + i); return d; });
  const auj = jourIso(new Date());
  const maintenant = new Date(); const yNow = (maintenant.getHours() + maintenant.getMinutes() / 60 - H0) * PX;
  return `<div class="semaine" style="--h:${PX}px">
    <div class="sem-tete"><span></span>${jours.map((d, i) => `<span class="${jourIso(d) === auj ? 'auj' : ''}">${JOURS[i]} <strong>${d.getDate()}</strong></span>`).join('')}</div>
    <div class="sem-corps"><div class="sem-heures">${[...Array(H1 - H0)].map((_, i) => `<span>${pad(H0 + i)}:00</span>`).join('')}</div>
    ${jours.map((d) => {
      const jour = jourIso(d);
      const items = liste.filter((e) => e.date === jour);
      return `<div class="sem-jour${jour === auj ? ' auj' : ''}" style="height:${(H1 - H0) * PX}px">
        ${jour === auj && yNow > 0 && yNow < (H1 - H0) * PX ? `<i class="maintenant" style="top:${yNow}px"></i>` : ''}
        ${items.map((e) => {
          const [h, m] = e.heure.split(':').map(Number);
          const top = Math.max(0, (h + m / 60 - H0) * PX); const hauteur = Math.max(40, (e.duree / 60) * PX - 3);
          return `<button class="rdv-b rdv-b--${e.statut}" style="top:${top}px;height:${hauteur}px" data-ent="${esc(e.salle)}" data-tip="${esc(`${e.heure} · ${e.candidatNom} — ${e.offreTitre}`)}">
            <strong>${esc(e.heure)} ${esc(e.candidatNom)}</strong><span>${esc(e.offreTitre)}</span></button>`;
        }).join('')}</div>`;
    }).join('')}</div></div>
    <p class="legende-ag"><span class="pt pt--entretien"></span>Planifié <span class="pt pt--ecartes"></span>Réalisé <span class="pt pt--annule"></span>Annulé · Les entretiens hors de 8 h – 19 h figurent dans la vue Liste.</p>`;
}

function grilleMois(ref, liste) {
  const premier = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const depart = lundi(premier); const auj = jourIso(new Date());
  return `<div class="mois"><div class="mois-tete">${JOURS.map((j) => `<span>${j}</span>`).join('')}</div><div class="mois-grille">
    ${[...Array(42)].map((_, i) => {
      const d = new Date(depart); d.setDate(depart.getDate() + i); const jour = jourIso(d);
      const items = liste.filter((e) => e.date === jour);
      return `<div class="mois-j${d.getMonth() !== ref.getMonth() ? ' hors' : ''}${jour === auj ? ' auj' : ''}"><span class="mois-n">${d.getDate()}</span>
        ${items.slice(0, 3).map((e) => `<button class="mois-e mois-e--${e.statut}" data-ent="${esc(e.salle)}">${esc(e.heure)} ${esc(e.candidatNom.split(' ')[0])}</button>`).join('')}
        ${items.length > 3 ? `<a class="mois-plus" href="#/agenda?vue=semaine&d=${jour}">+${items.length - 3}</a>` : ''}</div>`;
    }).join('')}</div></div>`;
}

function listeAgenda(liste) {
  const aVenir = liste.filter((e) => fin(e) >= new Date() && e.statut !== 'annule');
  const passes = liste.filter((e) => !aVenir.includes(e)).reverse();
  const tab = (rows) => `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Candidat·e</th><th>Offre</th><th>Évaluateur</th><th>Statut</th><th></th></tr></thead><tbody>
    ${rows.map((e) => `<tr><td><strong>${date(e.date)}</strong><br><span class="muted">${esc(e.heure)} · ${e.duree} min</span></td><td>${esc(e.candidatNom)}</td><td>${esc(e.offreTitre)}</td><td>${esc(e.evaluateur || '—')}</td>
      <td>${statutBadge(e)}${e.local ? ' <span class="muted petit">(local)</span>' : ''}</td><td class="td-actions">${e.statut === 'planifie' ? `<a class="btn btn--petit btn--primaire" href="#/visio/${esc(e.salle)}">${icon('video')} Visio</a>` : ''}<button class="btn btn--petit" data-ent="${esc(e.salle)}">Détails</button></td></tr>`).join('')}</tbody></table></div>`;
  return `<section class="carte"><h2>À venir (${aVenir.length})</h2>${aVenir.length ? tab(aVenir) : empty('Aucun entretien à venir.')}</section>
    <section class="carte"><h2>Passés et annulés (${passes.length})</h2>${passes.length ? tab(passes) : empty('Aucun.')}</section>`;
}

function detail(e, liste) {
  if (!e) return;
  const c = cand(e.candidatureId);
  const w = modal(`Entretien — ${e.candidatNom}`, `
    <dl class="dl"><dt>Date</dt><dd>${date(e.date)} à ${esc(e.heure)} (${e.duree} min)</dd><dt>Offre</dt><dd>${esc(e.offreTitre)}</dd>
      <dt>Évaluateur</dt><dd>${esc(e.evaluateur || '—')}</dd><dt>Statut</dt><dd>${statutBadge(e)}</dd><dt>Salle</dt><dd class="mono petit">${esc(e.salle)}</dd></dl>
    <div class="actions mt-s">
      ${e.statut === 'planifie' ? `<a class="btn btn--primaire" href="#/visio/${esc(e.salle)}">${icon('video')} ${enCours(e) ? 'Rejoindre maintenant' : 'Ouvrir la salle'}</a>` : ''}
      ${c ? `<a class="btn" href="#/recrutement/${c.offreId}?c=${c.id}">${icon('user')} Fiche candidat</a>` : ''}
      <button type="button" class="btn" data-ics>${icon('calendar')} Ajouter à mon calendrier</button>
      ${e.statut === 'planifie' && c ? `<button type="button" class="btn" data-reprog>Reprogrammer</button><button type="button" class="btn" data-annuler>Annuler</button>` : ''}
    </div>`, { valider: '', annuler: 'Fermer' });
  w.querySelector('[data-ics]').onclick = () => ics(e);
  w.querySelector('[data-reprog]')?.addEventListener('click', () => { w.remove(); reprogrammer(c, liste); });
  w.querySelector('[data-annuler]')?.addEventListener('click', async () => {
    const { ok } = await api('entretiens/annuler', { salle: e.salle }).catch(() => ({ ok: false }));
    c.statut = 'preselectionnee'; trace(c, `Entretien du ${e.date} à ${e.heure} annulé`); delete c.entretien;
    (c.messages ??= []).push({ id: `msg-${Date.now()}`, date: new Date().toISOString(), de: e.entrepriseNom, auteur: me().nom, objet: `Entretien annulé — ${e.offreTitre}`, corps: `Bonjour,\n\nL'entretien prévu le ${date(e.date)} à ${e.heure} est annulé. Nous reviendrons vers vous pour un nouveau créneau.\n\n${e.entrepriseNom}`, lu: false });
    commit(`Annulation de l'entretien avec ${e.candidatNom}`); w.remove();
    toast(ok ? 'Entretien annulé — candidat informé' : 'Entretien annulé localement', ok ? 'ok' : 'info'); rerender();
  });
}

// Formulaire de planification commun (pipeline, agenda, reprogrammation)
export function formulairePlanification(c, liste, { titre, valider = 'Planifier' } = {}) {
  const o = off(c.offreId); const s = stg(c.stagiaireId); const e = ent(o.entrepriseId);
  const deja = c.entretien || {};
  const demain = new Date(Date.now() + 864e5); const jour = deja.date || jourIso(demain);
  const w = modal(titre || `Planifier l'entretien — ${s.prenom} ${s.nom}`, `<div class="grille-2">
    <label>Date<input type="date" name="date" required value="${jour}" min="${jourIso(new Date())}"></label>
    <label>Heure<input type="time" name="heure" required value="${deja.heure || '10:00'}" step="900"></label>
    <label>Durée<select name="duree">${[20, 30, 45, 60].map((d) => `<option value="${d}" ${(deja.duree || 30) === d ? 'selected' : ''}>${d} min</option>`).join('')}</select></label>
    <label>Évaluateur·rice<select name="evaluateur">${(e.equipe || [{ nom: e.contact }]).map((m) => `<option ${m.nom === deja.evaluateur ? 'selected' : ''}>${esc(m.nom)}</option>`).join('')}</select></label></div>
    <p class="alerte-conflit" id="conflit" hidden></p>
    <label class="check"><input type="checkbox" name="informer" checked> Envoyer l'invitation au candidat (messagerie PNEC)</label>
    <p class="note">${icon('video')} L'entretien se déroule en vidéo directement dans la plateforme. Le candidat le retrouve dans son espace, depuis n'importe quel appareil.</p>`, {
    valider, onValider: async (v) => {
      const nouveau = !c.entretien;
      c.entretien = { ...(c.entretien || {}), date: v.date, heure: v.heure, duree: +v.duree, evaluateur: v.evaluateur, salle: c.entretien?.salle || nouvelleSalle() };
      c.statut = 'entretien_planifie';
      trace(c, `${nouveau ? 'Entretien planifié' : 'Entretien reprogrammé'} le ${v.date} à ${v.heure} (${v.evaluateur})`);
      if (v.informer) {
        (c.messages ??= []).push({ id: `msg-${Date.now()}`, date: new Date().toISOString(), de: e.raisonSociale, auteur: me().nom,
          objet: `${nouveau ? 'Invitation à un entretien' : 'Nouvel horaire d\'entretien'} — ${o.titre}`,
          corps: `Bonjour ${s.prenom},\n\nNous vous proposons un entretien vidéo le ${date(v.date)} à ${v.heure} (${v.duree} min) avec ${v.evaluateur}.\nConnectez-vous à votre espace PNEC (rubrique « Mes entretiens ») quelques minutes avant pour tester votre caméra et votre micro.\n\nÀ bientôt,\n${e.raisonSociale}`, lu: false });
      }
      const { ok, data } = await publierEntretien(c);
      commit(`${nouveau ? 'Entretien planifié' : 'Entretien reprogrammé'} le ${v.date} à ${v.heure} avec ${s.prenom} ${s.nom}`);
      if (!ok) toast(data?.error ? `Agenda partagé : ${data.error}` : 'Entretien enregistré localement (agenda partagé indisponible)', 'info');
      else toast(nouveau ? 'Entretien planifié — le candidat le voit dans son espace' : 'Entretien reprogrammé');
      rerender();
    },
  });
  const maj = () => {
    const f = w.querySelector('form');
    const cs = conflits(liste, f.date.value, f.heure.value, +f.duree.value, c.entretien?.salle);
    const el = w.querySelector('#conflit');
    el.hidden = !cs.length;
    el.innerHTML = cs.length ? `${icon('alert')} Chevauchement avec : ${cs.map((x) => `${esc(x.heure)} ${esc(x.candidatNom)}`).join(', ')}` : '';
  };
  w.querySelector('form').addEventListener('input', maj); maj();
}

function reprogrammer(c, liste) { formulairePlanification(c, liste, { titre: 'Reprogrammer l\'entretien', valider: 'Reprogrammer' }); }

function planifierDepuisAgenda(liste) {
  const u = me();
  const cs = D().candidatures.filter((c) => c.statut === 'preselectionnee' && off(c.offreId)?.entrepriseId === u.orgId);
  if (!cs.length) return toast('Aucun candidat présélectionné à convoquer. Lancez le tri IA dans l\'espace recruteur.', 'info');
  const w = modal('Planifier un entretien', `<label>Candidat·e présélectionné·e<select name="c">${cs.map((c) => { const s = stg(c.stagiaireId); return `<option value="${c.id}">${esc(`${s.prenom} ${s.nom}`)} — ${esc(off(c.offreId).titre)}${c.scoreIA != null ? ` (IA ${c.scoreIA}/100)` : ''}</option>`; }).join('')}</select></label>`, {
    valider: 'Continuer', onValider: ({ c }) => { setTimeout(() => formulairePlanification(cand(c), liste), 30); },
  });
  void w;
}

// =====================================================================
// Mes entretiens (candidat) — depuis le registre serveur
// =====================================================================
export function vueMesEntretiens() {
  return [`${pageHead('Mes entretiens', 'Entretiens vidéo dans la plateforme : testez votre caméra et votre micro avant l\'heure')}<div id="mes-ent"><p class="muted">Chargement…</p></div>`, async (root) => {
    const { entretiens, serveurOk } = await chargerEntretiens();
    const el = root.querySelector('#mes-ent'); if (!el) return;
    const aVenir = entretiens.filter((e) => e.statut === 'planifie' && fin(e).getTime() + 30 * 60000 >= Date.now());
    const autres = entretiens.filter((e) => !aVenir.includes(e));
    el.innerHTML = (serveurOk ? '' : `<div class="alerte">${icon('alert')}<div><strong>Service momentanément indisponible</strong><p>Réessayez dans quelques instants.</p></div></div>`)
      + (aVenir.length ? aVenir.map((e) => `<article class="carte rdv-c"><div class="rdv-date"><strong>${new Date(e.date + 'T12:00').getDate()}</strong><span>${new Date(e.date + 'T12:00').toLocaleDateString('fr-FR', { month: 'short' })}</span></div>
        <div class="rdv-i"><h2>${esc(e.offreTitre)}</h2><p class="muted">${esc(e.entrepriseNom)} · ${esc(e.heure)} · ${e.duree} min · avec ${esc(e.evaluateur || 'le recruteur')}</p>
        ${enCours(e) ? badge('La salle est ouverte', 'ok') : `<span class="muted petit">La salle ouvre 15 minutes avant l'heure. Vous pouvez tester votre matériel dès maintenant.</span>`}</div>
        <div class="actions"><a class="btn btn--primaire" href="#/visio/${esc(e.salle)}">${icon('video')} ${enCours(e) ? 'Rejoindre l\'entretien' : 'Tester et ouvrir la salle'}</a><button class="btn" data-ics="${esc(e.salle)}">${icon('calendar')} Calendrier</button></div></article>`).join('')
        : empty('Aucun entretien à venir. Les recruteurs vous convoquent depuis la plateforme : vous serez prévenu·e dans votre messagerie.'))
      + (autres.length ? `<section class="carte"><h2>Historique</h2><ul class="liste">${autres.map((e) => `<li>${date(e.date)} ${esc(e.heure)} — ${esc(e.offreTitre)} (${esc(e.entrepriseNom)}) ${statutBadge(e)}</li>`).join('')}</ul></section>` : '');
    el.querySelectorAll('[data-ics]').forEach((b) => b.onclick = () => ics(entretiens.find((e) => e.salle === b.dataset.ics)));
  }];
}

export { ics as exporterIcs, debut as debutEntretien, fin as finEntretien, go as _go };
