// Délégations : visites officielles, compétitions, conférences et autres groupes annoncés à l'avance.
// Enregistrement (DPAF ou organisateur via le portail), pré-contrôle de chaque membre, validation avec ou sans
// autorisation collective d'entrée, pointage des arrivées et facilitation au guichet.
import { api, country, countryOptions, dialog, esc, fmtDate, fmtDateTime, fmtNum, icon, riskBadge, toast } from "../../shared/ui.js";
import { mountTable, pageHead } from "./common.js";

export const TYPES = { VISITE_OFFICIELLE: "Visite officielle", COMPETITION: "Compétition sportive", CONFERENCE: "Conférence / sommet", CULTUREL: "Événement culturel", AUTRE: "Autre" };
const STATUS = { SOUMISE: ["info", "Soumise"], VALIDEE: ["good", "Validée"], REFUSEE: ["critical", "Refusée"], CLOTUREE: ["", "Clôturée"] };
const PASSPORTS = { DIPLOMATIQUE: "Diplomatique", SERVICE: "Service", ORDINAIRE: "Ordinaire" };
const badge = (s) => `<span class="status ${STATUS[s]?.[0] || ""}">${esc(STATUS[s]?.[1] || s)}</span>`;
const flagged = (g) => g.members.filter((m) => m.prescreen?.score >= 60).length;
const kpi = (label, value, sub, tone = "") => `<div class="card kpi"><div class="kpi-label">${esc(label)}</div><div class="kpi-value ${tone ? `tile-kpi ${tone}` : ""}" style="font-size:30px">${value}</div><div class="kpi-delta">${esc(sub)}</div></div>`;

/** Lignes « Nom;Prénoms;Nationalité;Sexe;Naissance;Passeport;Fonction;Type de passeport » → membres. */
export function parseMembers(text) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^nom\s*[;,\t]/i.test(l)).map((l) => {
    const [surname, given, nat, sex, dob, docNo, role, passportType] = l.split(/[;\t]/).map((x) => (x || "").trim());
    return { surname, given, nat: (nat || "").toUpperCase(), sex: (sex || "").toUpperCase(), dob, docNo, role, passportType: (passportType || "ORDINAIRE").toUpperCase() };
  });
}
const MEMBERS_HELP = `Une ligne par membre : <span class="mono">Nom;Prénoms;Nationalité (code ISO à 3 lettres);Sexe (M/F);Date de naissance (AAAA-MM-JJ);N° de passeport;Fonction;Type de passeport (DIPLOMATIQUE/SERVICE/ORDINAIRE)</span>. Copier-coller possible depuis Excel.`;

export async function render(el, ctx, rest, query) {
  if (rest[0]) return detail(el, ctx, rest[0]);
  const list = ctx.data.delegations || [];
  const upcoming = list.filter((g) => g.status === "VALIDEE" && g.departure >= new Date().toISOString().slice(0, 10));
  el.innerHTML = `${pageHead({ title: "Délégations", sub: "Visites officielles, compétitions, conférences et autres groupes : enregistrement, pré-contrôle des membres, validation et facilitation à l'arrivée.", crumbs: [[null, "e-Visa & voyageurs"]],
    actions: ctx.can("evisa") ? `<button class="btn btn-primary" id="add">${icon("plus")} Nouvelle délégation</button>` : "" })}
  <div class="kpis">
    ${kpi("À valider", fmtNum(list.filter((g) => g.status === "SOUMISE").length), "délégations soumises", list.some((g) => g.status === "SOUMISE") ? "warning" : "")}
    ${kpi("Validées en cours ou à venir", fmtNum(upcoming.length), `${fmtNum(upcoming.reduce((s, g) => s + g.members.length, 0))} membres attendus`)}
    ${kpi("Membres signalés", fmtNum(list.reduce((s, g) => s + flagged(g), 0)), "pré-contrôle (listes, règles)", list.some(flagged) ? "critical" : "")}
    ${kpi("Arrivés", fmtNum(list.reduce((s, g) => s + g.members.filter((m) => m.arrivedAt).length, 0)), "membres pointés")}
  </div>
  <div class="card filterbar"><label class="field"><span>Statut</span><select class="select" id="s"><option value="">Tous</option>${Object.entries(STATUS).map(([k, [, l]]) => `<option value="${k}" ${query.status === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="field"><span>Type</span><select class="select" id="ty"><option value="">Tous</option>${Object.entries(TYPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label></div>
  <section class="card" id="t"></section>`;
  const table = mountTable(el.querySelector("#t"), {
    rows: list, sort: "arrival", dir: 1, empty: "Aucune délégation enregistrée", onRow: (g) => ctx.go(`#/delegations/${g.id}`),
    columns: [
      { key: "ref", label: "Référence", render: (g) => `<span class="mono">${esc(g.ref)}</span>${g.protocol === "VIP" ? ` <span class="status brand">VIP</span>` : ""}` },
      { key: "name", label: "Délégation", render: (g) => `<div class="cell-title">${esc(g.name)}</div><div class="cell-sub">${esc(TYPES[g.type] || g.type)}${g.event ? ` · ${esc(g.event)}` : ""}</div>` },
      { key: "arrival", label: "Séjour", render: (g) => `${fmtDate(g.arrival)} → ${fmtDate(g.departure)}<div class="cell-sub">${esc(ctx.poste(g.posteId))}${g.flight ? ` · ${esc(g.flight)}` : ""}</div>` },
      { key: "members", label: "Membres", num: true, value: (g) => g.members.length, render: (g) => `${fmtNum(g.members.length)}${flagged(g) ? ` <span class="status critical">${flagged(g)} signalé(s)</span>` : ""}` },
      { key: "status", label: "Statut", render: (g) => `${badge(g.status)}${g.status === "VALIDEE" ? `<div class="cell-sub">${g.collectiveAuthorization ? "Autorisation collective" : "e-Visa individuels"}</div>` : ""}` },
    ],
  });
  const apply = () => { const s = el.querySelector("#s").value, ty = el.querySelector("#ty").value; table.update(list.filter((g) => (!s || g.status === s) && (!ty || g.type === ty))); };
  el.querySelector("#s").onchange = apply; el.querySelector("#ty").onchange = apply; if (query.status) apply();
  if (query.new && ctx.can("evisa")) { history.replaceState(null, "", "#/delegations"); setTimeout(() => el.querySelector("#add")?.click(), 0); }
  el.querySelector("#add")?.addEventListener("click", () => createDialog(ctx));
}

async function createDialog(ctx) {
  const { value, form } = await dialog({
    title: "Nouvelle délégation", wide: true,
    body: `<div class="form-grid">
      <label class="field" style="grid-column:1/-1"><span>Nom de la délégation *</span><input class="input" name="name" placeholder="ex. Équipe nationale de football du Maroc"></label>
      <label class="field"><span>Type *</span><select class="select" name="type">${Object.entries(TYPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
      <label class="field"><span>Événement</span><input class="input" name="event" placeholder="ex. Commission mixte, tournoi, sommet"></label>
      <label class="field"><span>Hôte / organisateur au Sénégal</span><input class="input" name="host" placeholder="Ministère, fédération, comité d'organisation"></label>
      <label class="field"><span>Pays de provenance</span><select class="select" name="originCountry">${countryOptions()}</select></label>
      <label class="field"><span>Arrivée *</span><input class="input" type="date" name="arrival"></label>
      <label class="field"><span>Départ *</span><input class="input" type="date" name="departure"></label>
      <label class="field"><span>Point d'entrée</span><select class="select" name="posteId">${ctx.data.postes.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></label>
      <label class="field"><span>Vol / moyen de transport</span><input class="input" name="flight" placeholder="ex. HC 302"></label>
      <label class="field"><span>Protocole</span><select class="select" name="protocol"><option value="STANDARD">Standard</option><option value="VIP">VIP (accueil protocolaire)</option></select></label>
      <label class="field"><span>Contact (nom)</span><input class="input" name="cname"></label>
      <label class="field"><span>Contact (e-mail)</span><input class="input" name="cemail" type="email"></label>
      <label class="field"><span>Contact (téléphone)</span><input class="input" name="cphone"></label>
      <label class="field" style="grid-column:1/-1"><span>Membres *</span><textarea class="textarea mono" name="members" rows="7" placeholder="Jallow;Mamadou;GMB;M;1968-03-14;GD0012345;Chef de délégation;DIPLOMATIQUE" data-no-i18n></textarea><small class="muted">${MEMBERS_HELP}</small></label>
    </div>`,
    actions: [{ label: "Annuler", value: null }, { label: "Enregistrer", cls: "btn-primary", value: "ok", validate: (f) => (!f.name.value.trim() ? "Nom obligatoire" : !f.arrival.value || !f.departure.value ? "Dates obligatoires" : !parseMembers(f.members.value).length ? "Ajoutez au moins un membre" : null) }],
  });
  if (!value) return;
  const f = Object.fromEntries(new FormData(form));
  try {
    const g = await api("/api/delegations", { method: "POST", body: { ...f, contact: { name: f.cname, email: f.cemail, phone: f.cphone }, members: parseMembers(f.members) } });
    await ctx.reload();
    toast(`Délégation ${g.ref} enregistrée — ${g.members.length} membre(s) pré-contrôlé(s)`);
    ctx.go(`#/delegations/${g.id}`);
  } catch (e) { toast(e.message, "critical"); }
}

function detail(el, ctx, id) {
  const g = (ctx.data.delegations || []).find((x) => x.id === id);
  if (!g) { el.innerHTML = `<div class="card empty">Délégation introuvable.</div>`; return; }
  const can = ctx.can("evisa"), canCtl = ctx.can("control");
  const act = async (body, msg) => {
    try { await api(`/api/delegations/${g.id}`, { method: "PATCH", body }); await ctx.reload(); toast(msg); ctx.refresh(); } catch (e) { toast(e.message, "critical"); }
  };
  el.innerHTML = `${pageHead({ title: g.name, sub: `${TYPES[g.type] || g.type}${g.event ? ` · ${g.event}` : ""}`, crumbs: [["#/delegations", "Délégations"], [null, g.ref]],
    actions: `<button class="btn" onclick="print()">${icon("printer")} Imprimer la liste</button>
      ${can && ["SOUMISE", "VALIDEE"].includes(g.status) ? `<button class="btn" id="addm">${icon("plus")} Ajouter des membres</button>` : ""}
      ${can && g.status === "SOUMISE" ? `<button class="btn btn-danger" id="refuse">${icon("x")} Refuser</button><button class="btn btn-primary" id="validate">${icon("check")} Valider</button>` : ""}
      ${can && g.status === "VALIDEE" ? `<button class="btn" id="close">${icon("checkCircle")} Clôturer</button>` : ""}` })}
  ${flagged(g) ? `<div class="msg critical" style="margin-bottom:12px">${icon("alert")}<span><b>${flagged(g)} membre(s) signalé(s) au pré-contrôle.</b> Une alerte a été créée dans le Threat Monitor. Le résultat n'est jamais communiqué à l'organisateur.</span></div>` : ""}
  <div class="grid-main">
    <section class="card"><div class="card-head"><h3>Membres (${g.members.length})</h3><span class="muted small" style="margin-left:auto">${g.members.filter((m) => m.arrivedAt).length} arrivé(s)</span></div><div id="m"></div></section>
    <section class="card"><div class="card-head"><h3>Informations</h3>${badge(g.status)}</div><div class="card-body"><dl class="kv">
      <dt>Référence</dt><dd class="mono">${esc(g.ref)}</dd>
      <dt>Séjour</dt><dd>${fmtDate(g.arrival)} → ${fmtDate(g.departure)}</dd>
      <dt>Point d'entrée</dt><dd>${esc(ctx.poste(g.posteId))}${g.flight ? ` · ${esc(g.flight)}` : ""}</dd>
      <dt>Provenance</dt><dd>${esc(country(g.originCountry))}</dd>
      <dt>Hôte</dt><dd>${esc(g.host || "—")}</dd>
      <dt>Protocole</dt><dd>${g.protocol === "VIP" ? "VIP (accueil protocolaire)" : "Standard"}</dd>
      <dt>Entrée</dt><dd>${g.status === "VALIDEE" ? (g.collectiveAuthorization ? "Autorisation collective (vaut e-Visa pendant le séjour)" : "e-Visa individuels requis") : "—"}</dd>
      <dt>Contact</dt><dd>${esc(g.contact?.name || "—")}<br><span class="small muted">${esc(g.contact?.email || "")} ${esc(g.contact?.phone || "")}</span></dd>
      <dt>Source</dt><dd>${esc(g.source)}</dd>
      ${g.reason ? `<dt>Motif du refus</dt><dd>${esc(g.reason)}</dd>` : ""}
    </dl>
    <h4 style="margin:16px 0 6px">Historique</h4>${g.history.slice().reverse().map((h) => `<div class="factor"><span>${esc(h.text)}<br><span class="small muted">${fmtDateTime(h.at)} · ${esc(h.by)}</span></span></div>`).join("")}</div></section>
  </div>`;
  mountTable(el.querySelector("#m"), {
    rows: g.members, sort: "surname", dir: 1,
    onRender: (t) => {
      t.querySelectorAll("[data-arr]").forEach((b) => (b.onclick = () => act({ action: "arrivee", memberId: b.dataset.arr }, "Arrivée pointée")));
      t.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { if (confirm("Retirer ce membre de la délégation ?")) act({ action: "retirer", memberId: b.dataset.rm }, "Membre retiré"); }));
    },
    columns: [
      { key: "surname", label: "Membre", render: (m) => `<div class="cell-title">${esc(m.surname)} ${esc(m.given)}</div><div class="cell-sub">${esc(m.role)}</div>` },
      { key: "nat", label: "Nationalité", render: (m) => esc(country(m.nat)) },
      { key: "docNo", label: "Passeport", render: (m) => `<span class="mono">${esc(m.docNo)}</span><div class="cell-sub">${esc(PASSPORTS[m.passportType] || m.passportType)}</div>` },
      { key: "dob", label: "Naissance", render: (m) => fmtDate(m.dob) },
      { key: "score", label: "Pré-contrôle", value: (m) => m.prescreen?.score ?? 0, render: (m) => `${riskBadge(m.prescreen?.score ?? 0, m.prescreen?.level || "FAIBLE")}${m.prescreen?.factors?.length ? `<div class="cell-sub">${esc(m.prescreen.factors.slice(0, 2).map((f) => f.label).join(" ; "))}</div>` : ""}` },
      { key: "arrivedAt", label: "Arrivée", render: (m) => (m.arrivedAt ? `<span class="status good">${fmtDateTime(m.arrivedAt)}</span>` : canCtl && g.status === "VALIDEE" ? `<button class="btn btn-sm" data-arr="${m.id}">${icon("check")} Pointer</button>` : "—")
        + (can && g.status === "SOUMISE" ? ` <button class="btn btn-sm btn-ghost" data-rm="${m.id}" title="Retirer">${icon("trash")}</button>` : "") },
    ],
  });
  el.querySelector("#validate")?.addEventListener("click", async () => {
    const { value, form } = await dialog({ title: `Valider ${g.ref}`, body: `<p>${g.members.length} membre(s) · ${flagged(g) ? `<b class="status critical">${flagged(g)} signalé(s)</b>` : "aucun membre signalé"}.</p>
      <label class="check"><input type="checkbox" name="collective" checked> Accorder une <b>autorisation collective d'entrée</b> : elle vaut e-Visa pour chaque membre pendant le séjour (arrivée − 3 jours à départ + 3 jours).</label>
      <p class="small muted">Sans autorisation collective, chaque membre soumis à visa doit présenter un e-Visa individuel. Les contrôles au guichet (listes, biométrie) restent obligatoires pour tous.</p>`,
      actions: [{ label: "Annuler", value: null }, { label: "Valider", cls: "btn-primary", value: "ok" }] });
    if (value) act({ action: "valider", collectiveAuthorization: form.collective.checked }, "Délégation validée");
  });
  el.querySelector("#refuse")?.addEventListener("click", async () => {
    const reason = prompt("Motif du refus");
    if (reason !== null) act({ action: "refuser", reason }, "Délégation refusée");
  });
  el.querySelector("#close")?.addEventListener("click", () => act({ action: "cloturer" }, "Délégation clôturée"));
  el.querySelector("#addm")?.addEventListener("click", async () => {
    const { value, form } = await dialog({ title: "Ajouter des membres", wide: true, body: `<label class="field"><span>Membres</span><textarea class="textarea mono" name="members" rows="6" data-no-i18n></textarea><small class="muted">${MEMBERS_HELP}</small></label>`,
      actions: [{ label: "Annuler", value: null }, { label: "Ajouter", cls: "btn-primary", value: "ok" }] });
    if (value) act({ action: "ajouter", members: parseMembers(form.members.value) }, "Membres ajoutés et pré-contrôlés");
  });
}
