// Plateforme WawID des compagnies aériennes : transmission des données API / PNR, suivi de la qualité et des délais,
// factures de redevance de sécurité et déclaration des paiements. Chaque compte ne voit que sa compagnie ;
// le résultat du pré-contrôle des passagers n'est jamais communiqué.
import { bindLangSwitch, initI18n, lang, langSwitch, t } from "../shared/i18n.js";
import { renderMarkdown } from "../shared/markdown.js";
import { INVOICE_TONES, PAYMENT_STATUS, invoiceState } from "../shared/redevance.js";
import { LOGO, WORDMARK, api, dialog, esc, fmtDate, fmtDateTime, fmtNum, icon, initTheme, toast, toggleTheme } from "../shared/ui.js";

initTheme();
const app = document.getElementById("app");
const S = { me: null, data: null };
const NAV = [["tableau", "Tableau de bord"], ["envoyer", "Transmettre"], ["messages", "Messages"], ["vols", "Vols"], ["redevance", "Redevance"], ["integration", "API"]];
const xof = (n) => `${fmtNum(Math.round(n))} FCFA`;
const MSG_TONE = { "ACCEPTÉ": "good", "ACCEPTÉ AVEC AVERTISSEMENTS": "warning", "REJETÉ": "critical" };
const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString(lang() === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

// ---------- Connexion ----------
function renderLogin(error = "") {
  app.innerHTML = `
  <header class="p-nav"><nav class="p-nav-bar">
    <a class="brand" href="./"><span class="brand-logo">${LOGO}</span><span><span class="brand-name">${WORDMARK}</span><br><span class="brand-sub c-brand-sub">Compagnies aériennes</span></span></a>
    <span style="margin-left:auto"></span>${langSwitch()}
  </nav></header>
  <main class="p-main">
    <form class="card c-login" id="login">
      <div><span class="pill-dark">${icon("plane")} API · PNR · Redevance</span></div>
      <h1>Espace compagnies aériennes</h1>
      <p class="muted">Transmission des données passagers (API / PNR) aux autorités du Sénégal, suivi de la conformité et de la redevance de sécurité.</p>
      <label class="field"><span>Identifiant</span><input class="input" name="username" autocomplete="username" required autofocus></label>
      <label class="field"><span>Mot de passe</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
      ${error ? `<div class="msg critical" role="alert">${icon("alert")}<span>${esc(error)}</span></div>` : ""}
      <button class="btn btn-primary btn-lg" type="submit">${icon("logIn")} Se connecter</button>
      <p class="small muted">Accès réservé aux compagnies habilitées. Compte et clé de passerelle délivrés par WawID. Toutes les actions sont journalisées.</p>
    </form>
  </main>`;
  bindLangSwitch(app);
  app.querySelector("#login").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      S.me = (await api("/api/session", { method: "POST", body: { username: f.get("username"), password: f.get("password"), platform: "compagnies" } })).user;
      await start();
    } catch (err) { renderLogin(err.message); }
  };
}

async function logout() {
  await api("/api/session", { method: "DELETE" }).catch(() => {});
  S.me = S.data = null;
  location.hash = "";
  renderLogin();
}

// ---------- Coquille ----------
async function load() { S.data = await api("/api/compagnie/overview"); }

async function start() {
  if (S.me?.platform !== "compagnies") return renderLogin(S.me ? "Ce compte n'ouvre pas la plateforme des compagnies aériennes." : "");
  await load();
  route();
}

function shell(page, inner) {
  const c = S.data.carrier;
  app.innerHTML = `
  <header class="p-nav"><nav class="p-nav-bar">
    <a class="brand" href="#tableau"><span class="brand-logo">${LOGO}</span><span><span class="brand-name">${WORDMARK}</span><br><span class="brand-sub c-brand-sub">${esc(c.name)} · ${esc(c.code)}</span></span></a>
    <div class="p-links">${NAV.map(([k, l]) => `<a href="#${k}" ${k === page ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</div>
    <button class="btn btn-ghost btn-icon" id="theme" title="Thème">${icon("moon")}</button>
    ${langSwitch()}
    <div class="c-user"><div class="who"><b>${esc(S.me.name)}</b><br><small>${esc(c.name)}</small></div>
      <button class="btn btn-ghost btn-icon" id="logout" title="Se déconnecter">${icon("logOut")}</button></div>
  </nav></header>
  <main class="p-main" id="view">${inner}</main>
  <footer class="p-foot">WawID · Plateforme des compagnies aériennes · ${esc(c.name)}</footer>`;
  bindLangSwitch(app);
  app.querySelector("#theme").onclick = toggleTheme;
  app.querySelector("#logout").onclick = logout;
}

const head = (title, sub, actions = "") => `<div class="c-head"><div class="grow"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${actions}</div>`;
const kpi = (value, label, sub = "") => `<div class="card c-kpi"><b>${value}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ""}</div>`;
const msgStatus = (s) => `<span class="status ${MSG_TONE[s] || ""}">${esc(s)}</span>`;
const bar = (pct) => `<div style="display:flex;align-items:center;gap:8px"><div class="c-bar" style="flex:1;min-width:60px"><i style="width:${pct}%"></i></div><span class="small">${pct} %</span></div>`;

// ---------- Tableau de bord ----------
function tableau() {
  const { flights, messages, invoices } = S.data;
  const month = Date.now() - 30 * 86400000;
  const f30 = flights.filter((f) => Date.parse(f.eta) > month);
  const pax = f30.reduce((s, f) => s + f.passengers, 0);
  const onTime = f30.length ? Math.round((f30.filter((f) => f.onTime).length / f30.length) * 100) : 100;
  const complete = pax ? Math.round(f30.reduce((s, f) => s + f.completeness * f.passengers, 0) / pax) : 100;
  const m30 = messages.filter((m) => Date.parse(m.receivedAt) > month);
  const rejected = m30.filter((m) => m.status === "REJETÉ").length;
  const states = invoices.map((i) => ({ ...i, st: invoiceState(i, S.data.redevance) }));
  const due = states.reduce((s, i) => s + i.st.due + i.st.penalty, 0);
  const late = states.filter((i) => i.st.status === "EN RETARD").length;
  return head("Tableau de bord", "Vos transmissions de données passagers et votre situation de redevance (30 derniers jours).", `<a class="btn btn-primary" href="#envoyer">${icon("upload")} Transmettre un message</a>`) + `
  <div class="c-kpis">
    ${kpi(fmtNum(f30.length), "Vols transmis", `${fmtNum(pax)} passagers`)}
    ${kpi(`${onTime} %`, "Transmis dans les délais", "API au départ · PNR H-24")}
    ${kpi(`${complete} %`, "Complétude des données", "n° de document, naissance, nationalité")}
    ${kpi(fmtNum(rejected), "Messages rejetés", `${fmtNum(m30.length)} messages reçus`)}
    ${kpi(xof(due), "Redevance restant due", late ? `${late} facture(s) en retard` : "Aucune facture en retard")}
  </div>
  <div class="c-grid">
    <section class="card"><div class="card-head"><h3>Derniers messages</h3><a class="btn btn-sm" href="#messages" style="margin-left:auto">Tout voir</a></div>
      ${messagesTable(messages.slice(0, 8))}</section>
    <section class="card"><div class="card-head"><h3>Prochaines échéances</h3><a class="btn btn-sm" href="#redevance" style="margin-left:auto">Redevance</a></div>
      <div class="card-body">${states.filter((i) => i.st.due).slice(0, 5).map((i) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)"><span>${esc(monthLabel(i.month))}<br><span class="small muted">Échéance ${fmtDate(i.dueAt)}</span></span><span style="text-align:right"><b>${xof(i.st.due + i.st.penalty)}</b><br><span class="status ${INVOICE_TONES[i.st.status]}">${esc(i.st.status)}</span></span></div>`).join("") || `<p class="muted">Aucune somme due.</p>`}</div></section>
  </div>`;
}

function messagesTable(list) {
  if (!list.length) return `<div class="card-body muted">Aucun message reçu.</div>`;
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Reçu le</th><th>Référence</th><th>Format</th><th>Vol</th><th class="num">Passagers</th><th>Complétude</th><th>Statut</th></tr></thead><tbody>
    ${list.map((m) => `<tr class="clickable" data-msg="${esc(m.id)}"><td>${fmtDateTime(m.receivedAt)}</td><td class="mono">${esc(m.id)}</td><td>${esc(m.format)}</td><td>${esc(m.flight || "—")}</td><td class="num">${fmtNum(m.passengers)}</td><td>${bar(m.completeness || 0)}</td><td>${msgStatus(m.status)}${m.onTime === false ? ` <span class="status warning">transmission tardive</span>` : ""}</td></tr>`).join("")}
  </tbody></table></div>`;
}

function bindMessages(root) {
  root.querySelectorAll("[data-msg]").forEach((tr) => (tr.onclick = () => {
    const m = S.data.messages.find((x) => x.id === tr.dataset.msg);
    dialog({ title: `Message ${m.id}`, body: ackBody(m) });
  }));
}

function ackBody(a) {
  return `<div class="c-ack"><dl>
    <dt>Statut</dt><dd>${msgStatus(a.status)}</dd>
    <dt>Référence</dt><dd class="mono">${esc(a.reference || a.id)}</dd>
    ${a.format ? `<dt>Format</dt><dd>${esc(a.format)}</dd>` : ""}
    ${a.flight ? `<dt>Vol</dt><dd>${esc(a.flight)}</dd>` : ""}
    ${a.passengers !== undefined ? `<dt>Passagers</dt><dd>${fmtNum(a.passengers)}</dd>` : ""}
    ${a.completeness !== undefined ? `<dt>Complétude</dt><dd>${a.completeness} %</dd>` : ""}
    ${a.onTime !== undefined ? `<dt>Délai</dt><dd>${a.onTime ? "Dans les délais" : "Transmission tardive"}</dd>` : ""}
    ${a.receivedAt ? `<dt>Reçu le</dt><dd>${fmtDateTime(a.receivedAt)}</dd>` : ""}
  </dl>${a.errors?.length ? `<h4 style="margin:14px 0 6px">Erreurs et avertissements</h4><ul>${a.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}</div>`;
}

// ---------- Transmettre ----------
function envoyer() {
  return head("Transmettre des données passagers", "Collez ou chargez un message UN/EDIFACT PAXLST (API) ou un PNR. En production, la transmission se fait de système à système via la passerelle (voir Intégration API).") + `
  <div class="c-grid">
    <form class="card card-pad c-stack" id="send">
      <label class="field"><span>Format</span><select class="select" name="format"><option value="">Détection automatique</option><option value="PAXLST">PAXLST (API)</option><option value="PNR">PNR</option></select></label>
      <label class="field"><span>Message</span><textarea class="textarea mono" name="message" rows="14" required placeholder="UNA:+.? '&#10;UNB+UNOA:4+…" data-no-i18n></textarea></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <label class="btn">${icon("upload")} Charger un fichier<input type="file" id="file" accept=".edi,.txt,.pnr,text/plain" hidden></label>
        <button class="btn" type="button" data-sample="PAXLST">Exemple PAXLST</button>
        <button class="btn" type="button" data-sample="PNR">Exemple PNR</button>
        <button class="btn btn-primary" type="submit" style="margin-left:auto">${icon("send")} Transmettre</button>
      </div>
    </form>
    <section class="card"><div class="card-head"><h3>Accusé de réception</h3></div><div class="card-body" id="ack"><p class="muted">L'accusé de réception s'affiche ici après la transmission.</p>
      <div class="msg info">${icon("info")}<span>Conformément aux règles API/PNR, le résultat des contrôles effectués par les autorités n'est pas communiqué aux transporteurs.</span></div></div></section>
  </div>`;
}

function bindEnvoyer(root) {
  const form = root.querySelector("#send");
  root.querySelectorAll("[data-sample]").forEach((b) => (b.onclick = async () => {
    const s = await api("/api/compagnie/samples");
    form.message.value = s[b.dataset.sample];
    form.format.value = b.dataset.sample;
  }));
  root.querySelector("#file").onchange = async (e) => { const f = e.target.files[0]; if (f) form.message.value = await f.text(); };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const ackEl = root.querySelector("#ack");
    const { ok, data } = await sendRaw({ message: form.message.value, format: form.format.value || undefined });
    if (data.status) {
      ackEl.innerHTML = ackBody(data);
      toast(ok ? "Message accepté" : "Message rejeté", ok ? "good" : "critical");
    } else ackEl.innerHTML = `<div class="msg critical">${icon("alert")}<span>${esc(data.error || "Erreur")}</span></div>`;
    await load();
  };
}

// La réponse d'erreur 422 contient l'accusé complet : on l'affiche tel quel.
async function sendRaw(body) {
  const res = await fetch("/api/compagnie/messages", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

// ---------- Messages ----------
function messages() {
  const list = S.data.messages;
  return head("Messages reçus", `${fmtNum(list.length)} messages · accusés de réception et erreurs de format.`) + `<section class="card">${messagesTable(list)}</section>`;
}

// ---------- Vols ----------
function vols() {
  const list = S.data.flights;
  return head("Vols", "Données reçues par vol : sources (API, PNR), délais et complétude.") + `<section class="card">${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Vol</th><th>Trajet</th><th>Date</th><th>Sens</th><th>Sources</th><th class="num">Passagers</th><th>Complétude</th><th>Délai</th></tr></thead><tbody>
    ${list.map((f) => `<tr class="clickable" data-flight="${esc(f.id)}"><td><b>${esc(f.flight)}</b></td><td>${esc(f.route)}</td><td>${fmtDateTime(f.eta)}</td><td>${f.direction === "ARRIVEE" ? "Arrivée" : "Départ"}</td><td>${esc(f.source || "—")}</td><td class="num">${fmtNum(f.passengers)}</td><td>${bar(f.completeness)}</td><td>${f.onTime ? `<span class="status good">Dans les délais</span>` : `<span class="status warning">transmission tardive</span>`}</td></tr>`).join("")}
  </tbody></table></div>` : `<div class="card-body muted">Aucun vol.</div>`}</section>`;
}

function bindVols(root) {
  root.querySelectorAll("[data-flight]").forEach((tr) => (tr.onclick = async () => {
    const f = await api(`/api/compagnie/flights/${tr.dataset.flight}`);
    const incomplete = f.list.filter((p) => p.missing.length);
    dialog({ title: `${f.flight} · ${f.route}`, wide: true, body: `
      <p class="muted">${fmtDateTime(f.eta)} · ${esc(f.source || "")} · ${fmtNum(f.passengers)} passagers · complétude ${f.completeness} %</p>
      ${incomplete.length ? `<div class="msg warning">${icon("alert")}<span>${incomplete.length} passager(s) avec des données manquantes : complétez-les dans un nouveau message.</span></div>` : `<div class="msg good">${icon("checkCircle")}<span>Données complètes pour tous les passagers.</span></div>`}
      <div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Passager</th><th>Document</th><th>Nationalité</th><th>Siège</th><th>Données manquantes</th></tr></thead><tbody>
      ${f.list.map((p) => `<tr><td>${esc(p.surname)} ${esc(p.given || "")}</td><td class="mono">${esc(p.docNo || "—")}</td><td>${esc(p.nat || "—")}</td><td>${esc(p.seat || "—")}</td><td>${p.missing.length ? p.missing.map((k) => `<span class="status warning">${esc(FIELD[k])}</span>`).join(" ") : `<span class="status good">Complet</span>`}</td></tr>`).join("")}
      </tbody></table></div>` });
  }));
}
const FIELD = { docNo: "N° de document", dob: "Date de naissance", nat: "Nationalité", expiry: "Expiration du document" };

// ---------- Redevance ----------
function redevance() {
  const r = S.data.redevance;
  const states = S.data.invoices.map((i) => ({ ...i, st: invoiceState(i, r) }));
  const due = states.reduce((s, i) => s + i.st.due + i.st.penalty, 0);
  const pending = states.reduce((s, i) => s + i.st.pending, 0);
  return head("Redevance de sécurité", `${r.rateUSD} USD par passager embarqué ou débarqué, perçue dans le prix du billet et reversée chaque mois.`) + `
  <div class="msg info" style="margin-bottom:16px">${icon("info")}<span><b>Bénéficiaire des paiements :</b> <span>${esc(r.beneficiary)}</span>. ${r.circuit === "OPERATEUR" ? "<span>WawID reverse ensuite la part de l'État au Trésor public.</span>" : ""} <span>Indiquez la référence de facture dans le libellé du virement, puis déclarez le paiement ici : il est validé après rapprochement avec le relevé bancaire.</span></span></div>
  <div class="c-kpis">
    ${kpi(xof(due), "Restant dû (pénalités comprises)")}
    ${kpi(xof(pending), "Paiements déclarés en attente de validation")}
    ${kpi(fmtNum(states.filter((i) => i.st.status === "EN RETARD").length), "Factures en retard", `pénalité ${Math.round(r.penaltyRate * 100)} % par mois de retard`)}
  </div>
  <section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Mois</th><th>Facture</th><th class="num">Passagers déclarés</th><th class="num">Montant</th><th class="num">Payé</th><th class="num">Reste dû</th><th>Échéance</th><th>Statut</th><th></th></tr></thead><tbody>
    ${states.map((i) => `<tr><td>${esc(monthLabel(i.month))}</td><td class="mono">${esc(i.id)}</td><td class="num">${fmtNum(i.declared)}</td><td class="num">${xof(i.amountXOF)}</td><td class="num">${xof(i.st.paid)}${i.st.pending ? `<div class="cell-sub">+ ${xof(i.st.pending)} à valider</div>` : ""}</td><td class="num"><b>${xof(i.st.due + i.st.penalty)}</b>${i.st.penalty ? `<div class="cell-sub">dont pénalité ${xof(i.st.penalty)}</div>` : ""}</td><td>${fmtDate(i.dueAt)}</td><td><span class="status ${INVOICE_TONES[i.st.status]}">${esc(i.st.status)}</span></td>
      <td><button class="btn btn-sm" data-inv="${esc(i.id)}">${i.st.due + i.st.penalty - i.st.pending > 0 ? "Déclarer un paiement" : "Détail"}</button></td></tr>`).join("")}
  </tbody></table></div></section>`;
}

function bindRedevance(root) {
  root.querySelectorAll("[data-inv]").forEach((b) => (b.onclick = async () => {
    const i = S.data.invoices.find((x) => x.id === b.dataset.inv);
    const st = invoiceState(i, S.data.redevance);
    const { value, form } = await dialog({
      title: `Facture ${i.id}`,
      body: `<p class="muted">${esc(monthLabel(i.month))} · ${fmtNum(i.declared)} passagers × ${i.rateUSD} USD × ${fmtNum(i.fx, 2)} FCFA/USD (taux IATA)</p>
        ${i.payments.length ? `<h4 style="margin:12px 0 6px">Paiements</h4>${i.payments.map((p) => `<div class="factor"><span>${fmtDate(p.at)} · ${esc(p.ref)} · ${esc(p.channel || p.by)} <span class="status ${PAYMENT_STATUS[p.status || "CONFIRME"][0]}">${PAYMENT_STATUS[p.status || "CONFIRME"][1]}</span>${p.reason ? `<br><span class="small muted">${esc(p.reason)}</span>` : ""}</span><b>${xof(p.amount)}</b></div>`).join("")}` : ""}
        ${st.due && st.due + st.penalty - st.pending <= 0 ? `<div class="msg info" style="margin-top:12px">${icon("info")}<span>Le reste dû est couvert par un paiement déclaré, en attente de validation par WawID.</span></div>` : ""}
        ${st.due + st.penalty - st.pending > 0 ? `<h4 style="margin:14px 0 6px">Déclarer un paiement</h4>
        <p class="small muted">Bénéficiaire : ${esc(S.data.redevance.beneficiary)}</p>
        <div class="form-grid"><label class="field"><span>Montant (FCFA)</span><input class="input" name="amount" type="number" min="1" value="${Math.max(0, st.due + st.penalty - st.pending)}"></label>
        <label class="field"><span>Mode</span><select class="select" name="method"><option>Virement</option><option>SWIFT</option><option>Mobile money</option><option>Chèque</option></select></label>
        <label class="field" style="grid-column:1/-1"><span>Référence du virement</span><input class="input" name="ref" required></label></div>` : ""}`,
      actions: st.due + st.penalty - st.pending > 0 ? [{ label: "Annuler", value: null }, { label: "Déclarer le paiement", cls: "btn-primary", value: "pay", validate: (f) => (!f.ref.value.trim() ? "Référence du virement obligatoire" : Number(f.amount.value) > 0 ? null : "Montant invalide") }] : undefined,
    });
    if (value !== "pay") return;
    try {
      await api("/api/compagnie/payments", { method: "POST", body: { invoiceId: i.id, amount: Number(form.amount.value), ref: form.ref.value, method: form.method.value } });
      toast("Paiement déclaré : il sera validé après rapprochement bancaire", "good");
      await load();
      route();
    } catch (err) { toast(err.message, "critical"); }
  }));
}

// ---------- Intégration API ----------
async function integration(root) {
  const L = lang();
  const doc = await api(`/api/docs/${L}/api-reference`).catch(() => null);
  const { html } = doc ? renderMarkdown(doc.markdown) : { html: "" };
  root.innerHTML = head("Intégration API", "Transmission automatique de système à système (passerelle WawID).") + `
  <div class="c-grid">
    <section class="card card-pad c-stack">
      <h3 style="margin:0">Passerelle</h3>
      <div class="c-code" data-no-i18n>POST ${esc(location.origin)}/api/carrier/messages
X-Carrier-Key: &lt;clé délivrée par WawID&gt;
Content-Type: text/plain

UNA:+.? '
UNB+UNOA:4+${esc(S.data.carrier.code)}:ZZ+SNPIU:ZZ+…</div>
      <p class="small muted">Réponse 202 avec accusé de réception (référence, passagers, complétude, délai) ; 422 si le message est rejeté ; 401 si la clé est invalide. La clé de passerelle est propre à votre compagnie : demandez-la ou faites-la renouveler auprès de WawID.</p>
      <h3 style="margin:8px 0 0">Délais</h3>
      <p class="small">API (PAXLST) : au plus tard à la fermeture du vol. PNR : au plus tard 24 h avant le départ, puis mise à jour à la fermeture.</p>
    </section>
    <section class="card card-pad c-doc"><div class="md" data-no-i18n>${html || `<p class="muted">Documentation indisponible.</p>`}</div></section>
  </div>`;
}

// ---------- Routage ----------
function route() {
  if (!S.data) return;
  const page = NAV.some(([k]) => k === location.hash.slice(1)) ? location.hash.slice(1) : "tableau";
  const views = { tableau, envoyer, messages, vols, redevance };
  shell(page, views[page] ? views[page]() : `<div class="empty"><div class="spinner" style="margin:auto"></div></div>`);
  const view = app.querySelector("#view");
  if (page === "integration") integration(view);
  bindMessages(view);
  if (page === "envoyer") bindEnvoyer(view);
  if (page === "vols") bindVols(view);
  if (page === "redevance") bindRedevance(view);
  scrollTo(0, 0);
}
addEventListener("hashchange", route);

(async () => {
  await initI18n("../");
  try {
    S.me = (await api("/api/session")).user;
    await start();
  } catch { renderLogin(); }
})();
