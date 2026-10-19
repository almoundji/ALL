// WawID — utilitaires d'interface partagés (icônes, format, API, dialogues, toasts, thème, QR).
import { locale } from "./i18n.js";
import { COUNTRIES } from "./engine.js";

const PATHS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  shieldCheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  shieldAlert: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  fingerprint: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  fileCheck: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>',
  file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-2.93 1.41-1.41M17.66 6.34l1.41-1.41M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  wifi: '<path d="M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 20 0M12 20h.01"/>',
  wifiOff: '<path d="M12 20h.01M8.5 16.43a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 4.17-2.65M10.66 5c4.01-.36 8.14.9 11.34 3.76M16.85 11.25a10 10 0 0 1 2.22 1.68M5 13a10 10 0 0 1 5.24-2.76M2 2l20 20"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7M19 12H5"/>',
  arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  logIn: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  idCard: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  gate: '<path d="M4 21V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v17M15 21V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v17M2 21h20M9 12h6"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 6H7.3a2 2 0 0 0-1.6.8L3 10.5 1.6 11c-.6.2-1 .8-1 1.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/>',
  server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4M20 17v3"/>',
  creditCard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  kanban: '<path d="M6 5v11M12 5v6M18 5v14"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  power: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  play: '<path d="m6 3 14 9-14 9V3z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
};

export const icon = (name, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || ""}</svg>`;

// Logo WawID : écusson et empreinte stylisée (identité propre, indépendante de la charte de l'éditeur).
export const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#14254B"/><path d="M20 7.2 30 11v7.8c0 6.5-4.2 11.4-10 13.4-5.8-2-10-6.9-10-13.4V11z" fill="none" stroke="#E4572E" stroke-width="2.3" stroke-linejoin="round"/><g fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"><path d="M14.6 19.4a5.6 5.6 0 0 1 10.8 0"/><path d="M16.9 25.4v-3.9a3.1 3.1 0 0 1 6.2 0v1.2"/><path d="M20 21.5v5.6"/><path d="M23.1 25.6v-.6"/></g></svg>`;
export const WORDMARK = `Waw<b>ID</b>`;

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const country = (code) => COUNTRIES[code] || code || "—";

const dtf = new Intl.DateTimeFormat(locale(), { day: "2-digit", month: "2-digit", year: "numeric" });
const dtt = new Intl.DateTimeFormat(locale(), { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const tf = new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" });
export const fmtDate = (iso) => (iso ? dtf.format(new Date(iso.length === 10 ? iso + "T00:00:00" : iso)) : "—");
export const fmtDateTime = (iso) => (iso ? dtt.format(new Date(iso)) : "—");
export const fmtTime = (iso) => (iso ? tf.format(new Date(iso)) : "—");
export const fmtNum = (n, d = 0) => (n ?? 0).toLocaleString(locale(), { maximumFractionDigits: d, minimumFractionDigits: d });
export const fmtPct = (n, d = 1) => `${fmtNum(n * 100, d)} %`;
export const fmtXOF = (n) => `${fmtNum(n)} FCFA`;
export function ago(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export const TONES = {
  decision: { AUTORISE: ["good", "Autorisé"], SECONDAIRE: ["warning", "Contrôle secondaire"], REFUSE: ["critical", "Refusé"] },
  level: { FAIBLE: ["good", "Faible"], MODERE: ["warning", "Modéré"], ELEVE: ["critical", "Élevé"] },
  severity: { critique: ["critical", "Critique"], haute: ["serious", "Haute"], moyenne: ["warning", "Moyenne"], basse: ["info", "Basse"] },
  alert: { NOUVELLE: ["critical", "Nouvelle"], EN_COURS: ["warning", "En cours"], CLOTUREE: ["good", "Clôturée"] },
  evisa: { SOUMISE: ["info", "Soumise"], EN_EXAMEN: ["warning", "En examen"], INFO_DEMANDEE: ["serious", "Info. demandée"], APPROUVEE: ["good", "Approuvée"], REFUSEE: ["critical", "Refusée"] },
  gate: { EN_SERVICE: ["good", "En service"], MAINTENANCE: ["warning", "Maintenance"], HORS_SERVICE: ["", "Hors service"], ALARME: ["critical", "Alarme"] },
  device: { EN_LIGNE: ["good", "En ligne"], "DÉGRADÉ": ["warning", "Dégradé"], HORS_LIGNE: ["critical", "Hors ligne"] },
  connector: { "CONNECTÉ": ["good", "Connecté"], "SIMULÉ": ["info", "Simulé (copie locale)"], "DÉSACTIVÉ": ["", "Désactivé"] },
  case: { OUVERT: ["warning", "Ouvert"], CLOS: ["good", "Clos"] },
};
export function status(kind, value, fallback) {
  const [tone, label] = TONES[kind]?.[value] || ["", fallback ?? value ?? "—"];
  return `<span class="status ${tone}">${esc(label)}</span>`;
}
export const riskBadge = (score, level) => `<span class="status ${TONES.level[level]?.[0] || ""}" title="Score de risque">${score} · ${esc(TONES.level[level]?.[1] || level)}</span>`;

// ---------- API ----------
export async function api(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(path, {
    method, credentials: "same-origin",
    headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Erreur ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- Toasts & dialogues ----------
export function toast(message, tone = "") {
  let host = document.querySelector(".toasts");
  if (!host) { host = document.createElement("div"); host.className = "toasts"; host.setAttribute("role", "status"); document.body.append(host); }
  const el = document.createElement("div");
  el.className = `toast ${tone}`;
  el.innerHTML = `${icon(tone === "critical" ? "alert" : "checkCircle")}<span>${esc(message)}</span>`;
  host.append(el);
  setTimeout(() => el.remove(), 4200);
}

/** Ouvre un dialogue modal. `actions` : [{ label, cls, value }] ; renvoie une promesse résolue avec { value, form }. */
export function dialog({ title, body, actions = [{ label: "Fermer", value: null }], wide = false, onMount }) {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.className = "dialog";
    if (wide) d.style.width = "min(960px, calc(100vw - 32px))";
    d.innerHTML = `<form method="dialog" novalidate>
      <div class="dialog-head"><h2>${esc(title)}</h2><button class="btn btn-ghost btn-icon" value="__close" aria-label="Fermer">${icon("x")}</button></div>
      <div class="dialog-body">${body}</div>
      <div class="dialog-foot">${actions.map((a, i) => `<button class="btn ${a.cls || ""}" value="${i}" ${a.cls?.includes("btn-primary") ? "autofocus" : ""}>${a.icon ? icon(a.icon) : ""}${esc(a.label)}</button>`).join("")}</div>
    </form>`;
    document.body.append(d);
    const form = d.querySelector("form");
    form.addEventListener("submit", (e) => {
      const btn = e.submitter;
      if (!btn || btn.value === "__close") return;
      const a = actions[+btn.value];
      if (a?.validate) {
        const error = a.validate(form);
        if (error) { e.preventDefault(); toast(error, "critical"); return; }
      }
    });
    d.addEventListener("close", () => {
      const v = d.returnValue;
      resolve({ value: v === "__close" || v === "" ? null : actions[+v]?.value ?? null, form });
      setTimeout(() => d.remove(), 50);
    });
    onMount?.(d);
    d.showModal();
  });
}

export const formData = (form) => Object.fromEntries(new FormData(form).entries());

// ---------- Thème ----------
export function initTheme() {
  try { const t = localStorage.getItem("wawid:theme"); if (t) document.documentElement.dataset.theme = t; } catch {}
}
export function toggleTheme() {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("wawid:theme", document.documentElement.dataset.theme); } catch {}
}

// ---------- QR code (bibliothèque qrcode-generator chargée par la page) ----------
export function qrSvg(text) {
  if (!window.qrcode) return `<div class="mono small">${esc(text)}</div>`;
  const q = window.qrcode(0, "M");
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

/** Exporte un tableau d'objets en CSV (séparateur ; pour Excel FR). */
export function downloadCSV(filename, rows) {
  if (!rows.length) { toast("Aucune ligne à exporter", "critical"); return; }
  const cols = Object.keys(rows[0]);
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => cell(r[c])).join(";"))].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const countryOptions = (selected = "", withEmpty = true) =>
  (withEmpty ? `<option value="">—</option>` : "") +
  Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1], "fr")).map(([c, n]) => `<option value="${c}" ${c === selected ? "selected" : ""}>${esc(n)} (${c})</option>`).join("");
