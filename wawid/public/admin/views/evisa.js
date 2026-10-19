// e-Visa (VMS) : instruction des demandes ; vérification des QR (e-Visa, WawPass) ; taxes et pré-enrôlements.
import { api, country, dialog, esc, fmtDate, fmtDateTime, fmtXOF, icon, qrSvg, riskBadge, status, toast } from "../../shared/ui.js";
import { mountTable, pageHead } from "./common.js";

export function render(el, ctx, rest, query) {
  if (rest[0]) return renderApplication(el, ctx, rest[0]);
  const tab = query.tab || "instruire";
  const d = ctx.data;
  const groups = { instruire: ["SOUMISE", "EN_EXAMEN"], INFO_DEMANDEE: ["INFO_DEMANDEE"], APPROUVEE: ["APPROUVEE"], REFUSEE: ["REFUSEE"], toutes: null };
  const rows = d.evisas.filter((v) => !groups[tab] || groups[tab].includes(v.status));
  el.innerHTML = `${pageHead({ title: "e-Visa — Visa Management System", sub: "Demandes déposées sur le portail voyageur, pré-contrôlées automatiquement (listes, règles) avant instruction.", crumbs: [[null, "APIS & e-Visa"]],
    actions: `<a class="btn" href="../#evisa" target="_blank">${icon("globe")} Portail voyageur</a>` })}
  <nav class="space-tabs">${[["instruire", "À instruire"], ["INFO_DEMANDEE", "Info. demandée"], ["APPROUVEE", "Approuvées"], ["REFUSEE", "Refusées"], ["toutes", "Toutes"]].map(([k, l]) => `<button aria-selected="${tab === k}" data-tab="${k}">${l} (${d.evisas.filter((v) => !groups[k] || groups[k].includes(v.status)).length})</button>`).join("")}</nav>
  <section class="card" id="t"></section>`;
  el.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => (location.hash = `#/evisa?tab=${b.dataset.tab}`)));
  mountTable(el.querySelector("#t"), {
    rows, onRow: (v) => (location.hash = `#/evisa/${v.ref}`), sort: "createdAt",
    columns: [
      { key: "ref", label: "Référence", render: (v) => `<span class="mono">${esc(v.ref)}</span>` },
      { key: "name", label: "Demandeur", value: (v) => v.applicant.surname, render: (v) => `<div class="cell-title">${esc(v.applicant.surname)} ${esc(v.applicant.given)}</div><div class="cell-sub">${esc(country(v.applicant.nat))} · <span class="mono">${esc(v.applicant.docNo)}</span></div>` },
      { key: "purpose", label: "Séjour", value: (v) => v.trip.arrival, render: (v) => `${esc(v.trip.purpose)}<div class="cell-sub">Arrivée ${fmtDate(v.trip.arrival)} · ${v.trip.nights} nuits</div>` },
      { key: "score", label: "Pré-contrôle", value: (v) => v.prescreen.score, render: (v) => riskBadge(v.prescreen.score, v.prescreen.level) + (!v.health.yellowFever ? ' <span class="status warning" title="Vaccin fièvre jaune non déclaré">Santé</span>' : "") },
      { key: "createdAt", label: "Déposée", render: (v) => fmtDateTime(v.createdAt) },
      { key: "status", label: "Statut", render: (v) => status("evisa", v.status) },
    ],
  });
}

function renderApplication(el, ctx, ref) {
  const v = ctx.data.evisas.find((x) => x.ref === ref);
  if (!v) { el.innerHTML = `<div class="card empty">Demande introuvable.</div>`; return; }
  const a = v.applicant;
  const canAct = ctx.can("evisa") && !["APPROUVEE", "REFUSEE"].includes(v.status);
  const crossings = ctx.data.crossings.filter((c) => c.traveler.docNo === a.docNo);
  el.innerHTML = `${pageHead({ title: `${a.surname} ${a.given}`, sub: `Demande ${esc(v.ref)} · ${esc(v.trip.purpose)} · déposée le ${fmtDateTime(v.createdAt)}`, crumbs: [["#/evisa", "e-Visa"], [null, v.ref]],
    actions: `${status("evisa", v.status)}${canAct ? `<button class="btn" data-act="request_info">Demander une information</button><button class="btn btn-danger" data-act="reject">${icon("xCircle")} Refuser</button><button class="btn btn-primary" data-act="approve">${icon("checkCircle")} Approuver</button>` : ""}` })}
  <div class="grid-main">
    <div class="stack">
      <section class="card"><div class="card-head"><h3>Demandeur et document</h3></div><div class="card-body grid-2">
        <dl class="kv"><dt>Nom</dt><dd>${esc(a.surname)}</dd><dt>Prénoms</dt><dd>${esc(a.given)}</dd><dt>Naissance</dt><dd>${fmtDate(a.dob)}</dd><dt>Sexe</dt><dd>${esc(a.sex)}</dd><dt>Nationalité</dt><dd>${esc(country(a.nat))}</dd></dl>
        <dl class="kv"><dt>Passeport</dt><dd class="mono">${esc(a.docNo)}</dd><dt>Canal</dt><dd>${esc(v.channel || "Web")}</dd><dt>Puce (NFC)</dt><dd>${v.chip ? (v.chip.passiveAuth === false || v.chip.dg1Match === false ? '<span class="status critical">Vérification échouée</span>' : '<span class="status good">Passeport authentifié</span>') + ` <span class="small muted">${esc(v.chip.source || "")}</span>` : '<span class="muted">Non lue</span>'}</dd><dt>Expiration</dt><dd>${fmtDate(a.expiry)}</dd><dt>E-mail</dt><dd>${esc(a.email)}</dd><dt>Téléphone</dt><dd>${esc(a.phone || "—")}</dd></dl></div></section>
      <section class="card"><div class="card-head"><h3>Séjour, santé et paiement</h3></div><div class="card-body grid-2">
        <dl class="kv"><dt>Motif</dt><dd>${esc(v.trip.purpose)}</dd><dt>Arrivée</dt><dd>${fmtDate(v.trip.arrival)} (${v.trip.nights} nuits)</dd><dt>Point d'entrée</dt><dd>${esc(ctx.poste(v.trip.port))}</dd><dt>Adresse</dt><dd>${esc(v.trip.address || "—")}</dd></dl>
        <dl class="kv"><dt>Fièvre jaune</dt><dd>${v.health.yellowFever ? '<span class="status good">Vacciné(e)</span>' : '<span class="status warning">Non déclaré</span>'}</dd><dt>Symptômes</dt><dd>${v.health.symptoms ? '<span class="status critical">Déclarés</span>' : "Aucun"}</dd><dt>Pays visités</dt><dd>${esc(v.health.countriesVisited || "—")}</dd><dt>Paiement</dt><dd>${fmtXOF(v.payment.amount)} · ${esc(v.payment.method)}<br><span class="small muted mono">${esc(v.payment.receipt)}</span></dd></dl></div></section>
      <section class="card"><div class="card-head"><h3>Échanges avec le demandeur</h3></div><div class="card-body timeline">${v.messages.map((m) => `<div><b>${esc(m.from)}</b> · ${fmtDateTime(m.at)}<br>${esc(m.text)}</div>`).join("") || `<p class="muted">Aucun échange.</p>`}</div></section>
      ${crossings.length ? `<section class="card"><div class="card-head"><h3>Passages antérieurs (${crossings.length})</h3></div><div class="table-wrap"><table class="table"><tbody>${crossings.slice(0, 8).map((c) => `<tr class="clickable" onclick="location.hash='#/passages/${c.id}'"><td>${fmtDateTime(c.ts)}</td><td>${c.direction === "ENTREE" ? "Entrée" : "Sortie"}</td><td>${esc(ctx.poste(c.posteId))}</td><td>${status("decision", c.decision)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}
    </div>
    <div class="stack">
      <section class="card"><div class="card-head"><h3>Pré-contrôle automatique</h3></div><div class="card-body">
        <div style="text-align:center;margin-bottom:10px">${riskBadge(v.prescreen.score, v.prescreen.level)}</div>
        ${v.prescreen.factors.map((f) => `<div class="factor"><span><b>${esc(f.label)}</b><br><span class="small muted">${esc(f.detail)}</span></span><b>+${f.points}</b></div>`).join("") || `<p class="muted small">Aucune correspondance dans les listes ni règle déclenchée.</p>`}</div></section>
      ${v.status === "APPROUVEE" ? `<section class="card"><div class="card-head"><h3>e-Visa délivré</h3></div><div class="card-body" style="text-align:center"><div class="qr">${qrSvg(v.token)}</div><p><b class="mono">${esc(v.visaNo)}</b><br><span class="small muted">Valide jusqu'au ${fmtDate(v.validUntil)} · décidé par ${esc(v.decidedBy)}</span></p></div></section>` : ""}
    </div>
  </div>`;
  el.querySelectorAll("[data-act]").forEach((b) => (b.onclick = async () => {
    const act = b.dataset.act;
    let message = "";
    if (act !== "approve") {
      const { value, form } = await dialog({ title: act === "reject" ? "Motif du refus" : "Information demandée", body: `<textarea class="textarea" name="m" placeholder="${act === "reject" ? "Motif communiqué au demandeur" : "ex. Réservation d'hôtel, lettre d'invitation…"}"></textarea>`, actions: [{ label: "Annuler", value: null }, { label: "Envoyer", cls: "btn-primary", value: "ok", validate: (f) => (!f.m.value.trim() ? "Texte obligatoire" : "") }] });
      if (!value) return;
      message = form.m.value.trim();
    }
    try { await api(`/api/evisas/${v.ref}`, { method: "PATCH", body: { action: act, message } }); await ctx.reload(); toast("Décision enregistrée — le demandeur la verra sur le portail"); renderApplication(el, ctx, ref); } catch (e) { toast(e.message, "critical"); }
  }));
}

// ---------- Vérification d'un QR ----------
export function renderVerify(el, ctx) {
  el.innerHTML = `${pageHead({ title: "Vérifier un QR code", sub: "e-Visa ou reçu WawPass (taxe de sécurité) : la signature cryptographique est contrôlée par le serveur.", crumbs: [[null, "Contrôle frontière"]] })}
  <div class="grid-2">
    <form class="card card-pad stack" id="f">
      <label class="field"><span>Contenu du QR code</span><input class="input mono" name="token" placeholder="EV.EV260001.ab12cd34ef56gh78" autofocus></label>
      <div class="row"><button class="btn btn-primary">${icon("shieldCheck")} Vérifier</button><button class="btn" type="button" id="scan">${icon("camera")} Scanner</button></div>
      <video id="v" playsinline muted style="width:100%;border-radius:12px;display:none"></video>
    </form>
    <section class="card card-pad" id="res"><div class="empty">${icon("qr")}<p>Scannez ou collez le contenu d'un QR code.</p></div></section>
  </div>`;
  const res = el.querySelector("#res");
  const verify = async (token) => {
    try {
      const r = await api("/api/verify-token", { method: "POST", body: { token } });
      ctx.reload().catch(() => {});
      res.innerHTML = `<div class="msg ${r.valid ? "good" : "critical"}">${icon(r.valid ? "checkCircle" : "xCircle")}<span><b>${r.valid ? "Valide" : "Non valide"}</b> — ${esc(r.message)}</span></div>${r.holder ? `<dl class="kv" style="margin-top:14px"><dt>Type</dt><dd>${esc(r.kind)}</dd><dt>Référence</dt><dd class="mono">${esc(r.ref)}</dd><dt>Titulaire</dt><dd>${esc(r.holder)}</dd><dt>Document</dt><dd class="mono">${esc(r.docNo)}</dd></dl><p class="small muted">Comparer avec le document présenté.</p>` : ""}`;
    } catch (e) { res.innerHTML = `<div class="msg critical">${icon("alert")}<span>${esc(e.message)}</span></div>`; }
  };
  el.querySelector("#f").onsubmit = (e) => { e.preventDefault(); const t = e.target.token.value.trim(); if (t) verify(t); };
  el.querySelector("#scan").onclick = async () => {
    if (!("BarcodeDetector" in window)) { toast("Lecture caméra non prise en charge par ce navigateur — utilisez une douchette ou collez le contenu.", "critical"); return; }
    const video = el.querySelector("#v");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = stream; video.style.display = "block"; await video.play();
      const det = new window.BarcodeDetector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!video.isConnected) return stream.getTracks().forEach((t) => t.stop());
        const codes = await det.detect(video).catch(() => []);
        if (codes[0]) { stream.getTracks().forEach((t) => t.stop()); video.style.display = "none"; el.querySelector("[name=token]").value = codes[0].rawValue; verify(codes[0].rawValue); return; }
        requestAnimationFrame(tick);
      };
      tick();
    } catch { toast("Caméra indisponible", "critical"); }
  };
}

// ---------- WawPass & pré-enrôlements ----------
export function renderPasses(el, ctx, _rest, query) {
  const tab = query.tab || "pass";
  const d = ctx.data;
  el.innerHTML = `${pageHead({ title: "WawPass & enrôlements", sub: "Taxes de sécurité payées en ligne (QR validé à l'aéroport) et pré-enrôlements au programme eGate.", crumbs: [[null, "APIS & e-Visa"]] })}
  <nav class="space-tabs"><button aria-selected="${tab === "pass"}" data-tab="pass">WawPass (${d.passes.length})</button><button aria-selected="${tab === "enrol"}" data-tab="enrol">Pré-enrôlements eGate (${d.enrolments.length})</button></nav>
  <section class="card" id="t"></section>`;
  el.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => (location.hash = `#/wawpass?tab=${b.dataset.tab}`)));
  if (tab === "pass") mountTable(el.querySelector("#t"), {
    rows: d.passes, sort: "createdAt",
    columns: [
      { key: "ref", label: "Reçu", render: (p) => `<span class="mono">${esc(p.ref)}</span>` },
      { key: "surname", label: "Voyageur", render: (p) => `<div class="cell-title">${esc(p.surname)} ${esc(p.given)}</div><div class="cell-sub mono">${esc(p.docNo)}</div>` },
      { key: "flight", label: "Vol", render: (p) => `${esc(p.flight)}<div class="cell-sub">${fmtDate(p.travelDate)}</div>` },
      { key: "amount", label: "Montant", num: true, render: (p) => `${fmtXOF(p.amount)}<div class="cell-sub">${esc(p.method)}</div>` },
      { key: "used", label: "Statut", render: (p) => (p.used ? '<span class="status">Utilisé</span>' : '<span class="status good">Valide</span>') },
    ],
  });
  else mountTable(el.querySelector("#t"), {
    rows: d.enrolments, sort: "createdAt", empty: "Aucun pré-enrôlement — les voyageurs s'inscrivent depuis le portail.",
    columns: [
      { key: "ref", label: "Référence", render: (e) => `<span class="mono">${esc(e.ref)}</span>` },
      { key: "name", label: "Voyageur", render: (e) => `<div class="cell-title">${esc(e.traveler.surname)} ${esc(e.traveler.given)}</div><div class="cell-sub">${esc(country(e.traveler.nat))} · <span class="mono">${esc(e.traveler.docNo)}</span></div>` },
      { key: "createdAt", label: "Date", render: (e) => fmtDateTime(e.createdAt) },
      { key: "status", label: "Statut", render: () => '<span class="status warning">Biométrie à capturer au 1er passage</span>' },
    ],
  });
}
