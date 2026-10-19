// Back-office WawID : session, shell Fiori, launchpad et routeur.
import { bindLangSwitch, initI18n, langSwitch, locale, t } from "../shared/i18n.js";
import { LOGO, WORDMARK, api, esc, fmtNum, icon, initTheme, toast, toggleTheme, ago, status } from "../shared/ui.js";
import * as dashboard from "./views/dashboard.js";
import * as control from "./views/control.js";
import * as crossings from "./views/crossings.js";
import * as gates from "./views/gates.js";
import * as threat from "./views/threat.js";
import * as intel from "./views/intel.js";
import * as apis from "./views/apis.js";
import * as evisa from "./views/evisa.js";
import * as ses from "./views/ses.js";
import * as scrum from "./views/scrum.js";
import * as redevance from "./views/redevance.js";
import * as help from "./views/help.js";

initTheme();
const root = document.getElementById("root");

export const ctx = {
  me: null, data: null,
  can: (perm) => Boolean(ctx.me?.perms.includes(perm)),
  poste: (id) => ctx.data?.postes.find((p) => p.id === id)?.name || id || "—",
  async reload() { ctx.data = await api("/api/data"); return ctx.data; },
  go: (hash) => { location.hash = hash; },
  refresh: () => route(),
};

// ---------- Applications (tuiles + routes) ----------
// Applications du launchpad. « tile » = tuile de navigation ; « create » = tuile d'action (bordure pointillée).
const APPS = [
  { space: "Contrôle frontière", id: "dashboard", path: "dashboard", title: "Tableau de bord", sub: "Entrées, sorties, fraude", icon: "grid", perm: "read", view: dashboard, kpi: (d) => [today(d).length, "passages sur 24 h"] },
  { space: "Contrôle frontière", id: "controle", path: "controle", title: "Contrôle guichet", sub: "Document, puce NFC, biométrie", icon: "scan", perm: "control", view: control, kpi: (d) => [today(d).filter((c) => c.channel === "GUICHET").length, "contrôles sur 24 h"] },
  { space: "Contrôle frontière", id: "egates", path: "egates", title: "eGates & ABC", sub: "Supervision temps réel", icon: "gate", perm: "read", view: gates, kpi: (d) => [d.gates.filter((g) => g.status === "EN_SERVICE" && g.mode === "AUTO").length, `portes ouvertes sur ${d.gates.length}`] },
  { space: "Contrôle frontière", id: "passages", path: "passages", title: "Passages", sub: "Historique des franchissements", icon: "list", perm: "read", view: crossings, kpi: (d) => [d.crossings.length, "sur 14 jours"] },
  { space: "Contrôle frontière", id: "voyageurs", path: "voyageurs", title: "Recherche voyageur", sub: "Profil 360° et parcours", icon: "user", perm: "read", view: crossings, fn: "renderSearch", kpi: (d) => [new Set(d.crossings.map((c) => c.traveler.docNo)).size, "voyageurs connus"] },
  { space: "Contrôle frontière", id: "verifier", path: "verifier", title: "Vérifier un QR", sub: "e-Visa", icon: "qr", perm: "read", view: evisa, fn: "renderVerify" },
  { space: "Contrôle frontière", id: "vehicules", path: "vehicules", title: "Véhicules (VRS)", sub: "Postes terrestres", icon: "car", perm: "read", view: ses, fn: "renderVehicles", kpi: (d) => [d.vehicles.filter((v) => v.flagged).length, "véhicules signalés"], tone: "warning" },
  { space: "Contrôle frontière", id: "new-controle", create: true, href: "#/controle", title: "Nouveau contrôle", sub: "Lecture du passeport", perm: "control" },

  { space: "Renseignement", id: "alertes", path: "alertes", title: "Threat Monitor", sub: "Alertes à traiter", icon: "shieldAlert", perm: "alerts", view: threat, kpi: (d) => [d.alerts.filter((a) => a.status === "NOUVELLE").length, "nouvelles alertes"], tone: "critical" },
  { space: "Renseignement", id: "dossiers", path: "dossiers", title: "Dossiers", sub: "Contrôle secondaire & entretiens", icon: "briefcase", perm: "cases", view: threat, fn: "renderCases", kpi: (d) => [d.cases.filter((c) => c.status === "OUVERT").length, "dossiers ouverts"] },
  { space: "Renseignement", id: "surveillance", path: "surveillance", title: "Listes de surveillance", sub: "Interpol, FPR, WAPIS, POI, SLTD", icon: "target", perm: "read", view: intel, kpi: (d) => [d.watchlist.filter((w) => w.active).length, "entrées actives"] },
  { space: "Renseignement", id: "regles", path: "regles", title: "Règles de ciblage", sub: "Profils de risque", icon: "filter", perm: "read", view: intel, fn: "renderRules", kpi: (d) => [d.rules.filter((r) => r.enabled).length, "règles actives"] },
  { space: "Renseignement", id: "connecteurs", path: "connecteurs", title: "Connecteurs", sub: "Interpol I-24/7, WAPIS, fichiers", icon: "link", perm: "read", view: intel, fn: "renderConnectors", kpi: (d) => [d.connectors.filter((c) => c.status !== "DÉSACTIVÉ").length, "sources actives"] },
  { space: "Renseignement", id: "new-watch", create: true, href: "#/surveillance?new=1", title: "Ajouter une entrée", sub: "Personne, document, contact", perm: "watchlist" },

  { space: "APIS & PNR", id: "apis", path: "apis", title: "Vols annoncés", sub: "Pré-contrôle des passagers", icon: "plane", perm: "read", view: apis, kpi: (d) => [d.flights.reduce((n, f) => n + f.passengers.filter((p) => p.score >= 30).length, 0), "passagers signalés"], tone: "critical" },
  { space: "APIS & PNR", id: "apis-gw", href: "#/apis?tab=passerelle", title: "Passerelle transporteurs", sub: "Messages PAXLST et PNR", icon: "upload", perm: "read", kpi: (d) => [(d.carrierMessages || []).filter((m) => Date.now() - Date.parse(m.receivedAt) < 86400000).length, "messages sur 24 h"] },
  { space: "APIS & PNR", id: "apis-cf", href: "#/apis?tab=conformite", title: "Conformité transporteurs", sub: "Délais et complétude", icon: "fileCheck", perm: "read", kpi: (d) => [new Set(d.flights.map((f) => f.carrier)).size, "compagnies"] },
  { space: "APIS & PNR", id: "new-msg", create: true, href: "#/apis?tab=passerelle&send=1", title: "Recevoir un message", sub: "API (PAXLST) ou PNR", perm: "apis" },

  { space: "e-Visa & voyageurs", id: "evisa", path: "evisa", title: "e-Visa", sub: "Instruction des demandes", icon: "file", perm: "read", view: evisa, kpi: (d) => [d.evisas.filter((v) => ["SOUMISE", "EN_EXAMEN"].includes(v.status)).length, "demandes à instruire"], tone: "warning" },
  { space: "e-Visa & voyageurs", id: "wawpass", path: "wawpass", title: "Pré-enrôlements eGate", sub: "Programme de passage automatisé", icon: "gate", perm: "read", view: evisa, fn: "renderPasses", kpi: (d) => [d.enrolments.length, "pré-enrôlements"] },
  { space: "e-Visa & voyageurs", id: "kiosque", href: "../gate/", external: true, title: "Kiosque eGate", sub: "Écran des portes", icon: "gate", perm: "read" },

  { space: "Finances", id: "redevance", path: "redevance", title: "Redevance de sécurité", sub: "Synthèse 6 mois", icon: "creditCard", perm: "finance", view: redevance, kpi: (d) => [Math.round((d.invoices || []).reduce((s, i) => s + i.amountXOF, 0) / 1e9 * 10) / 10, "Mds FCFA facturés"] },
  { space: "Finances", id: "rs-factures", href: "#/redevance?tab=factures", title: "Factures compagnies", sub: "Échéances et encaissements", icon: "file", perm: "finance", kpi: (d) => [(d.invoices || []).filter((i) => redevance.invoiceState(i, d.settings.redevance).status === "EN RETARD").length, "factures en retard"], tone: "critical" },
  { space: "Finances", id: "rs-valid", href: "#/redevance?tab=validations", title: "Paiements à valider", sub: "Déclarés par les compagnies", icon: "checkCircle", perm: "finance", kpi: (d) => [(d.invoices || []).reduce((n, i) => n + i.payments.filter((p) => p.status === "DECLARE").length, 0), "paiements déclarés"], tone: "warning" },
  { space: "Finances", id: "rs-rev", href: "#/redevance?tab=reversements", title: "Reversements à l'État", sub: "Part de l'État au Trésor public", icon: "send", perm: "finance", kpi: (d) => [(d.reversements || []).length, "virements au Trésor"] },
  { space: "Finances", id: "rs-rappro", href: "#/redevance?tab=rapprochement", title: "Rapprochement", sub: "Déclarations / comptage WawID", icon: "shieldCheck", perm: "finance", kpi: (d) => [(d.invoices || []).reduce((s, i) => s + Math.max(0, i.billable - i.declared), 0), "passagers non déclarés"], tone: "warning" },
  { space: "Finances", id: "rs-repart", href: "#/redevance?tab=repartition", title: "Répartition", sub: "Part opérateur / part État", icon: "chart", perm: "finance", kpi: (d) => [Math.round((d.settings.redevance?.operatorShare ?? 0.75) * 100), "% part opérateur"] },
  { space: "Finances", id: "rs-simu", href: "#/redevance?tab=simulateur", title: "Simulateur de modèle", sub: "Contrat actuel vs WawID", icon: "kanban", perm: "finance" },

  { space: "Administration", id: "systemes", path: "systemes", title: "Supervision systèmes", sub: "Terminaux, CCTV, scanners", icon: "server", perm: "read", view: ses, kpi: (d) => [d.devices.filter((x) => x.status !== "EN_LIGNE").length, "anomalies"], tone: "warning" },
  { space: "Administration", id: "utilisateurs", path: "utilisateurs", title: "Utilisateurs & rôles", sub: "Habilitations", icon: "users", perm: "users", view: ses, fn: "renderUsers" },
  { space: "Administration", id: "audit", path: "audit", title: "Journal d'audit", sub: "Chaîne d'intégrité SHA-256", icon: "lock", perm: "read", view: ses, fn: "renderAudit" },
  { space: "Administration", id: "parametres", path: "parametres", title: "Paramètres", sub: "Politique, NFC, données", icon: "settings", perm: "system", view: ses, fn: "renderSettings" },
  { space: "Administration", id: "new-user", create: true, href: "#/utilisateurs?new=1", title: "Créer un utilisateur", sub: "Agent, analyste, superviseur", perm: "users" },

  { space: "Aide", id: "aide", path: "aide", title: "Centre d'aide", sub: "Documentation FR / EN", icon: "file", perm: "read", view: help },
  { space: "Aide", id: "aide-api", href: "#/aide?page=api-reference", title: "Référence API", sub: "Compagnies, équipements", icon: "link", perm: "read" },
  { space: "Aide", id: "aide-faq", href: "#/aide?page=faq-glossaire", title: "FAQ et glossaire", sub: "Questions fréquentes", icon: "list", perm: "read" },
  { space: "Projet", id: "projet", path: "projet", title: "Projet (Scrum)", sub: "Backlog & sprints", icon: "kanban", perm: "read", view: scrum, kpi: () => [5, "sprint en cours"] },
];
const SPACES = ["Contrôle frontière", "Renseignement", "APIS & PNR", "e-Visa & voyageurs", "Finances", "Administration", "Aide", "Projet"];
const today = (d) => d.crossings.filter((c) => Date.now() - Date.parse(c.ts) < 86400000);

// ---------- Connexion ----------
function renderLogin(error = "") {
  root.innerHTML = `
  <main class="login">
    <section class="login-art">
      <a class="brand" href="./" style="color:#fff"><span class="brand-logo">${LOGO}</span><span><span class="brand-name" style="color:#fff">${WORDMARK}</span><br><span class="brand-sub" style="color:#9fb3c8">Espace DPAF</span></span></a>
      <div style="position:relative;z-index:1">
        <span class="pill-dark" style="background:rgba(255,255,255,.08)">${icon("zap")} BCS · TMS · APIS · e-VISA</span>
        <h1 style="margin-top:18px">WawID<br><span style="color:var(--accent)">Espace DPAF</span></h1>
        <p style="color:#ccc;max-width:440px">Police de l'Air et des Frontières, renseignement, Trésor et administration : contrôle aux frontières, eGates & ABC, renseignement, autorisations de voyage et redevance dans une seule console.</p>
      </div>
      <div class="rings" aria-hidden="true"></div>
    </section>
    <section class="login-form">
      <form id="login-form">
        <div style="justify-self:end">${langSwitch()}</div>
        <div><h2 style="font:800 26px var(--display)">Connexion</h2><p class="muted">Accès réservé aux agents habilités. Toutes les actions sont journalisées.</p></div>
        <label class="field"><span>Identifiant</span><input class="input" name="username" autocomplete="username" required autofocus></label>
        <label class="field"><span>Mot de passe</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
        ${error ? `<div class="msg critical" role="alert">${icon("alert")}<span>${esc(error)}</span></div>` : ""}
        <button class="btn btn-primary btn-lg" type="submit">${icon("logIn")} Se connecter</button>
      </form>
    </section>
  </main>`;
  bindLangSwitch(root);
  root.querySelector("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const { user } = await api("/api/session", { method: "POST", body: { username: f.get("username"), password: f.get("password"), platform: "dpaf" } });
      ctx.me = user;
      await start();
    } catch (err) { renderLogin(err.message); }
  });
}

async function logout() {
  await api("/api/session", { method: "DELETE" }).catch(() => {});
  ctx.me = null; ctx.data = null;
  location.hash = "";
  renderLogin();
}

// ---------- Shell ----------
function renderShell() {
  const initials = ctx.me.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  root.innerHTML = `
  <header class="shell no-print">
    <div class="shell-bar">
      <button class="btn btn-ghost btn-icon back-btn" id="back" title="Page précédente (Alt + ←)" aria-label="Page précédente" hidden>${icon("arrowLeft")}</button>
      <a class="brand" href="#/" title="Accueil"><span class="brand-logo">${LOGO}</span></a>
      <div class="shell-title"><span class="brand-name">${WORDMARK}</span><span class="shell-app" id="shell-app">Accueil</span></div>
      <form class="shell-search" id="shell-search" role="search">${icon("search")}<input id="q" placeholder="Rechercher un voyageur, un document, une application…" aria-label="Recherche globale"><kbd>/</kbd></form>
      <div class="shell-actions">
        <span class="poste-chip" title="Poste et connexion"><span class="net-dot" id="net-dot"></span>${esc(ctx.poste(ctx.me.posteId))}</span>
        ${langSwitch("shell-lang")}
        <button class="btn btn-ghost btn-icon" id="help" title="Aide sur cette page" aria-label="Aide sur cette page"><b style="font-size:16px">?</b></button>
        <button class="btn btn-ghost btn-icon" id="theme" title="Thème clair / sombre">${icon("moon")}</button>
        <div style="position:relative"><button class="btn btn-ghost btn-icon" id="notif" title="Notifications">${icon("bell")}<span class="badge-count" id="notif-count" hidden></span></button><div class="popover" id="notif-pop" hidden></div></div>
        <div style="position:relative"><button class="avatar" id="me" title="${esc(ctx.me.name)}">${esc(initials)}</button><div class="popover" id="me-pop" hidden style="width:280px">
          <div style="padding:16px"><b>${esc(ctx.me.name)}</b><div class="small muted">${esc(ctx.me.roleLabel)} · ${esc(ctx.poste(ctx.me.posteId))}</div></div>
          <a class="popover-item" href="../gate/" target="_blank">${icon("gate")} Ouvrir le kiosque eGate</a>
          <button class="popover-item" id="logout">${icon("logOut")} Se déconnecter</button>
        </div></div>
      </div>
    </div>
  </header>
  <main class="page" id="view"></main>`;

  root.querySelector("#theme").onclick = toggleTheme;
  bindLangSwitch(root);
  root.querySelector("#help").onclick = async () => {
    const section = location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
    location.hash = `#/aide?page=${section === "aide" ? "demarrage" : await help.slugForRoute(section)}`;
  };
  // Retour : page précédente de l'outil, sinon l'accueil (ouverture directe d'un lien).
  root.querySelector("#back").onclick = () => (history.length > 1 && sessionStorage.getItem("wawid:navigated") ? history.back() : (location.hash = "#/"));
  root.querySelector("#logout").onclick = logout;
  const pops = ["notif", "me"];
  for (const p of pops) root.querySelector(`#${p}`).onclick = (e) => {
    e.stopPropagation();
    const el = root.querySelector(`#${p}-pop`);
    const willOpen = el.hidden;
    pops.forEach((x) => (root.querySelector(`#${x}-pop`).hidden = true));
    if (p === "notif") fillNotifications();
    el.hidden = !willOpen;
  };
  document.addEventListener("click", (e) => { if (!e.target.closest(".popover")) pops.forEach((x) => (root.querySelector(`#${x}-pop`).hidden = true)); });
  root.querySelector("#shell-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = root.querySelector("#q").value.trim();
    if (!q) return;
    const app = APPS.find((a) => q && !a.create && !a.external && a.title.toLowerCase().includes(q.toLowerCase()) && ctx.can(a.perm));
    location.hash = app ? app.href || `#/${app.path}` : `#/voyageurs?q=${encodeURIComponent(q)}`;
  });
  const net = () => root.querySelector("#net-dot").classList.toggle("off", !navigator.onLine);
  addEventListener("online", net); addEventListener("offline", net); net();
  updateBadge();
}

function updateBadge() {
  const n = ctx.data.alerts.filter((a) => a.status === "NOUVELLE").length;
  const b = root.querySelector("#notif-count");
  if (b) { b.hidden = !n; b.textContent = n > 99 ? "99+" : n; }
}

function fillNotifications() {
  const items = ctx.data.alerts.filter((a) => a.status === "NOUVELLE").slice(0, 6);
  root.querySelector("#notif-pop").innerHTML = `<div class="card-head"><h3>Alertes nouvelles</h3><a class="btn btn-sm btn-ghost" style="margin-left:auto" href="#/alertes">Tout voir</a></div>` +
    (items.length ? items.map((a) => `<a class="popover-item" href="#/alertes?id=${a.id}">${status("severity", a.severity)}<span><b>${esc(a.title)}</b><br><span class="small muted">${esc(a.traveler)} · ${esc(ctx.poste(a.posteId))} · ${ago(a.ts)}</span></span></a>`).join("") : `<div class="empty">Aucune alerte nouvelle</div>`);
}

// ---------- Launchpad ----------
const hiddenTiles = () => { try { return JSON.parse(localStorage.getItem("wawid:hidden") || "[]"); } catch { return []; } };
const saveHidden = (list) => { try { localStorage.setItem("wawid:hidden", JSON.stringify(list)); } catch {} };
let editing = false;

function renderHome(el) {
  const d = ctx.data;
  const space = sessionStorage.getItem("wawid:space") || "Mon accueil";
  const hidden = hiddenTiles();
  const visible = APPS.filter((a) => ctx.can(a.perm));
  const date = new Date().toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const tile = (a) => {
    const off = hidden.includes(a.id);
    if (off && !editing && space === "Mon accueil") return "";
    const href = a.href || `#/${a.path}`;
    const toggle = editing ? `<button class="tile-toggle" data-toggle="${a.id}" title="${off ? "Afficher" : "Masquer"} sur Mon accueil">${icon(off ? "eye" : "check")}</button>` : "";
    if (a.create) return `<a class="tile create ${off ? "off" : ""}" href="${href}"><div class="tile-title">${esc(a.title)}</div><div class="tile-sub">${esc(a.sub)}</div><div class="tile-foot"><span class="tile-plus">${icon("plus")}</span></div>${toggle}</a>`;
    const [v, unit] = a.kpi ? a.kpi(d) : [];
    return `<a class="tile ${off ? "off" : ""}" href="${href}" ${a.external ? 'target="_blank"' : ""}>
      <div class="tile-title">${esc(a.title)}</div><div class="tile-sub">${esc(a.sub)}</div>
      <div class="tile-foot"><span class="tile-glyph">${icon(a.icon)}</span>${a.kpi ? `<span class="tile-num"><span class="tile-kpi ${a.tone && v ? a.tone : ""}">${fmtNum(v, Number.isInteger(v) ? 0 : 1)}</span><span class="tile-info">${esc(unit)}</span></span>` : a.external ? `<span class="tile-info">${icon("arrowRight")}</span>` : ""}</div>${toggle}
    </a>`;
  };
  const sections = (space === "Mon accueil" ? SPACES : [space]).map((s) => {
    const apps = visible.filter((a) => a.space === s);
    const html = apps.map(tile).join("");
    return html.trim() ? `<section class="tile-group"><h2>${esc(s)}</h2><div class="tiles">${html}</div></section>` : "";
  }).join("");
  el.innerHTML = `
  <header class="home-head">
    <h1>Bonjour ${esc(ctx.me.name.split(" ")[0])} <span>${esc(date)}</span></h1>
    <button class="btn" id="perso">${icon(editing ? "check" : "settings")} ${editing ? "Terminer" : "Personnaliser"}</button>
  </header>
  ${editing ? `<div class="msg info" style="margin-bottom:16px">${icon("eye")}<span>Choisissez les tuiles affichées sur « Mon accueil ». Elles restent accessibles dans leur espace.</span></div>` : ""}
  <nav class="space-tabs" role="tablist">${["Mon accueil", ...SPACES].filter((s) => s === "Mon accueil" || visible.some((a) => a.space === s)).map((s) => `<button role="tab" aria-selected="${s === space}" data-space="${esc(s)}">${esc(s)}</button>`).join("")}</nav>
  ${sections}`;
  el.querySelectorAll("[data-space]").forEach((b) => (b.onclick = () => { sessionStorage.setItem("wawid:space", b.dataset.space); renderHome(el); }));
  el.querySelector("#perso").onclick = () => { editing = !editing; renderHome(el); };
  el.querySelectorAll("[data-toggle]").forEach((b) => (b.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    const list = hiddenTiles();
    saveHidden(list.includes(b.dataset.toggle) ? list.filter((x) => x !== b.dataset.toggle) : [...list, b.dataset.toggle]);
    renderHome(el);
  }));
}

// ---------- Routeur ----------
addEventListener("hashchange", () => sessionStorage.setItem("wawid:navigated", "1"));

async function route() {
  const view = root.querySelector("#view");
  if (!view) return;
  const [path, qs] = location.hash.replace(/^#\/?/, "").split("?");
  const [section, ...rest] = path.split("/");
  const query = Object.fromEntries(new URLSearchParams(qs || ""));
  const app = APPS.find((a) => a.path === section && a.view);
  root.querySelector("#shell-app").textContent = app ? app.title : "Accueil";
  root.querySelector("#back").hidden = !section;
  document.title = app ? `${app.title} · WawID` : "WawID Back-office";
  scrollTo(0, 0);
  if (!app) return renderHome(view);
  if (!ctx.can(app.perm)) { view.innerHTML = `<div class="card empty">${icon("lock")}<p>Accès non autorisé pour le rôle « ${esc(ctx.me.roleLabel)} ».</p></div>`; return; }
  try {
    await app.view[app.fn || "render"](view, ctx, rest, query);
  } catch (e) {
    console.error(e);
    if (e.status === 401) return logout();
    view.innerHTML = `<div class="msg critical">${icon("alert")}<span>${esc(e.message)}</span></div>`;
  }
  updateBadge();
}

async function start() {
  // Plateformes dissociées : une session ouverte sur la plateforme des compagnies n'ouvre pas l'espace DPAF.
  if (ctx.me?.platform && ctx.me.platform !== "dpaf") {
    await api("/api/session", { method: "DELETE" }).catch(() => {});
    ctx.me = null;
    return renderLogin("Ce compte est un compte compagnie : connectez-vous sur la plateforme des compagnies aériennes.");
  }
  await ctx.reload();
  renderShell();
  addEventListener("hashchange", route);
  await route();
  // Rafraîchissement périodique (passages eGate, alertes) sans recharger la vue en cours de saisie.
  setInterval(async () => {
    if (document.hidden) return;
    const before = ctx.data.alerts.filter((a) => a.status === "NOUVELLE").length;
    try { await ctx.reload(); } catch (e) { if (e.status === 401) return logout(); return; }
    const after = ctx.data.alerts.filter((a) => a.status === "NOUVELLE").length;
    if (after > before) toast(`${after - before} nouvelle(s) alerte(s)`, "critical");
    updateBadge();
    document.dispatchEvent(new CustomEvent("wawid:data"));
  }, 30000);
}

addEventListener("keydown", (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) {
    const q = document.getElementById("q");
    if (q) { e.preventDefault(); q.focus(); }
  }
});

(async () => {
  await initI18n("../");
  try {
    ctx.me = (await api("/api/session")).user;
    await start();
  } catch { renderLogin(); }
})();
