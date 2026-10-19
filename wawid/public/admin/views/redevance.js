// Redevance de sécurité (décret 2011-652, arrêté de recouvrement, décret 2012-519) :
// assiette par compagnie, exonérations, factures en FCFA, pénalités, encaissements au Trésor,
// rapprochement déclarations / comptage WawID, répartition et simulateur de modèle économique.
import { api, dialog, downloadCSV, esc, fmtDate, fmtNum, icon, toast } from "../../shared/ui.js";
import { barChart, bindTooltips, legend, mountTable, pageHead } from "./common.js";

const DEFAULTS = { rateUSD: 12, operatorShare: 0.75, penaltyRate: 0.05, fx: {} };
const EXEMPT = { equipage: "Équipage", billetsID: "Billets ID (personnel)", enfants: "Enfants 0-2 ans", transit: "Transit ≤ 24 h", deroutes: "Vols déroutés" };
const TABS = [["synthese", "Synthèse"], ["factures", "Factures compagnies"], ["rapprochement", "Rapprochement"], ["repartition", "Répartition"], ["simulateur", "Simulateur de modèle"]];
const xof = (n) => `${fmtNum(Math.round(n))} FCFA`;
const mds = (n) => (Math.abs(n) >= 1e9 ? `${fmtNum(n / 1e9, 2)} Mds` : `${fmtNum(n / 1e6, 1)} M`);
const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });

/** État d'une facture : payé, reste dû, mois de retard et pénalité (5 % par mois de retard sur le reste dû). */
export function invoiceState(inv, r = DEFAULTS, now = new Date()) {
  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
  const due = Math.max(0, inv.amountXOF - paid);
  const late = due > 0 && now > new Date(inv.dueAt) ? Math.ceil((now - new Date(inv.dueAt)) / (30 * 86400000)) : 0;
  const penalty = Math.round(due * r.penaltyRate * late);
  const status = due === 0 ? "PAYÉE" : late ? "EN RETARD" : paid ? "PARTIELLE" : "ÉMISE";
  return { paid, due, late, penalty, status };
}
const STATUS = { "PAYÉE": "good", "PARTIELLE": "warning", "ÉMISE": "info", "EN RETARD": "critical" };

export function render(el, ctx, _rest, query) {
  const d = ctx.data;
  const r = { ...DEFAULTS, ...(d.settings.redevance || {}) };
  const invoices = (d.invoices || []).map((i) => ({ ...i, st: invoiceState(i, r) }));
  const tab = TABS.some(([k]) => k === query.tab) ? query.tab : "synthese";
  el.innerHTML = `${pageHead({ title: "Redevance de sécurité", sub: "12 USD par passager embarqué ou débarqué sur vol commercial international, facturée en FCFA au taux IATA du mois, recouvrée par la DGCPT (décret 2012-519).", crumbs: [[null, "Finances"]],
    actions: `<button class="btn" id="csv">${icon("download")} Exporter</button>` })}
  <nav class="space-tabs">${TABS.map(([k, l]) => `<button aria-selected="${k === tab}" data-tab="${k}">${l}</button>`).join("")}</nav>
  <div id="body"></div>`;
  el.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => (location.hash = `#/redevance?tab=${b.dataset.tab}`)));
  el.querySelector("#csv").onclick = () => downloadCSV("wawid-redevance.csv", invoices.map((i) => ({
    Facture: i.id, Mois: i.month, Compagnie: i.carrierName, "Passagers comptés": i.counted, Exonérés: i.counted - i.billable, Taxables: i.billable,
    Déclarés: i.declared, "Taux USD/FCFA": i.fx, "Montant USD": i.amountUSD, "Montant FCFA": i.amountXOF, Payé: i.st.paid, "Reste dû": i.st.due, Pénalité: i.st.penalty, Statut: i.st.status,
  })));
  const body = el.querySelector("#body");
  ({ synthese, factures, rapprochement, repartition, simulateur })[tab](body, ctx, invoices, r);
  bindTooltips(el);
}

// ---------- Synthèse ----------
function synthese(body, ctx, invoices, r) {
  const months = [...new Set(invoices.map((i) => i.month))].sort();
  const sum = (list, f) => list.reduce((s, i) => s + f(i), 0);
  const billed = sum(invoices, (i) => i.amountXOF), paid = sum(invoices, (i) => i.st.paid), due = sum(invoices, (i) => i.st.due), penalties = sum(invoices, (i) => i.st.penalty);
  const gapPax = sum(invoices, (i) => i.billable - i.declared), gapXOF = sum(invoices, (i) => (i.billable - i.declared) * i.rateUSD * i.fx);
  body.innerHTML = `
  <div class="kpis">
    ${kpi("Facturé (6 mois)", mds(billed), "FCFA")}
    ${kpi("Encaissé au Trésor", mds(paid), `${fmtNum((paid / billed) * 100 || 0, 1)} % du facturé`)}
    ${kpi("Restant dû", mds(due), `${invoices.filter((i) => i.st.status === "EN RETARD").length} facture(s) en retard`, due ? "warning" : "")}
    ${kpi("Pénalités de retard", mds(penalties), `${Math.round(r.penaltyRate * 100)} % par mois de retard`, penalties ? "critical" : "")}
    ${kpi("Passagers non déclarés", fmtNum(gapPax), `≈ ${mds(gapXOF)} FCFA d'assiette manquante`, gapPax ? "critical" : "")}
  </div>
  <div class="grid-main">
    <section class="card"><div class="card-head"><h3>Facturé et encaissé par mois (FCFA)</h3></div><div class="card-body">
      ${legend([{ name: "Facturé", color: "var(--series-1)" }, { name: "Encaissé", color: "var(--series-3)" }])}
      ${barChart({ labels: months.map(monthLabel), series: [
        { name: "Facturé", color: "var(--series-1)", values: months.map((m) => Math.round(sum(invoices.filter((i) => i.month === m), (i) => i.amountXOF) / 1e6)) },
        { name: "Encaissé", color: "var(--series-3)", values: months.map((m) => Math.round(sum(invoices.filter((i) => i.month === m), (i) => i.st.paid) / 1e6)) },
      ], unit: " M" })}
      <p class="small muted" style="margin:6px 0 0">Montants en millions de FCFA.</p></div></section>
    <section class="card"><div class="card-head"><h3>Calendrier réglementaire</h3></div><div class="card-body small stack">
      <div><b>Mois M</b> — passages embarqués et débarqués (hors exonérations).</div>
      <div><b>Du 1er au 9 M+1</b> — collecte des statistiques passagers : déclarations des compagnies <i>et</i> comptage WawID (biométrie, API/PNR).</div>
      <div><b>Le 10 M+1</b> — émission des factures en FCFA au taux IATA du mois M.</div>
      <div><b>Fin de M+1</b> — échéance ; reversement au Receveur général du Trésor.</div>
      <div><b>Après échéance</b> — pénalité de ${Math.round(r.penaltyRate * 100)} % par mois de retard.</div>
    </div></section>
  </div>
  <section class="card" style="margin-top:16px"><div class="card-head"><h3>Par compagnie (6 mois)</h3></div><div id="byc"></div></section>`;
  const carriers = Object.values(invoices.reduce((m, i) => {
    const c = (m[i.carrier] ||= { carrier: i.carrierName, billed: 0, paid: 0, due: 0, penalty: 0, gap: 0 });
    c.billed += i.amountXOF; c.paid += i.st.paid; c.due += i.st.due; c.penalty += i.st.penalty; c.gap += i.billable - i.declared;
    return m;
  }, {}));
  mountTable(body.querySelector("#byc"), {
    rows: carriers, sort: "billed",
    columns: [
      { key: "carrier", label: "Compagnie", render: (c) => `<b>${esc(c.carrier)}</b>` },
      { key: "billed", label: "Facturé", num: true, render: (c) => xof(c.billed) },
      { key: "paid", label: "Encaissé", num: true, render: (c) => xof(c.paid) },
      { key: "due", label: "Reste dû", num: true, render: (c) => (c.due ? `<span class="status warning">${xof(c.due)}</span>` : "0") },
      { key: "penalty", label: "Pénalités", num: true, render: (c) => (c.penalty ? xof(c.penalty) : "—") },
      { key: "gap", label: "Non déclarés", num: true, render: (c) => (c.gap > 0 ? `<span class="status critical">${fmtNum(c.gap)}</span>` : '<span class="status good">0</span>') },
    ],
  });
}

// ---------- Factures ----------
function factures(body, ctx, invoices, r) {
  body.innerHTML = `<div class="card filterbar"><label class="field"><span>Mois</span><select class="select" id="m"><option value="">Tous</option>${[...new Set(invoices.map((i) => i.month))].sort().reverse().map((m) => `<option value="${m}">${monthLabel(m)}</option>`).join("")}</select></label>
    <label class="field"><span>Statut</span><select class="select" id="s"><option value="">Tous</option>${Object.keys(STATUS).map((s) => `<option>${s}</option>`).join("")}</select></label>
    ${ctx.can("finance") ? `<button class="btn" id="assiette" style="align-self:flex-end">${icon("refresh")} Assiette du mois en cours (WawID)</button>` : ""}</div>
    <section class="card" id="t"></section>`;
  const table = mountTable(body.querySelector("#t"), {
    rows: invoices, sort: "id", onRow: (i) => invoiceDialog(i, ctx, r),
    columns: [
      { key: "id", label: "Facture", render: (i) => `<span class="mono">${esc(i.id)}</span><div class="cell-sub">émise le ${fmtDate(i.issuedAt)}</div>` },
      { key: "carrierName", label: "Compagnie" },
      { key: "billable", label: "Passagers taxables", num: true, render: (i) => fmtNum(i.declared) },
      { key: "amountXOF", label: "Montant", num: true, render: (i) => `${xof(i.amountXOF)}<div class="cell-sub">${fmtNum(i.amountUSD)} USD × ${fmtNum(i.fx, 2)}</div>` },
      { key: "dueAt", label: "Échéance", render: (i) => fmtDate(i.dueAt) },
      { key: "due", label: "Reste dû", num: true, value: (i) => i.st.due, render: (i) => (i.st.due ? xof(i.st.due + i.st.penalty) : "0") },
      { key: "status", label: "Statut", value: (i) => i.st.status, render: (i) => `<span class="status ${STATUS[i.st.status]}">${i.st.status}${i.st.late ? ` · ${i.st.late} mois` : ""}</span>` },
    ],
  });
  const apply = () => { const m = body.querySelector("#m").value, s = body.querySelector("#s").value; table.update(invoices.filter((i) => (!m || i.month === m) && (!s || i.st.status === s))); };
  body.querySelector("#m").onchange = apply; body.querySelector("#s").onchange = apply;
  body.querySelector("#assiette")?.addEventListener("click", async () => {
    const month = new Date().toISOString().slice(0, 7);
    try {
      const a = await api("/api/redevance/assiette", { method: "POST", body: { month } });
      const rows = Object.entries(a.carriers).sort((x, y) => y[1].counted - x[1].counted);
      dialog({ title: `Assiette provisoire — ${monthLabel(month)}`, body: `<p class="muted small" style="margin-top:0">Source : ${esc(a.source)}. Les factures définitives sont émises le 10 du mois suivant.</p>
        <table class="table"><thead><tr><th>Compagnie</th><th class="num">Passagers contrôlés</th><th class="num">dont enfants 0-2 ans</th><th class="num">Montant estimé</th></tr></thead><tbody>
        ${rows.map(([c, v]) => `<tr><td>${esc(c)}</td><td class="num">${fmtNum(v.counted)}</td><td class="num">${fmtNum(v.enfants)}</td><td class="num">${fmtNum((v.counted - v.enfants) * r.rateUSD)} USD</td></tr>`).join("") || `<tr><td colspan="4" class="empty">Aucun passage ce mois-ci</td></tr>`}</tbody></table>` });
    } catch (e) { toast(e.message, "critical"); }
  });
}

async function invoiceDialog(i, ctx, r) {
  const ex = Object.entries(i.exempt).map(([k, v]) => `<dt>${EXEMPT[k]}</dt><dd>${fmtNum(v)}</dd>`).join("");
  const { value, form } = await dialog({
    title: `Facture ${i.id} — ${i.carrierName}`, wide: true,
    body: `<div class="grid-2"><dl class="kv">
        <dt>Période</dt><dd>${monthLabel(i.month)}</dd><dt>Passagers comptés (WawID)</dt><dd>${fmtNum(i.counted)}</dd>${ex}
        <dt>Taxables (WawID)</dt><dd><b>${fmtNum(i.billable)}</b></dd><dt>Déclarés par la compagnie</dt><dd>${fmtNum(i.declared)} ${i.billable > i.declared ? `<span class="status critical">écart ${fmtNum(i.billable - i.declared)}</span>` : ""}</dd>
      </dl><dl class="kv">
        <dt>Taux</dt><dd>${i.rateUSD} USD × ${fmtNum(i.fx, 2)} FCFA</dd><dt>Montant</dt><dd><b>${xof(i.amountXOF)}</b></dd>
        <dt>Émise le</dt><dd>${fmtDate(i.issuedAt)}</dd><dt>Échéance</dt><dd>${fmtDate(i.dueAt)}</dd>
        <dt>Encaissé</dt><dd>${xof(i.st.paid)}</dd><dt>Reste dû</dt><dd>${xof(i.st.due)}</dd><dt>Pénalités</dt><dd>${xof(i.st.penalty)}</dd>
        <dt>Statut</dt><dd><span class="status ${STATUS[i.st.status]}">${i.st.status}</span></dd>
      </dl></div>
      ${i.payments.length ? `<h4 style="margin:14px 0 6px">Encaissements</h4>${i.payments.map((p) => `<div class="factor"><span>${fmtDate(p.at)} · ${esc(p.ref)} · ${esc(p.by)}</span><b>${xof(p.amount)}</b></div>`).join("")}` : ""}
      ${ctx.can("finance") && i.st.due ? `<h4 style="margin:14px 0 6px">Enregistrer un encaissement (quittance du Trésor)</h4><div class="form-grid"><label class="field"><span>Montant (FCFA)</span><input class="input" name="amount" type="number" min="1" value="${i.st.due + i.st.penalty}"></label><label class="field"><span>Référence de quittance</span><input class="input" name="ref"></label></div>` : ""}`,
    actions: ctx.can("finance") && i.st.due ? [{ label: "Fermer", value: null }, { label: "Enregistrer", cls: "btn-primary", value: "pay" }] : [{ label: "Fermer", value: null }],
  });
  if (value !== "pay") return;
  try {
    await api("/api/redevance/payments", { method: "POST", body: { invoiceId: i.id, amount: Number(form.amount.value), ref: form.ref.value } });
    await ctx.reload(); toast("Encaissement enregistré"); ctx.refresh();
  } catch (e) { toast(e.message, "critical"); }
}

// ---------- Rapprochement ----------
function rapprochement(body, ctx, invoices) {
  const rows = invoices.filter((i) => i.billable !== i.declared).map((i) => ({ ...i, gap: i.billable - i.declared, gapXOF: (i.billable - i.declared) * i.rateUSD * i.fx, pct: ((i.billable - i.declared) / i.billable) * 100 }));
  const total = rows.reduce((s, i) => s + i.gapXOF, 0);
  body.innerHTML = `<div class="msg info" style="margin-bottom:16px">${icon("shieldCheck")}<span>Dans le dispositif actuel, l'assiette repose sur les déclarations des compagnies. WawID compte chaque passager <b>contrôlé</b> (biométrie aux guichets et eGates, manifestes API/PNR) : tout écart révèle des passagers non déclarés, soit ici <b>${xof(total)}</b> d'assiette manquante sur 6 mois.</span></div>
  <section class="card" id="t"></section>`;
  mountTable(body.querySelector("#t"), {
    rows, sort: "gapXOF", empty: "Aucun écart : déclarations conformes au comptage WawID.",
    columns: [
      { key: "month", label: "Mois", render: (i) => monthLabel(i.month) },
      { key: "carrierName", label: "Compagnie" },
      { key: "billable", label: "Comptés WawID (taxables)", num: true, render: (i) => fmtNum(i.billable) },
      { key: "declared", label: "Déclarés", num: true, render: (i) => fmtNum(i.declared) },
      { key: "gap", label: "Écart", num: true, render: (i) => `<span class="status ${i.pct > 3 ? "critical" : "warning"}">${fmtNum(i.gap)} · ${fmtNum(i.pct, 1)} %</span>` },
      { key: "gapXOF", label: "Montant non facturé", num: true, render: (i) => xof(i.gapXOF) },
    ],
  });
}

// ---------- Répartition ----------
function repartition(body, ctx, invoices, r) {
  const months = [...new Set(invoices.map((i) => i.month))].sort();
  const rows = months.map((m) => { const c = invoices.filter((i) => i.month === m).reduce((s, i) => s + i.st.paid, 0); return { month: m, collected: c, operator: c * r.operatorShare, state: c * (1 - r.operatorShare) }; });
  const tot = rows.reduce((a, x) => ({ collected: a.collected + x.collected, operator: a.operator + x.operator, state: a.state + x.state }), { collected: 0, operator: 0, state: 0 });
  body.innerHTML = `<div class="kpis">
    ${kpi("Encaissé (6 mois)", mds(tot.collected), "FCFA")}
    ${kpi(`Part opérateur (${Math.round(r.operatorShare * 100)} %)`, mds(tot.operator), "versée mensuellement")}
    ${kpi(`Part État (${Math.round((1 - r.operatorShare) * 100)} %)`, mds(tot.state), "Trésor public")}
  </div>
  <section class="card"><div class="card-head"><h3>Répartition mensuelle des encaissements</h3>${ctx.can("system") ? `<button class="btn btn-sm" id="share" style="margin-left:auto">${icon("settings")} Paramètres</button>` : ""}</div><div class="table-wrap"><table class="table">
    <thead><tr><th>Mois</th><th class="num">Encaissé</th><th class="num">Part opérateur</th><th class="num">Part État</th></tr></thead>
    <tbody>${rows.map((x) => `<tr><td>${monthLabel(x.month)}</td><td class="num">${xof(x.collected)}</td><td class="num">${xof(x.operator)}</td><td class="num">${xof(x.state)}</td></tr>`).join("")}</tbody></table></div>
    <div class="card-body small muted">Clé actuelle issue de la décision du ministre de l'Économie et des Finances du 4 décembre 2012 (75 % à l'opérateur). Elle est paramétrable pour refléter un nouveau contrat.</div></section>`;
  body.querySelector("#share")?.addEventListener("click", async () => {
    const { value, form } = await dialog({ title: "Paramètres de la redevance", body: `<div class="form-grid">
      <label class="field"><span>Taux (USD par passager)</span><input class="input" type="number" name="rateUSD" value="${r.rateUSD}"></label>
      <label class="field"><span>Part opérateur (%)</span><input class="input" type="number" name="share" min="0" max="100" value="${Math.round(r.operatorShare * 100)}"></label>
      <label class="field"><span>Pénalité mensuelle (%)</span><input class="input" type="number" name="pen" value="${Math.round(r.penaltyRate * 100)}"></label>
      <label class="field"><span>Taux IATA du mois (FCFA / USD)</span><input class="input" type="number" step="0.01" name="fx" placeholder="ex. 605,40"></label></div>`,
      actions: [{ label: "Annuler", value: null }, { label: "Enregistrer", cls: "btn-primary", value: "ok" }] });
    if (!value) return;
    try {
      await api("/api/redevance/settings", { method: "PATCH", body: { rateUSD: Number(form.rateUSD.value), operatorShare: Number(form.share.value) / 100, penaltyRate: Number(form.pen.value) / 100, fx: Number(form.fx.value), fxMonth: new Date().toISOString().slice(0, 7) } });
      await ctx.reload(); toast("Paramètres enregistrés"); ctx.refresh();
    } catch (e) { toast(e.message, "critical"); }
  });
}

// ---------- Simulateur ----------
function simulateur(body, ctx, invoices, r) {
  const annualPax = Math.round(invoices.reduce((s, i) => s + i.billable, 0) * 2);
  body.innerHTML = `<div class="grid-main">
    <section class="card card-pad stack">
      <div class="msg warning">${icon("alert")}<span>Simulation sur hypothèses : les volumes de démonstration sont fictifs. Saisissez le trafic réel (statistiques AIBD / ANACIM) pour une étude chiffrée.</span></div>
      <div class="form-grid">
        <label class="field"><span>Passagers taxables par an</span><input class="input" type="number" id="pax" value="${annualPax}"></label>
        <label class="field"><span>Taux (USD)</span><input class="input" type="number" id="rate" value="${r.rateUSD}"></label>
        <label class="field"><span>FCFA pour 1 USD</span><input class="input" type="number" id="fx" value="600"></label>
        <label class="field"><span>Croissance annuelle du trafic (%)</span><input class="input" type="number" id="g" value="5"></label>
        <label class="field"><span>Durée (années)</span><input class="input" type="number" id="years" value="5"></label>
        <label class="field"><span>Part opérateur actuelle (%)</span><input class="input" type="number" id="cur" value="${Math.round(r.operatorShare * 100)}"></label>
        <label class="field"><span>Gain d'assiette par le comptage WawID (%)</span><input class="input" type="number" id="gain" value="3"></label>
        <label class="field"><span>Modèle WawID</span><select class="select" id="model"><option value="share">Part des recettes</option><option value="fee">Forfait annuel (marché de services)</option></select></label>
        <label class="field"><span>Part WawID (%) ou forfait (M FCFA/an)</span><input class="input" type="number" id="wv" value="35"></label>
      </div>
    </section>
    <section class="card"><div class="card-head"><h3>Résultat pour l'État</h3></div><div class="card-body" id="out"></div></section>
  </div>`;
  const calc = () => {
    const v = (id) => Number(body.querySelector(`#${id}`).value) || 0;
    let cur = 0, wawid = 0, gross = 0;
    for (let y = 0; y < v("years"); y++) {
      const pax = v("pax") * (1 + v("g") / 100) ** y;
      const base = pax * v("rate") * v("fx");
      const baseW = base * (1 + v("gain") / 100);
      gross += baseW;
      cur += base * (1 - v("cur") / 100);
      wawid += body.querySelector("#model").value === "share" ? baseW * (1 - v("wv") / 100) : baseW - v("wv") * 1e6;
    }
    body.querySelector("#out").innerHTML = `<dl class="kv">
      <dt>Recettes brutes (${v("years")} ans)</dt><dd>${mds(gross)} FCFA</dd>
      <dt>Part État — contrat actuel</dt><dd>${mds(cur)} FCFA</dd>
      <dt>Part État — modèle WawID</dt><dd><b>${mds(wawid)} FCFA</b></dd>
      <dt>Gain pour l'État</dt><dd><span class="status ${wawid >= cur ? "good" : "critical"}">${wawid >= cur ? "+" : ""}${mds(wawid - cur)} FCFA</span></dd></dl>
      <p class="small muted">Le modèle WawID inclut l'hébergement souverain, le transfert de compétences et la propriété des données par l'État ; le gain d'assiette provient du comptage indépendant des passagers.</p>`;
  };
  body.querySelectorAll("input,select").forEach((i) => (i.oninput = i.onchange = calc));
  calc();
}

const kpi = (label, value, sub, tone = "") => `<div class="card kpi"><div class="kpi-label">${esc(label)}</div><div class="kpi-value ${tone ? `tile-kpi ${tone}` : ""}" style="font-size:26px">${value}</div><div class="kpi-delta">${esc(sub)}</div></div>`;
