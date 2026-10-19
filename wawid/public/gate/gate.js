// Kiosque eGate / ABC : parcours voyageur (document → visage → décision) piloté par le serveur WawID.
import { buildTD3, simulatedBiometric } from "../shared/engine.js";
import { chipPayload, readChip } from "../shared/nfc.js";
import { initI18n, lang, setLang } from "../shared/i18n.js";
import { LOGO, esc, icon } from "../shared/ui.js";

const root = document.getElementById("kiosk");
const params = new URLSearchParams(location.search);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

const SCENARIOS = {
  "Voyageur régulier": { mrz: buildTD3({ issuer: "SEN", nat: "SEN", sex: "F", surname: "Diop", given: "Aminata", docNo: "A01234567", dob: "1991-05-14", expiry: "2031-05-13" }) },
  "Ressortissant CEDEAO": { mrz: buildTD3({ issuer: "MLI", nat: "MLI", sex: "M", surname: "Keita", given: "Seydou", docNo: "ML1029384", dob: "1987-08-22", expiry: "2030-04-11" }) },
  "Personne recherchée": { mrz: buildTD3({ issuer: "SEN", nat: "SEN", sex: "M", surname: "Ndour", given: "Pape Mor", docNo: "A06612380", dob: "1990-07-21", expiry: "2030-05-10" }) },
  "Passeport volé": { mrz: buildTD3({ issuer: "GIN", nat: "GIN", sex: "F", surname: "Bangoura", given: "Mariam", docNo: "GN2219034", dob: "1995-10-10", expiry: "2029-03-03" }) },
  "Voyageur mineur": { mrz: buildTD3({ issuer: "SEN", nat: "SEN", sex: "M", surname: "Fall", given: "Ibou", docNo: "A09988776", dob: "2013-06-01", expiry: "2029-06-01" }) },
  "Sans e-Visa": { mrz: buildTD3({ issuer: "CHN", nat: "CHN", sex: "M", surname: "Wang", given: "Lei", docNo: "E81234567", dob: "1985-03-09", expiry: "2030-08-01" }) },
  "Puce clonée": { mrz: buildTD3({ issuer: "NGA", nat: "NGA", sex: "M", surname: "Adeyemi", given: "Tunde", docNo: "NG8812345", dob: "1984-09-17", expiry: "2030-10-10" }), chip: { passiveAuth: false } },
  "Usurpation (masque)": { mrz: buildTD3({ issuer: "FRA", nat: "FRA", sex: "M", surname: "Moreau", given: "Julien", docNo: "20FR44121", dob: "1983-11-30", expiry: "2032-02-02" }), spoof: true },
};

let gate = null, gates = [], busy = false, stream = null;
const headers = () => ({ "content-type": "application/json", "x-gate-key": store.get("wawid:gateKey") || "" });

async function call(path, body) {
  const res = await fetch(path, { method: body ? "POST" : "GET", headers: headers(), body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || `Erreur ${res.status}`); e.status = res.status; throw e; }
  return data;
}

function frame(main, step = 0) {
  root.innerHTML = `
  <header class="k-top"><span class="brand-logo">${LOGO}</span><div><div class="brand-name">Waw<b>ID</b> <span style="color:var(--accent)">eGate</span></div><div class="brand-sub">République du Sénégal · Police de l'Air et des Frontières</div></div>
    <div class="k-gate">${gate ? `${icon("gate")} ${esc(gate.name)} · ${esc(gate.zone)} <button class="btn btn-sm btn-ghost" id="chg" title="Changer d'équipement">${icon("settings")}</button>` : ""}</div></header>
  <main class="k-main">${main}</main>
  <nav class="k-steps">${["Passeport", "Visage", "Vérification", "Passage"].map((s, i) => `<span class="${i + 1 <= step ? "on" : ""}"><b>${i + 1}</b>${s}</span>`).join("")}</nav>`;
  root.querySelector("#chg")?.addEventListener("click", () => { gate = null; choose(); });
}

// ---------- Configuration de l'équipement ----------
async function boot() {
  try {
    gates = await call("/api/gate/list");
  } catch (e) {
    if (e.status === 401) return askKey();
    return frame(`<div class="msg critical">${icon("wifiOff")}<span>Serveur WawID injoignable : ${esc(e.message)}</span></div>`);
  }
  const wanted = params.get("gate") || store.get("wawid:gate");
  gate = gates.find((g) => g.id === wanted) || null;
  gate ? idle() : choose();
}

function askKey() {
  const refused = Boolean(store.get("wawid:gateKey"));
  frame(`<form id="k" class="card card-pad stack" style="width:min(460px,100%);background:#0b1f33">
    ${refused ? `<div class="msg critical">${icon("alert")}<span>Clé refusée par le serveur.</span></div>` : ""}
    <h2 style="font:800 24px var(--display)">Activation de l'équipement</h2>
    <p class="muted">Saisissez la clé d'équipement fournie par l'administrateur (ou connectez-vous au back-office avec un compte superviseur dans ce navigateur).</p>
    <input class="input" name="key" type="password" placeholder="Clé d'équipement" autofocus>
    <button class="btn btn-primary btn-lg">${icon("lock")} Activer</button></form>`);
  root.querySelector("#k").onsubmit = (e) => { e.preventDefault(); store.set("wawid:gateKey", new FormData(e.target).get("key")); boot(); };
}

function choose() {
  frame(`<div class="stack" style="width:min(760px,100%)"><h2 style="font:800 26px var(--display)">Choisir l'équipement</h2>
    <div class="gate-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">${gates.map((g) => `<button class="btn" style="height:auto;padding:14px;justify-content:flex-start;text-align:left;background:#0b1f33" data-g="${g.id}"><span>${icon("gate")} <b>${esc(g.name)}</b><br><span class="small muted">${esc(g.id)} · ${esc(g.type)} · ${g.status === "EN_SERVICE" && g.mode === "AUTO" ? "Ouvert" : "Fermé"}</span></span></button>`).join("")}</div></div>`);
  root.querySelectorAll("[data-g]").forEach((b) => (b.onclick = () => { gate = gates.find((g) => g.id === b.dataset.g); store.set("wawid:gate", gate.id); idle(); }));
}

// ---------- Parcours ----------
function idle() {
  busy = false;
  stopCamera();
  if (gate.status !== "EN_SERVICE" || gate.mode !== "AUTO") {
    frame(`<div class="k-result ko"><div class="big">${icon("lock")}</div><div class="k-title" style="font-size:40px">Porte fermée</div><p class="k-lead">Merci de vous diriger vers un guichet de contrôle.</p><button class="btn" id="re">${icon("refresh")} Actualiser</button></div>`);
    root.querySelector("#re").onclick = boot;
    return;
  }
  frame(`<div class="k-card">
    <div><div class="k-title">Placez votre <em>passeport</em> ouvert sur le lecteur</div>
      <p class="k-lead">Page photo vers le bas. Le passage automatisé est réservé aux voyageurs majeurs munis d'un passeport biométrique.</p>
      <div class="k-langs" data-no-i18n><button data-l="fr" aria-pressed="${lang() === "fr"}">Français</button><button data-l="en" aria-pressed="${lang() === "en"}">English</button><span title="${lang() === "en" ? "Coming soon" : "Bientôt"}">Wolof</span><span title="${lang() === "en" ? "Coming soon" : "Bientôt"}">العربية</span></div></div>
    <div class="k-visual">${icon("idCard")}<span class="k-scanline"></span></div>
  </div>
  <details class="k-sim" open><summary>Simulateur (démonstration)</summary>
    <span class="small muted">En production, le lecteur de documents et la caméra de la porte transmettent ces données.</span>
    <select class="select" id="sc">${Object.keys(SCENARIOS).map((k) => `<option>${esc(k)}</option>`).join("")}</select>
    <textarea class="textarea" id="mrz" spellcheck="false"></textarea>
    <label class="check small"><input type="checkbox" id="cam"> Utiliser la caméra de cet appareil</label>
    <button class="btn btn-primary" id="go">${icon("scan")} Présenter le passeport</button></details>`, 1);
  root.querySelectorAll("[data-l]").forEach((b) => (b.onclick = () => { if (b.dataset.l !== lang()) setLang(b.dataset.l); }));
  const sc = root.querySelector("#sc"), mrz = root.querySelector("#mrz");
  const fill = () => (mrz.value = SCENARIOS[sc.value].mrz);
  sc.onchange = fill; fill();
  root.querySelector("#go").onclick = () => {
    const scenario = mrz.value === SCENARIOS[sc.value].mrz ? SCENARIOS[sc.value] : {};
    run(mrz.value, Boolean(scenario.spoof), root.querySelector("#cam").checked, scenario.chip || {});
  };
}

const titleCase = (w) => w.charAt(0) + w.slice(1).toLowerCase();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function stopCamera() { stream?.getTracks().forEach((t) => t.stop()); stream = null; }

async function run(mrz, spoof, useCamera, chipSim = {}) {
  if (busy) return;
  busy = true;
  const started = Date.now();
  frame(`<div class="k-result"><div class="spinner" style="width:64px;height:64px;border-width:6px"></div><div class="k-title" style="font-size:38px">Lecture de la puce…</div><p class="k-lead">Ne retirez pas votre passeport.</p></div>`, 1);
  const chip = await readChip(mrz, chipSim);
  frame(`<div class="k-card"><div><div class="k-title">Regardez la <em>caméra</em></div><p class="k-lead">Retirez lunettes de soleil et couvre-chef. Restez immobile.</p><p class="k-lead" id="cd" style="font:900 64px var(--display);color:var(--accent)">3</p></div>
    <div class="k-visual" id="vis">${icon("user")}<span class="k-oval"></span></div></div>`, 2);
  if (useCamera) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      const v = document.createElement("video"); v.autoplay = true; v.playsInline = true; v.muted = true; v.srcObject = stream;
      const vis = root.querySelector("#vis"); vis.innerHTML = ""; vis.append(v); vis.insertAdjacentHTML("beforeend", '<span class="k-oval"></span>');
    } catch { /* capture simulée */ }
  }
  for (const n of [3, 2, 1]) { const cd = root.querySelector("#cd"); if (cd) cd.textContent = n; await wait(700); }
  stopCamera();
  frame(`<div class="k-result"><div class="spinner" style="width:64px;height:64px;border-width:6px"></div><div class="k-title" style="font-size:38px">Vérification en cours…</div><p class="k-lead">Comparaison biométrique et contrôles de sécurité.</p></div>`, 3);
  const faceScore = simulatedBiometric(`${mrz}-${Date.now()}`, spoof ? 0.62 : 0.95);
  let r;
  try {
    [r] = await Promise.all([call("/api/gate/transaction", { gateId: gate.id, mrz, chip: chipPayload(chip), attack: spoof ? "masque" : undefined, faceScore, liveness: !spoof, durationSec: Math.round((Date.now() - started) / 1000) + 2 }), wait(900)]);
  } catch (e) {
    r = { outcome: "ORIENTATION", message: e.status === 401 ? "Équipement non autorisé." : "Service momentanément indisponible." };
    if (e.status === 401) store.set("wawid:gateKey", "");
  }
  const ok = r.outcome === "OUVERTURE";
  frame(`<div class="k-result ${ok ? "ok" : "ko"}">
    <div class="big">${icon(ok ? "check" : "arrowRight")}</div>
    <div class="k-title" style="font-size:44px">${ok ? `Bon voyage${r.traveler ? `, ${esc(titleCase(r.traveler.given.split(" ")[0]))}` : ""} !` : "Veuillez vous présenter au guichet"}</div>
    <p class="k-lead">${esc(ok ? "Les portes s'ouvrent. Avancez." : r.message)}</p>
    ${ok ? `<div class="k-doors"><i></i><i></i></div>` : `<p class="small muted">Un agent a été informé. Merci de votre compréhension.</p>`}
  </div>`, ok ? 4 : 3);
  setTimeout(r.outcome === "INDISPONIBLE" ? boot : idle, 6500);
}

// L'état de la porte (ouverte / fermée à distance) est relu périodiquement quand le kiosque est au repos.
setInterval(async () => {
  if (busy || !gate || document.hidden) return;
  try {
    gates = await call("/api/gate/list");
    const fresh = gates.find((g) => g.id === gate.id);
    if (fresh && (fresh.status !== gate.status || fresh.mode !== gate.mode)) { gate = fresh; idle(); } else if (fresh) gate = fresh;
  } catch { /* réseau : on garde l'état connu */ }
}, 15000);

initI18n("../").then(boot);
