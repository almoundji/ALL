// Supervision eGates, kiosques ABC et corridors biométriques : état, flux temps réel, paramètres à distance.
import { ago, api, dialog, esc, fmtNum, fmtTime, icon, status, toast } from "../../shared/ui.js";
import { bindTooltips, hbars, pageHead } from "./common.js";

export function render(el, ctx, _rest, query) {
  const d = ctx.data;
  const poste = query.poste || "";
  const gates = d.gates.filter((g) => !poste || g.posteId === poste);
  const tx = d.crossings.filter((c) => c.channel === "EGATE" && Date.now() - Date.parse(c.ts) < 86400000 && (!poste || c.posteId === poste));
  const rejected = tx.filter((c) => c.decision !== "AUTORISE");
  const reasons = Object.entries(rejected.reduce((m, c) => { const r = (c.reason || "Contrôle complémentaire").replace(/^eGate : /, ""); m[r] = (m[r] || 0) + 1; return m; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
  const canManage = ctx.can("gates");

  el.innerHTML = `${pageHead({ title: "eGates & ABC", sub: "Passage automatisé : portes biométriques, kiosques ABC et corridor sans contact. Pilotage à distance et orientation vers les guichets.", crumbs: [[null, "Contrôle frontière"]],
    actions: `<select class="select" id="poste" style="width:auto"><option value="">Tous les postes</option>${d.postes.filter((p) => d.gates.some((g) => g.posteId === p.id)).map((p) => `<option value="${p.id}" ${p.id === poste ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select><a class="btn btn-primary" href="../gate/" target="_blank">${icon("play")} Ouvrir le kiosque</a>` })}
  <div class="kpis">
    ${kpi("En service", `${gates.filter((g) => g.status === "EN_SERVICE").length} / ${gates.length}`, "équipements opérationnels")}
    ${kpi("Alarmes", gates.filter((g) => g.status === "ALARME").length, "intervention requise", gates.some((g) => g.status === "ALARME") ? "critical" : "")}
    ${kpi("Transactions 24 h", fmtNum(tx.length), `${fmtNum(tx.filter((c) => c.decision === "AUTORISE").length)} ouvertures`)}
    ${kpi("Taux d'orientation guichet", `${fmtNum(tx.length ? (rejected.length / tx.length) * 100 : 0, 1)} %`, "rejets et contrôles complémentaires", "warning")}
    ${kpi("Durée moyenne", `${tx.length ? Math.round(tx.reduce((s, c) => s + c.durationSec, 0) / tx.length) : 0} s`, "par passage automatisé")}
  </div>
  <div class="grid-main">
    <div class="gate-grid">${gates.map((g) => gateCard(g, ctx, canManage)).join("")}</div>
    <div class="stack">
      <section class="card"><div class="card-head"><h3>Flux en direct</h3><span class="status good" style="margin-left:auto">Actualisation 30 s</span></div>
        <div>${tx.slice(0, 12).map((c) => `<a class="feed-item" href="#/passages/${c.id}" style="text-decoration:none;color:inherit"><span class="small muted">${fmtTime(c.ts)}</span><span><b>${esc(c.traveler.surname)} ${esc(c.traveler.given[0] || "")}.</b><br><span class="small muted">${esc(c.gateId)}</span></span>${c.decision === "AUTORISE" ? '<span class="status good">Ouverture</span>' : '<span class="status warning">Guichet</span>'}</a>`).join("") || `<div class="empty">Aucune transaction</div>`}</div></section>
      <section class="card"><div class="card-head"><h3>Motifs d'orientation (24 h)</h3></div><div class="card-body">${reasons.length ? hbars(reasons, "var(--series-2)") : `<div class="empty">Aucun rejet</div>`}</div></section>
    </div>
  </div>`;
  bindTooltips(el);
  el.querySelector("#poste").onchange = (e) => (location.hash = `#/egates${e.target.value ? `?poste=${e.target.value}` : ""}`);
  el.querySelectorAll("[data-cmd]").forEach((b) => (b.onclick = () => command(el, ctx, b.dataset.id, b.dataset.cmd, query)));
  document.addEventListener("wawid:data", () => { if (location.hash.startsWith("#/egates")) render(el, ctx, _rest, query); }, { once: true });
}

function gateCard(g, ctx, canManage) {
  const bars = [g.stats?.today || 0, g.stats?.rejected || 0];
  const devices = Object.entries(g.devices || {});
  return `<article class="card gate-card ${g.status === "ALARME" ? "alarm" : ""}">
    <header><span class="tile-icon">${icon(g.type === "Kiosque ABC" ? "scan" : g.type === "Corridor biométrique" ? "camera" : "gate")}</span><div class="grow"><b>${esc(g.name)}</b><div class="small muted">${esc(g.id)} · ${esc(g.zone)}</div></div>${status("gate", g.status)}</header>
    <div class="row small"><span class="status ${g.mode === "AUTO" ? "info" : ""}">Mode ${g.mode === "AUTO" ? "automatique" : g.mode === "MANUEL" ? "assisté" : "fermé"}</span><span class="muted">${esc(g.type)} · fw ${esc(g.firmware)}</span></div>
    <div class="row" style="justify-content:space-between"><div><div class="kpi-value" style="font-size:24px">${fmtNum(bars[0])}</div><div class="small muted">passages aujourd'hui</div></div><div style="text-align:right"><div class="kpi-value" style="font-size:24px">${fmtNum(bars[1])}</div><div class="small muted">orientés guichet</div></div></div>
    <div class="row small">${devices.map(([k, v]) => `<span class="status ${v === "OK" ? "good" : "critical"}">${esc({ lecteurDoc: "Lecteur", camera: "Caméra", empreintes: "Empreintes", portes: "Portes" }[k] || k)}</span>`).join("")}</div>
    <div class="small muted">Seuil facial ${Math.round(g.config.faceThreshold * 100)} % · âge min. ${g.config.minAge} · éligibilité ${esc(g.config.eligibility)} · heartbeat ${ago(g.lastHeartbeat)}</div>
    ${canManage ? `<div class="row">
      <button class="btn btn-sm" data-cmd="config" data-id="${g.id}">${icon("settings")} Paramètres</button>
      ${g.status === "EN_SERVICE" ? `<button class="btn btn-sm" data-cmd="${g.mode === "AUTO" ? "close" : "auto"}" data-id="${g.id}">${g.mode === "AUTO" ? "Fermer" : "Ouvrir"}</button>` : `<button class="btn btn-sm btn-good" data-cmd="service" data-id="${g.id}">Remettre en service</button>`}
      <button class="btn btn-sm btn-ghost" data-cmd="restart" data-id="${g.id}" title="Redémarrer à distance">${icon("power")}</button>
      ${g.status === "EN_SERVICE" ? `<button class="btn btn-sm btn-ghost" data-cmd="maintenance" data-id="${g.id}" title="Passer en maintenance">${icon("lock")}</button>` : ""}
      <a class="btn btn-sm btn-ghost" href="../gate/?gate=${g.id}" target="_blank" title="Ouvrir ce kiosque">${icon("play")}</a></div>` : ""}
  </article>`;
}

async function command(el, ctx, id, cmd, query) {
  const g = ctx.data.gates.find((x) => x.id === id);
  let body;
  if (cmd === "auto") body = { mode: "AUTO" };
  else if (cmd === "close") body = { mode: "FERME" };
  else if (cmd === "service") body = { status: "EN_SERVICE", mode: "AUTO" };
  else if (cmd === "maintenance") body = { status: "MAINTENANCE", mode: "FERME" };
  else if (cmd === "restart") body = { command: "restart" };
  else if (cmd === "config") {
    const c = g.config;
    const { value, form } = await dialog({
      title: `Paramètres — ${g.name}`,
      body: `<div class="form-grid">
        <label class="field"><span>Seuil de correspondance faciale (%)</span><input class="input" type="number" name="faceThreshold" min="50" max="99" value="${Math.round(c.faceThreshold * 100)}"></label>
        <label class="field"><span>Score de risque maximal accepté</span><input class="input" type="number" name="maxRisk" min="0" max="100" value="${c.maxRisk}"></label>
        <label class="field"><span>Âge minimal</span><input class="input" type="number" name="minAge" min="0" max="21" value="${c.minAge}"></label>
        <label class="field"><span>Éligibilité</span><select class="select" name="eligibility">${[["TOUS", "Toutes nationalités"], ["CEDEAO", "Ressortissants CEDEAO"], ["LISTE", "Liste personnalisée"]].map(([v, l]) => `<option value="${v}" ${v === c.eligibility ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label class="field" style="grid-column:1/-1"><span>Nationalités éligibles (si liste, codes ISO séparés par des virgules)</span><input class="input" name="eligibleNats" value="${esc(c.eligibleNats)}" placeholder="SEN, FRA, MLI"></label>
        <label class="check"><input type="checkbox" name="livenessRequired" ${c.livenessRequired ? "checked" : ""}> Détection du vivant obligatoire</label>
        <label class="check"><input type="checkbox" name="requireVisaCheck" ${c.requireVisaCheck ? "checked" : ""}> Vérifier l'autorisation de voyage</label>
      </div>`,
      actions: [{ label: "Annuler", value: null }, { label: "Appliquer à distance", cls: "btn-primary", value: "ok" }],
    });
    if (!value) return;
    const f = new FormData(form);
    body = { config: { faceThreshold: Number(f.get("faceThreshold")) / 100, maxRisk: Number(f.get("maxRisk")), minAge: Number(f.get("minAge")), eligibility: f.get("eligibility"), eligibleNats: f.get("eligibleNats"), livenessRequired: f.has("livenessRequired"), requireVisaCheck: f.has("requireVisaCheck") } };
  }
  try {
    await api(`/api/gates/${id}`, { method: "PATCH", body });
    await ctx.reload();
    toast(`Commande envoyée à ${g.name}`);
    render(el, ctx, [], query);
  } catch (e) { toast(e.message, "critical"); }
}

const kpi = (label, value, sub, tone = "") => `<div class="card kpi"><div class="kpi-label">${esc(label)}</div><div class="kpi-value ${tone && value && value !== "0,0 %" ? `tile-kpi ${tone}` : ""}" style="font-size:30px">${value}</div><div class="kpi-delta">${esc(sub)}</div></div>`;
