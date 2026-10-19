// Threat Monitor (alertes) en mise en page maître-détail, et gestion des dossiers de contrôle secondaire.
import { ago, api, dialog, esc, fmtDateTime, icon, status, toast } from "../../shared/ui.js";
import { mountTable, pageHead } from "./common.js";

const TYPES = { SLTD: "Document perdu / volé", WATCHLIST: "Liste de surveillance", FRAUDE_BIO: "Fraude biométrique", FRAUDE_DOC: "Fraude documentaire", DOCUMENT: "Document expiré", REGLE: "Règle de ciblage", VISA: "Sans autorisation", APIS: "APIS / PNR", RISQUE: "Risque élevé" };
const RESOLUTIONS = ["Fausse alerte — homonyme", "Levée de doute — documents complémentaires", "Remis à la police aux frontières", "Refus d'entrée notifié", "Signalement transmis à Interpol (BCN)", "Document saisi"];

export function render(el, ctx, _rest, query) {
  const tab = query.tab || "ouvertes";
  const sel = query.id;
  const d = ctx.data;
  const counts = { ouvertes: d.alerts.filter((a) => a.status !== "CLOTUREE").length, NOUVELLE: d.alerts.filter((a) => a.status === "NOUVELLE").length, EN_COURS: d.alerts.filter((a) => a.status === "EN_COURS").length, CLOTUREE: d.alerts.filter((a) => a.status === "CLOTUREE").length };
  const list = d.alerts.filter((a) => (tab === "ouvertes" ? a.status !== "CLOTUREE" : tab === "toutes" ? true : a.status === tab) && (!query.type || a.type === query.type));
  const current = d.alerts.find((a) => a.id === sel) || null;
  const link = (p) => `#/alertes?${new URLSearchParams({ tab, ...(query.type ? { type: query.type } : {}), ...p })}`;
  el.innerHTML = `${pageHead({ title: "Threat Monitor", sub: "Vue unique de toutes les correspondances : passages, eGates, APIS et e-Visa. Prise en charge, investigation et résolution.", crumbs: [[null, "Renseignement"]] })}
  <nav class="space-tabs">${[["ouvertes", "Ouvertes"], ["NOUVELLE", "Nouvelles"], ["EN_COURS", "En cours"], ["CLOTUREE", "Clôturées"], ["toutes", "Toutes"]].map(([k, l]) => `<button aria-selected="${tab === k}" data-tab="${k}">${l}${counts[k] !== undefined ? ` (${counts[k]})` : ""}</button>`).join("")}
    <select class="select" id="type" style="width:auto;margin-left:auto"><option value="">Tous les types</option>${Object.entries(TYPES).map(([k, l]) => `<option value="${k}" ${k === query.type ? "selected" : ""}>${l}</option>`).join("")}</select></nav>
  <div class="grid-main" style="grid-template-columns:${current ? "minmax(0,1fr) minmax(0,1.2fr)" : "1fr"}">
    <section class="card"><div id="list"></div></section>
    ${current ? `<section class="card" id="detail">${detail(current, ctx)}</section>` : ""}
  </div>`;
  el.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => (location.hash = `#/alertes?${new URLSearchParams({ tab: b.dataset.tab, ...(query.type ? { type: query.type } : {}) })}`)));
  el.querySelector("#type").onchange = (e) => (location.hash = `#/alertes?${new URLSearchParams({ tab, ...(e.target.value ? { type: e.target.value } : {}) })}`);
  mountTable(el.querySelector("#list"), {
    rows: list, onRow: (a) => (location.hash = link({ id: a.id })), sort: "ts", empty: "Aucune alerte",
    columns: [
      { key: "severity", label: "Gravité", value: (a) => ({ critique: 3, haute: 2, moyenne: 1 })[a.severity], render: (a) => status("severity", a.severity) },
      { key: "title", label: "Alerte", render: (a) => `<div class="cell-title">${esc(a.title)}</div><div class="cell-sub">${esc(a.traveler)} · ${esc(ctx.poste(a.posteId))}</div>` },
      { key: "ts", label: "Reçue", render: (a) => `<span class="nowrap small">${ago(a.ts)}</span>` },
      { key: "status", label: "Statut", render: (a) => status("alert", a.status) + (a.assignee ? `<div class="cell-sub">${esc(a.assignee)}</div>` : "") },
    ],
  });
  if (current) bindDetail(el, ctx, current, () => render(el, ctx, _rest, query));
}

function detail(a, ctx) {
  const c = ctx.data.crossings.find((x) => x.id === a.crossingId);
  const f = a.flightId ? ctx.data.flights.find((x) => x.id === a.flightId) : null;
  return `<div class="card-head"><div class="grow"><h3>${esc(a.title)}</h3><div class="small muted">${esc(a.id)} · ${esc(TYPES[a.type] || a.type)} · ${fmtDateTime(a.ts)}</div></div>${status("severity", a.severity)}</div>
  <div class="card-body stack">
    <dl class="kv"><dt>Voyageur</dt><dd><b>${esc(a.traveler)}</b></dd><dt>Document</dt><dd class="mono">${esc(a.docNo || "—")}</dd><dt>Poste</dt><dd>${esc(ctx.poste(a.posteId))}</dd><dt>Statut</dt><dd>${status("alert", a.status)} ${a.assignee ? `· ${esc(a.assignee)}` : ""}</dd>${a.resolution ? `<dt>Résolution</dt><dd>${esc(a.resolution)}</dd>` : ""}
      ${c ? `<dt>Passage</dt><dd><a href="#/passages/${c.id}">${esc(c.id)}</a> — score ${c.risk.score}</dd>` : ""}${f ? `<dt>Vol</dt><dd><a href="#/apis?id=${f.id}">${esc(f.flight)} ${esc(f.route)}</a></dd>` : ""}</dl>
    ${c ? `<div><span class="label">Facteurs</span>${c.risk.factors.map((x) => `<div class="factor"><span>${esc(x.label)}<br><span class="small muted">${esc(x.detail)}</span></span><b>+${x.points}</b></div>`).join("")}</div>` : ""}
    <div class="row">
      ${a.status === "NOUVELLE" ? `<button class="btn btn-primary" data-act="assign">${icon("user")} Prendre en charge</button>` : ""}
      ${a.status !== "CLOTUREE" ? `<button class="btn btn-good" data-act="close">${icon("check")} Clôturer</button>` : `<button class="btn" data-act="reopen">Rouvrir</button>`}
      <button class="btn" data-act="note">${icon("file")} Note</button>
      ${ctx.can("cases") ? `<button class="btn" data-act="case">${icon("briefcase")} Ouvrir un dossier</button>` : ""}
    </div>
    <div><span class="label">Historique</span><div class="timeline" style="margin-top:8px">${[...a.history].reverse().map((h) => `<div><b>${fmtDateTime(h.at)}</b> · ${esc(h.by)}<br>${esc(h.text)}</div>`).join("")}</div></div>
  </div>`;
}

function bindDetail(el, ctx, a, rerender) {
  el.querySelectorAll("[data-act]").forEach((b) => (b.onclick = async () => {
    const act = b.dataset.act;
    let body = { action: act };
    if (act === "close") {
      const { value, form } = await dialog({ title: "Clôturer l'alerte", body: `<label class="field"><span>Résolution</span><select class="select" name="preset">${RESOLUTIONS.map((r) => `<option>${esc(r)}</option>`).join("")}<option value="">Autre…</option></select></label><label class="field" style="margin-top:12px"><span>Précisions</span><textarea class="textarea" name="detail"></textarea></label>`, actions: [{ label: "Annuler", value: null }, { label: "Clôturer", cls: "btn-primary", value: "ok" }] });
      if (!value) return;
      const f = new FormData(form);
      body.resolution = [f.get("preset"), f.get("detail")].filter(Boolean).join(" — ");
    } else if (act === "note") {
      const { value, form } = await dialog({ title: "Ajouter une note", body: `<textarea class="textarea" name="note" required></textarea>`, actions: [{ label: "Annuler", value: null }, { label: "Ajouter", cls: "btn-primary", value: "ok", validate: (f) => (!f.note.value.trim() ? "La note est vide" : "") }] });
      if (!value) return;
      body.note = new FormData(form).get("note");
    } else if (act === "case") {
      try {
        const c = await api("/api/cases", { method: "POST", body: { alertId: a.id } });
        await ctx.reload(); toast(`Dossier ${c.id} ouvert`); location.hash = `#/dossiers/${c.id}`;
      } catch (e) { toast(e.message, "critical"); }
      return;
    }
    try {
      await api(`/api/alerts/${a.id}`, { method: "PATCH", body });
      await ctx.reload(); toast("Alerte mise à jour"); rerender();
    } catch (e) { toast(e.message, "critical"); }
  }));
}

// ---------- Dossiers ----------
export function renderCases(el, ctx, rest) {
  if (rest[0]) return renderCase(el, ctx, rest[0]);
  el.innerHTML = `${pageHead({ title: "Dossiers", sub: "Contrôles secondaires : vue unifiée, entretiens structurés, pièces et décisions.", crumbs: [[null, "Renseignement"]] })}<section class="card" id="t"></section>`;
  mountTable(el.querySelector("#t"), {
    rows: ctx.data.cases, onRow: (c) => (location.hash = `#/dossiers/${c.id}`), sort: "createdAt", empty: "Aucun dossier",
    columns: [
      { key: "id", label: "Dossier", render: (c) => `<span class="mono">${esc(c.id)}</span>` },
      { key: "title", label: "Objet", render: (c) => `<div class="cell-title">${esc(c.title)}</div><div class="cell-sub">${esc(c.traveler)}</div>` },
      { key: "priority", label: "Priorité", render: (c) => status("severity", c.priority) },
      { key: "owner", label: "Responsable" },
      { key: "createdAt", label: "Ouvert", render: (c) => fmtDateTime(c.createdAt) },
      { key: "status", label: "Statut", render: (c) => status("case", c.status) },
    ],
  });
}

function renderCase(el, ctx, id) {
  const c = ctx.data.cases.find((x) => x.id === id);
  if (!c) { el.innerHTML = `<div class="card empty">Dossier introuvable.</div>`; return; }
  const q = [["motif", "Motif du voyage"], ["hebergement", "Hébergement / adresse au Sénégal"], ["ressources", "Ressources et billet de retour"], ["observations", "Observations de l'agent"]];
  el.innerHTML = `${pageHead({ title: c.title, sub: `${esc(c.traveler)} · ${esc(ctx.poste(c.posteId))}`, crumbs: [["#/dossiers", "Dossiers"], [null, c.id]],
    actions: `${status("case", c.status)}${c.crossingId ? `<a class="btn" href="#/passages/${c.crossingId}">${icon("list")} Passage</a>` : ""}<button class="btn ${c.status === "OUVERT" ? "btn-good" : ""}" id="toggle">${c.status === "OUVERT" ? "Clore le dossier" : "Rouvrir"}</button>` })}
  <div class="grid-main">
    <form class="card" id="iv"><div class="card-head"><h3>Entretien structuré</h3><button class="btn btn-primary btn-sm" style="margin-left:auto" ${c.status === "CLOS" ? "disabled" : ""}>${icon("check")} Enregistrer</button></div>
      <div class="card-body stack">${q.map(([k, l]) => `<label class="field"><span>${l}</span><textarea class="textarea" name="${k}" ${c.status === "CLOS" ? "readonly" : ""}>${esc(c.interview[k])}</textarea></label>`).join("")}</div></form>
    <section class="card"><div class="card-head"><h3>Notes</h3></div><div class="card-body stack">
      <div class="timeline">${c.notes.map((n) => `<div><b>${fmtDateTime(n.at)}</b> · ${esc(n.by || "")}<br>${esc(n.text)}</div>`).join("")}</div>
      <form id="note" class="row"><input class="input grow" name="note" placeholder="Ajouter une note…" style="flex:1"><button class="btn">Ajouter</button></form>
    </div></section>
  </div>`;
  const patch = async (body, msg) => {
    try { await api(`/api/cases/${c.id}`, { method: "PATCH", body }); await ctx.reload(); toast(msg); renderCase(el, ctx, id); } catch (e) { toast(e.message, "critical"); }
  };
  el.querySelector("#iv").onsubmit = (e) => { e.preventDefault(); patch({ interview: Object.fromEntries(new FormData(e.target)) }, "Entretien enregistré"); };
  el.querySelector("#note").onsubmit = (e) => { e.preventDefault(); const n = new FormData(e.target).get("note"); if (n) patch({ note: n }, "Note ajoutée"); };
  el.querySelector("#toggle").onclick = () => patch({ status: c.status === "OUVERT" ? "CLOS" : "OUVERT" }, "Statut mis à jour");
}
