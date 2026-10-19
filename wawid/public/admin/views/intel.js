// Renseignement : listes de surveillance multi-sources, règles de ciblage (POI) et connecteurs externes.
import { RULE_FIELDS, RULE_OPS, nameSimilarity } from "../../shared/engine.js";
import { api, country, countryOptions, dialog, esc, fmtDateTime, fmtNum, icon, status, toast, ago } from "../../shared/ui.js";
import { lang, t } from "../../shared/i18n.js";
import { mountTable, pageHead } from "./common.js";

const SOURCES = {
  INTERPOL_NOTICE: "Interpol — notices", INTERPOL_DIFFUSION: "Interpol — diffusions", INTERPOL_SLTD: "Interpol SLTD", WAPIS: "WAPIS",
  FPR: "Personnes recherchées (FPR)", JUDICIAIRE: "Interdictions judiciaires", SLTD_NATIONAL: "Documents nationaux invalidés", POI: "Personnes d'intérêt",
};

export function render(el, ctx, _rest, query) {
  const src = query.source || "";
  const d = ctx.data;
  const rows = d.watchlist.filter((w) => !src || w.source === src);
  const canEdit = ctx.can("watchlist");
  el.innerHTML = `${pageHead({ title: "Listes de surveillance", sub: "Copie locale synchronisée des fichiers Interpol, WAPIS, nationaux et des personnes d'intérêt — interrogée à chaque passage, eGate, demande e-Visa et manifeste APIS.", crumbs: [[null, "Renseignement"]],
    actions: `<button class="btn" id="test">${icon("search")} Tester une correspondance</button>${canEdit ? `<button class="btn btn-primary" id="add">${icon("plus")} Ajouter</button>` : ""}` })}
  <nav class="space-tabs">${[["", "Toutes"], ...Object.entries(SOURCES)].map(([k, l]) => { const n = d.watchlist.filter((w) => !k || w.source === k).length; return n || !k ? `<button aria-selected="${src === k}" data-src="${k}">${esc(l)} (${n})</button>` : ""; }).join("")}</nav>
  <section class="card" id="t"></section>`;
  el.querySelectorAll("[data-src]").forEach((b) => (b.onclick = () => (location.hash = `#/surveillance${b.dataset.src ? `?source=${b.dataset.src}` : ""}`)));
  mountTable(el.querySelector("#t"), {
    rows, sort: "addedAt", onRender: (t) => t.querySelectorAll("[data-toggle]").forEach((b) => (b.onclick = async () => {
      const w = d.watchlist.find((x) => x.id === b.dataset.toggle);
      try { await api(`/api/watchlist/${w.id}`, { method: "PATCH", body: { active: !w.active } }); await ctx.reload(); render(el, ctx, _rest, query); } catch (e) { toast(e.message, "critical"); }
    })),
    columns: [
      { key: "kind", label: "Type", render: (w) => (w.kind === "document" ? `${icon("idCard")} Document` : `${icon("user")} Personne`) },
      { key: "name", label: "Identité / document", value: (w) => w.surname || w.docNo, render: (w) => (w.kind === "document" ? `<span class="mono cell-title">${esc(w.docNo)}</span><div class="cell-sub">Émis par ${esc(country(w.issuer))}</div>` : `<div class="cell-title">${esc(w.surname)} ${esc(w.given)}</div><div class="cell-sub">${w.dob ? `né(e) le ${esc(w.dob)} · ` : ""}${esc(country(w.nat))}</div>`) },
      { key: "list", label: "Source", render: (w) => `${esc(w.list)}<div class="cell-sub mono">${esc(w.reference || "")}</div>` },
      { key: "severity", label: "Gravité", value: (w) => ({ critique: 4, haute: 3, moyenne: 2, basse: 1 })[w.severity] || 0, render: (w) => (w.severity ? status("severity", w.severity) : status("severity", "haute")) },
      { key: "reason", label: "Motif", render: (w) => `<span class="small">${esc(w.reason)}</span>` },
      { key: "active", label: "État", render: (w) => `${w.active ? '<span class="status good">Active</span>' : '<span class="status">Inactive</span>'}${canEdit ? ` <button class="btn btn-sm btn-ghost" data-toggle="${w.id}">${w.active ? "Désactiver" : "Activer"}</button>` : ""}` },
    ],
  });
  el.querySelector("#add")?.addEventListener("click", () => addEntry(el, ctx, _rest, query));
  if (query.new && canEdit) { history.replaceState(null, "", "#/surveillance"); addEntry(el, ctx, _rest, {}); }
  el.querySelector("#test").onclick = () => testMatch(ctx);
}

async function addEntry(el, ctx, rest, query) {
  const { value, form } = await dialog({
    title: "Nouvelle entrée de surveillance",
    body: `<div class="form-grid">
      <label class="field"><span>Type</span><select class="select" name="kind"><option value="person">Personne</option><option value="document">Document</option></select></label>
      <label class="field"><span>Source</span><select class="select" name="source">${Object.entries(SOURCES).map(([k, l]) => `<option value="${k}" ${k === "POI" ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      <label class="field"><span>Nom</span><input class="input" name="surname"></label><label class="field"><span>Prénoms</span><input class="input" name="given"></label>
      <label class="field"><span>Date de naissance</span><input class="input" type="date" name="dob"></label><label class="field"><span>Nationalité</span><select class="select" name="nat">${countryOptions()}</select></label>
      <label class="field"><span>N° de document</span><input class="input" name="docNo"></label><label class="field"><span>État émetteur</span><select class="select" name="issuer">${countryOptions()}</select></label>
      <label class="field"><span>Gravité</span><select class="select" name="severity"><option value="critique">Critique</option><option value="haute">Haute</option><option value="moyenne" selected>Moyenne</option><option value="basse">Basse</option></select></label>
      <label class="field"><span>Référence</span><input class="input" name="reference" placeholder="N° de notice, de mandat…"></label>
      <label class="field" style="grid-column:1/-1"><span>Motif</span><textarea class="textarea" name="reason"></textarea></label></div>`,
    actions: [{ label: "Annuler", value: null }, { label: "Ajouter", cls: "btn-primary", value: "ok" }],
  });
  if (!value) return;
  const b = Object.fromEntries(new FormData(form));
  b.list = SOURCES[b.source];
  try { await api("/api/watchlist", { method: "POST", body: b }); await ctx.reload(); toast("Entrée ajoutée — appliquée immédiatement aux contrôles"); render(el, ctx, rest, query); } catch (e) { toast(e.message, "critical"); }
}

function testMatch(ctx) {
  dialog({
    title: "Tester une correspondance nominative",
    body: `<p class="muted small">Algorithme Jaro-Winkler insensible aux accents, à l'ordre des noms et aux translittérations ; bonus si la date de naissance concorde.</p>
      <input class="input" id="tq" placeholder="ex. Issouf Kabore, Bakary Traore…"><div id="tr" style="margin-top:12px"></div>`,
    onMount: (dlg) => {
      const inp = dlg.querySelector("#tq");
      inp.oninput = () => {
        const q = inp.value.trim();
        const res = q.length < 3 ? [] : ctx.data.watchlist.filter((w) => w.kind === "person").map((w) => ({ w, s: nameSimilarity(q, `${w.surname} ${w.given}`) })).sort((a, b) => b.s - a.s).slice(0, 6);
        dlg.querySelector("#tr").innerHTML = res.map(({ w, s }) => `<div class="factor"><span><b>${esc(w.surname)} ${esc(w.given)}</b><br><span class="small muted">${esc(w.list)}</span></span><span class="status ${s >= 0.9 ? "critical" : s >= 0.8 ? "warning" : ""}">${fmtNum(s * 100, 0)} %</span></div>`).join("");
      };
    },
  });
}

// ---------- Règles de ciblage ----------
export function renderRules(el, ctx) {
  const canEdit = ctx.can("rules");
  const describe = (r) => r.conditions.map((c) => `${t(RULE_FIELDS[c.field]?.label || c.field)} ${t(RULE_OPS[c.op] || c.op)} ${c.value}`).join(` ${t("ET")} `);
  el.innerHTML = `${pageHead({ title: "Règles de ciblage", sub: "Profils de risque définis par les analystes (équivalent POI / targeting) : chaque règle déclenchée ajoute des points au score, de façon explicable.", crumbs: [[null, "Renseignement"]],
    actions: canEdit ? `<button class="btn btn-primary" id="new">${icon("plus")} Nouvelle règle</button>` : "" })}
  <div class="stack">${ctx.data.rules.map((r) => {
    const hits = ctx.data.crossings.filter((c) => c.risk.factors.some((f) => f.code === "REGLE" && f.ruleId === r.id)).length;
    return `<article class="card card-pad row" style="align-items:flex-start">
      <div class="tile-icon">${icon("filter")}</div>
      <div class="grow"><b>${esc(r.name)}</b> <span class="status ${r.enabled ? "good" : ""}">${r.enabled ? "Active" : "Inactive"}</span>
        <div class="small muted" style="margin-top:4px" data-no-i18n>${t("SI")} ${esc(describe(r))} ${t("ALORS")} +${r.points} points</div>
        <div class="small muted">${fmtNum(hits)} déclenchement(s) sur la période · modifiée par ${esc(r.author)} ${ago(r.updatedAt)}</div></div>
      ${canEdit ? `<div class="row"><button class="btn btn-sm" data-edit="${r.id}">Modifier</button><button class="btn btn-sm btn-ghost" data-tog="${r.id}">${r.enabled ? "Désactiver" : "Activer"}</button><button class="btn btn-sm btn-ghost btn-danger" data-del="${r.id}" title="Supprimer">${icon("trash")}</button></div>` : ""}
    </article>`;
  }).join("") || `<div class="card empty">Aucune règle</div>`}</div>`;
  const save = async (body) => { try { await api("/api/rules", { method: "POST", body }); await ctx.reload(); toast("Règle enregistrée"); renderRules(el, ctx); } catch (e) { toast(e.message, "critical"); } };
  el.querySelector("#new")?.addEventListener("click", async () => { const r = await ruleDialog(); if (r) save(r); });
  el.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = async () => { const r = await ruleDialog(ctx.data.rules.find((x) => x.id === b.dataset.edit)); if (r) save(r); }));
  el.querySelectorAll("[data-tog]").forEach((b) => (b.onclick = () => { const r = ctx.data.rules.find((x) => x.id === b.dataset.tog); save({ ...r, enabled: !r.enabled }); }));
  el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    const { value } = await dialog({ title: "Supprimer la règle ?", body: "<p>Les passages déjà évalués conservent leur score.</p>", actions: [{ label: "Annuler", value: null }, { label: "Supprimer", cls: "btn-danger", value: "ok" }] });
    if (!value) return;
    try { await api(`/api/rules/${b.dataset.del}`, { method: "DELETE" }); await ctx.reload(); toast("Règle supprimée"); renderRules(el, ctx); } catch (e) { toast(e.message, "critical"); }
  }));
}

async function ruleDialog(rule = { name: "", points: 10, enabled: true, conditions: [{ field: "nat", op: "in", value: "" }] }) {
  const condRow = (c = { field: "nat", op: "in", value: "" }) => `<div class="row cond" style="margin-bottom:8px">
    <select class="select" name="field" style="flex:2">${Object.entries(RULE_FIELDS).map(([k, f]) => `<option value="${k}" ${k === c.field ? "selected" : ""}>${esc(f.label)}</option>`).join("")}</select>
    <select class="select" name="op" style="flex:1.4">${Object.entries(RULE_OPS).map(([k, l]) => `<option value="${k}" ${k === c.op ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
    <input class="input" name="value" value="${esc(c.value)}" placeholder="ex. CDG IST, 16" style="flex:2"><button type="button" class="btn btn-ghost btn-icon" data-rm>${icon("x")}</button></div>`;
  const { value, form } = await dialog({
    title: rule.id ? "Modifier la règle" : "Nouvelle règle de ciblage", wide: true,
    body: `<div class="form-grid"><label class="field" style="grid-column:span 2"><span>Nom</span><input class="input" name="name" value="${esc(rule.name)}"></label><label class="field"><span>Points ajoutés</span><input class="input" type="number" name="points" min="0" max="100" value="${rule.points}"></label></div>
      <p class="label" style="margin:16px 0 8px">Conditions (toutes doivent être vraies) — valeurs multiples séparées par des espaces ou virgules</p>
      <div id="conds">${rule.conditions.map(condRow).join("")}</div><button type="button" class="btn btn-sm" id="addc">${icon("plus")} Condition</button>`,
    actions: [{ label: "Annuler", value: null }, { label: "Enregistrer", cls: "btn-primary", value: "ok" }],
    onMount: (dlg) => {
      const conds = dlg.querySelector("#conds");
      const bindRm = () => conds.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => b.closest(".cond").remove()));
      dlg.querySelector("#addc").onclick = () => { conds.insertAdjacentHTML("beforeend", condRow()); bindRm(); };
      bindRm();
    },
  });
  if (!value) return null;
  return {
    id: rule.id, enabled: rule.enabled, name: form.querySelector("[name=name]").value, points: Number(form.querySelector("[name=points]").value),
    conditions: [...form.querySelectorAll(".cond")].map((c) => ({ field: c.querySelector("[name=field]").value, op: c.querySelector("[name=op]").value, value: c.querySelector("[name=value]").value })),
  };
}

// ---------- Connecteurs ----------
export function renderConnectors(el, ctx) {
  const canAdmin = ctx.can("system");
  el.innerHTML = `${pageHead({ title: "Connecteurs", sub: "Interfaçage avec les fichiers de recherche nationaux et internationaux. Chaque contrôle interroge en parallèle les connecteurs actifs ; en cas d'indisponibilité, la copie locale synchronisée prend le relais (mode dégradé).", crumbs: [[null, "Renseignement"]] })}
  <div class="msg info" style="margin-bottom:16px" data-no-i18n>${icon("link")}<span>${lang() === "en"
    ? `To connect a real service, set the <span class="mono">&lt;PREFIX&gt;_URL</span> and <span class="mono">&lt;PREFIX&gt;_TOKEN</span> variables in Netlify. WawID sends <span class="mono">POST {surname, given, dob, nat, docNo, issuer}</span> and expects <span class="mono">{hits:[{list, severity, reason, reference, kind}]}</span>. Interpol I-24/7 is accessed through the National Central Bureau (NCB); WAPIS through the national platform.`
    : `Pour brancher un service réel, définissez dans Netlify les variables <span class="mono">&lt;PRÉFIXE&gt;_URL</span> et <span class="mono">&lt;PRÉFIXE&gt;_TOKEN</span>. WawID envoie <span class="mono">POST {surname, given, dob, nat, docNo, issuer}</span> et attend <span class="mono">{hits:[{list, severity, reason, reference, kind}]}</span>. L'accès à Interpol I-24/7 se fait via le Bureau central national (BCN) ; WAPIS via la plateforme nationale.`}</span></div>
  <div class="gate-grid">${ctx.data.connectors.map((c) => `<article class="card gate-card">
    <header><span class="tile-icon">${icon(c.source === "APIS" ? "plane" : c.source.startsWith("INTERPOL") ? "globe" : "database")}</span><div class="grow"><b>${esc(c.name)}</b></div></header>
    <div>${status("connector", c.status)}</div>
    <dl class="kv small"><dt>Protocole</dt><dd>${esc(c.protocol)}</dd><dt>Mode</dt><dd>${esc(c.mode)}</dd><dt>Enregistrements</dt><dd>${fmtNum(c.records)}</dd><dt>Dernière synchro</dt><dd>${fmtDateTime(c.lastSync)}</dd><dt>Variables</dt><dd class="mono" style="font-size:11px">${esc(c.envPrefix)}_URL</dd></dl>
    <div class="row">${ctx.can("watchlist") ? `<button class="btn btn-sm" data-test="${c.id}">${icon("zap")} Tester</button>` : ""}${canAdmin ? `<button class="btn btn-sm btn-ghost" data-en="${c.id}">${c.status === "DÉSACTIVÉ" ? "Activer" : "Désactiver"}</button>` : ""}<span class="small muted" data-res="${c.id}"></span></div>
  </article>`).join("")}</div>`;
  el.querySelectorAll("[data-test]").forEach((b) => (b.onclick = async () => {
    const out = el.querySelector(`[data-res="${b.dataset.test}"]`);
    out.textContent = "Test en cours…";
    try { const r = await api(`/api/connectors/${b.dataset.test}/test`, { method: "POST", body: {} }); out.textContent = `${r.message}${r.latencyMs ? ` (${r.latencyMs} ms)` : ""}`; } catch (e) { out.textContent = e.message; }
  }));
  el.querySelectorAll("[data-en]").forEach((b) => (b.onclick = async () => {
    const c = ctx.data.connectors.find((x) => x.id === b.dataset.en);
    try { await api(`/api/connectors/${c.id}`, { method: "PATCH", body: { enabled: c.status === "DÉSACTIVÉ" } }); await ctx.reload(); renderConnectors(el, ctx); } catch (e) { toast(e.message, "critical"); }
  }));
}
