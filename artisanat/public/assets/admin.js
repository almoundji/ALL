// Console d'administration (principes SAP Fiori : barre shell, page d'accueil en tuiles, List Report, Object Page, barre d'actions en pied de page).
import { $, $$, api, barsH, barsV, date, dateShort, dateTime, donut, esc, fcfa, fmt, foncierClass, formData, mfcfa, options, ostatus, pct, toast } from "./common.js";

const root = $("#root");
const S = { token: null, user: null, ref: null };
try { S.token = sessionStorage.getItem("art_admin"); } catch { /* stockage indisponible */ }
const saveToken = (t) => { S.token = t; try { t ? sessionStorage.setItem("art_admin", t) : sessionStorage.removeItem("art_admin"); } catch { /* ignore */ } };
const call = (path, opts = {}) => api(path, { ...opts, token: S.token }).catch((e) => { if (e.status === 401) { saveToken(null); login(); } throw e; });
const can = (...roles) => roles.includes(S.user?.role);
const ROLES = { admin: "Administrateur", agent: "Agent de Chambre de métiers", lecteur: "Lecteur" };

// ---------- Connexion ----------
function login(msg = "") {
  root.innerHTML = `<div class="login-page"><form class="login-box" id="lf"><img src="/embleme.svg" alt=""><h1>Développement et promotion de l'Artisanat national</h1><p>Espace d'administration — Ministère et Chambres de métiers</p>
    <label for="u">Identifiant</label><input class="f-input" id="u" name="username" autocomplete="username" required>
    <label for="p">Mot de passe</label><input class="f-input" id="p" name="password" type="password" autocomplete="current-password" required>
    <div id="err">${msg ? `<div class="f-msg neg">${esc(msg)}</div>` : ""}</div><button class="fbtn emph" style="width:100%;margin-top:16px">Se connecter</button>
    <div class="f-msg info" style="font-size:12.5px;margin-top:16px"><b>Comptes de démonstration</b><br>admin / admin123 — administrateur national<br>cm.thies / agent123 — agent, région de Thiès<br>lecteur / lecteur123 — lecture seule</div>
    <p style="margin-top:12px"><a href="/">← Portail usagers</a> · <a href="/documentation">Documentation</a></p></form></div>`;
  $("#lf").addEventListener("submit", async (e) => { e.preventDefault();
    try { const r = await api("/admin/login", { method: "POST", body: formData(e.currentTarget) }); saveToken(r.token); S.user = r.user; location.hash = "#/"; start(); }
    catch (err) { $("#err").innerHTML = `<div class="f-msg neg">${esc(err.message)}</div>`; } });
}

// ---------- Coque ----------
const TABS = [["", "Accueil"], ["artisans", "Artisans"], ["marches", "Commande publique"], ["fonds", "Fonds spécial"], ["sites", "Infrastructures"], ["actualites", "Actualités"], ["admin", "Administration"]];
function shell() {
  const initials = S.user.nom.split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  root.innerHTML = `<header class="shellbar"><a class="logo" href="#/"><img src="/embleme.svg" alt=""><div class="tricolor-mini"></div><b>Artisanat national</b><span>Administration</span></a>
    <form class="search" id="gs" role="search"><input id="gq" placeholder="Rechercher un artisan (nom, n°, téléphone)…" aria-label="Recherche globale"></form>
    <button class="avatar" id="av" title="${esc(S.user.nom)} — ${esc(ROLES[S.user.role])}${S.user.region ? " — " + esc(S.user.region) : ""}">${esc(initials)}</button></header>
    <nav class="f-tabs" id="tabs">${TABS.filter(([k]) => k !== "admin" || can("admin")).map(([k, l]) => `<a href="#/${k}" data-k="${k}">${l}</a>`).join("")}</nav><main class="f-page" id="page"></main>`;
  $("#gs").addEventListener("submit", (e) => { e.preventDefault(); location.hash = "#/artisans?q=" + encodeURIComponent($("#gq").value); });
  $("#av").addEventListener("click", () => dialog("Mon compte", `<p><b>${esc(S.user.nom)}</b><br>${esc(S.user.username)} · ${esc(ROLES[S.user.role])}${S.user.region ? `<br>Périmètre : région de ${esc(S.user.region)}` : "<br>Périmètre : national"}</p>`,
    [["Se déconnecter", "neg", () => { saveToken(null); S.user = null; login(); }], ["Fermer"]]));
}

// ---------- Boîte de dialogue ----------
function dialog(title, html, buttons = [["Fermer"]]) {
  const d = $("#dlg"); $("#dlgTitle").textContent = title; $("#dlgBody").innerHTML = html;
  $("#dlgFoot").innerHTML = buttons.map(([l, cls = ""], i) => `<button class="fbtn ${cls}" value="${i}" type="${buttons[i][2] ? "button" : "submit"}">${esc(l)}</button>`).join("");
  $("#dlgBody").onkeydown = (e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault(); };
  $$("#dlgFoot button").forEach((b, i) => { const fn = buttons[i][2]; if (fn) b.addEventListener("click", async () => { if (b.classList.contains("emph") && !$("#dlgForm").reportValidity()) return; try { const keep = await fn(formData($("#dlgForm"))); if (keep !== false) d.close(); } catch (e) { toast(e.message, true); } }); });
  d.showModal(); d.querySelector("input,select,textarea")?.focus();
}
const field = (name, label, value = "", type = "text", attrs = "") => `<label${type === "textarea" ? ' class="full"' : ""}>${label}${type === "textarea" ? `<textarea name="${name}" rows="5" ${attrs}>${esc(value)}</textarea>` : `<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}>`}</label>`;
const select = (name, label, list, value = "", attrs = "", empty = null) => `<label>${label}<select name="${name}" ${attrs}>${options(list, value, empty)}</select></label>`;

// ---------- Page d'accueil (tuiles) ----------
const tile = (href, title, sub, num, cls = "", unit = "", foot = "", wide = false) => `<a class="tile${wide ? " wide" : ""}" href="${href}"><div class="tt">${esc(title)}</div><div class="ts">${esc(sub)}</div><div class="tn"><span class="num ${cls}">${num}</span><span class="unit">${esc(unit)}</span></div>${foot ? `<div class="tf">${esc(foot)}</div>` : ""}</a>`;
const actionTile = (id, label, ico = "+") => `<button class="tile action" id="${id}"><span class="ico">${ico}</span><span class="tt">${esc(label)}</span></button>`;
const short = (n) => (n >= 1e9 ? (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : n >= 1e6 ? (n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : n >= 1e4 ? (n / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : fmt(n));
const shortU = (n) => (n >= 1e9 ? "Md FCFA" : n >= 1e6 ? "M FCFA" : n >= 1e4 ? "k FCFA" : "FCFA");

async function home() {
  const d = await call("/admin/dashboard"); const A = d.artisans, F = d.financement, I = d.infrastructures, C = d.commande;
  const h = new Date().getHours();
  $("#page").innerHTML = `<div class="f-hello">${h < 18 ? "Bonjour" : "Bonsoir"}, ${esc(S.user.nom)}</div><div class="f-sub">${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${S.user.region ? `Périmètre : région de ${esc(S.user.region)}` : "Périmètre national"}</div>
    <section class="f-group"><h2>P1 · Recensement et enrôlement</h2><div class="tiles">
      ${tile("#/artisans?statut=en_attente", "Dossiers à valider", "Contrôle des Chambres de métiers", fmt(A.en_attente), A.en_attente ? "crit" : "pos", "dossiers")}
      ${tile("#/artisans", "Artisans recensés", "Tous canaux", fmt(A.total), "info", "", `${pct(A.valides, A.total)} % validés`)}
      ${tile("#/artisans?sexe=F", "Femmes artisanes", "Part des recensés", pct(A.femmes, A.total), "", "%", `${fmt(A.femmes)} artisanes`)}
      ${tile("#/artisans?statut_juridique=Informel", "Unités informelles", "À accompagner vers la formalisation", fmt(A.informels), "crit", "", `${pct(A.informels, A.total)} % du total`)}
      ${tile("#/artisans", "Emplois déclarés", "Artisans, employés, apprentis", fmt(A.emplois), "pos")}
      ${can("admin", "agent") ? actionTile("tNew", "Enrôler au guichet") : ""}${actionTile("tCsv", "Exporter le registre (CSV)", "⤓")}</div></section>
    <section class="f-group"><h2>P2 · Commande publique</h2><div class="tiles">
      ${tile("#/marches", "Marchés réservés ouverts", "APDA · Mobilier national", fmt(C.marches_ouverts), "info", "", mfcfa(C.montant_ouvert))}
      ${tile("#/marches", "Candidatures d'artisans", "Tous marchés", fmt(C.candidatures), "", "", `${fmt(C.retenues)} retenues`)}
      ${can("admin") ? actionTile("tMarche", "Publier un marché") : ""}</div></section>
    <section class="f-group"><h2>P3 · Fonds spécial de financement</h2><div class="tiles">
      ${tile("#/fonds", "Ressources du Fonds", "État, initiatives, artisans", short(F.ressources), "pos", shortU(F.ressources), `Disponible : ${mfcfa(F.disponible)}`)}
      ${tile("#/fonds?statut=soumise", "Demandes à instruire", "Soumises et en instruction", fmt(F.en_cours), F.en_cours ? "crit" : "pos", "", `${mfcfa(F.montant_demande)} demandés au total`)}
      ${tile("#/fonds", "Apports solidaires", `${fmt(F.cotisants)} artisans cotisants`, short(F.apports_artisans), "", shortU(F.apports_artisans))}
      ${tile("#/fonds?statut=accordee", "Financements accordés", "Accordés et décaissés", fmt(F.accordees), "pos", "", `${mfcfa(F.engage)} engagés`)}</div></section>
    <section class="f-group"><h2>P4 · Infrastructures et foncier</h2><div class="tiles">
      ${tile("#/sites?foncier=Non%20r%C3%A9gularis%C3%A9", "Villages non régularisés", "Régularisation foncière urgente", fmt(I.villages_non_regularises), I.villages_non_regularises ? "neg" : "pos", `/ ${I.villages}`)}
      ${tile("#/sites?etat=degrade", "Sites dégradés", "Chambres et villages", fmt(I.degrades), I.degrades ? "crit" : "pos")}
      ${tile("#/sites", "Avancement moyen", "Projets de modernisation", I.avancement_moyen, "info", "%", `Budget : ${mfcfa(I.budget)}`)}</div></section>
    <section class="f-group"><h2>Aperçu</h2></section>
    <div class="f-grid">
      <div class="f-card"><header><h3>Inscriptions par jour</h3><small>tous canaux</small></header><div class="body">${barsV(Object.entries(A.par_jour).map(([k, v]) => [k.slice(8, 10) + "/" + k.slice(5, 7), v]))}</div></div>
      <div class="f-card"><header><h3>Artisans par région</h3></header><div class="body">${barsH(Object.entries(A.par_region).sort((a, b) => b[1] - a[1]), { color: "#008f36" })}</div></div>
      <div class="f-card"><header><h3>Artisans par filière</h3></header><div class="body">${barsH(Object.entries(A.par_filiere).sort((a, b) => b[1] - a[1]))}</div></div>
      <div class="f-card"><header><h3>Besoins exprimés</h3></header><div class="body">${barsH(Object.entries(A.besoins).sort((a, b) => b[1] - a[1]), { color: "#e76500" })}</div></div>
      <div class="f-card"><header><h3>Statut foncier des villages artisanaux</h3></header><div class="body">${donut(S.ref.statuts_fonciers.map((k) => [k, I.par_foncier[k] || 0]), ["#256f3a", "#5dc122", "#e9a400", "#e76500", "#aa0808"])}</div></div>
      <div class="f-card"><header><h3>Dernières opérations</h3></header><div class="body"><ul class="feed">${d.derniers.map((x) => `<li><b>${esc(x.action.replace(/_/g, " "))}</b> — ${esc(x.objet)}<small>${esc(x.user)} · ${dateTime(x.ts)}${x.details ? " · " + esc(x.details) : ""}</small></li>`).join("")}</ul></div></div>
    </div>`;
  $("#tNew")?.addEventListener("click", () => artisanDialog());
  $("#tCsv").addEventListener("click", exportCsv);
  $("#tMarche")?.addEventListener("click", () => marcheDialog());
}
async function exportCsv(params = "") {
  const blob = await call("/admin/artisans?format=csv" + (params ? "&" + params : ""));
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `registre-artisans-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------- Artisans : List Report ----------
async function artisans(qs) {
  const r = S.ref; const p = new URLSearchParams(qs); p.set("limit", "50"); if (!p.get("offset")) p.set("offset", "0");
  const res = await call("/admin/artisans?" + p);
  const fsel = (k, label, list) => `<label>${label}<select data-f="${k}">${options(list, p.get(k) || "", "Tous")}</select></label>`;
  $("#page").innerHTML = `<div class="f-filterbar"><label style="max-width:320px">Recherche<input data-f="q" value="${esc(p.get("q") || "")}" placeholder="Nom, n°, téléphone, CNI…"></label>
      <label>Statut<select data-f="statut">${["", "en_attente", "valide", "rejete"].map((s) => `<option value="${s}"${p.get("statut") === s ? " selected" : ""}>${s ? { en_attente: "En attente", valide: "Validé", rejete: "Rejeté" }[s] : "Tous"}</option>`).join("")}</select></label>
      ${S.user.region ? "" : fsel("region", "Région", Object.keys(r.regions))}${fsel("filiere", "Filière", Object.keys(r.filieres))}${fsel("canal", "Canal", ["En ligne", "Guichet Chambre de métiers"])}${fsel("statut_juridique", "Statut juridique", r.statuts_juridiques)}
      <button class="fbtn emph" id="go">Lancer</button></div>
    <div class="f-title"><h1>Artisans <span class="count">(${fmt(res.total)})</span></h1><span class="sp"></span>
      ${can("admin", "agent") ? `<button class="fbtn" id="bulk" disabled>Valider la sélection</button><button class="fbtn" id="new">Enrôler</button>` : ""}<button class="fbtn" id="csv">Exporter</button></div>
    <div class="f-table-wrap"><table class="f-table"><thead><tr>${can("admin", "agent") ? '<th><input type="checkbox" id="all" aria-label="Tout sélectionner"></th>' : ""}<th data-sort="numero">N° artisan</th><th data-sort="nom">Artisan</th><th data-sort="metier">Métier</th><th data-sort="region">Localisation</th><th data-sort="canal">Canal</th><th data-sort="date_inscription">Inscription</th><th data-sort="statut">Statut</th><th></th></tr></thead>
      <tbody>${res.items.map((a) => `<tr data-id="${a.id}">${can("admin", "agent") ? `<td><input type="checkbox" class="ck" value="${a.id}" ${a.statut !== "en_attente" ? "disabled" : ""} aria-label="Sélectionner"></td>` : ""}
        <td>${esc(a.numero)}</td><td><b>${esc(a.prenom)} ${esc(a.nom)}</b><div class="t2">${esc(a.telephone)} · ${a.sexe === "F" ? "Femme" : "Homme"}</div></td><td>${esc(a.metier)}<div class="t2">${esc(a.filiere)}</div></td>
        <td>${esc(a.departement)}<div class="t2">${esc(a.region)}</div></td><td>${esc(a.canal)}</td><td>${dateShort(a.date_inscription)}</td><td>${ostatus(a.statut)}</td><td class="nav-ind">›</td></tr>`).join("") || `<tr><td colspan="9" style="text-align:center;padding:30px">Aucun artisan</td></tr>`}</tbody></table>
      <div class="f-pager"><button class="fbtn ghost" id="prev" ${+p.get("offset") === 0 ? "disabled" : ""}>‹ Précédent</button>${fmt(+p.get("offset") + 1)}–${fmt(Math.min(res.total, +p.get("offset") + 50))} sur ${fmt(res.total)}<button class="fbtn ghost" id="next" ${+p.get("offset") + 50 >= res.total ? "disabled" : ""}>Suivant ›</button></div></div>`;
  const nav = (o = {}) => { const q = new URLSearchParams(); $$("[data-f]").forEach((el) => el.value && q.set(el.dataset.f, el.value)); if (p.get("sort")) q.set("sort", p.get("sort")); for (const [k, v] of Object.entries(o)) q.set(k, v); location.hash = "#/artisans?" + q; };
  $("#go").addEventListener("click", () => nav()); $$("[data-f]").forEach((el) => el.addEventListener(el.tagName === "SELECT" ? "change" : "keydown", (e) => { if (e.type === "change" || e.key === "Enter") nav(); }));
  $$("th[data-sort]").forEach((th) => th.addEventListener("click", () => { const k = th.dataset.sort; nav({ sort: p.get("sort") === k ? "-" + k : k }); }));
  $("#prev").addEventListener("click", () => nav({ offset: Math.max(0, +p.get("offset") - 50) })); $("#next").addEventListener("click", () => nav({ offset: +p.get("offset") + 50 }));
  $$("tbody tr[data-id]").forEach((tr) => tr.addEventListener("click", (e) => { if (e.target.closest("input")) return; location.hash = "#/artisan/" + tr.dataset.id; }));
  $("#csv").addEventListener("click", () => { const q = new URLSearchParams(p); q.delete("limit"); q.delete("offset"); exportCsv(q.toString()); });
  $("#new")?.addEventListener("click", () => artisanDialog());
  const upd = () => { const n = $$(".ck:checked").length; $("#bulk").disabled = !n; $("#bulk").textContent = n ? `Valider la sélection (${n})` : "Valider la sélection"; $$(".ck").forEach((c) => c.closest("tr").classList.toggle("sel", c.checked)); };
  $$(".ck").forEach((c) => c.addEventListener("change", upd)); $("#all")?.addEventListener("change", (e) => { $$(".ck:not(:disabled)").forEach((c) => (c.checked = e.target.checked)); upd(); });
  $("#bulk")?.addEventListener("click", async () => { const ids = $$(".ck:checked").map((c) => +c.value); const r = await call("/admin/artisans/decision-groupee", { method: "POST", body: { ids } }); toast(`${r.valides} dossier(s) validé(s).`); route(); });
}

function artisanDialog(a = null) {
  const r = S.ref; const v = (k, d = "") => (a ? a[k] ?? d : d);
  const regions = S.user.region ? [S.user.region] : Object.keys(r.regions); const reg = v("region", regions.length === 1 ? regions[0] : "");
  dialog(a ? `Modifier ${a.numero}` : "Enrôlement au guichet", `<div class="f-form">
    ${field("prenom", "Prénom *", v("prenom"), "text", "required")}${field("nom", "Nom *", v("nom"), "text", "required")}
    ${select("sexe", "Sexe *", ["F", "M"], v("sexe", "F"))}${field("date_naissance", "Date de naissance *", v("date_naissance"), "date", "required")}
    ${field("cni", "N° CNI *", v("cni"), "text", "required")}${field("telephone", "Téléphone *", v("telephone"), "tel", "required")}
    ${select("region", "Région *", regions, reg, 'id="dRegion"', "")}${select("departement", "Département *", r.regions[reg] || [], v("departement"), 'id="dDep"', "")}
    ${field("commune", "Commune", v("commune"))}${field("adresse", "Adresse", v("adresse"))}
    ${select("filiere", "Filière *", Object.keys(r.filieres), v("filiere"), 'id="dFil"', "")}${select("metier", "Métier *", r.filieres[v("filiere")] || [], v("metier"), 'id="dMet"', "")}
    ${field("enseigne", "Enseigne", v("enseigne"))}${select("statut_juridique", "Statut juridique *", r.statuts_juridiques, v("statut_juridique", "Informel"))}
    ${field("ninea", "NINEA", v("ninea"))}${select("formation", "Formation", r.formations, v("formation"))}
    ${field("annees_experience", "Années d'expérience", v("annees_experience", 0), "number")}${field("apprentis", "Apprentis", v("apprentis", 0), "number")}
    ${field("employes", "Employés", v("employes", 0), "number")}${field("email", "E-mail", v("email"), "email")}</div>`,
    [["Annuler"], [a ? "Enregistrer" : "Enrôler", "emph", async (d) => {
      const res = a ? await call(`/admin/artisans/${a.id}`, { method: "PATCH", body: d }) : await call("/admin/artisans", { method: "POST", body: d });
      toast(a ? "Dossier mis à jour." : `Artisan enrôlé : ${res.numero}`); location.hash = "#/artisan/" + res.id; route();
    }]]);
  $("#dRegion").addEventListener("change", (e) => { $("#dDep").innerHTML = options(r.regions[e.target.value] || [], "", ""); });
  $("#dFil").addEventListener("change", (e) => { $("#dMet").innerHTML = options(r.filieres[e.target.value] || [], "", ""); });
}

// ---------- Artisan : Object Page ----------
async function artisan(id) {
  const d = await call("/admin/artisans/" + id); const a = d.artisan;
  const f = (l, v) => `<div><small>${l}</small><span>${v || "—"}</span></div>`;
  $("#page").innerHTML = `<div class="objpage"><div class="ohead"><a class="back" href="#/artisans">‹ Artisans</a><h1>${esc(a.prenom)} ${esc(a.nom)}</h1><div class="sub">${esc(a.numero)} · ${esc(a.metier)} · ${esc(a.enseigne || "sans enseigne")}</div>
    <div class="attrs"><div><small>Statut</small>${ostatus(a.statut, true)}</div><div><small>Région</small><b>${esc(a.region)}</b></div><div><small>Expérience</small><b class="big">${fmt(a.annees_experience)} ans</b></div>
      <div><small>Emplois</small><b class="big">${fmt(1 + a.employes + a.apprentis)}</b></div><div><small>Apports au Fonds</small><b class="big">${fcfa(d.contributions.reduce((x, c) => x + c.montant, 0))}</b></div></div>
    <div class="anchors"><a href="#s-id" data-anchor>Identité</a><a href="#s-act" data-anchor>Activité</a><a href="#s-marches" data-anchor>Marchés</a><a href="#s-fin" data-anchor>Financement</a><a href="#s-hist" data-anchor>Historique</a></div></div>
    ${a.statut === "rejete" ? `<div class="f-msg neg">Rejeté le ${date(a.date_decision)} par ${esc(a.agent)} — motif : ${esc(a.motif)}</div>` : ""}
    ${d.doublons.length ? `<div class="f-msg crit">Doublon potentiel (même nom et date de naissance) : ${d.doublons.map((x) => `<a href="#/artisan/${x.id}">${esc(x.numero)}</a>`).join(", ")}</div>` : ""}
    <section class="osection" id="s-id"><h2>Identité et contact</h2><div class="ofields">${f("Prénom(s) et nom", esc(a.prenom + " " + a.nom))}${f("Sexe", a.sexe === "F" ? "Femme" : "Homme")}${f("Date de naissance", date(a.date_naissance))}${f("N° CNI", esc(a.cni))}
      ${f("Téléphone", esc(a.telephone))}${f("E-mail", esc(a.email))}${f("Adresse", esc(a.adresse))}${f("Localisation", esc(`${a.commune}, ${a.departement}, ${a.region}`))}${f("Canal d'inscription", esc(a.canal))}${f("Inscrit le", dateTime(a.date_inscription))}${f("Annuaire public", a.visible_annuaire ? "Oui" : "Non")}</div></section>
    <section class="osection" id="s-act"><h2>Activité</h2><div class="ofields">${f("Filière", esc(a.filiere))}${f("Métier", esc(a.metier))}${f("Enseigne", esc(a.enseigne))}${f("Statut juridique", esc(a.statut_juridique))}${f("NINEA", esc(a.ninea))}
      ${f("Formation", esc(a.formation))}${f("Apprentis", fmt(a.apprentis))}${f("Employés", fmt(a.employes))}${f("Village artisanal", esc(d.site?.nom))}${f("Besoins", esc(a.besoins.join(", ")))}</div></section>
    <section class="osection" id="s-marches"><h2>Candidatures (${d.candidatures.length})</h2>${miniTable(["Marché", "Offre", "Délai", "Statut"], d.candidatures.map((c) => [`<a href="#/marche/${c.marche_id}">${esc(c.marche?.intitule)}</a>`, fcfa(c.montant), c.delai_jours + " j", ostatus(c.statut)]))}</section>
    <section class="osection" id="s-fin"><h2>Financements (${d.financements.length})</h2>${miniTable(["Référence", "Instrument", "Demandé", "Accordé", "Statut"], d.financements.map((x) => [esc(x.reference), esc(x.instrument), fcfa(x.montant_demande), x.montant_accorde ? fcfa(x.montant_accorde) : "—", ostatus(x.statut)]))}</section>
    <section class="osection" id="s-hist"><h2>Historique</h2>${miniTable(["Date", "Action", "Par", "Détail"], d.historique.map((x) => [dateTime(x.ts), esc(x.action.replace(/_/g, " ")), esc(x.user), esc(x.details)]))}</section>
    ${can("admin", "agent") ? `<div class="f-footer">${a.statut !== "valide" ? '<button class="fbtn pos" id="ok">Valider</button>' : ""}${a.statut !== "rejete" ? '<button class="fbtn neg" id="ko">Rejeter</button>' : ""}${a.statut !== "en_attente" ? '<button class="fbtn" id="re">Remettre en attente</button>' : ""}<button class="fbtn emph" id="ed">Modifier</button></div>` : ""}</div>`;
  $$("[data-anchor]").forEach((x) => x.addEventListener("click", (e) => { e.preventDefault(); $(x.getAttribute("href")).scrollIntoView({ behavior: "smooth" }); }));
  const decide = async (statut, motif = "") => { await call(`/admin/artisans/${a.id}/decision`, { method: "POST", body: { statut, motif } }); toast("Décision enregistrée."); route(); };
  $("#ok")?.addEventListener("click", () => decide("valide"));
  $("#re")?.addEventListener("click", () => decide("en_attente"));
  $("#ko")?.addEventListener("click", () => dialog("Rejeter le dossier", `<div class="f-form"><label class="full">Motif du rejet *<select name="motif">${options(["Pièce d'identité illisible", "Doublon d'un dossier existant", "Activité hors nomenclature artisanale", "Informations incohérentes", "Autre"], "", null)}</select></label>${field("precision", "Précision", "", "textarea")}</div>`,
    [["Annuler"], ["Rejeter", "neg", (x) => decide("rejete", x.precision ? `${x.motif} — ${x.precision}` : x.motif)]]));
  $("#ed")?.addEventListener("click", () => artisanDialog(a));
}
const miniTable = (head, rows) => rows.length ? `<div class="f-table-wrap"><table class="f-table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr style="cursor:default">${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : `<div class="f-msg info">Aucun élément.</div>`;

// ---------- Commande publique ----------
async function marches() {
  const list = await call("/admin/marches");
  $("#page").innerHTML = `<div class="f-title"><h1>Marchés réservés <span class="count">(${list.length})</span></h1><span class="sp"></span>${can("admin") ? '<button class="fbtn emph" id="new">Publier un marché</button>' : ""}</div>
    <div class="f-table-wrap"><table class="f-table"><thead><tr><th>Référence</th><th>Intitulé</th><th>Acheteur</th><th>Filière / zone</th><th style="text-align:right">Montant</th><th>Date limite</th><th>Candidatures</th><th>Statut</th><th></th></tr></thead>
    <tbody>${list.map((m) => `<tr data-id="${m.id}"><td>${esc(m.reference)}</td><td><b>${esc(m.intitule)}</b></td><td>${esc(m.acheteur)}</td><td>${esc(m.filiere)}<div class="t2">${esc(m.region)}</div></td><td style="text-align:right">${mfcfa(m.montant)}</td><td>${dateShort(m.date_limite)}</td><td>${fmt(m.candidatures)}${m.retenues ? ` <span class="t2">(${m.retenues} retenues)</span>` : ""}</td><td>${ostatus(m.statut)}</td><td class="nav-ind">›</td></tr>`).join("")}</tbody></table></div>`;
  $$("tbody tr").forEach((tr) => tr.addEventListener("click", () => (location.hash = "#/marche/" + tr.dataset.id)));
  $("#new")?.addEventListener("click", () => marcheDialog());
}
function marcheDialog(m = null) {
  const r = S.ref; const v = (k, d = "") => (m ? m[k] ?? d : d);
  dialog(m ? `Modifier ${m.reference}` : "Publier un marché réservé", `<div class="f-form"><label class="full">Intitulé *<input name="intitule" value="${esc(v("intitule"))}" required></label>
    ${select("acheteur", "Acheteur *", r.acheteurs, v("acheteur"))}${select("filiere", "Filière *", Object.keys(r.filieres), v("filiere"))}${select("region", "Zone *", ["Toutes régions", ...Object.keys(r.regions)], v("region", "Toutes régions"))}
    ${field("montant", "Montant estimé (FCFA) *", v("montant", ""), "number", "min=0 required")}${field("date_limite", "Date limite *", v("date_limite"), "date", "required")}${field("quota_artisans", "Nombre d'artisans visés", v("quota_artisans", 20), "number")}
    ${m ? select("statut", "Statut", ["ouvert", "clos", "attribue"], v("statut")) : ""}${field("description", "Description et conditions", v("description"), "textarea")}</div>`,
    [["Annuler"], [m ? "Enregistrer" : "Publier", "emph", async (d) => { const x = m ? await call(`/admin/marches/${m.id}`, { method: "PATCH", body: d }) : await call("/admin/marches", { method: "POST", body: d }); toast(m ? "Marché mis à jour." : `Marché publié : ${x.reference}`); location.hash = "#/marche/" + x.id; route(); }]]);
}
async function marche(id) {
  const m = await call("/admin/marches/" + id);
  const montantOffres = m.candidatures.reduce((x, c) => x + c.montant, 0);
  $("#page").innerHTML = `<div class="objpage"><div class="ohead"><a class="back" href="#/marches">‹ Commande publique</a><h1>${esc(m.intitule)}</h1><div class="sub">${esc(m.reference)} · ${esc(m.acheteur)}</div>
    <div class="attrs"><div><small>Statut</small>${ostatus(m.statut, true)}</div><div><small>Montant estimé</small><b class="big">${mfcfa(m.montant)}</b></div><div><small>Date limite</small><b class="big">${dateShort(m.date_limite)}</b></div>
    <div><small>Candidatures</small><b class="big">${m.candidatures.length}</b></div><div><small>Retenues</small><b class="big">${m.candidatures.filter((c) => c.statut === "retenue").length} / ${m.quota_artisans}</b></div></div><div style="height:12px"></div></div>
    <section class="osection"><h2>Conditions</h2><div class="ofields"><div><small>Filière</small><span>${esc(m.filiere)}</span></div><div><small>Zone</small><span>${esc(m.region)}</span></div><div><small>Publication</small><span>${dateShort(m.date_publication)}</span></div><div><small>Total des offres</small><span>${mfcfa(montantOffres)}</span></div><div style="grid-column:1/-1"><small>Description</small><span>${esc(m.description)}</span></div></div></section>
    <section class="osection"><h2>Candidatures</h2>${miniTable(["Artisan", "Région", "Offre", "Délai", "Note", "Statut", ""], m.candidatures.map((c) => [`<a href="#/artisan/${c.artisan_id}">${esc(c.artisan?.prenom)} ${esc(c.artisan?.nom)}</a><div class="t2">${esc(c.artisan?.numero)}</div>`, esc(c.artisan?.region), fcfa(c.montant), c.delai_jours + " j", esc(c.note), ostatus(c.statut),
      can("admin") ? `<button class="fbtn pos" data-k="${c.id}" data-s="retenue">Retenir</button> <button class="fbtn neg" data-k="${c.id}" data-s="non_retenue">Écarter</button>` : ""]))}</section>
    ${can("admin") ? `<div class="f-footer">${m.statut === "ouvert" ? '<button class="fbtn" id="close">Clore les candidatures</button>' : ""}${m.statut !== "attribue" ? '<button class="fbtn pos" id="attr">Marquer attribué</button>' : ""}<button class="fbtn emph" id="ed">Modifier</button></div>` : ""}</div>`;
  $$("[data-k]").forEach((b) => b.addEventListener("click", async () => { await call(`/admin/candidatures/${b.dataset.k}/decision`, { method: "POST", body: { statut: b.dataset.s } }); toast("Décision enregistrée."); route(); }));
  const setStatut = async (statut) => { await call(`/admin/marches/${m.id}`, { method: "PATCH", body: { statut } }); toast("Marché mis à jour."); route(); };
  $("#close")?.addEventListener("click", () => setStatut("clos")); $("#attr")?.addEventListener("click", () => setStatut("attribue")); $("#ed")?.addEventListener("click", () => marcheDialog(m));
}

// ---------- Fonds spécial ----------
async function fonds(qs) {
  const p = new URLSearchParams(qs); const st = p.get("statut") || "";
  const d = await call("/admin/financements" + (st ? "?statut=" + st : "")); const F = d.fonds;
  $("#page").innerHTML = `<div class="f-title"><h1>Fonds spécial pour le financement de l'Artisanat</h1><span class="sp"></span>${can("admin") ? '<button class="fbtn" id="ab">Enregistrer une ressource</button>' : ""}</div>
    <div class="tiles">${tile("#/fonds", "Ressources", "Total mobilisé", short(F.ressources), "pos", shortU(F.ressources))}${tile("#/fonds", "Engagé", "Accordé + décaissé", short(F.engage), "info", shortU(F.engage))}
      ${tile("#/fonds", "Décaissé", "", short(F.decaisse), "", shortU(F.decaisse))}${tile("#/fonds", "Disponible", "", short(F.disponible), F.disponible > 0 ? "pos" : "neg", shortU(F.disponible))}
      <div class="tile wide" style="cursor:default"><div class="tt">Origine des ressources</div><div style="margin-top:10px">${barsH(Object.entries(F.par_source), { color: "#008f36", format: mfcfa })}</div></div></div>
    <div class="f-filterbar" style="margin-top:16px"><label>Statut<select id="st">${[["", "Tous"], ["soumise", "Soumises"], ["instruction", "En instruction"], ["accordee", "Accordées"], ["decaissee", "Décaissées"], ["rejetee", "Rejetées"]].map(([k, l]) => `<option value="${k}"${k === st ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div class="f-title"><h1>Demandes <span class="count">(${d.items.length})</span></h1></div>
    ${miniTable(["Référence", "Artisan", "Instrument / objet", "Demandé", "Accordé", "Statut", ""], d.items.map((f) => [esc(f.reference) + `<div class="t2">${dateShort(f.date)}</div>`, `<a href="#/artisan/${f.artisan.id}">${esc(f.artisan.prenom)} ${esc(f.artisan.nom)}</a><div class="t2">${esc(f.artisan.metier)} · ${esc(f.artisan.region)}</div>`,
      `${esc(f.instrument)}<div class="t2">${esc(f.objet)} · ${f.duree_mois} mois · apport ${fcfa(f.apport_personnel)}</div>`, fcfa(f.montant_demande), f.montant_accorde ? fcfa(f.montant_accorde) : "—", ostatus(f.statut) + (f.motif ? `<div class="t2">${esc(f.motif)}</div>` : ""),
      can("admin") && !["rejetee", "decaissee"].includes(f.statut) ? `<button class="fbtn" data-f="${f.id}">Décider</button>` : ""]))}
    <div class="f-title" style="margin-top:24px"><h1>Derniers mouvements de ressources</h1></div>
    ${miniTable(["Date", "Source", "Libellé", "Montant"], d.contributions.map((c) => [dateShort(c.date), esc(c.source) + (c.artisan ? `<div class="t2">${esc(c.artisan.prenom)} ${esc(c.artisan.nom)}</div>` : ""), esc(c.libelle), fcfa(c.montant)]))}`;
  $("#st").addEventListener("change", (e) => (location.hash = "#/fonds" + (e.target.value ? "?statut=" + e.target.value : "")));
  $("#ab")?.addEventListener("click", () => dialog("Enregistrer une ressource du Fonds", `<div class="f-form">${select("source", "Source", ["État", "Initiatives existantes", "Partenaire"])}${field("montant", "Montant (FCFA)", "", "number", "min=1 required")}<label class="full">Libellé<input name="libelle"></label></div>`,
    [["Annuler"], ["Enregistrer", "emph", async (x) => { await call("/admin/contributions", { method: "POST", body: x }); toast("Ressource enregistrée."); route(); }]]));
  $$("[data-f]").forEach((b) => b.addEventListener("click", () => { const f = d.items.find((x) => x.id === +b.dataset.f);
    const choix = f.statut === "accordee" ? [["decaissee", "Décaisser"]] : [["instruction", "Mettre en instruction"], ["accordee", "Accorder"], ["rejetee", "Rejeter"]];
    dialog(`Décision — ${f.reference}`, `<p>${esc(f.artisan.prenom)} ${esc(f.artisan.nom)} · ${esc(f.instrument)} · demandé : <b>${fcfa(f.montant_demande)}</b><br><small>Disponible dans le Fonds : ${mfcfa(F.disponible)}</small></p>
      <div class="f-form"><label>Décision<select name="statut">${choix.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>${field("montant_accorde", "Montant accordé (FCFA)", f.montant_accorde || f.montant_demande, "number")}${field("motif", "Motif (obligatoire en cas de rejet)", "", "textarea")}</div>`,
      [["Annuler"], ["Enregistrer", "emph", async (x) => { await call(`/admin/financements/${f.id}/decision`, { method: "POST", body: x }); toast("Décision enregistrée."); route(); }]]); }));
}

// ---------- Infrastructures et foncier ----------
async function sites(qs) {
  const p = new URLSearchParams(qs); let list = await call("/admin/sites");
  const ty = p.get("type") || "", fo = p.get("foncier") || "", et = p.get("etat") || "";
  list = list.filter((s) => (!ty || s.type === ty) && (!fo || s.statut_foncier === fo) && (!et || s.etat === et));
  $("#page").innerHTML = `<div class="f-filterbar"><label>Type<select data-f="type"><option value="">Tous</option><option value="chambre"${ty === "chambre" ? " selected" : ""}>Chambres de métiers</option><option value="village"${ty === "village" ? " selected" : ""}>Villages artisanaux</option></select></label>
      <label>Statut foncier<select data-f="foncier">${options(S.ref.statuts_fonciers, fo, "Tous")}</select></label><label>État<select data-f="etat">${[["", "Tous"], ["bon", "Bon"], ["moyen", "Moyen"], ["degrade", "Dégradé"]].map(([k, l]) => `<option value="${k}"${k === et ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div class="f-title"><h1>Chambres de métiers et villages artisanaux <span class="count">(${list.length})</span></h1></div>
    <div class="f-table-wrap"><table class="f-table"><thead><tr><th>Site</th><th>Région</th><th>Statut foncier</th><th>État</th><th>Projet</th><th style="text-align:right">Budget</th><th>Avancement</th><th>Échéance</th></tr></thead>
    <tbody>${list.map((s) => `<tr data-id="${s.id}"><td><b>${esc(s.nom)}</b><div class="t2">${s.type === "chambre" ? "Chambre de métiers" : "Village artisanal"} · ${fmt(s.ateliers)} ateliers · ${fmt(s.superficie_m2)} m²</div></td><td>${esc(s.region)}</td>
      <td><span class="ostatus ${foncierClass(s.statut_foncier)}">${esc(s.statut_foncier)}</span><div class="t2">${esc(s.reference_fonciere)}</div></td><td>${ostatus(s.etat)}</td><td>${esc(s.projet)}${s.observations ? `<div class="t2">${esc(s.observations)}</div>` : ""}</td>
      <td style="text-align:right">${mfcfa(s.budget)}</td><td style="min-width:120px"><div class="micro"><div class="bar"><i style="width:${s.avancement}%;background:#008f36"></i></div></div><span class="t2">${s.avancement} %</span></td><td>${dateShort(s.echeance)}</td></tr>`).join("")}</tbody></table></div>`;
  $$("[data-f]").forEach((el) => el.addEventListener("change", () => { const q = new URLSearchParams(); $$("[data-f]").forEach((x) => x.value && q.set(x.dataset.f, x.value)); location.hash = "#/sites?" + q; }));
  $$("tbody tr").forEach((tr) => tr.addEventListener("click", () => { if (!can("admin", "agent")) return; const s = list.find((x) => x.id === +tr.dataset.id);
    dialog(s.nom, `<div class="f-form">${select("statut_foncier", "Statut foncier", S.ref.statuts_fonciers, s.statut_foncier)}${field("reference_fonciere", "Référence foncière", s.reference_fonciere)}
      ${select("etat", "État des infrastructures", ["bon", "moyen", "degrade"], s.etat)}${field("avancement", "Avancement du projet (%)", s.avancement, "number", "min=0 max=100")}
      <label class="full">Projet<input name="projet" value="${esc(s.projet)}"></label>${field("budget", "Budget (FCFA)", s.budget, "number")}${field("echeance", "Échéance", s.echeance, "date")}${field("observations", "Observations", s.observations, "textarea")}</div>`,
      [["Annuler"], ["Enregistrer", "emph", async (x) => { await call(`/admin/sites/${s.id}`, { method: "PATCH", body: x }); toast("Site mis à jour."); route(); }]]); }));
}

// ---------- Actualités ----------
async function actualites() {
  const list = await call("/admin/actualites");
  $("#page").innerHTML = `<div class="f-title"><h1>Actualités <span class="count">(${list.length})</span></h1><span class="sp"></span>${can("admin") ? '<button class="fbtn emph" id="new">Rédiger un article</button>' : ""}</div>
    <div class="f-table-wrap"><table class="f-table"><thead><tr><th>Date</th><th>Titre</th><th>Catégorie</th><th>Statut</th><th></th></tr></thead><tbody>${list.map((a) => `<tr data-id="${a.id}"><td>${dateShort(a.date)}</td><td><b>${esc(a.titre)}</b><div class="t2">${esc(a.chapo)}</div></td><td>${esc(a.categorie)}</td><td>${a.publie ? '<span class="ostatus pos">Publié</span>' : '<span class="ostatus crit">Brouillon</span>'}</td><td class="nav-ind">›</td></tr>`).join("")}</tbody></table></div>`;
  $("#new")?.addEventListener("click", () => actuDialog());
  $$("tbody tr").forEach((tr) => tr.addEventListener("click", () => can("admin") && actuDialog(list.find((x) => x.id === +tr.dataset.id))));
}
function actuDialog(a = null) {
  const v = (k, d = "") => (a ? a[k] ?? d : d);
  dialog(a ? "Modifier l'article" : "Nouvel article", `<div class="f-form"><label class="full">Titre *<input name="titre" value="${esc(v("titre"))}" required></label>${select("categorie", "Catégorie", S.ref.categories, v("categorie"))}
    ${field("date", "Date", v("date", new Date().toISOString().slice(0, 10)), "date")}<label>Illustration<select name="illustration">${["conseil", "recensement", "commande", "financement", "infrastructures", "formation"].map((k) => `<option${k === v("illustration") ? " selected" : ""}>${k}</option>`).join("")}</select></label>
    <label style="flex-direction:row;align-items:center;gap:8px;margin-top:20px"><input type="checkbox" name="publie" style="width:auto;min-height:0"${!a || a.publie ? " checked" : ""}> Publier sur le portail</label>
    ${field("chapo", "Chapeau *", v("chapo"), "textarea", 'rows="2"')}${field("contenu", "Contenu * (paragraphes séparés par une ligne vide)", v("contenu"), "textarea", 'rows="8"')}</div>`,
    [...(a ? [["Supprimer", "neg", async () => { if (!confirm("Supprimer définitivement cet article ?")) return false; await call(`/admin/actualites/${a.id}`, { method: "DELETE" }); toast("Article supprimé."); route(); }]] : []),
      ["Annuler"], ["Enregistrer", "emph", async (x) => { await (a ? call(`/admin/actualites/${a.id}`, { method: "PATCH", body: x }) : call("/admin/actualites", { method: "POST", body: x })); toast("Article enregistré."); route(); }]]);
}

// ---------- Administration ----------
async function admin() {
  const [users, logs] = await Promise.all([call("/admin/utilisateurs"), call("/admin/audit")]);
  $("#page").innerHTML = `<div class="f-title"><h1>Utilisateurs <span class="count">(${users.length})</span></h1><span class="sp"></span><button class="fbtn emph" id="new">Créer un compte</button></div>
    ${miniTable(["Identifiant", "Nom", "Rôle", "Périmètre", "Statut", ""], users.map((u) => [esc(u.username), esc(u.nom), esc(ROLES[u.role]), esc(u.region || "National"), u.actif ? '<span class="ostatus pos">Actif</span>' : '<span class="ostatus neg">Désactivé</span>',
      `<button class="fbtn" data-u="${u.id}">Modifier</button>`]))}
    <div class="f-title" style="margin-top:24px"><h1>Journal d'audit <span class="count">(500 dernières opérations)</span></h1><span class="sp"></span><button class="fbtn neg" id="reset">Réinitialiser la démonstration</button></div>
    ${miniTable(["Date", "Utilisateur", "Action", "Objet", "Détail"], logs.slice(0, 200).map((x) => [dateTime(x.ts), esc(x.user), esc(x.action.replace(/_/g, " ")), esc(x.objet), esc(x.details)]))}`;
  const regions = ["", ...Object.keys(S.ref.regions)];
  $("#new").addEventListener("click", () => dialog("Créer un compte", `<div class="f-form">${field("username", "Identifiant *", "", "text", "required")}${field("nom", "Nom complet *", "", "text", "required")}
    <label>Rôle<select name="role">${Object.entries(ROLES).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label><label>Périmètre régional<select name="region">${regions.map((r) => `<option value="${esc(r)}">${esc(r || "National")}</option>`).join("")}</select></label>
    ${field("password", "Mot de passe initial * (8 caractères min.)", "", "password", "minlength=8 required")}</div>`,
    [["Annuler"], ["Créer", "emph", async (x) => { await call("/admin/utilisateurs", { method: "POST", body: x }); toast("Compte créé."); route(); }]]));
  $$("[data-u]").forEach((b) => b.addEventListener("click", () => { const u = users.find((x) => x.id === +b.dataset.u);
    dialog(`Compte ${u.username}`, `<div class="f-form"><label>Rôle<select name="role">${Object.entries(ROLES).map(([k, l]) => `<option value="${k}"${k === u.role ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <label>Périmètre<select name="region">${regions.map((r) => `<option value="${esc(r)}"${r === u.region ? " selected" : ""}>${esc(r || "National")}</option>`).join("")}</select></label>
      ${field("password", "Nouveau mot de passe (laisser vide pour conserver)", "", "password")}<label style="flex-direction:row;align-items:center;gap:8px;margin-top:20px"><input type="checkbox" name="actif" style="width:auto;min-height:0"${u.actif ? " checked" : ""}> Compte actif</label></div>`,
      [["Annuler"], ["Enregistrer", "emph", async (x) => { if (!x.password) delete x.password; await call(`/admin/utilisateurs/${u.id}`, { method: "PATCH", body: x }); toast("Compte mis à jour."); route(); }]]); }));
  $("#reset").addEventListener("click", () => dialog("Réinitialiser la démonstration", `<div class="f-msg crit">Toutes les données saisies seront remplacées par le jeu de démonstration initial. Cette action est irréversible.</div>`,
    [["Annuler"], ["Réinitialiser", "neg", async () => { await call("/admin/reinitialiser", { method: "POST" }); toast("Démonstration réinitialisée."); route(); }]]));
}

// ---------- Routeur ----------
const ROUTES = { "": home, artisans, artisan, marches, marche, fonds, sites, actualites, admin };
async function route() {
  if (!S.user || !$("#page")) return;
  const [path, qs = ""] = location.hash.replace(/^#\/?/, "").split("?"); const [name, arg] = path.split("/");
  const fn = ROUTES[name] || home; const active = { artisan: "artisans", marche: "marches" }[name] ?? name;
  $$("#tabs a").forEach((a) => a.classList.toggle("active", a.dataset.k === (ROUTES[name] ? active : "")));
  document.title = (TABS.find(([k]) => k === active)?.[1] || "Administration") + " — Artisanat national";
  try { await fn(arg ?? qs, qs); } catch (e) { if (e.status !== 401) $("#page").innerHTML = `<div class="f-msg neg">${esc(e.message)}</div>`; }
}
async function start() {
  if (!S.token) return login();
  try { S.user = await api("/admin/me", { token: S.token }); S.ref = await api("/public/referentiels"); } catch { saveToken(null); return login(); }
  shell(); route();
}
addEventListener("hashchange", route);
start();
