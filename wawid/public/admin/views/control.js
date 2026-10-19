// Contrôle guichet (Securiport Terminal équivalent) : assistant en 4 étapes.
import { buildTD3, parseMRZ, simulatedBiometric } from "../../shared/engine.js";
import { api, country, esc, fmtDate, fmtPct, icon, status, toast } from "../../shared/ui.js";
import { chipPayload, readChip } from "../../shared/nfc.js";
import { pageHead } from "./common.js";

const CHIP_SIM = { "Puce clonée": { passiveAuth: false } };
export const SAMPLES = {
  "Passeport valide": buildTD3({ issuer: "SEN", nat: "SEN", sex: "F", surname: "Diop", given: "Aminata", docNo: "A01234567", dob: "1991-05-14", expiry: "2031-05-13" }),
  "Notice rouge Interpol": buildTD3({ issuer: "BFA", nat: "BFA", sex: "M", surname: "Kabore", given: "Issouf Malik", docNo: "BF7712093", dob: "1981-04-12", expiry: "2029-02-01" }),
  "Passeport volé (SLTD)": buildTD3({ issuer: "SEN", nat: "SEN", sex: "M", surname: "Diatta", given: "Moustapha", docNo: "A04718823", dob: "1992-02-02", expiry: "2031-01-01" }),
  "Sans e-Visa": buildTD3({ issuer: "CHN", nat: "CHN", sex: "M", surname: "Wang", given: "Lei", docNo: "E81234567", dob: "1985-03-09", expiry: "2030-08-01" }),
  "Puce clonée": buildTD3({ issuer: "NGA", nat: "NGA", sex: "M", surname: "Adeyemi", given: "Tunde", docNo: "NG8812345", dob: "1984-09-17", expiry: "2030-10-10" }),
  "MRZ falsifiée": buildTD3({ issuer: "FRA", nat: "FRA", sex: "M", surname: "Martin", given: "Paul", docNo: "19AB12345", dob: "1980-01-01", expiry: "2032-01-01" }).replace("<<<<<<<<<<<<<<0", "<<<<<<<<<<<<<<7").replace("8001011M", "8001021M"),
};

// Pour « MRZ falsifiée », la puce contient les vraies données : l'incohérence DG1 ↔ MRZ est détectée.
CHIP_SIM["MRZ falsifiée"] = { dg1: buildTD3({ issuer: "FRA", nat: "FRA", sex: "M", surname: "Martin", given: "Paul", docNo: "19AB12345", dob: "1980-01-01", expiry: "2032-01-01" }) };

let s;
const STEPS = ["Document", "Biométrie", "Vérifications", "Décision"];

export function render(el, ctx) {
  s = { step: 0, mrz: "", direction: "ENTREE", posteId: ctx.me.posteId, flight: "", origin: "", parsed: null, chip: null, scenario: null, face: null, liveness: null, fingers: [false, false, false, false], iris: null, spoof: false, result: null, decision: null, started: Date.now() };
  stopCamera();
  draw(el, ctx);
}

function draw(el, ctx) {
  el.innerHTML = `
  ${pageHead({ title: "Contrôle guichet", sub: "Lecture du document, capture biométrique multimodale, interrogation des fichiers et décision motivée.", crumbs: [[null, "Contrôle frontière"]],
    actions: `<a class="btn" href="#/verifier">${icon("qr")} Vérifier un QR</a><button class="btn" id="reset">${icon("refresh")} Nouveau contrôle</button>` })}
  <ol class="wizard-steps" style="list-style:none;padding:0">${STEPS.map((t, i) => `<li class="wizard-step ${i === s.step ? "active" : i < s.step ? "done" : ""}"><b>${i < s.step ? "✓" : i + 1}</b>${esc(t)}</li>`).join("")}</ol>
  <div id="step"></div>`;
  el.querySelector("#reset").onclick = () => render(el, ctx);
  const host = el.querySelector("#step");
  [stepDocument, stepBiometrics, stepChecks, stepDecision][s.step](host, ctx, () => { s.step++; draw(el, ctx); }, () => { s.step--; draw(el, ctx); });
}

const nav = (back, nextLabel = "Suivant", disabled = false) => `<div class="row" style="justify-content:space-between;margin-top:16px">
  ${back ? `<button class="btn" data-back>${icon("arrowLeft")} Précédent</button>` : "<span></span>"}
  <button class="btn btn-primary" data-next ${disabled ? "disabled" : ""}>${esc(nextLabel)} ${icon("arrowRight")}</button></div>`;

// ---------- 1. Document ----------
function stepDocument(host, ctx, next) {
  host.innerHTML = `<div class="grid-main">
    <section class="card card-pad stack">
      <div class="row"><div class="seg" id="dir">${[["ENTREE", "Entrée"], ["SORTIE", "Sortie"]].map(([v, l]) => `<button aria-pressed="${s.direction === v}" data-v="${v}">${l}</button>`).join("")}</div>
        <select class="select" id="poste" style="max-width:280px">${ctx.data.postes.map((p) => `<option value="${p.id}" ${p.id === s.posteId ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>
      <div class="form-grid">
        <label class="field"><span>Vol / navire / véhicule</span><input class="input" id="flight" value="${esc(s.flight)}" placeholder="HC 404"></label>
        <label class="field"><span>Provenance / destination (code)</span><input class="input" id="origin" value="${esc(s.origin)}" placeholder="CDG"></label>
      </div>
      <label class="field"><span>Zone de lecture automatique (MRZ) — lecteur de documents ou saisie</span>
        <textarea class="textarea mrz-input" id="mrz" spellcheck="false" placeholder="P&lt;SENDIOP&lt;&lt;AMINATA&lt;&lt;&lt;…">${esc(s.mrz)}</textarea></label>
      <div><span class="label">Scénarios de démonstration (lecteur simulé)</span><div class="row" style="margin-top:6px">${Object.keys(SAMPLES).map((k) => `<button class="btn btn-sm" data-sample="${esc(k)}">${icon("scan")} ${esc(k)}</button>`).join("")}</div></div>
    </section>
    <div class="stack">
      <section class="card"><div class="card-head"><h3>Lecture du document</h3></div><div class="card-body" id="parsed"></div></section>
      <section class="card"><div class="card-head"><h3>${icon("wifi")} Puce sans contact (NFC)</h3><button class="btn btn-sm" id="chip-read" style="margin-left:auto">${icon("scan")} Lire la puce</button></div><div class="card-body" id="chip">${chipPanel()}</div></section>
    </div>
  </div>${nav(false, "Capturer la biométrie", true)}`;
  const mrz = host.querySelector("#mrz");
  const update = () => {
    s.mrz = mrz.value;
    s.parsed = s.mrz.trim() ? parseMRZ(s.mrz) : null;
    if (s.chip && s.chip.mrz !== s.mrz) { s.chip = null; host.querySelector("#chip").innerHTML = chipPanel(); }
    host.querySelector("#parsed").innerHTML = parsedPanel(s.parsed);
    host.querySelector("#chip-read").disabled = !s.parsed?.ok;
    host.querySelector("[data-next]").disabled = !s.parsed?.ok;
  };
  mrz.oninput = update;
  host.querySelectorAll("[data-sample]").forEach((b) => (b.onclick = () => { mrz.value = SAMPLES[b.dataset.sample]; s.scenario = b.dataset.sample; s.spoof = ""; update(); }));
  host.querySelector("#chip-read").onclick = async (e) => {
    e.target.disabled = true;
    host.querySelector("#chip").innerHTML = `<div class="row"><div class="spinner"></div>Posez le document sur le lecteur — authentification PACE/BAC…</div>`;
    const chip = await readChip(s.mrz, CHIP_SIM[s.scenario] || {});
    s.chip = { ...chip, mrz: s.mrz };
    host.querySelector("#chip").innerHTML = chipPanel();
    e.target.disabled = false;
  };
  host.querySelectorAll("#dir button").forEach((b) => (b.onclick = () => { s.direction = b.dataset.v; host.querySelectorAll("#dir button").forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
  host.querySelector("#poste").onchange = (e) => (s.posteId = e.target.value);
  host.querySelector("#flight").oninput = (e) => (s.flight = e.target.value);
  host.querySelector("#origin").oninput = (e) => (s.origin = e.target.value.toUpperCase());
  host.querySelector("[data-next]").onclick = next;
  update();
  mrz.focus();
}

export function parsedPanel(p) {
  if (!p) return `<div class="empty">${icon("idCard")}<p>Présentez le document au lecteur ou collez la MRZ.</p></div>`;
  if (!p.ok) return `<div class="msg critical">${icon("alert")}<span>${esc(p.error)}</span></div>`;
  const expired = p.expiry && p.expiry < new Date().toISOString().slice(0, 10);
  return `<dl class="kv">
    <dt>Type</dt><dd>${esc(p.docType)} (${p.format})</dd>
    <dt>Nom</dt><dd><b>${esc(p.surname)}</b></dd><dt>Prénoms</dt><dd>${esc(p.given)}</dd>
    <dt>Nationalité</dt><dd>${esc(country(p.nat))}</dd><dt>Émetteur</dt><dd>${esc(country(p.issuer))}</dd>
    <dt>Date de naissance</dt><dd>${fmtDate(p.dob)}</dd><dt>Sexe</dt><dd>${esc(p.sex)}</dd>
    <dt>N° document</dt><dd class="mono">${esc(p.docNo)}</dd><dt>Expiration</dt><dd>${fmtDate(p.expiry)} ${expired ? '<span class="status critical">Expiré</span>' : ""}</dd>
  </dl>
  <h4 style="margin:16px 0 6px;font-size:13px">Chiffres de contrôle ICAO 9303</h4>
  ${p.checks.map((c) => `<div class="row small" style="justify-content:space-between;padding:3px 0"><span>${esc(c.label)}</span>${c.ok ? '<span class="status good">Valide</span>' : '<span class="status critical">Invalide</span>'}</div>`).join("")}`;
}

function chipPanel() {
  const c = s.chip;
  if (!c) return `<p class="muted small" style="margin:0">Lecture de la puce ICAO (DG1 données, DG2 portrait, SOD signature) via le lecteur du poste. Recommandé pour tout passeport biométrique.</p>`;
  if (!c.read) return `<div class="msg warning">${icon("alert")}<span>Puce non lue — vérifier les sécurités physiques du document.</span></div>`;
  const dg1 = c.dg1 ? parseMRZ(c.dg1) : null;
  const match = dg1?.ok && dg1.docNo === s.parsed?.docNo && dg1.dob === s.parsed?.dob && dg1.surname === s.parsed?.surname && dg1.expiry === s.parsed?.expiry;
  return `<div class="row" style="align-items:flex-start;gap:14px">${c.photo ? `<img src="${c.photo}" alt="Portrait DG2" style="width:72px;border-radius:8px">` : ""}
    <div class="stack" style="gap:6px">
      <span class="status ${c.passiveAuth ? "good" : "critical"}">Authentification passive : ${c.passiveAuth ? "valide" : "échec"}</span>
      <span class="status ${match ? "good" : "critical"}">Puce ↔ MRZ imprimée : ${match ? "concordantes" : "différentes"}</span>
      <span class="small muted">${esc(c.protocol || "")} · ${esc(c.reader || c.source)}${c.source === "simulation" ? " (simulé)" : ""}</span></div></div>`;
}

// ---------- 2. Biométrie ----------
let stream = null;
function stopCamera() { stream?.getTracks().forEach((t) => t.stop()); stream = null; }

function stepBiometrics(host, _ctx, next, back) {
  host.innerHTML = `<div class="grid-2">
    <section class="card">
      <div class="card-head"><h3>${icon("camera")} Visage</h3><span class="small muted" style="margin-left:auto">${s.chip?.photo ? "Comparaison avec le portrait de la puce (DG2)" : "Norme ISO/IEC 19794-5"}</span></div>
      <div class="card-body stack">
        <div class="capture" id="cap">${s.face ? `<canvas id="snap"></canvas>` : `<div class="stack" style="text-align:center">${icon("user")}<span>Caméra inactive</span></div>`}<span class="frame"></span></div>
        <div class="row"><button class="btn" id="cam">${icon("camera")} Activer la caméra</button><button class="btn btn-primary" id="shot">${icon("check")} Capturer</button>
          <select class="select" id="spoof" style="margin-left:auto;width:auto" title="Simulation d'attaque (démonstration)">${[["", "Voyageur réel"], ["masque", "Simuler : masque 3D"], ["ecran", "Simuler : rejeu écran"], ["impression", "Simuler : photo imprimée"], ["deepfake", "Simuler : deepfake / injection"]].map(([v, l]) => `<option value="${v}" ${s.spoof === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div id="face-res">${faceResult()}</div>
      </div>
    </section>
    <section class="stack">
      <div class="card"><div class="card-head"><h3>${icon("fingerprint")} Empreintes (4 doigts)</h3><button class="btn btn-sm" id="fp-all" style="margin-left:auto">Capturer tout</button></div>
        <div class="card-body"><div class="fingers">${["Index G", "Index D", "Pouce G", "Pouce D"].map((f, i) => `<button class="finger ${s.fingers[i] ? "ok" : ""}" data-f="${i}">${icon("fingerprint")}${f}<span>${s.fingers[i] ? `NFIQ ${s.fingers[i]}` : "À capturer"}</span></button>`).join("")}</div></div></div>
      <div class="card"><div class="card-head"><h3>${icon("eye")} Iris (optionnel)</h3><button class="btn btn-sm" id="iris" style="margin-left:auto">${s.iris ? "Recapturer" : "Capturer"}</button></div>
        <div class="card-body">${s.iris ? `<span class="status good">Correspondance ${fmtPct(s.iris)}</span>` : `<span class="muted small">Non capturé — recommandé pour les profils à risque.</span>`}</div></div>
      <div class="msg info">${icon("lock")}<span>Les gabarits biométriques sont chiffrés et ne quittent pas l'enclave du terminal ; seuls les scores sont transmis. Les scores sont simulés dans cette démonstration.</span></div>
    </section>
  </div>${nav(true, "Lancer les vérifications", !s.face)}`;

  const cap = host.querySelector("#cap");
  host.querySelector("#cam").onclick = async () => {
    try {
      stopCamera();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640 } });
      cap.innerHTML = `<video autoplay playsinline muted></video><span class="frame"></span>`;
      cap.querySelector("video").srcObject = stream;
    } catch { toast("Caméra indisponible — capture simulée.", "critical"); }
  };
  host.querySelector("#spoof").onchange = (e) => (s.spoof = e.target.value);
  host.querySelector("#shot").onclick = () => {
    const video = cap.querySelector("video");
    const canvas = document.createElement("canvas");
    canvas.width = 640; canvas.height = 480;
    const g = canvas.getContext("2d");
    if (video) g.drawImage(video, 0, 0, 640, 480);
    else { g.fillStyle = "#222"; g.fillRect(0, 0, 640, 480); g.fillStyle = "#FFD500"; g.font = "bold 28px Poppins, sans-serif"; g.textAlign = "center"; g.fillText("Capture simulée", 320, 250); }
    stopCamera();
    cap.innerHTML = ""; canvas.id = "snap"; cap.append(canvas); cap.insertAdjacentHTML("beforeend", '<span class="frame"></span>');
    s.snapshot = canvas;
    s.face = simulatedBiometric(`${s.parsed.docNo}-${Date.now()}`, s.spoof ? 0.6 : 0.94);
    s.liveness = !s.spoof;
    host.querySelector("#face-res").innerHTML = faceResult();
    host.querySelector("[data-next]").disabled = false;
  };
  if (s.snapshot) { const c = host.querySelector("#snap"); c.width = 640; c.height = 480; c.getContext("2d").drawImage(s.snapshot, 0, 0); }
  const capFinger = (i) => { s.fingers[i] = 1 + Math.floor(Math.random() * 2); };
  host.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { capFinger(+b.dataset.f); stepBiometrics(host, _ctx, next, back); }));
  host.querySelector("#fp-all").onclick = () => { [0, 1, 2, 3].forEach(capFinger); stepBiometrics(host, _ctx, next, back); };
  host.querySelector("#iris").onclick = () => { s.iris = simulatedBiometric(s.parsed.docNo + "iris", s.spoof ? 0.7 : 0.96); stepBiometrics(host, _ctx, next, back); };
  host.querySelector("[data-back]").onclick = () => { stopCamera(); back(); };
  host.querySelector("[data-next]").onclick = () => { stopCamera(); next(); };
}

const faceResult = () => (s.face === null ? `<span class="muted small">Positionnez le visage dans le cadre puis capturez.</span>` :
  `<div class="row"><span class="status ${s.face >= 0.8 ? "good" : "critical"}">Correspondance 1:1 avec la puce : ${fmtPct(s.face)}</span><span class="status ${s.liveness ? "good" : "critical"}">Détection du vivant : ${s.liveness ? "réussie" : "échec"}</span></div>`);

// ---------- 3. Vérifications ----------
async function stepChecks(host, ctx, next, back) {
  host.innerHTML = `<div class="card card-pad"><div class="row"><div class="spinner"></div><b>Interrogation des fichiers nationaux et internationaux…</b></div></div>`;
  try {
    s.result = await api("/api/assess", { method: "POST", body: payload() });
  } catch (e) {
    host.innerHTML = `<div class="msg critical">${icon("alert")}<span>${esc(e.message)}</span></div>${nav(true, "Réessayer")}`;
    host.querySelector("[data-back]").onclick = back;
    host.querySelector("[data-next]").onclick = () => stepChecks(host, ctx, next, back);
    return;
  }
  const { risk, visa, crossings30d, externalErrors } = s.result;
  const has = (code) => risk.factors.filter((f) => f.code === code);
  const live = ctx.data.connectors.filter((c) => c.status !== "DÉSACTIVÉ");
  const row = (label, ok, detail, warn = false) => `<div class="check-row">${ok ? `<span class="status good">OK</span>` : `<span class="status ${warn ? "warning" : "critical"}">${warn ? "Attention" : "Alerte"}</span>`}<div class="grow"><b>${esc(label)}</b><div class="small muted">${esc(detail)}</div></div></div>`;
  host.innerHTML = `<div class="grid-main">
    <section class="card"><div class="card-head"><h3>Vérifications</h3><span class="small muted" style="margin-left:auto">${live.length} sources interrogées</span></div><div class="card-body">
      ${row("Authenticité MRZ (ICAO 9303)", !has("MRZ").length, has("MRZ")[0]?.detail || "Chiffres de contrôle valides")}
      ${row("Puce électronique (NFC)", !has("PUCE_PA").length && !has("PUCE_MRZ").length && !has("PUCE_ABSENTE").length, s.chip ? [has("PUCE_PA")[0]?.label, has("PUCE_MRZ")[0]?.label].filter(Boolean).join(" · ") || (s.chip.read ? "Authentification passive valide, données concordantes" : "Puce non lue") : "Non lue au guichet", !s.chip)}
      ${row("Validité du document", !has("EXPIRE").length, has("EXPIRE")[0]?.detail || `Expire le ${fmtDate(s.parsed.expiry)}`)}
      ${row("Interpol SLTD — documents perdus / volés", !has("SLTD").length, has("SLTD")[0]?.detail || "Aucune correspondance")}
      ${row("Interpol notices, FPR, WAPIS, POI", !has("WATCHLIST").length, has("WATCHLIST").map((f) => f.detail).join(" · ") || "Aucune correspondance nominative")}
      ${row("Autorisation de voyage (e-Visa)", !has("VISA").length, visa ? `${visa.ref} — ${visa.status}${visa.validUntil ? ` (jusqu'au ${fmtDate(visa.validUntil)})` : ""}` : has("VISA").length ? "Aucune demande trouvée" : "Dispense de visa")}
      ${row("Correspondance faciale", !has("FACE").length, `Score ${fmtPct(s.face)}`, has("FACE_LIMITE").length > 0)}
      ${row("Détection du vivant et anti-deepfake (ISO 30107-3)", !has("LIVENESS").length && !has("ATTAQUE").length, has("ATTAQUE")[0]?.label || (s.liveness ? "Réussie" : "Échec — suspicion de masque / photo"))}
      ${row("Réutilisation d'identité", !has("DOC_REUTILISE").length && !has("MULTI_DOCS").length, [...has("DOC_REUTILISE"), ...has("MULTI_DOCS")].map((f) => `${f.label} : ${f.detail}`).join(" · ") || "Aucune incohérence document ↔ identité", !has("DOC_REUTILISE").length)}
      ${row("Règles de ciblage", !has("REGLE").length, has("REGLE").map((f) => f.label.replace("Règle de ciblage : ", "")).join(" · ") || "Aucune règle déclenchée", true)}
      ${row("Historique de voyage", crossings30d <= 6, `${crossings30d} passage(s) sur 30 jours`, true)}
      ${externalErrors.length ? `<div class="msg warning" style="margin-top:10px">${icon("wifiOff")}<span>Sources indisponibles (contrôle sur copie locale) : ${esc(externalErrors.join(" ; "))}</span></div>` : ""}
    </div></section>
    <section class="card"><div class="card-head"><h3>Évaluation du risque</h3></div><div class="card-body">${riskPanel(risk)}</div></section>
  </div>${nav(true, "Décider")}`;
  host.querySelector("[data-back]").onclick = back;
  host.querySelector("[data-next]").onclick = next;
}

export function gauge(score, tone) {
  const a = Math.PI * (1 - score / 100), r = 80, cx = 100, cy = 95;
  const x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
  return `<div class="gauge"><svg viewBox="0 0 200 110" width="220"><path d="M20 95 A80 80 0 0 1 180 95" fill="none" stroke="var(--surface-3)" stroke-width="14" stroke-linecap="round"/>
    ${score > 0 ? `<path d="M20 95 A80 80 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" style="stroke:var(--${tone})" stroke-width="14" stroke-linecap="round"/>` : ""}</svg>
    <div class="gauge-value"><b>${score}</b><span class="small muted">/ 100</span></div></div>`;
}

export function riskPanel(risk) {
  const reco = { AUTORISE: "Autoriser le passage", SECONDAIRE: "Orienter en contrôle secondaire", REFUSE: "Refuser et retenir — escalade superviseur" }[risk.recommendation];
  return `${gauge(risk.score, risk.tone)}
    <div style="text-align:center;margin:6px 0 14px">${status("level", risk.level)}</div>
    <div class="msg ${risk.recommendation === "AUTORISE" ? "good" : risk.recommendation === "REFUSE" ? "critical" : "warning"}">${icon("shieldCheck")}<span>Recommandation : <b>${esc(reco)}</b></span></div>
    <h4 style="margin:16px 0 4px;font-size:13px">Facteurs explicatifs</h4>
    ${risk.factors.length ? risk.factors.map((f) => `<div class="factor"><span><b>${esc(f.label)}</b>${f.detail ? `<br><span class="small muted">${esc(f.detail)}</span>` : ""}</span><b>+${f.points}</b></div>`).join("") : `<p class="muted small">Aucun facteur de risque.</p>`}`;
}

// ---------- 4. Décision ----------
function stepDecision(host, ctx, next, back) {
  const reco = s.result.risk.recommendation;
  s.decision = s.decision || reco;
  const cards = [["AUTORISE", "Autoriser", "Apposer le cachet et laisser passer", "good"], ["SECONDAIRE", "Contrôle secondaire", "Entretien et vérifications approfondies", "warning"], ["REFUSE", "Refuser", "Refus notifié, retenue si mandat", "critical"]];
  host.innerHTML = `<div class="grid-main">
    <section class="card card-pad stack">
      <div class="decision-cards">${cards.map(([v, l, d, tone]) => `<button class="decision-card" data-d="${v}" aria-pressed="${s.decision === v}">${v === reco ? '<span class="reco">Recommandé</span>' : "<span></span>"}<span class="status ${tone}">${l}</span><span class="small muted">${d}</span></button>`).join("")}</div>
      <label class="field"><span>Motif ${s.decision !== reco ? "(obligatoire : décision différente de la recommandation)" : "(facultatif)"}</span><input class="input" id="reason" value="${esc(s.reason || "")}" maxlength="300"></label>
      <label class="field"><span>Observations</span><textarea class="textarea" id="notes">${esc(s.notes || "")}</textarea></label>
    </section>
    <section class="card"><div class="card-head"><h3>Récapitulatif</h3></div><div class="card-body"><dl class="kv">
      <dt>Voyageur</dt><dd><b>${esc(s.parsed.surname)} ${esc(s.parsed.given)}</b></dd><dt>Document</dt><dd class="mono">${esc(s.parsed.docNo)} · ${esc(s.parsed.nat)}</dd>
      <dt>Sens</dt><dd>${s.direction === "ENTREE" ? "Entrée" : "Sortie"}</dd><dt>Poste</dt><dd>${esc(ctx.poste(s.posteId))}</dd>
      <dt>Visage</dt><dd>${fmtPct(s.face)}</dd><dt>Empreintes</dt><dd>${s.fingers.filter(Boolean).length} / 4</dd>
      <dt>Score</dt><dd>${s.result.risk.score} / 100</dd></dl></div></section>
  </div>
  <div class="row" style="justify-content:space-between;margin-top:16px"><button class="btn" data-back>${icon("arrowLeft")} Précédent</button><button class="btn btn-dark btn-lg" id="submit">${icon("check")} Valider la décision</button></div>`;
  host.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => { s.decision = b.dataset.d; s.reason = host.querySelector("#reason").value; s.notes = host.querySelector("#notes").value; stepDecision(host, ctx, next, back); }));
  host.querySelector("[data-back]").onclick = back;
  host.querySelector("#submit").onclick = async (e) => {
    s.reason = host.querySelector("#reason").value.trim();
    s.notes = host.querySelector("#notes").value.trim();
    if (s.decision !== reco && !s.reason) { toast("Motif obligatoire", "critical"); host.querySelector("#reason").focus(); return; }
    e.target.disabled = true;
    try {
      const c = await api("/api/crossings", { method: "POST", body: { ...payload(), decision: s.decision, reason: s.reason, notes: s.notes, durationSec: Math.round((Date.now() - s.started) / 1000) } });
      await ctx.reload();
      toast(`Passage enregistré (${c.id})`);
      location.hash = `#/passages/${c.id}`;
    } catch (err) { toast(err.message, "critical"); e.target.disabled = false; }
  };
}

const payload = () => ({ mrz: s.mrz, chip: chipPayload(s.chip), attack: s.spoof || undefined, direction: s.direction, posteId: s.posteId, flight: s.flight, origin: s.origin, faceScore: s.face, liveness: s.liveness, irisScore: s.iris ?? undefined, fingerprints: s.fingers.filter(Boolean).length, channel: "GUICHET" });
