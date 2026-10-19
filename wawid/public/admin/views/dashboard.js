// Tableau de bord intégré : entrées / sorties, canaux, fraude, décisions, postes.
import { country, downloadCSV, esc, fmtDateTime, fmtNum, icon, riskBadge, status } from "../../shared/ui.js";
import { barChart, bindTooltips, hbars, legend, lineChart, pageHead, shareBar } from "./common.js";

const PERIODS = { "24h": [1, "24 heures"], "7j": [7, "7 jours"], "14j": [14, "14 jours"] };
const FRAUD_TYPES = { SLTD: "Document perdu / volé (SLTD)", DOC_REUTILISE: "Document réutilisé (autre identité)", PUCE_PA: "Puce invalide (authentification passive)", PUCE_MRZ: "Puce ≠ MRZ imprimée", ATTAQUE: "Attaque de présentation / deepfake", WATCHLIST: "Personne recherchée / POI", FACE: "Non-correspondance faciale", LIVENESS: "Usurpation (détection du vivant)", MRZ: "Document falsifié (MRZ)", EXPIRE: "Document expiré", VISA: "Sans autorisation de voyage" };

export function render(el, ctx, _rest, query) {
  const period = PERIODS[query.p] ? query.p : "7j";
  const poste = query.poste || "";
  const channel = query.canal || "";
  const d = ctx.data;
  const [days] = PERIODS[period];
  // Fenêtre alignée sur les graphiques : 24 heures pleines, ou N jours calendaires (UTC) dont aujourd'hui.
  const now = new Date();
  const since = days === 1 ? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() - 23) : Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1));
  const span = Date.now() - since;
  const rows = d.crossings.filter((c) => Date.parse(c.ts) >= since && (!poste || c.posteId === poste) && (!channel || c.channel === channel));
  const prevRows = d.crossings.filter((c) => { const t = Date.parse(c.ts); return t < since && t >= since - span && (!poste || c.posteId === poste) && (!channel || c.channel === channel); });

  const entries = rows.filter((c) => c.direction === "ENTREE").length;
  const exits = rows.length - entries;
  const fraud = rows.filter((c) => c.risk.fraud);
  const refused = rows.filter((c) => c.decision === "REFUSE").length;
  const egate = rows.filter((c) => c.channel === "EGATE");
  const avg = (list) => (list.length ? Math.round(list.reduce((s, c) => s + c.durationSec, 0) / list.length) : 0);
  const delta = (cur, prev) => (prev && cur === prev ? "= stable vs période précédente" : prev ? `${cur > prev ? "▲" : "▼"} ${fmtNum(Math.abs(((cur - prev) / prev) * 100), 0)} % vs période précédente` : "—");
  const openAlerts = d.alerts.filter((a) => a.status !== "CLOTUREE" && (!poste || a.posteId === poste));

  // Série temporelle : par heure (24 h) ou par jour.
  const buckets = [];
  if (days === 1) for (let h = 23; h >= 0; h--) { const t = new Date(Date.now() - h * 3600000); buckets.push({ key: t.toISOString().slice(0, 13), label: `${String(t.getHours()).padStart(2, "0")}h` }); }
  else for (let k = days - 1; k >= 0; k--) { const t = new Date(Date.now() - k * 86400000); buckets.push({ key: t.toISOString().slice(0, 10), label: t.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) }); }
  const keyOf = (c) => (days === 1 ? new Date(c.ts).toISOString().slice(0, 13) : c.ts.slice(0, 10));
  const count = (pred) => buckets.map((b) => rows.filter((c) => keyOf(c) === b.key && pred(c)).length);
  const flow = [
    { name: "Entrées", color: "var(--series-1)", values: count((c) => c.direction === "ENTREE") },
    { name: "Sorties", color: "var(--series-2)", values: count((c) => c.direction === "SORTIE") },
  ];
  const fraudSeries = [{ name: "Suspicions de fraude", color: "var(--critical)", values: count((c) => c.risk.fraud) }];

  const fraudByType = Object.entries(FRAUD_TYPES).map(([code, label]) => ({ label, value: rows.filter((c) => c.risk.factors.some((f) => f.code === code)).length })).filter((x) => x.value).sort((a, b) => b.value - a.value);
  const nats = Object.entries(rows.reduce((m, c) => ((m[c.traveler.nat] = (m[c.traveler.nat] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ label: country(k), value: v }));
  const perPoste = d.postes.map((p) => {
    const r = rows.filter((c) => c.posteId === p.id);
    return { p, total: r.length, in: r.filter((c) => c.direction === "ENTREE").length, out: r.filter((c) => c.direction === "SORTIE").length, egate: r.filter((c) => c.channel === "EGATE").length, fraud: r.filter((c) => c.risk.fraud).length, refused: r.filter((c) => c.decision === "REFUSE").length, avg: avg(r) };
  }).filter((x) => x.total);

  const sel = (name, value, opts) => `<select class="select" data-f="${name}">${opts.map(([v, l]) => `<option value="${v}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  el.innerHTML = `
  ${pageHead({ title: "Tableau de bord", sub: "Flux d'entrées et de sorties, canaux de passage et indicateurs de fraude, consolidés sur tous les postes.", crumbs: [[null, "Contrôle frontière"]],
    actions: `<button class="btn" id="export">${icon("download")} Exporter</button><button class="btn" onclick="print()">${icon("printer")} Imprimer</button>` })}
  <div class="card filterbar no-print">
    <label class="field"><span>Période</span>${sel("p", period, Object.entries(PERIODS).map(([k, [, l]]) => [k, l]))}</label>
    <label class="field"><span>Poste</span>${sel("poste", poste, [["", "Tous les postes"], ...d.postes.map((p) => [p.id, p.name])])}</label>
    <label class="field"><span>Canal</span>${sel("canal", channel, [["", "Tous"], ["GUICHET", "Guichet"], ["EGATE", "eGate / ABC"]])}</label>
  </div>

  <div class="kpis">
    ${kpi("Passages", fmtNum(rows.length), delta(rows.length, prevRows.length), "users")}
    ${kpi("Entrées", fmtNum(entries), `${fmtNum(rows.length ? (entries / rows.length) * 100 : 0, 0)} % des flux`, "arrowRight")}
    ${kpi("Sorties", fmtNum(exits), `Solde net ${entries - exits >= 0 ? "+" : ""}${fmtNum(entries - exits)}`, "arrowLeft")}
    ${kpi("Part eGate / ABC", `${fmtNum(rows.length ? (egate.length / rows.length) * 100 : 0, 0)} %`, `${fmtNum(egate.length)} passages automatisés`, "gate")}
    ${kpi("Suspicions de fraude", fmtNum(fraud.length), delta(fraud.length, prevRows.filter((c) => c.risk.fraud).length), "shieldAlert", fraud.length ? "critical" : "")}
    ${kpi("Refus d'entrée / sortie", fmtNum(refused), `${fmtNum(openAlerts.length)} alertes ouvertes`, "xCircle", refused ? "warning" : "")}
    ${kpi("Durée moyenne", `${avg(rows)} s`, `guichet ${avg(rows.filter((c) => c.channel === "GUICHET"))} s · eGate ${avg(egate)} s`, "clock")}
  </div>

  <div class="grid-main">
    <section class="card">
      <div class="card-head"><h3>Entrées et sorties ${days === 1 ? "par heure" : "par jour"}</h3><div class="seg view-switch" data-switch="flow"><button aria-pressed="true" data-v="chart">Graphique</button><button aria-pressed="false" data-v="table">Tableau</button></div></div>
      <div class="card-body" data-pane="flow-chart">${legend(flow)}${barChart({ labels: buckets.map((b) => b.label), series: flow })}</div>
      <div class="card-body table-wrap" data-pane="flow-table" hidden><table class="table"><thead><tr><th>${days === 1 ? "Heure" : "Jour"}</th><th class="num">Entrées</th><th class="num">Sorties</th><th class="num">Fraude</th></tr></thead><tbody>${buckets.map((b, i) => `<tr><td>${b.label}</td><td class="num">${flow[0].values[i]}</td><td class="num">${flow[1].values[i]}</td><td class="num">${fraudSeries[0].values[i]}</td></tr>`).join("")}</tbody></table></div>
    </section>
    <section class="card">
      <div class="card-head"><h3>Décisions</h3></div>
      <div class="card-body">${shareBar([
        { label: "Autorisé", value: rows.filter((c) => c.decision === "AUTORISE").length, color: "var(--good)" },
        { label: "Contrôle secondaire", value: rows.filter((c) => c.decision === "SECONDAIRE").length, color: "var(--warning)" },
        { label: "Refusé", value: refused, color: "var(--critical)" },
      ])}
      <h3 style="font-size:15px;margin:22px 0 10px">Canal de passage</h3>
      ${shareBar([
        { label: "Guichet", value: rows.length - egate.length, color: "var(--series-1)" },
        { label: "eGate / ABC", value: egate.length, color: "var(--series-3)" },
      ])}</div>
    </section>
  </div>

  <div class="grid-main" style="margin-top:16px">
    <section class="card">
      <div class="card-head"><h3>Suspicions de fraude ${days === 1 ? "par heure" : "par jour"}</h3><span class="status critical" style="margin-left:auto">${fmtNum(fraud.length)} sur la période</span></div>
      <div class="card-body">${lineChart({ labels: buckets.map((b) => b.label), series: fraudSeries, height: 180 })}</div>
    </section>
    <section class="card">
      <div class="card-head"><h3>Fraude et signalements par type</h3></div>
      <div class="card-body">${fraudByType.length ? hbars(fraudByType, "var(--critical)") : `<div class="empty">Aucun signalement</div>`}</div>
    </section>
  </div>

  <div class="grid-main" style="margin-top:16px">
    <section class="card">
      <div class="card-head"><h3>Par poste frontière</h3></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Poste</th><th class="num">Entrées</th><th class="num">Sorties</th><th class="num">eGate</th><th class="num">Fraude</th><th class="num">Refus</th><th class="num">Durée moy.</th></tr></thead>
      <tbody>${perPoste.map((x) => `<tr class="clickable" data-poste="${x.p.id}"><td><div class="cell-title">${esc(x.p.name)}</div><div class="cell-sub">${esc(x.p.type)} · ${esc(x.p.region)}</div></td><td class="num">${fmtNum(x.in)}</td><td class="num">${fmtNum(x.out)}</td><td class="num">${fmtNum(x.egate)}</td><td class="num">${x.fraud ? `<span class="status critical">${x.fraud}</span>` : 0}</td><td class="num">${fmtNum(x.refused)}</td><td class="num">${x.avg} s</td></tr>`).join("")}</tbody></table></div>
    </section>
    <section class="card">
      <div class="card-head"><h3>Principales nationalités</h3></div>
      <div class="card-body">${hbars(nats)}</div>
    </section>
  </div>

  <section class="card" style="margin-top:16px">
    <div class="card-head"><h3>Dernières suspicions de fraude</h3><a class="btn btn-sm btn-ghost" style="margin-left:auto" href="#/passages?fraude=1&periode=${days}">Tout voir</a></div>
    <div class="table-wrap"><table class="table"><tbody>${fraud.slice(0, 8).map((c) => `<tr class="clickable" data-id="${c.id}"><td class="nowrap">${fmtDateTime(c.ts)}</td><td><div class="cell-title">${esc(c.traveler.surname)} ${esc(c.traveler.given)}</div><div class="cell-sub">${esc(country(c.traveler.nat))} · ${esc(c.traveler.docNo)}</div></td><td>${esc(c.risk.factors.filter((f) => f.points >= 25).map((f) => f.label).join(" · "))}</td><td>${esc(ctx.poste(c.posteId))}<div class="cell-sub">${c.channel === "EGATE" ? "eGate" : "Guichet"}</div></td><td>${riskBadge(c.risk.score, c.risk.level)}</td><td>${status("decision", c.decision)}</td></tr>`).join("") || `<tr><td class="empty">Aucune suspicion sur la période</td></tr>`}</tbody></table></div>
  </section>`;

  bindTooltips(el);
  el.querySelectorAll("[data-f]").forEach((s) => (s.onchange = () => {
    const q = new URLSearchParams({ p: period, poste, canal: channel });
    q.set(s.dataset.f, s.value);
    location.hash = `#/dashboard?${q}`;
  }));
  el.querySelectorAll("[data-switch]").forEach((sw) => sw.querySelectorAll("button").forEach((b) => (b.onclick = () => {
    sw.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    el.querySelector(`[data-pane="${sw.dataset.switch}-chart"]`).hidden = b.dataset.v !== "chart";
    el.querySelector(`[data-pane="${sw.dataset.switch}-table"]`).hidden = b.dataset.v !== "table";
    sessionStorage.setItem("wawid:flowView", b.dataset.v);
  })));
  el.querySelectorAll("[data-poste]").forEach((tr) => (tr.onclick = () => (location.hash = `#/dashboard?p=${period}&poste=${tr.dataset.poste}&canal=${channel}`)));
  el.querySelectorAll("tr[data-id]").forEach((tr) => (tr.onclick = () => (location.hash = `#/passages/${tr.dataset.id}`)));
  el.querySelector("#export").onclick = () => downloadCSV(`wawid-tableau-de-bord-${period}.csv`, perPoste.map((x) => ({
    Poste: x.p.name, Entrées: x.in, Sorties: x.out, "eGate/ABC": x.egate, "Suspicions de fraude": x.fraud, Refus: x.refused, "Durée moyenne (s)": x.avg,
  })));
  // Un seul abonnement au rafraîchissement ; la vue Graphique / Tableau choisie est conservée.
  document.removeEventListener("wawid:data", onData);
  onData = () => { if (location.hash.startsWith("#/dashboard")) render(el, ctx, _rest, query); };
  document.addEventListener("wawid:data", onData, { once: true });
  if (sessionStorage.getItem("wawid:flowView") === "table") el.querySelector('[data-switch="flow"] [data-v="table"]').click();
}

let onData = null;
const kpi = (label, value, sub, ic, tone = "") => `<div class="card kpi"><div class="kpi-label">${icon(ic)} ${esc(label)}</div><div class="kpi-value ${tone ? `tile-kpi ${tone}` : ""}" style="${tone ? "font-size:30px" : ""}">${value}</div><div class="kpi-delta">${esc(sub)}</div></div>`;
