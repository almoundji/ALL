// Utilitaires partagés par le portail usagers, la console d'administration et la documentation.
export const SITE_NAME = "Développement et promotion de l'Artisanat national";

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(Number(n) || 0));
export const fcfa = (n) => `${fmt(n)} FCFA`;
export const mfcfa = (n) => (Math.abs(n) >= 1e9 ? `${(n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Md FCFA` : Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M FCFA` : fcfa(n));
export const date = (d) => (d ? new Date(d.length === 10 ? d + "T12:00:00Z" : d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—");
export const dateShort = (d) => (d ? new Date(d.length === 10 ? d + "T12:00:00Z" : d).toLocaleDateString("fr-FR") : "—");
export const dateTime = (d) => (d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");
export const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

export async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch("/api" + path, { method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (res.headers.get("content-type")?.includes("text/csv")) return res.blob();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.detail || `Erreur ${res.status}`); e.status = res.status; throw e; }
  return data;
}

export function toast(msg, err = false) {
  const t = document.createElement("div"); t.className = "toast" + (err ? " err" : ""); t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 4200);
}

export const formData = (form) => {
  const o = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === "checkbox") { if (el.dataset.multi) { (o[el.name] ||= []); if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.checked; }
    else if (el.type === "radio") { if (el.checked) o[el.name] = el.value; }
    else o[el.name] = el.value;
  }
  return o;
};
export const options = (list, sel = "", empty = "") => (empty !== null ? `<option value="">${esc(empty)}</option>` : "") + list.map((x) => `<option${x === sel ? " selected" : ""}>${esc(x)}</option>`).join("");

// Libellés des statuts (portail et administration)
export const STATUTS = {
  en_attente: ["En attente de validation", "wait", "crit"], valide: ["Validé", "ok", "pos"], rejete: ["Rejeté", "ko", "neg"],
  ouvert: ["Ouvert", "ok", "pos"], clos: ["Clos", "", "crit"], attribue: ["Attribué", "info", "info"],
  soumise: ["Soumise", "wait", "info"], retenue: ["Retenue", "ok", "pos"], non_retenue: ["Non retenue", "ko", "neg"],
  instruction: ["En instruction", "wait", "crit"], accordee: ["Accordée", "ok", "pos"], rejetee: ["Rejetée", "ko", "neg"], decaissee: ["Décaissée", "info", "info"],
  bon: ["Bon état", "ok", "pos"], moyen: ["État moyen", "wait", "crit"], degrade: ["Dégradé", "ko", "neg"],
};
export const tag = (s) => { const [l, c] = STATUTS[s] || [s, ""]; return `<span class="tag ${c}">${esc(l)}</span>`; };
export const ostatus = (s, inv = false) => { const [l, , c] = STATUTS[s] || [s, "", ""]; return `<span class="ostatus ${c}${inv ? " inv" : ""}">${esc(l)}</span>`; };
export const foncierClass = (f) => (f.startsWith("Titre") || f.startsWith("Bail") ? "pos" : f === "Non régularisé" ? "neg" : "crit");

// Illustrations vectorielles (pas d'images externes) — motifs aux couleurs nationales
const PICTOS = {
  conseil: '<g fill="#fff"><path d="M300 70 L400 115 H200 Z"/><rect x="210" y="122" width="180" height="10"/><rect x="222" y="138" width="16" height="70"/><rect x="262" y="138" width="16" height="70"/><rect x="322" y="138" width="16" height="70"/><rect x="362" y="138" width="16" height="70"/><rect x="200" y="212" width="200" height="14"/></g>',
  recensement: '<g fill="none" stroke="#fff" stroke-width="10"><rect x="200" y="85" width="200" height="130" rx="14"/><circle cx="255" cy="140" r="24"/><path d="M220 195c10-22 60-22 70 0"/><path d="M310 125h65M310 150h65M310 175h45"/></g>',
  commande: '<g fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"><path d="M200 120h200v20H200z"/><path d="M215 140v85M385 140v85M240 140v60M360 140v60"/><path d="M230 120l20-40h100l20 40"/></g>',
  financement: '<g fill="none" stroke="#fff" stroke-width="10"><ellipse cx="270" cy="185" rx="60" ry="18"/><path d="M210 185v-25M330 185v-25"/><ellipse cx="270" cy="160" rx="60" ry="18"/><ellipse cx="270" cy="130" rx="60" ry="18"/><path d="M210 130v30M330 130v30"/><circle cx="365" cy="105" r="30"/><path d="M365 92v26"/></g>',
  infrastructures: '<g fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"><path d="M190 140l110-65 110 65"/><path d="M215 130v95h170v-95"/><path d="M275 225v-55h50v55"/></g>',
  formation: '<g fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"><path d="M300 100c-40-20-80-20-110-10v120c30-10 70-10 110 10 40-20 80-20 110-10V90c-30-10-70-10-110 10z"/><path d="M300 100v120"/></g>',
};
const BG = { conseil: ["#0b3d20", "#008f36"], recensement: ["#006f2a", "#2aa35a"], commande: ["#3a2a12", "#a86b1f"], financement: ["#5a4b00", "#c9a400"], infrastructures: ["#5a0610", "#e1001a"], formation: ["#1a2a44", "#2f62a8"] };
export function illustration(kind = "conseil", id = 0) {
  const [a, b] = BG[kind] || BG.conseil; const gid = `g${kind}${id}${Math.random().toString(36).slice(2, 6)}`;
  let motif = "";
  for (let i = 0; i < 12; i++) motif += `<path d="M${-60 + i * 60} 300 L${i * 60} 240 L${60 + i * 60} 300 Z" fill="${["#008f36", "#ffeb00", "#e1001a"][i % 3]}" opacity=".85"/>`;
  return `<svg viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration ${esc(kind)}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="600" height="300" fill="url(#${gid})"/><g opacity=".12" fill="#fff">${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 600}" cy="${(i * 53) % 240}" r="${2 + (i % 4)}"/>`).join("")}</g>
    ${PICTOS[kind] || PICTOS.conseil}${motif}</svg>`;
}

// Graphiques SVG simples (barres horizontales / verticales, anneau)
export function barsH(entries, { color = "#0064d9", max, format = fmt } = {}) {
  const m = max || Math.max(1, ...entries.map((e) => e[1]));
  return `<div class="micro">${entries.map(([k, v]) => `<div class="r"><span title="${esc(k)}">${esc(k)}</span><div class="bar"><i style="width:${(100 * v) / m}%;background:${color}"></i></div><b>${esc(format(v))}</b></div>`).join("")}</div>`;
}
export function barsV(entries, { color = "#0064d9", height = 160 } = {}) {
  const w = 600, pad = 24, m = Math.max(1, ...entries.map((e) => e[1])), bw = (w - pad * 2) / Math.max(1, entries.length);
  return `<svg class="chart" viewBox="0 -14 ${w} ${height + 54}" role="img" aria-label="Histogramme">${entries.map(([k, v], i) => {
    const h = (height * v) / m, x = pad + i * bw;
    return `<rect x="${x + 3}" y="${height - h + 10}" width="${Math.max(2, bw - 6)}" height="${h}" rx="3" fill="${color}"><title>${esc(k)} : ${fmt(v)}</title></rect>` +
      (entries.length <= 16 || i % 2 === 0 ? `<text x="${x + bw / 2}" y="${height + 28}" text-anchor="middle">${esc(k)}</text>` : "") +
      (entries.length <= 16 ? `<text class="lbl" x="${x + bw / 2}" y="${height - h + 4}" text-anchor="middle">${fmt(v)}</text>` : "");
  }).join("")}</svg>`;
}
export function donut(entries, colors, size = 150) {
  const total = entries.reduce((a, e) => a + e[1], 0) || 1, r = 52, c = 2 * Math.PI * r; let off = 0;
  const arcs = entries.map(([k, v], i) => { const len = (c * v) / total; const s = `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${colors[i % colors.length]}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${esc(k)} : ${fmt(v)}</title></circle>`; off += len; return s; }).join("");
  return `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><svg width="${size}" height="${size}" viewBox="0 0 140 140" role="img" aria-label="Répartition">${arcs}<text x="70" y="76" text-anchor="middle" style="font-size:18px;font-weight:700;fill:#1d2d3e">${fmt(total)}</text></svg>
    <div class="legend" style="flex-direction:column;gap:6px">${entries.map(([k, v], i) => `<span><i style="background:${colors[i % colors.length]}"></i>${esc(k)} — <b>${fmt(v)}</b></span>`).join("")}</div></div>`;
}

// Rendu Markdown minimal (documentation) : titres, listes, tableaux, code, citations, gras, italique, liens.
export function markdown(src) {
  const inline = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[\s(])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, l, u) => `<a href="${/^(https?:|\/|#|\.)/.test(u) ? u : "#"}">${l}</a>`);
  const lines = src.replace(/\r/g, "").split("\n"); let out = "", i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith("```")) { let code = ""; i++; while (i < lines.length && !lines[i].startsWith("```")) code += lines[i++] + "\n"; i++; out += `<pre><code>${esc(code)}</code></pre>`; continue; }
    const h = l.match(/^(#{1,4})\s+(.*)/); if (h) { const id = h[2].toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-"); out += `<h${h[1].length} id="${id}">${inline(h[2])}</h${h[1].length}>`; i++; continue; }
    if (/^\|/.test(l)) { const rows = []; while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]); const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      out += `<table><thead><tr>${cells(rows[0]).map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.slice(2).map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`; continue; }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) { const ordered = /^\s*\d+\./.test(l); let items = ""; while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items += `<li>${inline(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""))}</li>`; out += ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`; continue; }
    if (l.startsWith(">")) { let q = ""; while (i < lines.length && lines[i].startsWith(">")) q += lines[i++].replace(/^>\s?/, "") + " "; out += `<blockquote>${inline(q)}</blockquote>`; continue; }
    if (!l.trim()) { i++; continue; }
    let p = ""; while (i < lines.length && lines[i].trim() && !/^(#|```|\||>|\s*([-*]|\d+\.)\s)/.test(lines[i])) p += lines[i++] + " "; out += `<p>${inline(p)}</p>`;
  }
  return out;
}
