// Briques communes des vues : en-têtes de page, tableau triable « growing », graphiques SVG avec infobulles.
import { esc, fmtNum, icon } from "../../shared/ui.js";

export function pageHead({ title, sub = "", crumbs = [], actions = "" }) {
  return `<header class="page-head">
    <div>${crumbs.length ? `<nav class="crumbs">${[["#/", "Accueil"], ...crumbs].map(([h, l]) => (h ? `<a href="${h}">${esc(l)}</a>` : `<span>${esc(l)}</span>`)).join(icon("chevronRight"))}</nav>` : ""}
      <h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>
    ${actions ? `<div class="actions">${actions}</div>` : ""}
  </header>`;
}

/**
 * Tableau triable avec chargement progressif.
 * columns : [{ key, label, value?(row), render?(row), num?, sortable? }]
 */
export function mountTable(el, { columns, rows, onRow, pageSize = 50, empty = "Aucun élément", sort = null, dir = -1, onRender }) {
  let state = { sort, dir, shown: pageSize };
  const draw = () => {
    let list = rows;
    if (state.sort) {
      const col = columns.find((c) => c.key === state.sort);
      const v = col?.value || ((r) => r[state.sort]);
      list = [...rows].sort((a, b) => { const x = v(a), y = v(b); return (x > y ? 1 : x < y ? -1 : 0) * state.dir; });
    }
    el.innerHTML = `<div class="table-wrap"><table class="table">
      <thead><tr>${columns.map((c) => `<th ${c.sortable !== false ? `data-sort="${c.key}"` : ""} class="${c.num ? "num" : ""}" ${state.sort === c.key ? `aria-sort="${state.dir > 0 ? "ascending" : "descending"}"` : ""}>${esc(c.label)}</th>`).join("")}${onRow ? "<th></th>" : ""}</tr></thead>
      <tbody>${list.slice(0, state.shown).map((r, i) => `<tr data-i="${i}" class="${onRow ? "clickable" : ""}">${columns.map((c) => `<td class="${c.num ? "num" : ""}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join("")}${onRow ? `<td class="muted">${icon("chevronRight")}</td>` : ""}</tr>`).join("")}</tbody>
    </table></div>
    ${!list.length ? `<div class="empty">${esc(empty)}</div>` : ""}
    ${list.length > state.shown ? `<div class="table-foot"><button class="btn btn-sm" data-more>Plus [${fmtNum(state.shown)} / ${fmtNum(list.length)}]</button></div>` : ""}`;
    el.querySelectorAll("th[data-sort]").forEach((th) => (th.onclick = () => {
      state.dir = state.sort === th.dataset.sort ? -state.dir : 1;
      state.sort = th.dataset.sort; draw();
    }));
    el.querySelector("[data-more]")?.addEventListener("click", () => { state.shown += pageSize; draw(); });
    if (onRow) el.querySelectorAll("tbody tr").forEach((tr) => (tr.onclick = (e) => { if (!e.target.closest("button,a,input")) onRow(list[+tr.dataset.i]); }));
    onRender?.(el);
  };
  draw();
  return { update(newRows) { rows = newRows; state.shown = pageSize; draw(); } };
}

// ---------- Graphiques ----------

/** Active les infobulles sur tout élément [data-tip] contenu dans un .chart. */
export function bindTooltips(scope) {
  scope.querySelectorAll(".chart").forEach((chart) => {
    let tip = chart.querySelector(".tooltip");
    if (!tip) { tip = document.createElement("div"); tip.className = "tooltip"; tip.hidden = true; chart.append(tip); }
    chart.addEventListener("pointermove", (e) => {
      const t = e.target.closest("[data-tip]");
      if (!t) { tip.hidden = true; chart.querySelectorAll(".hover").forEach((x) => x.classList.remove("hover")); return; }
      const box = chart.getBoundingClientRect();
      tip.innerHTML = t.dataset.tip;
      tip.hidden = false;
      tip.style.left = `${Math.min(box.width - 80, Math.max(80, e.clientX - box.left))}px`;
      tip.style.top = `${e.clientY - box.top}px`;
    });
    chart.addEventListener("pointerleave", () => (tip.hidden = true));
  });
}

// Maximum « rond » et pair, pour que la graduation médiane tombe sur un entier.
const niceMax = (v) => { if (v <= 2) return 2; const p = 10 ** Math.floor(Math.log10(v)); let m = Math.ceil(v / p) * p; if ((m / p) % 2) m += p; return m; };

/** Barres groupées ou empilées verticales. series : [{ name, color, values[] }] */
export function barChart({ labels, series, stacked = false, height = 240, unit = "" }) {
  const W = 720, H = height, L = 36, B = 26, T = 8;
  const totals = labels.map((_, i) => (stacked ? series.reduce((s, x) => s + x.values[i], 0) : Math.max(...series.map((x) => x.values[i]))));
  const max = niceMax(Math.max(1, ...totals));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const band = (W - L) / labels.length;
  const gap = 2;
  const barW = stacked ? Math.max(4, Math.min(28, band * 0.6)) : Math.max(3, Math.min(16, (band * 0.7) / series.length - gap));
  const ticks = [0, max / 2, max];
  let marks = "";
  labels.forEach((lab, i) => {
    const x0 = L + band * i + band / 2;
    const tip = `<b>${esc(lab)}</b><br>` + series.map((s) => `<i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color}"></i> ${esc(s.name)} : <b>${fmtNum(s.values[i])}</b>${unit}`).join("<br>");
    if (stacked) {
      let acc = 0;
      series.forEach((s, k) => {
        const v = s.values[i];
        if (!v) return;
        const top = y(acc + v), bottom = y(acc);
        const h = Math.max(0, bottom - top - (k > 0 ? gap : 0));
        const isTop = series.slice(k + 1).every((x) => !x.values[i]);
        marks += isTop ? `<path d="${roundTop(x0 - barW / 2, top, barW, h)}" style="fill:${s.color}"/>` : `<rect x="${x0 - barW / 2}" y="${top}" width="${barW}" height="${h}" style="fill:${s.color}"/>`;
        acc += v;
      });
    } else {
      const start = x0 - (series.length * (barW + gap) - gap) / 2;
      series.forEach((s, k) => { const v = s.values[i]; if (v) marks += `<path d="${roundTop(start + k * (barW + gap), y(v), barW, y(0) - y(v))}" style="fill:${s.color}"/>`; });
    }
    marks += `<rect x="${L + band * i}" y="${T}" width="${band}" height="${H - T - B}" fill="transparent" data-tip="${esc(tip)}"/>`;
  });
  const every = Math.ceil(labels.length / 14);
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">
    <g class="grid">${ticks.map((t) => `<line x1="${L}" x2="${W}" y1="${y(t)}" y2="${y(t)}"/>`).join("")}</g>
    <g class="axis">${ticks.map((t) => `<text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${fmtNum(t)}</text>`).join("")}
    ${labels.map((l, i) => (i % every === 0 ? `<text x="${L + band * i + band / 2}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>` : "")).join("")}</g>
    <line class="baseline" x1="${L}" x2="${W}" y1="${y(0)}" y2="${y(0)}"/>
    ${marks}</svg></div>`;
}

function roundTop(x, y, w, h, r = 4) {
  if (h <= 0) return "";
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Courbes (2 px) avec bandes de survol par abscisse. */
export function lineChart({ labels, series, height = 220 }) {
  const W = 720, H = height, L = 36, B = 26, T = 10;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const x = (i) => L + ((W - L - 10) * i) / Math.max(1, labels.length - 1);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, max / 2, max];
  const every = Math.ceil(labels.length / 12);
  const bandW = (W - L) / labels.length;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">
    <g class="grid">${ticks.map((t) => `<line x1="${L}" x2="${W}" y1="${y(t)}" y2="${y(t)}"/>`).join("")}</g>
    <g class="axis">${ticks.map((t) => `<text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${fmtNum(t)}</text>`).join("")}
    ${labels.map((l, i) => (i % every === 0 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>` : "")).join("")}</g>
    ${series.map((s) => `<polyline fill="none" style="stroke:${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}"/>`).join("")}
    ${labels.map((l, i) => `<rect x="${x(i) - bandW / 2}" y="${T}" width="${bandW}" height="${H - T - B}" fill="transparent" data-tip="${esc(`<b>${l}</b><br>` + series.map((s) => `${esc(s.name)} : <b>${fmtNum(s.values[i])}</b>`).join("<br>"))}"/>`).join("")}
  </svg></div>`;
}

/** Barre de répartition 100 % (parts d'un tout, ≤ 4 catégories), libellée directement. */
export function shareBar(parts) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return `<div class="chart"><div style="display:flex;gap:2px;height:22px;border-radius:6px;overflow:hidden">${parts.filter((p) => p.value).map((p) => `<span data-tip="${esc(`<b>${p.label}</b> : ${fmtNum(p.value)} (${fmtNum((p.value / total) * 100, 1)} %)`)}" style="flex:${p.value};background:${p.color}"></span>`).join("")}</div>
    <div class="legend" style="margin-top:10px">${parts.map((p) => `<span><i style="background:${p.color}"></i>${esc(p.label)} · <b>${fmtNum(p.value)}</b> (${fmtNum((p.value / total) * 100, 1)} %)</span>`).join("")}</div></div>`;
}

/** Barres horizontales HTML (classements). */
export function hbars(items, color = "var(--series-1)") {
  const max = Math.max(1, ...items.map((i) => i.value));
  return `<div class="chart">${items.map((i) => `<div class="hbar" data-tip="${esc(`<b>${i.label}</b> : ${fmtNum(i.value)}`)}"><span class="nowrap" style="overflow:hidden;text-overflow:ellipsis">${esc(i.label)}</span><span class="hbar-track"><span style="width:${(i.value / max) * 100}%;background:${color}"></span></span><b class="num">${fmtNum(i.value)}</b></div>`).join("")}</div>`;
}

export const legend = (series) => `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div>`;
