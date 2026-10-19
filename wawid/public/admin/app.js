// Back-office WawID : session, shell Fiori, launchpad et routeur.
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
const APPS = [
  { space: "Contrôle frontière", id: "dashboard", path: "dashboard", title: "Tableau de bord", sub: "Entrées, sorties, fraude", icon: "chart", perm: "read", view: dashboard, accent: true, kpi: (d) => [today(d).length, "passages 24 h"] },
  { space: "Contrôle frontière", id: "controle", path: "controle", title: "Contrôle guichet", sub: "Document, biométrie, décision", icon: "scan", perm: "control", view: control },
  { space: "Contrôle frontière", id: "egates", path: "egates", title: "eGates & ABC", sub: "Supervision temps réel", icon: "gate", perm: "read", view: gates, kpi: (d) => [d.gates.filter((g) => g.status === "EN_SERVICE").length, `/ ${d.gates.length} en service`] },
  { space: "Contrôle frontière", id: "passages", path: "passages", title: "Passages", sub: "Historique des franchissements", icon: "list", perm: "read", view: crossings, kpi: (d) => [d.crossings.length, "sur 14 j"] },
  { space: "Contrôle frontière", id: "voyageurs", path: "voyageurs", title: "Recherche voyageur", sub: "Profil 360° et parcours", icon: "user", perm: "read", view: crossings, fn: "renderSearch" },
  { space: "Contrôle frontière", id: "verifier", path: "verifier", title: "Vérifier un QR", sub: "e-Visa · WawPass", icon: "qr", perm: "read", view: evisa, fn: "renderVerify" },
  { space: "Contrôle frontière", id: "vehicules", path: "vehicules", title: "Véhicules (VRS)", sub: "Postes terrestres", icon: "car", perm: "read", view: ses, fn: "renderVehicles", kpi: (d) => [d.vehicles.filter((v) => v.flagged).length, "signalés"], tone: "warning" },

  { space: "Renseignement", id: "alertes", path: "alertes", title: "Threat Monitor", sub: "Alertes à traiter", icon: "shieldAlert", perm: "alerts", view: threat, kpi: (d) => [d.alerts.filter((a) => a.status === "NOUVELLE").length, "nouvelles"], tone: "critical" },
  { space: "Renseignement", id: "dossiers", path: "dossiers", title: "Dossiers", sub: "Contrôle secondaire & entretiens", icon: "briefcase", perm: "cases", view: threat, fn: "renderCases", kpi: (d) => [d.cases.filter((c) => c.status === "OUVERT").length, "ouverts"] },
  { space: "Renseignement", id: "surveillance", path: "surveillance", title: "Listes de surveillance", sub: "Interpol, FPR, WAPIS, POI, SLTD", icon: "target", perm: "read", view: intel, kpi: (d) => [d.watchlist.filter((w) => w.active).length, "entrées actives"] },
  { space: "Renseignement", id: "regles", path: "regles", title: "Règles de ciblage", sub: "Profils de risque (POI)", icon: "filter", perm: "read", view: intel, fn: "renderRules", kpi: (d) => [d.rules.filter((r) => r.enabled).length, "actives"] },
  { space: "Renseignement", id: "connecteurs", path: "connecteurs", title: "Connecteurs", sub: "Interpol I-24/7, WAPIS, fichiers nationaux", icon: "link", perm: "read", view: intel, fn: "renderConnectors" },

  { space: "APIS & e-Visa", id: "apis", path: "apis", title: "APIS Monitor", sub: "Pré-contrôle API / PNR", icon: "plane", perm: "read", view: apis, kpi: (d) => [d.flights.length, "vols annoncés"] },
  { space: "APIS & e-Visa", id: "evisa", path: "evisa", title: "e-Visa (VMS)", sub: "Instruction des demandes", icon: "fileCheck", perm: "read", view: evisa, kpi: (d) => [d.evisas.filter((v) => ["SOUMISE", "EN_EXAMEN"].includes(v.status)).length, "à instruire"], tone: "warning" },
  { space: "APIS & e-Visa", id: "wawpass", path: "wawpass", title: "WawPass & enrôlements", sub: "Taxe de sécurité · pré-enrôlement eGate", icon: "creditCard", perm: "read", view: evisa, fn: "renderPasses" },

  { space: "Administration", id: "systemes", path: "systemes", title: "Supervision systèmes", sub: "Terminaux, CCTV, scanners", icon: "server", perm: "read", view: ses, kpi: (d) => [d.devices.filter((x) => x.status !== "EN_LIGNE").length, "anomalies"], tone: "warning" },
  { space: "Administration", id: "utilisateurs", path: "utilisateurs", title: "Utilisateurs & rôles", sub: "Habilitations", icon: "users", perm: "users", view: ses, fn: "renderUsers" },
  { space: "Administration", id: "audit", path: "audit", title: "Journal d'audit", sub: "Chaîne d'intégrité SHA-256", icon: "lock", perm: "read", view: ses, fn: "renderAudit" },
  { space: "Administration", id: "parametres", path: "parametres", title: "Paramètres", sub: "Politique visa, seuils, données", icon: "settings", perm: "system", view: ses, fn: "renderSettings" },
  { space: "Administration", id: "projet", path: "projet", title: "Projet (Scrum)", sub: "Backlog & sprints", icon: "kanban", perm: "read", view: scrum },
];
const SPACES = ["Contrôle frontière", "Renseignement", "APIS & e-Visa", "Administration"];
const today = (d) => d.crossings.filter((c) => Date.now() - Date.parse(c.ts) < 86400000);

// ---------- Connexion ----------
function renderLogin(error = "") {
  root.innerHTML = `
  <main class="login">
    <section class="login-art">
      <a class="brand" href="../" style="color:#fff"><span class="brand-logo">${LOGO}</span><span><span class="brand-name" style="color:#fff">${WORDMARK}</span><br><span class="brand-sub" style="color:#9fb3c8">Identité & frontières</span></span></a>
      <div style="position:relative;z-index:1">
        <span class="pill-dark" style="background:rgba(255,255,255,.08)">${icon("zap")} BCS · TMS · APIS · e-VISA</span>
        <h1 style="margin-top:18px">WawID<br><span style="color:var(--accent)">Back-office</span> sécurisé</h1>
        <p style="color:#ccc;max-width:440px">Contrôle aux frontières, eGates & ABC, renseignement et autorisations de voyage dans une seule console.</p>
      </div>
      <div class="rings" aria-hidden="true"></div>
    </section>
    <section class="login-form">
      <form id="login-form">
        <div><h2 style="font:800 26px var(--display)">Connexion</h2><p class="muted">Accès réservé aux agents habilités. Toutes les actions sont journalisées.</p></div>
        <label class="field"><span>Identifiant</span><input class="input" name="username" autocomplete="username" required autofocus></label>
        <label class="field"><span>Mot de passe</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
        ${error ? `<div class="msg critical" role="alert">${icon("alert")}<span>${esc(error)}</span></div>` : ""}
        <button class="btn btn-primary btn-lg" type="submit">${icon("logIn")} Se connecter</button>
        <a class="small muted" href="../">← Portail voyageur</a>
      </form>
    </section>
  </main>`;
  root.querySelector("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const { user } = await api("/api/session", { method: "POST", body: { username: f.get("username"), password: f.get("password") } });
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
      <a class="brand" href="#/" title="Accueil"><span class="brand-logo">${LOGO}</span></a>
      <div class="shell-title"><span class="brand-name">${WORDMARK}</span><span class="shell-app" id="shell-app">Accueil</span></div>
      <form class="shell-search" id="shell-search" role="search">${icon("search")}<input id="q" placeholder="Rechercher un voyageur, un document, une application…" aria-label="Recherche globale"><kbd>/</kbd></form>
      <div class="shell-actions">
        <span class="poste-chip" title="Poste et connexion"><span class="net-dot" id="net-dot"></span>${esc(ctx.poste(ctx.me.posteId))}</span>
        <button class="btn btn-ghost btn-icon" id="theme" title="Thème clair / sombre">${icon("moon")}</button>
        <div style="position:relative"><button class="btn btn-ghost btn-icon" id="notif" title="Notifications">${icon("bell")}<span class="badge-count" id="notif-count" hidden></span></button><div class="popover" id="notif-pop" hidden></div></div>
        <div style="position:relative"><button class="avatar" id="me" title="${esc(ctx.me.name)}">${esc(initials)}</button><div class="popover" id="me-pop" hidden style="width:280px">
          <div style="padding:16px"><b>${esc(ctx.me.name)}</b><div class="small muted">${esc(ctx.me.roleLabel)} · ${esc(ctx.poste(ctx.me.posteId))}</div></div>
          <a class="popover-item" href="../gate/" target="_blank">${icon("gate")} Ouvrir le kiosque eGate</a>
          <a class="popover-item" href="../" target="_blank">${icon("globe")} Portail voyageur</a>
          <button class="popover-item" id="logout">${icon("logOut")} Se déconnecter</button>
        </div></div>
      </div>
    </div>
  </header>
  <main class="page" id="view"></main>`;

  root.querySelector("#theme").onclick = toggleTheme;
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
    const app = APPS.find((a) => q && a.title.toLowerCase().includes(q.toLowerCase()) && ctx.can(a.perm));
    location.hash = app ? `#/${app.path}` : `#/voyageurs?q=${encodeURIComponent(q)}`;
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
function renderHome(el) {
  const d = ctx.data;
  const t = today(d);
  const space = sessionStorage.getItem("wawid:space") || "Tous";
  const visible = APPS.filter((a) => ctx.can(a.perm));
  const tile = (a) => {
    const [v, unit] = a.kpi ? a.kpi(d) : [];
    return `<a class="tile ${a.accent ? "accent" : ""}" href="#/${a.path}">
      <div class="tile-title">${esc(a.title)}</div><div class="tile-sub">${esc(a.sub)}</div>
      <div class="tile-foot">${a.kpi ? `<div><div class="tile-kpi ${a.tone && v ? a.tone : ""}">${fmtNum(v)}</div><div class="tile-info">${esc(unit)}</div></div>` : "<span></span>"}<span class="tile-icon">${icon(a.icon)}</span></div>
    </a>`;
  };
  const fraud = t.filter((c) => c.risk.fraud).length;
  el.innerHTML = `
  <section class="hero">
    <div>
      <span class="pill-dark">${icon("zap")} Biométrie · eGates · Interpol · APIS · e-Visa</span>
      <h1>L'identité <span class="hl">vérifiée</span><br>à chaque frontière</h1>
      <p>Bonjour ${esc(ctx.me.name.split(" ")[0])} — ${fmtNum(t.length)} passages sur 24 h, dont ${fmtNum(t.filter((c) => c.channel === "EGATE").length)} par eGate, ${fmtNum(fraud)} suspicion(s) de fraude.</p>
    </div>
    <div class="row">${ctx.can("control") ? `<a class="btn btn-primary btn-lg" href="#/controle">${icon("scan")} Nouveau contrôle</a>` : ""}<a class="btn btn-lg" href="#/dashboard">${icon("chart")} Tableau de bord</a></div>
  </section>
  <nav class="space-tabs" role="tablist">${["Tous", ...SPACES].map((s) => `<button role="tab" aria-selected="${s === space}" data-space="${esc(s)}">${esc(s)}</button>`).join("")}</nav>
  ${SPACES.filter((s) => space === "Tous" || s === space).map((s) => {
    const apps = visible.filter((a) => a.space === s);
    return apps.length ? `<section class="tile-group"><h2>${esc(s)}</h2><div class="tiles">${apps.map(tile).join("")}</div></section>` : "";
  }).join("")}`;
  el.querySelectorAll("[data-space]").forEach((b) => (b.onclick = () => { sessionStorage.setItem("wawid:space", b.dataset.space); renderHome(el); }));
}

// ---------- Routeur ----------
async function route() {
  const view = root.querySelector("#view");
  if (!view) return;
  const [path, qs] = location.hash.replace(/^#\/?/, "").split("?");
  const [section, ...rest] = path.split("/");
  const query = Object.fromEntries(new URLSearchParams(qs || ""));
  const app = APPS.find((a) => a.path === section);
  root.querySelector("#shell-app").textContent = app ? app.title : "Accueil";
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
  try {
    ctx.me = (await api("/api/session")).user;
    await start();
  } catch { renderLogin(); }
})();
