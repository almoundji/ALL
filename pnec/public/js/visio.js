// Entretien vidéo intégré (WebRTC) : salle d'attente avec test du matériel, appel chiffré
// de navigateur à navigateur, micro / caméra / partage d'écran, discussion, minuteur,
// et grille d'évaluation à côté de la vidéo pour le recruteur.
import { db, save, log, session, api } from './store.js';
import { esc, icon, toast, date } from './ui.js';
import { cand, stg, trace } from './views.js';
import { publierEntretien } from './agenda.js';

const D = () => db();
const me = () => session();
const CRITERES = [['motivation', 'Motivation et engagement citoyen'], ['technique', 'Compétences techniques'], ['communication', 'Communication'], ['adequation', 'Adéquation au poste']];

export function vueVisio([salle]) {
  const html = `<div class="visio-page" id="visio">
    <div class="visio-charge"><p class="muted">Ouverture de la salle d'entretien…</p></div></div>`;
  return [html, (root) => demarrer(root.querySelector('#visio'), salle)];
}

async function infosSalle(salle) {
  let r = await api(`visio/${encodeURIComponent(salle)}`).catch(() => ({ ok: false, status: 0, data: {} }));
  if (!r.ok && r.status === 404 && me().role === 'entreprise') {
    // Entretien de démonstration encore absent du registre partagé : on l'y inscrit.
    const c = D().candidatures.find((x) => x.entretien?.salle === salle);
    if (c && (await publierEntretien(c, c.statut === 'entretien_planifie' ? 'planifie' : 'realise')).ok) r = await api(`visio/${encodeURIComponent(salle)}`);
  }
  return r;
}

async function demarrer(el, salle) {
  const r = await infosSalle(salle);
  if (!document.body.contains(el)) return;
  if (!r.ok) {
    el.innerHTML = `<div class="visio-erreur">${icon('alert')}<h1>Salle indisponible</h1><p>${esc(r.data?.error || 'Impossible de joindre le service de visioconférence.')}</p>
      <a class="btn btn--primaire" href="#/${me().role === 'stagiaire' ? 'entretiens' : 'agenda'}">Retour à mes entretiens</a></div>`;
    return;
  }
  const { entretien: e, role, iceServers } = r.data;
  const recruteur = role === 'recruteur';
  const c = recruteur ? cand(e.candidatureId) : null;
  const autreNom = recruteur ? e.candidatNom : `${e.evaluateur || 'Recruteur'} · ${e.entrepriseNom}`;

  // ---------- État ----------
  let local = null, pc = null, fileIce = [], actif = true, polling = null, connecteDepuis = null, ecran = null, chrono = null;
  const nettoyer = () => {
    actif = false; clearInterval(polling); clearInterval(chrono);
    local?.getTracks().forEach((t) => t.stop()); ecran?.getTracks().forEach((t) => t.stop());
    pc?.close(); pc = null;
  };
  window.__nettoyage = () => { if (pc || polling) envoyer('quitte'); nettoyer(); };
  const envoyer = (type, data) => api(`visio/${encodeURIComponent(salle)}/signal`, { type, data }).catch(() => {});

  // ---------- Salle d'attente ----------
  el.innerHTML = `<div class="lobby">
    <div class="lobby-v"><video id="apercu" autoplay playsinline muted></video><div class="lobby-ctrl">
      <button class="vbtn" data-micro-l aria-label="Micro">${icon('micro')}</button><button class="vbtn" data-cam-l aria-label="Caméra">${icon('video')}</button></div>
      <p class="lobby-msg" id="lobby-msg">Autorisez l'accès à votre caméra et à votre micro.</p></div>
    <div class="lobby-i"><p class="sur-titre vert">Entretien vidéo PNEC</p><h1>${esc(e.offreTitre)}</h1>
      <p class="muted">${esc(e.entrepriseNom)} · ${date(e.date)} à ${esc(e.heure)} · ${e.duree} min</p>
      <p>Avec <strong>${esc(autreNom)}</strong></p>
      <label>Caméra<select id="sel-cam"></select></label><label>Micro<select id="sel-mic"></select></label>
      <div class="vu"><span>Niveau du micro</span><i><b id="vu"></b></i></div>
      <button class="btn btn--primaire btn--large" id="rejoindre" disabled>${icon('video')} Rejoindre l'entretien</button>
      <ul class="puces petit muted"><li>Connexion chiffrée de bout en bout entre les deux participants</li><li>Installez-vous au calme, avec une bonne lumière face à vous</li><li>L'entretien n'est pas enregistré</li></ul>
    </div></div>`;
  const apercu = el.querySelector('#apercu'); const msg = el.querySelector('#lobby-msg');
  let micOn = true, camOn = true, analyse = null;

  async function ouvrirMedia(camId, micId) {
    local?.getTracks().forEach((t) => t.stop());
    try {
      local = await navigator.mediaDevices.getUserMedia({
        video: camId ? { deviceId: { exact: camId } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: micId ? { deviceId: { exact: micId }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true },
      });
    } catch (err) {
      try { local = await navigator.mediaDevices.getUserMedia({ audio: true }); camOn = false; msg.textContent = 'Caméra indisponible : vous participerez en audio.'; } catch {
        msg.textContent = 'Accès à la caméra et au micro refusé. Autorisez-le dans votre navigateur puis rechargez la page.'; return false;
      }
    }
    apercu.srcObject = local; msg.textContent = 'Tout est prêt.';
    local.getAudioTracks().forEach((t) => { t.enabled = micOn; }); local.getVideoTracks().forEach((t) => { t.enabled = camOn; });
    vumetre(); return true;
  }
  function vumetre() {
    try {
      analyse?.ctx.close();
      const ctx = new AudioContext(); const src = ctx.createMediaStreamSource(local); const an = ctx.createAnalyser(); an.fftSize = 256; src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount); analyse = { ctx };
      const tick = () => { if (!actif || !document.getElementById('vu')) return ctx.close(); an.getByteFrequencyData(buf); document.getElementById('vu').style.width = `${Math.min(100, (buf.reduce((a, b) => a + b, 0) / buf.length) * 1.6)}%`; requestAnimationFrame(tick); };
      tick();
    } catch { /* AudioContext indisponible */ }
  }
  async function listerPeripheriques() {
    const devs = await navigator.mediaDevices.enumerateDevices();
    const remplir = (sel, kind) => { sel.innerHTML = devs.filter((d) => d.kind === kind).map((d, i) => `<option value="${d.deviceId}">${esc(d.label || `${kind === 'videoinput' ? 'Caméra' : 'Micro'} ${i + 1}`)}</option>`).join('') || '<option value="">Aucun</option>'; };
    remplir(el.querySelector('#sel-cam'), 'videoinput'); remplir(el.querySelector('#sel-mic'), 'audioinput');
    const vt = local?.getVideoTracks()[0]?.getSettings().deviceId; const at = local?.getAudioTracks()[0]?.getSettings().deviceId;
    if (vt) el.querySelector('#sel-cam').value = vt; if (at) el.querySelector('#sel-mic').value = at;
  }
  if (!navigator.mediaDevices?.getUserMedia) { msg.textContent = 'Votre navigateur ne permet pas la visioconférence. Utilisez Chrome, Edge, Firefox ou Safari récent.'; return; }
  if (await ouvrirMedia()) { await listerPeripheriques(); el.querySelector('#rejoindre').disabled = false; }
  el.querySelector('#sel-cam').onchange = (ev) => ouvrirMedia(ev.target.value, el.querySelector('#sel-mic').value);
  el.querySelector('#sel-mic').onchange = (ev) => ouvrirMedia(el.querySelector('#sel-cam').value, ev.target.value);
  const majBoutons = () => el.querySelectorAll('[data-micro-l],[data-micro]').forEach((b) => { b.classList.toggle('off', !micOn); b.innerHTML = icon(micOn ? 'micro' : 'micro-off'); })
    || el.querySelectorAll('[data-cam-l],[data-cam]').forEach((b) => { b.classList.toggle('off', !camOn); b.innerHTML = icon(camOn ? 'video' : 'video-off'); });
  const basculerMicro = () => { micOn = !micOn; local?.getAudioTracks().forEach((t) => { t.enabled = micOn; }); majBoutons(); envoyer('etat', { micro: micOn, camera: camOn }); };
  const basculerCam = () => { camOn = !camOn; local?.getVideoTracks().forEach((t) => { t.enabled = camOn; }); majBoutons(); envoyer('etat', { micro: micOn, camera: camOn }); };
  el.querySelector('[data-micro-l]').onclick = basculerMicro; el.querySelector('[data-cam-l]').onclick = basculerCam;
  el.querySelector('#rejoindre').onclick = rejoindre;

  // ---------- Appel ----------
  async function rejoindre() {
    el.innerHTML = `<div class="appel${recruteur ? ' appel--recruteur' : ''}">
      <div class="appel-v">
        <div class="scene"><video id="distante" autoplay playsinline></video>
          <div class="attente" id="attente"><span class="av av--l">${esc(autreNom.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase())}</span><p id="etat-txt">En attente de ${esc(autreNom)}…</p></div>
          <span class="tag-nom">${esc(autreNom)} <i id="etat-autre"></i></span>
          <video id="locale" autoplay playsinline muted></video>
          <span class="chrono" id="chrono">00:00 / ${e.duree} min</span>
          <span class="qualite" id="qualite" title="Qualité de la connexion"></span>
        </div>
        <div class="controles">
          <button class="vbtn" data-micro aria-label="Couper / activer le micro"></button>
          <button class="vbtn" data-cam aria-label="Couper / activer la caméra"></button>
          ${navigator.mediaDevices?.getDisplayMedia ? `<button class="vbtn" data-ecran aria-label="Partager mon écran">${icon('ecran')}</button>` : ''}
          <button class="vbtn" data-chat aria-label="Discussion">${icon('chat')}<b id="chat-n" hidden></b></button>
          <button class="vbtn" data-plein aria-label="Plein écran">${icon('plein')}</button>
          <button class="vbtn vbtn--rouge" data-quitter aria-label="Quitter l'entretien">${icon('raccrocher')}</button>
        </div>
      </div>
      <aside class="appel-p">
        <nav class="onglets onglets--tiroir"><a href="#" data-p="${recruteur ? 'eval' : 'info'}" class="on">${recruteur ? 'Évaluation' : 'L\'offre'}</a><a href="#" data-p="chat">Discussion</a></nav>
        <div class="appel-pb" id="p-eval">${recruteur ? panneauEvaluation(c) : panneauCandidat(e)}</div>
        <div class="appel-pb" id="p-chat" hidden><div class="chat-l" id="chat-l"><p class="muted petit">Les messages ne sont pas conservés après l'entretien.</p></div>
          <form class="ligne-form" id="f-chat"><input name="m" placeholder="Écrire un message…" maxlength="500" autocomplete="off" required><button class="btn btn--primaire btn--petit">Envoyer</button></form></div>
      </aside></div>`;
    el.querySelector('#locale').srcObject = local;
    majBoutons();
    bindAppel();
    // Purge des anciens messages de signalisation, puis annonce de présence
    await api(`visio/${encodeURIComponent(salle)}/signal`).catch(() => {});
    await envoyer('pret', { nom: me().nom });
    log(me().nom, `Entrée dans la salle d'entretien (${e.offreTitre})`); save();
    polling = setInterval(relever, 1200);
  }

  function creerPc() {
    pc?.close();
    pc = new RTCPeerConnection({ iceServers });
    fileIce = [];
    local.getTracks().forEach((t) => pc.addTrack(t, local));
    if (ecran) remplacerVideo(ecran.getVideoTracks()[0]);
    pc.ontrack = (ev) => { const v = el.querySelector('#distante'); if (v && v.srcObject !== ev.streams[0]) v.srcObject = ev.streams[0]; };
    pc.onicecandidate = (ev) => { if (ev.candidate) envoyer('ice', ev.candidate.toJSON()); };
    pc.onconnectionstatechange = () => {
      const st = pc?.connectionState; const att = el.querySelector('#attente'); const txt = el.querySelector('#etat-txt');
      if (!att) return;
      if (st === 'connected') {
        att.hidden = true; if (!connecteDepuis) { connecteDepuis = Date.now(); demarrerChrono(); }
        envoyer('etat', { micro: micOn, camera: camOn }); qualite();
      } else if (st === 'connecting') { att.hidden = false; txt.textContent = 'Connexion en cours…'; }
      else if (st === 'disconnected') { att.hidden = false; txt.textContent = 'Connexion instable, reconnexion…'; }
      else if (st === 'failed') {
        att.hidden = false; txt.innerHTML = `Connexion impossible (réseau restrictif). <button class="btn btn--petit" id="relancer">Réessayer</button> <a class="btn btn--petit btn--clair" href="${esc(D().params.visioBase + salle)}" target="_blank" rel="noopener">Salle de secours</a>`;
        el.querySelector('#relancer').onclick = () => (recruteur ? offrir() : envoyer('pret', { nom: me().nom }));
      }
    };
    return pc;
  }
  async function offrir() {
    creerPc();
    const offre = await pc.createOffer();
    await pc.setLocalDescription(offre);
    await envoyer('offre', pc.localDescription.toJSON());
  }
  async function viderIce() { for (const cdt of fileIce) { try { await pc.addIceCandidate(cdt); } catch { /* candidat obsolète */ } } fileIce = []; }

  async function relever() {
    if (!actif) return;
    const r2 = await api(`visio/${encodeURIComponent(salle)}/signal`).catch(() => null);
    if (!r2?.ok) return;
    for (const m of r2.data.messages) {
      try {
        if (m.type === 'pret') { if (recruteur) await offrir(); else if (!pc || pc.connectionState !== 'connected') await envoyer('pret', { nom: me().nom }); }
        else if (m.type === 'offre' && !recruteur) {
          creerPc(); await pc.setRemoteDescription(m.data); await viderIce();
          const rep = await pc.createAnswer(); await pc.setLocalDescription(rep); await envoyer('reponse', pc.localDescription.toJSON());
        } else if (m.type === 'reponse' && recruteur && pc && pc.signalingState === 'have-local-offer') { await pc.setRemoteDescription(m.data); await viderIce(); }
        else if (m.type === 'ice') { if (pc?.remoteDescription) await pc.addIceCandidate(m.data).catch(() => {}); else fileIce.push(m.data); }
        else if (m.type === 'chat') ajouterChat(m.nom, m.data.texte, false);
        else if (m.type === 'etat') { const i = el.querySelector('#etat-autre'); if (i) i.innerHTML = `${m.data.micro ? '' : icon('micro-off')}${m.data.camera ? '' : icon('video-off')}`; }
        else if (m.type === 'quitte') {
          pc?.close(); pc = null; const att = el.querySelector('#attente');
          if (att) { att.hidden = false; el.querySelector('#etat-txt').textContent = `${autreNom} a quitté l'entretien.`; }
          const v = el.querySelector('#distante'); if (v) v.srcObject = null;
        }
      } catch (err) { console.warn('visio', err); }
    }
  }

  function demarrerChrono() {
    chrono = setInterval(() => {
      const s = Math.floor((Date.now() - connecteDepuis) / 1000); const t = el.querySelector('#chrono'); if (!t) return;
      t.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} / ${e.duree} min`;
      t.classList.toggle('depasse', s > e.duree * 60);
    }, 1000);
  }
  async function qualite() {
    if (!pc || !actif) return;
    const stats = await pc.getStats(); let rtt = null;
    stats.forEach((s) => { if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.currentRoundTripTime != null) rtt = s.currentRoundTripTime; });
    const q = el.querySelector('#qualite'); if (q && rtt != null) { q.className = `qualite ${rtt < 0.15 ? 'q-bon' : rtt < 0.4 ? 'q-moyen' : 'q-faible'}`; q.title = `Latence ${Math.round(rtt * 1000)} ms`; }
    setTimeout(qualite, 4000);
  }
  function remplacerVideo(piste) { pc?.getSenders().find((s) => s.track?.kind === 'video')?.replaceTrack(piste); }

  function ajouterChat(nom, texte, moi) {
    const l = el.querySelector('#chat-l'); if (!l) return;
    l.insertAdjacentHTML('beforeend', `<div class="chat-m${moi ? ' moi' : ''}"><strong>${esc(nom)}</strong><p>${esc(texte)}</p></div>`); l.scrollTop = l.scrollHeight;
    if (!moi && el.querySelector('#p-chat').hidden) { const n = el.querySelector('#chat-n'); n.hidden = false; n.textContent = String((+n.textContent || 0) + 1); }
  }

  function bindAppel() {
    el.querySelector('[data-micro]').onclick = basculerMicro;
    el.querySelector('[data-cam]').onclick = basculerCam;
    const btnEcran = el.querySelector('[data-ecran]');
    if (btnEcran) btnEcran.onclick = async (ev) => {
      const b = ev.currentTarget;
      if (ecran) { ecran.getTracks().forEach((t) => t.stop()); ecran = null; remplacerVideo(local.getVideoTracks()[0]); el.querySelector('#locale').srcObject = local; b.classList.remove('on'); return; }
      try {
        ecran = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const piste = ecran.getVideoTracks()[0]; remplacerVideo(piste); el.querySelector('#locale').srcObject = ecran; b.classList.add('on');
        piste.onended = () => { if (ecran) b.click(); };
      } catch { toast('Partage d\'écran annulé', 'info'); }
    };
    el.querySelector('[data-plein]').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : el.querySelector('.scene').requestFullscreen?.());
    el.querySelector('[data-quitter]').onclick = async () => {
      await envoyer('quitte'); nettoyer(); window.__nettoyage = null;
      log(me().nom, `Sortie de la salle d'entretien (${e.offreTitre})`); save();
      toast('Vous avez quitté l\'entretien', 'info');
      location.hash = recruteur ? (c ? `#/recrutement/${c.offreId}?c=${c.id}&t=evaluations` : '#/agenda') : '#/entretiens';
    };
    const ouvrirPanneau = (p) => {
      el.querySelectorAll('[data-p]').forEach((a) => a.classList.toggle('on', a.dataset.p === p));
      el.querySelector('#p-eval').hidden = p === 'chat'; el.querySelector('#p-chat').hidden = p !== 'chat';
      if (p === 'chat') { const n = el.querySelector('#chat-n'); n.hidden = true; n.textContent = ''; el.querySelector('#f-chat input').focus(); }
      el.querySelector('.appel').classList.add('panneau-ouvert');
    };
    el.querySelectorAll('[data-p]').forEach((a) => a.onclick = (ev) => { ev.preventDefault(); ouvrirPanneau(a.dataset.p); });
    el.querySelector('[data-chat]').onclick = () => {
      const ap = el.querySelector('.appel');
      if (ap.classList.contains('panneau-ouvert') && !el.querySelector('#p-chat').hidden && window.innerWidth < 960) ap.classList.remove('panneau-ouvert'); else ouvrirPanneau('chat');
    };
    el.querySelector('#f-chat').onsubmit = (ev) => {
      ev.preventDefault(); const t = ev.target.m.value.trim(); if (!t) return;
      envoyer('chat', { texte: t }); ajouterChat(me().nom, t, true); ev.target.reset();
    };
    const f = el.querySelector('#f-eval-visio');
    if (f) f.onsubmit = async (ev) => {
      ev.preventDefault();
      const v = Object.fromEntries(new FormData(f));
      const notes = Object.fromEntries(CRITERES.map(([k]) => [k, +v[k]]));
      const note = Math.round((Object.values(notes).reduce((a, b) => a + b, 0) / 20) * 20 * 10) / 10;
      if (c) {
        Object.assign(c.entretien, { notes, note, commentaire: v.commentaire });
        if (c.statut === 'entretien_planifie') c.statut = 'entretien_realise';
        trace(c, `Entretien vidéo évalué : ${note}/20`);
        await publierEntretien(c, 'realise');
      }
      log(me().nom, `Évaluation de l'entretien vidéo avec ${e.candidatNom} : ${note}/20`); save();
      toast(`Évaluation enregistrée : ${note}/20`);
      f.querySelector('button').textContent = 'Mettre à jour l\'évaluation';
    };
  }
}

function panneauEvaluation(c) {
  if (!c) return '<p class="muted">Candidature introuvable dans ce navigateur : l\'évaluation se fera depuis l\'espace recruteur.</p>';
  const s = stg(c.stagiaireId); const n = c.entretien?.notes || {};
  return `<div class="mini-profil"><strong>${esc(s.prenom)} ${esc(s.nom)}</strong><p class="muted petit">${esc(s.diplome)} · ${esc(s.region)} · ${s.experience ? `${s.experience} mois d'exp.` : 'primo-demandeur·se'}</p>
    <div class="tags">${s.competences.map((k) => `<span class="tag tag--s">${esc(k)}</span>`).join('')}</div>
    ${c.detailIA?.pointsVigilance?.length ? `<p class="petit"><strong>À vérifier :</strong> ${esc(c.detailIA.pointsVigilance.join(' · '))}</p>` : ''}</div>
    <form id="f-eval-visio" class="form">
    ${CRITERES.map(([k, l]) => `<fieldset class="etoiles etoiles--s"><legend>${l}</legend>${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="${k}" value="${v}" required ${n[k] === v ? 'checked' : ''}><span>${v}</span></label>`).join('')}</fieldset>`).join('')}
    <label>Appréciation<textarea name="commentaire" rows="3" required>${esc(c.entretien?.commentaire || '')}</textarea></label>
    <button class="btn btn--primaire btn--large">Enregistrer l'évaluation</button></form>`;
}

function panneauCandidat(e) {
  return `<div class="mini-profil"><strong>${esc(e.offreTitre)}</strong><p class="muted petit">${esc(e.entrepriseNom)}</p></div>
    <h3>Conseils</h3><ul class="puces petit"><li>Présentez-vous en une minute : formation, compétences, motivation.</li>
    <li>Préparez un exemple concret de projet ou de stage.</li><li>Posez vos questions sur les missions et l'encadrement.</li>
    <li>En cas de coupure, restez sur la page : la connexion se rétablit automatiquement.</li></ul>`;
}
