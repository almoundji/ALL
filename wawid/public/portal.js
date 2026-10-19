// Portail voyageur WawID : e-Visa, suivi, WawPass (taxe de sécurité), pré-enrôlement eGate.
import { parseMRZ } from "./shared/engine.js";
import { bindLangSwitch, initI18n, langSwitch, lang } from "./shared/i18n.js";
import { LOGO, WORDMARK, api, countryOptions, country, esc, fmtDate, fmtDateTime, fmtXOF, icon, initTheme, qrSvg, status, toast, toggleTheme } from "./shared/ui.js";

initTheme();
const app = document.getElementById("app");
let info = null;
const NAV = [["accueil", "Accueil"], ["evisa", "e-Visa"], ["suivi", "Suivi"], ["wawpass", "WawPass"], ["egate", "eGate"]];

function shell(page, html) {
  app.innerHTML = `
  <header class="p-nav"><nav class="p-nav-bar">
    ${page !== "accueil" ? `<button class="btn btn-ghost btn-icon" id="nav-back" title="Page précédente" aria-label="Page précédente" style="border:1px solid var(--line)">${icon("arrowLeft")}</button>` : ""}
    <a class="brand" href="#accueil"><span class="brand-logo">${LOGO}</span><span><span class="brand-name">${WORDMARK}</span><br><span class="brand-sub">Portail voyageur</span></span></a>
    <div class="p-links">${NAV.map(([k, l]) => `<a href="#${k}" ${k === page ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</div>
    <button class="btn btn-ghost btn-icon" id="theme" title="Thème">${icon("moon")}</button>
    <a class="btn btn-ghost btn-sm p-agents" href="app/" title="Application mobile">${icon("download")} <span>Application mobile</span></a>
    <a class="btn btn-ghost btn-sm p-agents" href="aide/" title="Aide">${icon("file")} <span>Aide</span></a>
    ${langSwitch()}
  </nav></header>
  <main class="p-main">${html}</main>
  <footer class="p-foot">WawID — gestion des identités et des frontières · une solution WAW Telecom · Données protégées conformément à la loi n° 2008-12 (CDP).</footer>`;
  app.querySelector("#nav-back")?.addEventListener("click", () => (history.length > 1 ? history.back() : (location.hash = "#accueil")));
  bindLangSwitch(app);
  const themeBtn = app.querySelector("#theme");
  const paintTheme = () => { const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; themeBtn.innerHTML = icon(dark ? "sun" : "moon"); };
  themeBtn.onclick = () => { toggleTheme(); paintTheme(); };
  paintTheme();
  scrollTo(0, 0);
}

// ---------- Accueil ----------
function home() {
  shell("accueil", `
  <section class="p-hero">
    <span class="pill-dark">${icon("zap")} e-Visa · WawPass · eGate · Suivi</span>
    <h1>Votre voyage, <span class="hl">simplifié</span> et sécurisé</h1>
    <span class="p-underline" style="margin:14px 0 0 0"></span>
    <p>Demandez votre autorisation de voyage en ligne, payez la taxe de sécurité et franchissez la frontière en quelques secondes grâce aux eGates biométriques.</p>
    <div class="row"><a class="btn btn-primary btn-lg" href="#evisa">${icon("fileCheck")} Demander un e-Visa</a><a class="btn btn-lg" href="#suivi">${icon("search")} Suivre ma demande</a></div>
  </section>
  <section class="card card-pad" style="margin-top:20px">
    <h3 style="font:800 20px var(--display)">Ai-je besoin d'un visa ?</h3>
    <div class="row" style="margin-top:12px"><select class="select" id="nat" style="max-width:360px">${countryOptions("", true)}</select><span id="need"></span></div>
  </section>
  <div class="p-cards">
    ${card("evisa", "fileCheck", "e-Visa", `Formulaire en ligne, paiement ${fmtXOF(info.evisaFee)}, réponse par e-mail et QR code à présenter.`)}
    ${card("suivi", "search", "Suivi de demande", "Consultez l'état de votre dossier et répondez aux demandes de l'administration.")}
    ${card("wawpass", "creditCard", "WawPass", `Taxe de sécurité aéroportuaire (${fmtXOF(info.passFee)}) payée en ligne, validée à l'aéroport par QR code.`)}
    ${card("egate", "gate", "Passage eGate", "Pré-enregistrez votre passeport pour passer par les portes automatiques.")}
  </div>`);
  const nat = app.querySelector("#nat");
  nat.onchange = () => {
    const v = nat.value;
    app.querySelector("#need").innerHTML = !v ? "" : info.visaExempt.includes(v) ? `<span class="status good">Dispensé de visa (séjour ≤ 90 jours)</span>` : `<span class="status warning">e-Visa requis</span> <a href="#evisa">Faire la demande</a>`;
  };
}
const card = (href, ic, title, text) => `<a class="card p-card" href="#${href}"><span class="tile-icon">${icon(ic)}</span><h3>${title}</h3><p class="muted" style="margin:0">${text}</p><span class="row" style="font-weight:600">Commencer ${icon("arrowRight")}</span></a>`;

// ---------- e-Visa ----------
const draft = { applicant: {}, trip: {}, health: {}, step: 0 };
const STEPS = ["Identité", "Voyage", "Santé", "Paiement"];

function evisa() {
  const a = draft.applicant, t = draft.trip, h = draft.health;
  const step = draft.step;
  const body = [
    `<div class="msg info">${icon("scan")}<span>Astuce : collez les 2 lignes en bas de la page photo de votre passeport (MRZ) pour remplir automatiquement.</span></div>
     <textarea class="textarea mono" id="mrz" placeholder="P&lt;FRAMARTIN&lt;&lt;CLAIRE&lt;&lt;&lt;…" style="min-height:64px"></textarea>
     <div class="form-grid">
      ${field("surname", "Nom", a.surname)}${field("given", "Prénoms", a.given)}
      ${field("dob", "Date de naissance", a.dob, "date")}
      <label class="field"><span>Sexe</span><select class="select" name="sex">${[["F", "Féminin"], ["M", "Masculin"], ["X", "Non précisé"]].map(([v, l]) => `<option value="${v}" ${a.sex === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="field"><span>Nationalité *</span><select class="select" name="nat" required>${countryOptions(a.nat)}</select></label>
      ${field("docNo", "N° de passeport", a.docNo)}${field("expiry", "Expiration du passeport", a.expiry, "date")}
      ${field("email", "E-mail", a.email, "email")}${field("phone", "Téléphone", a.phone, "tel", false)}
     </div>`,
    `<div class="form-grid">
      <label class="field"><span>Motif</span><select class="select" name="purpose">${["Tourisme", "Affaires", "Visite familiale", "Conférence", "Études", "Transit"].map((p) => `<option ${t.purpose === p ? "selected" : ""}>${p}</option>`).join("")}</select></label>
      ${field("arrival", "Date d'arrivée", t.arrival, "date")}${field("nights", "Durée (nuits)", t.nights || 7, "number")}
      <label class="field"><span>Point d'entrée</span><select class="select" name="port">${info.postes.map((p) => `<option value="${p.id}" ${t.port === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
      <label class="field" style="grid-column:1/-1"><span>Adresse de séjour</span><input class="input" name="address" value="${esc(t.address || "")}" placeholder="Hôtel, adresse ou hôte"></label></div>`,
    `<div class="stack">
      <label class="check"><input type="checkbox" name="yellowFever" ${h.yellowFever ? "checked" : ""}> Je suis vacciné(e) contre la fièvre jaune (certificat international)</label>
      <label class="check"><input type="checkbox" name="symptoms" ${h.symptoms ? "checked" : ""}> J'ai présenté de la fièvre ou des symptômes infectieux au cours des 14 derniers jours</label>
      <label class="field"><span>Pays visités au cours des 21 derniers jours</span><input class="input" name="countriesVisited" value="${esc(h.countriesVisited || "")}"></label></div>`,
    `<div class="stack">
      <div class="card card-pad row" style="justify-content:space-between"><span><b>Frais de traitement e-Visa</b><br><span class="small muted">Non remboursables</span></span><b style="font:800 24px var(--display)">${fmtXOF(info.evisaFee)}</b></div>
      <label class="field"><span>Moyen de paiement</span><select class="select" name="paymentMethod">${["Wave", "Orange Money", "Free Money", "Carte bancaire"].map((m) => `<option ${draft.paymentMethod === m ? "selected" : ""}>${m}</option>`).join("")}</select></label>
      <div class="msg warning">${icon("lock")}<span>Démonstration : aucun paiement réel n'est effectué.</span></div>
      <label class="check"><input type="checkbox" name="consent" required> J'accepte que mes données soient traitées par les services de l'immigration pour l'instruction de ma demande et le contrôle aux frontières (loi n° 2008-12), et certifie l'exactitude des informations.</label></div>`,
  ][step];
  shell("evisa", `<section class="p-section"><h2>Demande d'e-Visa</h2>
    <div class="p-steps">${STEPS.map((s, i) => `<span class="${i === step ? "on" : i < step ? "done" : ""}">${i + 1}. ${s}</span>`).join("")}</div>
    <form class="card p-form" id="f" novalidate>${body}
      <div class="row" style="justify-content:space-between">${step ? `<button type="button" class="btn" id="back">${icon("arrowLeft")} Retour</button>` : "<span></span>"}<button class="btn btn-primary btn-lg">${step < 3 ? `Continuer ${icon("arrowRight")}` : `${icon("creditCard")} Payer et soumettre`}</button></div>
    </form></section>`);
  const f = app.querySelector("#f");
  app.querySelector("#mrz")?.addEventListener("input", (e) => {
    const p = parseMRZ(e.target.value);
    if (!p.ok) return;
    collect(f);
    Object.assign(draft.applicant, { surname: p.surname, given: p.given, dob: p.dob, sex: p.sex, nat: p.nat, docNo: p.docNo, expiry: p.expiry });
    evisa(); toast(p.checksOk ? "Informations du passeport importées" : "MRZ importée — vérifiez les champs (chiffres de contrôle invalides)", p.checksOk ? "" : "critical");
  });
  app.querySelector("#back")?.addEventListener("click", () => { collect(f); draft.step--; evisa(); });
  f.onsubmit = async (e) => {
    e.preventDefault();
    collect(f);
    const missing = [...f.querySelectorAll("[required]")].filter((i) => (i.type === "checkbox" ? !i.checked : !i.value.trim()));
    f.querySelectorAll("[aria-invalid]").forEach((i) => i.removeAttribute("aria-invalid"));
    if (missing.length) { missing.forEach((i) => i.setAttribute("aria-invalid", "true")); missing[0].focus(); toast("Veuillez compléter les champs obligatoires", "critical"); return; }
    if (step < 3) { draft.step++; return evisa(); }
    const btn = f.querySelector("button.btn-primary"); btn.disabled = true;
    try {
      const r = await api("/api/public/evisa", { method: "POST", body: { applicant: draft.applicant, trip: draft.trip, health: draft.health, consent: true, paymentMethod: draft.paymentMethod } });
      const docNo = draft.applicant.docNo;
      Object.assign(draft, { applicant: {}, trip: {}, health: {}, step: 0 });
      shell("evisa", `<div class="card p-receipt"><span class="tile-icon" style="width:72px;height:72px;background:var(--good-soft);color:var(--good-text)">${icon("checkCircle")}</span>
        <h2 style="font:900 32px var(--display)">Demande enregistrée</h2><p>Conservez votre référence :</p><b class="mono" style="font-size:28px">${esc(r.ref)}</b>
        <p class="muted small">Paiement ${fmtXOF(r.amount)} — reçu ${esc(r.receipt)}. Vous recevrez une réponse par e-mail, généralement sous 72 h.</p>
        <a class="btn btn-primary" href="#suivi?ref=${encodeURIComponent(r.ref)}&doc=${encodeURIComponent(docNo)}">${icon("search")} Suivre ma demande</a></div>`);
    } catch (err) { toast(err.message, "critical"); btn.disabled = false; }
  };
}

function field(name, label, value = "", type = "text", required = true) {
  return `<label class="field"><span>${label}${required ? " *" : ""}</span><input class="input" name="${name}" type="${type}" value="${esc(value ?? "")}" ${required ? "required" : ""}></label>`;
}

function collect(f) {
  const step = draft.step;
  const data = Object.fromEntries(new FormData(f));
  if (step === 0) Object.assign(draft.applicant, data);
  if (step === 1) Object.assign(draft.trip, data);
  if (step === 2) Object.assign(draft.health, { yellowFever: "yellowFever" in data, symptoms: "symptoms" in data, countriesVisited: data.countriesVisited });
  if (step === 3) draft.paymentMethod = data.paymentMethod;
  delete draft.applicant.mrz;
}

// ---------- Suivi ----------
async function track(q) {
  shell("suivi", `<section class="p-section"><h2>Suivre ma demande</h2>
    <form class="card p-form" id="f" style="margin-top:20px"><div class="form-grid">${field("ref", "Référence (EV…)", q.ref)}${field("doc", "N° de passeport", q.doc)}</div><button class="btn btn-primary">${icon("search")} Consulter</button></form>
    <div id="res" style="margin-top:20px"></div></section>`);
  const f = app.querySelector("#f");
  const show = async () => {
    const res = app.querySelector("#res");
    try {
      const r = await api("/api/public/evisa/status", { method: "POST", body: { ref: f.ref.value, docNo: f.doc.value } });
      res.innerHTML = `<section class="card p-form">
        <div class="row" style="justify-content:space-between"><div><b style="font:800 22px var(--display)">${esc(r.applicant.surname)} ${esc(r.applicant.given)}</b><div class="muted small">${esc(r.ref)} · ${esc(country(r.applicant.nat))} · déposée le ${fmtDateTime(r.createdAt)}</div></div>${status("evisa", r.status)}</div>
        ${r.status === "APPROUVEE" ? `<div class="grid-2" style="display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center"><div class="qr">${qrSvg(r.token)}</div><div><b>e-Visa n° ${esc(r.visaNo)}</b><p class="muted">Valable jusqu'au ${fmtDate(r.validUntil)} pour une entrée par ${esc(info.postes.find((p) => p.id === r.trip.port)?.name || r.trip.port)}. Présentez ce QR code et votre passeport au contrôle ou à l'eGate.</p><button class="btn" onclick="print()">${icon("printer")} Imprimer</button></div></div>` : ""}
        ${r.messages.length ? `<div><span class="label">Messages</span><div class="timeline" style="margin-top:8px">${r.messages.map((m) => `<div><b>${esc(m.from)}</b> · ${fmtDateTime(m.at)}<br>${esc(m.text)}</div>`).join("")}</div></div>` : ""}
        ${r.status === "INFO_DEMANDEE" ? `<form id="reply" class="stack"><label class="field"><span>Votre réponse</span><textarea class="textarea" name="text" required></textarea></label><button class="btn btn-primary">Envoyer</button></form>` : ""}
      </section>`;
      res.querySelector("#reply")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try { await api("/api/public/evisa/reply", { method: "POST", body: { ref: f.ref.value, docNo: f.doc.value, text: e.target.text.value } }); toast("Réponse transmise"); show(); } catch (err) { toast(err.message, "critical"); }
      });
    } catch (err) { res.innerHTML = `<div class="msg critical">${icon("alert")}<span>${esc(err.message)}</span></div>`; }
  };
  f.onsubmit = (e) => { e.preventDefault(); show(); };
  if (q.ref && q.doc) show();
}

// ---------- WawPass ----------
function wawpass() {
  shell("wawpass", `<section class="p-section"><h2>WawPass — taxe de sécurité</h2><p class="muted">Payez en ligne avant votre vol et présentez le QR code à l'aéroport.</p>
    <form class="card p-form" id="f"><div class="form-grid">${field("surname", "Nom")}${field("given", "Prénoms")}<label class="field"><span>Nationalité *</span><select class="select" name="nat" required>${countryOptions()}</select></label>${field("docNo", "N° de passeport")}${field("flight", "Vol (ex. HC 404)")}${field("travelDate", "Date du voyage", "", "date")}
      <label class="field"><span>Moyen de paiement</span><select class="select" name="paymentMethod"><option>Wave</option><option>Orange Money</option><option>Carte bancaire</option></select></label></div>
      <div class="row" style="justify-content:space-between"><b style="font:800 22px var(--display)">${fmtXOF(info.passFee)}</b><button class="btn btn-primary btn-lg">${icon("creditCard")} Payer</button></div></form></section>`);
  app.querySelector("#f").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api("/api/public/pass", { method: "POST", body: Object.fromEntries(new FormData(e.target)) });
      shell("wawpass", `<div class="card p-receipt"><h2 style="font:900 30px var(--display)">Paiement confirmé</h2><div class="qr">${qrSvg(r.token)}</div><b class="mono">${esc(r.ref)}</b>
        <p class="muted">${esc(r.surname)} ${esc(r.given)} · vol ${esc(r.flight)} du ${fmtDate(r.travelDate)} · ${fmtXOF(r.amount)}</p><button class="btn" onclick="print()">${icon("printer")} Imprimer / enregistrer</button></div>`);
    } catch (err) { toast(err.message, "critical"); }
  };
}

// ---------- eGate ----------
function egate() {
  shell("egate", `<section class="p-section"><h2>Passer par les eGates</h2>
    <div class="grid-2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-top:20px">
      <div class="card card-pad stack"><h3 style="font:800 20px var(--display)">Comment ça marche ?</h3>
        <p>${icon("idCard")} Posez votre passeport biométrique ouvert sur le lecteur.</p><p>${icon("camera")} Regardez la caméra : votre visage est comparé à la photo de la puce.</p><p>${icon("checkCircle")} Les portes s'ouvrent en 15 secondes environ.</p>
        <p class="small muted">Réservé aux majeurs. En cas de doute, la porte vous oriente vers un guichet.</p></div>
      <form class="card card-pad stack" id="f"><h3 style="font:800 20px var(--display)">Pré-enregistrement</h3>
        <label class="field"><span>MRZ de votre passeport (2 lignes)</span><textarea class="textarea mono" name="mrz" required></textarea></label>
        ${field("email", "E-mail", "", "email")}
        <label class="check"><input type="checkbox" name="consent" required> J'accepte la capture de mes données biométriques lors de mon premier passage, à des fins de contrôle aux frontières.</label>
        <button class="btn btn-primary">${icon("check")} M'enregistrer</button></form></div></section>`);
  app.querySelector("#f").onsubmit = async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    try {
      const r = await api("/api/public/enrol", { method: "POST", body: { ...b, consent: "consent" in b } });
      e.target.outerHTML = `<div class="card card-pad stack"><span class="status good">Pré-enregistrement confirmé</span><b class="mono" style="font-size:22px">${esc(r.ref)}</b><p class="muted">Votre visage et vos empreintes seront capturés lors de votre premier passage au guichet ; ensuite, les eGates vous seront ouvertes.</p></div>`;
    } catch (err) { toast(err.message, "critical"); }
  };
}

async function route() {
  const [page, qs] = location.hash.replace(/^#/, "").split("?");
  const q = Object.fromEntries(new URLSearchParams(qs || ""));
  if (page === "evisa") return evisa();
  if (page === "suivi") return track(q);
  if (page === "wawpass") return wawpass();
  if (page === "egate") return egate();
  return home();
}

(async () => {
  await initI18n("");
  try { info = await api("/api/public/info"); } catch { app.innerHTML = `<div class="empty">Service momentanément indisponible.</div>`; return; }
  addEventListener("hashchange", route);
  route();
})();
