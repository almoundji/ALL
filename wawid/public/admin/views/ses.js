// Administration (SES) : supervision des équipements, véhicules (VRS), utilisateurs, journal d'audit, paramètres.
import { ago, api, dialog, esc, fmtDateTime, fmtNum, icon, status, toast } from "../../shared/ui.js";
import { bridgeStatus, bridgeUrl, setBridgeUrl } from "../../shared/nfc.js";
import { mountTable, pageHead } from "./common.js";

export function render(el, ctx, _rest, query) {
  const d = ctx.data;
  const poste = query.poste || "";
  const devices = d.devices.filter((x) => !poste || x.posteId === poste);
  const types = [...new Set(d.devices.map((x) => x.type))];
  el.innerHTML = `${pageHead({ title: "Supervision systèmes", sub: "État en temps réel des terminaux, eGates, caméras CCTV à reconnaissance faciale, scanners bagages, lecteurs de plaques et serveurs locaux.", crumbs: [[null, "Administration"]],
    actions: `<select class="select" id="poste" style="width:auto"><option value="">Tous les postes</option>${d.postes.map((p) => `<option value="${p.id}" ${p.id === poste ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>` })}
  <div class="kpis">${types.map((t) => { const l = devices.filter((x) => x.type === t); const ko = l.filter((x) => x.status !== "EN_LIGNE").length; return `<div class="card kpi"><div class="kpi-label">${esc(t)}</div><div class="kpi-value" style="font-size:26px">${l.length - ko} / ${l.length}</div><div class="kpi-delta">${ko ? `<span class="status warning">${ko} anomalie(s)</span>` : '<span class="status good">Nominal</span>'}</div></div>`; }).join("")}
    <div class="card kpi"><div class="kpi-label">eGates / ABC</div><div class="kpi-value" style="font-size:26px">${d.gates.filter((g) => (!poste || g.posteId === poste) && g.status === "EN_SERVICE").length} / ${d.gates.filter((g) => !poste || g.posteId === poste).length}</div><div class="kpi-delta"><a href="#/egates">Superviser</a></div></div></div>
  <section class="card" id="t"></section>`;
  el.querySelector("#poste").onchange = (e) => (location.hash = `#/systemes${e.target.value ? `?poste=${e.target.value}` : ""}`);
  mountTable(el.querySelector("#t"), {
    rows: devices, sort: "status", pageSize: 60,
    columns: [
      { key: "id", label: "Équipement", render: (x) => `<span class="mono cell-title">${esc(x.id)}</span>` },
      { key: "type", label: "Type" },
      { key: "posteId", label: "Poste", render: (x) => esc(ctx.poste(x.posteId)) },
      { key: "version", label: "Version", render: (x) => `<span class="small muted">${esc(x.version)}</span>` },
      { key: "status", label: "État", value: (x) => (x.status === "EN_LIGNE" ? 0 : 1), render: (x) => status("device", x.status) },
    ],
  });
}

export function renderVehicles(el, ctx) {
  el.innerHTML = `${pageHead({ title: "Véhicules (VRS)", sub: "Identification des véhicules et de leurs occupants aux postes terrestres (lecture de plaques, déclaration des occupants).", crumbs: [[null, "Contrôle frontière"]] })}
  <div class="card filterbar"><label class="field" style="max-width:none;flex:1"><span>Plaque, conducteur</span><input class="input" id="vq"></label><label class="check" style="align-self:center"><input type="checkbox" id="flag"> Signalés uniquement</label></div>
  <section class="card" id="t"></section>`;
  const table = mountTable(el.querySelector("#t"), {
    rows: ctx.data.vehicles, sort: "ts",
    columns: [
      { key: "ts", label: "Date", render: (v) => fmtDateTime(v.ts) },
      { key: "plate", label: "Plaque", render: (v) => `<span class="mono cell-title">${esc(v.plate)}</span>${v.flagged ? ` <span class="status critical">Signalé</span>` : ""}<div class="cell-sub">${esc(v.note)}</div>` },
      { key: "type", label: "Type", render: (v) => `${esc(v.type)}<div class="cell-sub">${esc(v.cargo)}</div>` },
      { key: "driver", label: "Conducteur", render: (v) => `${esc(v.driver)}<div class="cell-sub">${v.occupants} occupant(s)</div>` },
      { key: "posteId", label: "Poste", render: (v) => `${esc(ctx.poste(v.posteId))}<div class="cell-sub">${v.direction === "ENTREE" ? "Entrée" : "Sortie"}</div>` },
    ],
  });
  const apply = () => {
    const q = el.querySelector("#vq").value.toUpperCase();
    table.update(ctx.data.vehicles.filter((v) => (!el.querySelector("#flag").checked || v.flagged) && (!q || `${v.plate} ${v.driver}`.toUpperCase().includes(q))));
  };
  el.querySelector("#vq").oninput = apply;
  el.querySelector("#flag").onchange = apply;
}

export async function renderUsers(el, ctx, _rest, query) {
  const users = await api("/api/users");
  const roles = ctx.data.roles;
  el.innerHTML = `${pageHead({ title: "Utilisateurs & rôles", sub: "Habilitations par rôle (moindre privilège). Mots de passe hachés (scrypt), sessions de 12 h, actions tracées.", crumbs: [[null, "Administration"]],
    actions: `<button class="btn btn-primary" id="add">${icon("plus")} Nouvel utilisateur</button>` })}
  <section class="card" id="t"></section>
  <section class="card" style="margin-top:16px"><div class="card-head"><h3>Matrice des droits</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Droit</th>${Object.values(roles).map((r) => `<th>${esc(r.label)}</th>`).join("")}</tr></thead><tbody>
    ${[["read", "Consultation"], ["control", "Contrôle guichet"], ["alerts", "Traitement des alertes"], ["cases", "Dossiers"], ["watchlist", "Listes de surveillance"], ["rules", "Règles de ciblage"], ["apis", "APIS"], ["evisa", "Décisions e-Visa"], ["gates", "Pilotage eGates"], ["users", "Utilisateurs"], ["system", "Paramètres système"]].map(([p, l]) => `<tr><td>${l}</td>${Object.values(roles).map((r) => `<td>${r.perms.includes(p) ? `<span class="status good">Oui</span>` : '<span class="muted">—</span>'}</td>`).join("")}</tr>`).join("")}
  </tbody></table></div></section>`;
  const bindEdit = (t) => t.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => editUser(b.dataset.edit)));
  mountTable(el.querySelector("#t"), {
    rows: users, onRender: bindEdit,
    columns: [
      { key: "name", label: "Nom", render: (u) => `<div class="cell-title">${esc(u.name)}</div><div class="cell-sub mono">${esc(u.username)}</div>` },
      { key: "role", label: "Rôle", render: (u) => esc(u.roleLabel) },
      { key: "posteId", label: "Poste", render: (u) => esc(ctx.poste(u.posteId)) },
      { key: "lastLogin", label: "Dernière connexion", render: (u) => (u.lastLogin ? ago(u.lastLogin) : "Jamais") },
      { key: "active", label: "État", render: (u) => `${u.active ? '<span class="status good">Actif</span>' : '<span class="status">Désactivé</span>'} <button class="btn btn-sm btn-ghost" data-edit="${u.id}">Modifier</button>` },
    ],
  });
  const roleOpts = (sel) => Object.entries(roles).map(([k, r]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${esc(r.label)}</option>`).join("");
  const posteOpts = (sel) => ctx.data.postes.map((p) => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.name)}</option>`).join("");
  if (query?.new) { history.replaceState(null, "", "#/utilisateurs"); setTimeout(() => el.querySelector("#add").click(), 0); }
  el.querySelector("#add").onclick = async () => {
    const { value, form } = await dialog({ title: "Nouvel utilisateur", body: `<div class="form-grid"><label class="field"><span>Nom complet</span><input class="input" name="name"></label><label class="field"><span>Identifiant</span><input class="input" name="username" autocomplete="off"></label><label class="field"><span>Rôle</span><select class="select" name="role">${roleOpts("agent")}</select></label><label class="field"><span>Poste</span><select class="select" name="posteId">${posteOpts("AIBD")}</select></label><label class="field" style="grid-column:1/-1"><span>Mot de passe initial (10 caractères min.)</span><input class="input" name="password" type="password" autocomplete="new-password"></label></div>`, actions: [{ label: "Annuler", value: null }, { label: "Créer", cls: "btn-primary", value: "ok" }] });
    if (!value) return;
    try { await api("/api/users", { method: "POST", body: Object.fromEntries(new FormData(form)) }); toast("Utilisateur créé"); renderUsers(el, ctx); } catch (e) { toast(e.message, "critical"); }
  };
  async function editUser(id) {
    {
    const u = users.find((x) => x.id === id);
    const { value, form } = await dialog({ title: `Modifier ${u.username}`, body: `<div class="form-grid"><label class="field"><span>Rôle</span><select class="select" name="role">${roleOpts(u.role)}</select></label><label class="field"><span>Poste</span><select class="select" name="posteId">${posteOpts(u.posteId)}</select></label><label class="field" style="grid-column:1/-1"><span>Nouveau mot de passe (laisser vide pour conserver)</span><input class="input" name="password" type="password" autocomplete="new-password"></label><label class="check"><input type="checkbox" name="active" ${u.active ? "checked" : ""}> Compte actif</label></div>`, actions: [{ label: "Annuler", value: null }, { label: "Enregistrer", cls: "btn-primary", value: "ok" }] });
    if (!value) return;
    const f = new FormData(form);
    const body = { role: f.get("role"), posteId: f.get("posteId"), active: f.has("active") };
    if (f.get("password")) body.password = f.get("password");
    try { await api(`/api/users/${u.id}`, { method: "PATCH", body }); toast("Utilisateur mis à jour"); renderUsers(el, ctx); } catch (e) { toast(e.message, "critical"); }
    }
  }
}

export async function renderAudit(el) {
  const { entries, verification: v } = await api("/api/audit");
  el.innerHTML = `${pageHead({ title: "Journal d'audit", sub: "Chaque action est chaînée par empreinte SHA-256 à la précédente : toute suppression ou modification a posteriori est détectée.", crumbs: [[null, "Administration"]] })}
  <div class="msg ${v.ok ? "good" : "critical"}" style="margin-bottom:16px">${icon(v.ok ? "shieldCheck" : "shieldAlert")}<span>${v.ok ? `<b>Chaîne intègre</b> — ${fmtNum(v.count)} entrées vérifiées. Empreinte de tête : <span class="mono">${esc(v.head?.slice(0, 24))}…</span>` : `<b>Intégrité rompue</b> à l'entrée n° ${v.brokenAt} : ${esc(v.reason)}`}</span></div>
  <section class="card" id="t"></section>`;
  mountTable(el.querySelector("#t"), {
    rows: entries, pageSize: 100,
    columns: [
      { key: "seq", label: "N°", num: true },
      { key: "ts", label: "Horodatage", render: (e) => `<span class="nowrap">${fmtDateTime(e.ts)}</span>` },
      { key: "actor", label: "Acteur" },
      { key: "action", label: "Action", render: (e) => `<span class="mono small">${esc(e.action)}</span>` },
      { key: "target", label: "Objet", render: (e) => `${esc(e.target)}<div class="cell-sub">${esc(e.details)}</div>` },
      { key: "hash", label: "Empreinte", sortable: false, render: (e) => `<span class="mono small muted" title="${esc(e.hash)}">${esc(e.hash.slice(0, 12))}…</span>` },
    ],
  });
}

export function renderSettings(el, ctx) {
  const s = ctx.data.settings;
  el.innerHTML = `${pageHead({ title: "Paramètres", sub: "Politique migratoire et conservation des données.", crumbs: [[null, "Administration"]] })}
  <div class="grid-2">
    <section class="card"><div class="card-head"><h3>Politique</h3></div><div class="card-body"><dl class="kv">
      <dt>Dispense de visa</dt><dd>${s.visaExempt.map((c) => `<span class="status">${esc(c)}</span>`).join(" ")}</dd>
      <dt>Seuil facial (guichet)</dt><dd>${Math.round(s.faceThreshold * 100)} %</dd>
      <dt>Frais e-Visa</dt><dd>${fmtNum(s.evisaFee)} FCFA</dd><dt>Taxe de sécurité</dt><dd>${fmtNum(s.passFee)} FCFA</dd>
      <dt>Conservation</dt><dd>${Math.round(s.retentionDays / 365)} ans (Loi n° 2008-12 sur les données personnelles — CDP)</dd></dl></div></section>
    <section class="card"><div class="card-head"><h3>${icon("wifi")} Lecteur NFC de ce poste</h3></div><div class="card-body stack">
      <p class="muted" style="margin:0">Les puces de passeport sont lues par le pont local <span class="mono">tools/nfc-bridge.mjs</span> relié au lecteur (PC/SC ou SDK constructeur). Réglage propre à ce poste de travail.</p>
      <label class="field"><span>Adresse du pont</span><input class="input mono" id="nfc-url" value="${esc(bridgeUrl())}"></label>
      <div class="row"><button class="btn" id="nfc-save">Enregistrer</button><button class="btn" id="nfc-test">${icon("zap")} Tester</button><span id="nfc-res" class="small"></span></div></div></section>
    <section class="card"><div class="card-head"><h3>Données de démonstration</h3></div><div class="card-body stack">
      <p class="muted">Régénère un jeu de données fictif complet (passages, alertes, e-Visa, vols…). Les comptes utilisateurs sont conservés ; le journal d'audit repart d'une nouvelle chaîne.</p>
      <button class="btn btn-danger" id="reset">${icon("refresh")} Réinitialiser la démonstration</button></div></section>
  </div>`;
  el.querySelector("#nfc-save").onclick = () => { setBridgeUrl(el.querySelector("#nfc-url").value.trim()); toast("Adresse du pont enregistrée pour ce poste"); };
  el.querySelector("#nfc-test").onclick = async () => {
    const st = await bridgeStatus(el.querySelector("#nfc-url").value.trim());
    el.querySelector("#nfc-res").innerHTML = st.ok ? `<span class="status good">Connecté — ${esc(st.reader)}</span>` : `<span class="status warning">Pont injoignable — lecture simulée</span>`;
  };
  el.querySelector("#reset").onclick = async () => {
    const { value } = await dialog({ title: "Réinitialiser ?", body: "<p>Toutes les données opérationnelles seront remplacées par un nouveau jeu de démonstration.</p>", actions: [{ label: "Annuler", value: null }, { label: "Réinitialiser", cls: "btn-danger", value: "ok" }] });
    if (!value) return;
    try { await api("/api/system/reset", { method: "POST", body: {} }); await ctx.reload(); toast("Démonstration réinitialisée"); location.hash = "#/"; } catch (e) { toast(e.message, "critical"); }
  };
}
