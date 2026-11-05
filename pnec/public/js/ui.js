// Composants d'interface réutilisables : icônes, tuiles, badges, modales, graphiques.

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nf = new Intl.NumberFormat('fr-FR');
export const num = (n) => nf.format(Math.round(n || 0));
export function fcfa(n, court = false) {
  if (court) {
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mds`;
    if (Math.abs(n) >= 1e5) return `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  }
  return `${num(n)} FCFA`;
}
export const date = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const dateLongue = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// Icônes au trait (24×24, stroke currentColor)
const P = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h2a2 2 0 0 1 2 2v10"/><path d="M8 7h4M8 11h4M8 15h4"/><path d="M2 21h20"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2A5 5 0 0 1 21.5 19"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="1"/><rect x="12" y="8" width="3" height="10" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  graduation: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/><path d="M22 9v6"/>',
  handshake: '<path d="M11 17l2 2a1.4 1.4 0 0 0 2-2"/><path d="M14 14l2.5 2.5a1.4 1.4 0 0 0 2-2L15 11"/><path d="M2 12l4-4 5 1 3-2 4 1 4 4"/><path d="M6 8l-4 6 5 5 2-2"/><path d="M18 9l4 5-3 3"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
};
export const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.grid}</svg>`;

export function tile({ titre, sous, ico = 'grid', valeur, legende, href, alerte }) {
  return `<a class="tile${alerte ? ' tile--alerte' : ''}" href="${href}">
    <div class="tile-h"><h3>${esc(titre)}</h3>${sous ? `<p>${esc(sous)}</p>` : ''}</div>
    <div class="tile-b">${icon(ico)}<div class="tile-v"><strong>${esc(valeur)}</strong><span>${esc(legende || '')}</span></div></div>
  </a>`;
}
export function tileCreer({ titre, sous, href }) {
  return `<a class="tile tile--creer" href="${href}"><div class="tile-h"><h3>${esc(titre)}</h3><p>${esc(sous)}</p></div>${icon('plus', 'plus')}</a>`;
}

export const badge = (label, ton = 'neutre') => `<span class="badge badge--${ton}">${esc(label)}</span>`;

export function scorePill(score, seuil) {
  if (score == null) return '<span class="muted">—</span>';
  const ton = score >= 75 ? 'ok' : score >= seuil ? 'info' : 'gris';
  return `<span class="score score--${ton}" title="Score d'adéquation IA">${score}<small>/100</small></span>`;
}

export function pageHead(titre, sous = '', actions = '', retour = '') {
  return `<div class="page-head">
    <div>${retour ? `<a class="lien-retour" href="${retour}">${icon('back')} Retour</a>` : ''}
    <h1>${esc(titre)}</h1>${sous ? `<p class="muted">${sous}</p>` : ''}</div>
    <div class="actions">${actions}</div></div>`;
}

export function empty(msg) { return `<div class="vide">${icon('inbox')}<p>${esc(msg)}</p></div>`; }

// ---------- Toast & modale ----------
export function toast(msg, ton = 'ok') {
  document.querySelectorAll('.toast').forEach((x) => x.remove());
  const t = document.createElement('div');
  t.className = `toast toast--${ton}`;
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('on'));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 300); }, 3200);
}

export function modal(titre, corps, { valider = 'Valider', annuler = 'Annuler', onValider, large = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal${large ? ' modal--large' : ''}" role="dialog" aria-modal="true" aria-label="${esc(titre)}">
    <div class="modal-h"><h2>${esc(titre)}</h2><button class="btn-ico" data-close aria-label="Fermer">${icon('x')}</button></div>
    <form class="modal-b">${corps}<div class="modal-f">
      ${annuler ? `<button type="button" class="btn" data-close>${esc(annuler)}</button>` : ''}
      ${valider ? `<button type="submit" class="btn btn--primaire">${esc(valider)}</button>` : ''}</div></form></div>`;
  const close = () => wrap.remove();
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
  wrap.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const ok = onValider ? await onValider(fd, e.target) : true;
    if (ok !== false) close();
  });
  document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
  document.body.appendChild(wrap);
  wrap.querySelector('input, select, textarea, button[type=submit]')?.focus();
  return wrap;
}

// ---------- Graphiques (SVG, une seule série, teinte verte) ----------
// Barres horizontales triées : valeur à droite de chaque barre, info-bulle au survol.
export function barsH(rows, { format = num, max } = {}) {
  if (!rows.length) return empty('Aucune donnée');
  const m = max ?? Math.max(...rows.map((r) => r.value), 1);
  return `<div class="bars" role="list">${rows.map((r) => `
    <div class="bar-row" role="listitem" data-tip="${esc(r.label)} : ${esc(format(r.value))}${r.extra ? ' — ' + esc(r.extra) : ''}">
      <span class="bar-l">${esc(r.label)}</span>
      <span class="bar-t"><span class="bar-f" style="width:${Math.max(r.value ? 1.5 : 0, (r.value / m) * 100)}%"></span></span>
      <span class="bar-v">${esc(format(r.value))}</span>
    </div>`).join('')}</div>`;
}

// Entonnoir du parcours : barres centrées, taux de passage entre étapes.
export function funnel(steps) {
  const m = Math.max(...steps.map((s) => s.value), 1);
  return `<div class="funnel">${steps.map((s, i) => `
    <div class="fun-row" data-tip="${esc(s.label)} : ${num(s.value)}">
      <span class="fun-l">${esc(s.label)}</span>
      <span class="fun-t"><span class="fun-f" style="width:${Math.max(2, (s.value / m) * 100)}%"></span></span>
      <span class="fun-v">${num(s.value)}${i ? `<small>${pct(s.value, steps[i - 1].value)} %</small>` : ''}</span>
    </div>`).join('')}</div>`;
}

// Colonnes (évolution mensuelle), base à zéro, étiquettes d'axe sobres.
export function columns(rows, { format = num } = {}) {
  const W = 640, H = 220, pad = { l: 8, r: 8, t: 22, b: 28 };
  const m = Math.max(...rows.map((r) => r.value), 1);
  const bw = (W - pad.l - pad.r) / rows.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / m);
  const bars = rows.map((r, i) => {
    const x = pad.l + i * bw + bw * 0.2, w = bw * 0.6, yy = y(r.value), h = H - pad.b - yy;
    const rad = Math.min(4, w / 2, h);
    const d = h > 0 ? `M${x},${H - pad.b} V${yy + rad} Q${x},${yy} ${x + rad},${yy} H${x + w - rad} Q${x + w},${yy} ${x + w},${yy + rad} V${H - pad.b} Z` : '';
    return `<g class="col" data-tip="${esc(r.label)} : ${esc(format(r.value))}">
      <rect x="${pad.l + i * bw}" y="${pad.t}" width="${bw}" height="${H - pad.t - pad.b}" fill="transparent"/>
      ${d ? `<path d="${d}" class="col-f"/>` : ''}
      ${r.value ? `<text x="${x + w / 2}" y="${yy - 6}" text-anchor="middle" class="col-v">${esc(format(r.value))}</text>` : ''}
      <text x="${x + w / 2}" y="${H - 8}" text-anchor="middle" class="col-l">${esc(r.label)}</text></g>`;
  }).join('');
  return `<svg class="cols" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution mensuelle">
    <line x1="${pad.l}" x2="${W - pad.r}" y1="${H - pad.b}" y2="${H - pad.b}" class="axe"/>${bars}</svg>`;
}

export function tableau(entetes, lignes) {
  return `<div class="table-wrap"><table><thead><tr>${entetes.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${lignes.map((l) => `<tr>${l.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// Info-bulle partagée pour tous les éléments [data-tip]
export function initTooltips() {
  const tip = document.createElement('div');
  tip.className = 'tip';
  document.body.appendChild(tip);
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest?.('[data-tip]');
    if (!t) { tip.classList.remove('on'); return; }
    tip.textContent = t.dataset.tip;
    tip.classList.add('on');
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.transform = `translate(${x}px, ${e.clientY + 14}px)`;
  });
}
