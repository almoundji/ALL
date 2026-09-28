// Interface : connexion, récupération de l'analyse, calcul de la value et des mises (en direct).

const $ = (s) => document.querySelector(s);
const DEFAULTS = {
  demo: false, leagues: ["Premier League (ANG)", "Ligue 1 (FRA)", "La Liga (ESP)", "Bundesliga (ALL)", "Serie A (ITA)", "Championship (ANG)", "Ligue 2 (FRA)", "Eredivisie (P-B)", "Liga Portugal (POR)",
    "Ligue des nations (UEFA)", "Qualif. Coupe du monde (Europe)", "Qualif. Coupe du monde (Am. Sud)", "Coupe d'Afrique des nations"],
  modelWeight: 0.3, minEdge: 0.03, minOdds: 1.3, maxOdds: 6, halfLife: 180,
  bankroll: 100, minStake: 10, comboBook: "Betclic (FR)", comboStake: 2, comboLegs: 3, comboRisk: "equilibre", comboPeriod: "weekend", comboFill: "fill", kelly: 0.25, maxStake: 0.05,
};
const LABELS = { home: "Victoire {h}", draw: "Match nul", away: "Victoire {a}", over: "Plus de {p} buts", under: "Moins de {p} buts" };

let settings = load();
let data = null;
let picks = [];

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("vb-settings3") || "{}") }; }
  catch { return { ...DEFAULTS }; }
}
function save() { try { localStorage.setItem("vb-settings3", JSON.stringify(settings)); } catch {} }

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pct = (x, d = 0) => (x == null || Number.isNaN(x) ? "–" : `${(x * 100).toFixed(d)} %`);
const odd = (x) => (x == null ? "–" : x.toFixed(2));
const date = (iso) => new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const signed = (x) => `<span class="${x >= 0 ? "pos" : "neg"}">${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)} %</span>`;

// ------------------------------------------------------------------ connexion

async function api(path, opts) {
  const res = await fetch(path, { credentials: "same-origin", ...opts });
  if (res.status === 401 && path !== "/api/session") { showLogin(); throw new Error("non connecté"); }
  return res;
}

function showLogin() { $("#app-view").hidden = true; $("#login-view").hidden = false; }
function showApp() { $("#login-view").hidden = true; $("#app-view").hidden = false; }

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const btn = e.target.querySelector("button");
  btn.disabled = true; $("#login-error").textContent = "";
  try {
    const res = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: f.get("username"), password: f.get("password") }) });
    if (!res.ok) { $("#login-error").textContent = (await res.json()).error || "Connexion impossible"; return; }
    e.target.reset(); showApp(); refresh();
  } finally { btn.disabled = false; }
});

$("#logout").addEventListener("click", async () => {
  await fetch("/api/session", { method: "DELETE" });
  data = null; showLogin();
});

// ------------------------------------------------------------------ réglages

const sliders = {
  modelWeight: (v) => v.toFixed(2), minEdge: (v) => pct(v), minOdds: (v) => v.toFixed(2),
  maxOdds: (v) => v.toFixed(1), halfLife: (v) => `${v} j`, kelly: (v) => v.toFixed(2), maxStake: (v) => pct(v),
};
for (const [id, fmt] of Object.entries(sliders)) {
  const input = $(`#${id}`);
  const out = document.querySelector(`output[for=${id}]`);
  input.value = settings[id]; out.textContent = fmt(settings[id]);
  input.addEventListener("input", () => {
    settings[id] = Number(input.value); out.textContent = fmt(settings[id]); save();
    if (id !== "halfLife") render();
  });
  if (id === "halfLife") input.addEventListener("change", () => refresh());
}
$("#bankroll").value = settings.bankroll;
$("#bankroll").addEventListener("input", (e) => { settings.bankroll = Math.max(1, Number(e.target.value) || 1); save(); render(); });
$("#minStake").value = settings.minStake;
$("#minStake").addEventListener("input", (e) => { settings.minStake = Math.max(0, Number(e.target.value) || 0); save(); render(); });
$("#combo-legs").innerHTML = Array.from({ length: 19 }, (_, i) => `<option>${i + 2}</option>`).join("");
for (const [id, key, num] of [["#combo-fill", "comboFill"], ["#combo-book", "comboBook"], ["#combo-stake", "comboStake", true], ["#combo-legs", "comboLegs", true],
  ["#combo-risk", "comboRisk"], ["#combo-period", "comboPeriod"]]) {
  $(id).value = settings[key];
  $(id).addEventListener("change", (e) => { settings[key] = num ? Math.max(0.5, Number(e.target.value) || 1) : e.target.value; save(); render(); });
}
$("#demo").checked = settings.demo;
$("#demo").addEventListener("change", (e) => { settings.demo = e.target.checked; save(); refresh(); });
$("#reload").addEventListener("click", () => refresh(true));
$("#open-side").addEventListener("click", () => $(".sidebar").classList.add("open"));
$("#close-side").addEventListener("click", () => $(".sidebar").classList.remove("open"));

function renderLeagues(all) {
  const intl = new Set(data?.intlLeagues ?? []);
  const box = (l) => `<label><input type="checkbox" value="${esc(l)}" ${settings.leagues.includes(l) ? "checked" : ""}
    ${data?.source !== "odds-api" ? "disabled" : ""}> ${esc(l)}</label>`;
  $("#leagues").innerHTML = `<h3>Championnats</h3>${all.filter((l) => !intl.has(l)).map(box).join("")}`
    + (intl.size ? `<h3 style="margin-top:.8rem">Sélections nationales</h3>${all.filter((l) => intl.has(l)).map(box).join("")}` : "");
  $("#leagues").querySelectorAll("input").forEach((c) => c.addEventListener("change", () => {
    settings.leagues = [...$("#leagues").querySelectorAll("input:checked")].map((x) => x.value); save();
  }));
}

document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".tabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
  document.querySelectorAll(".tab").forEach((t) => (t.hidden = t.id !== `tab-${b.dataset.tab}`));
}));

// ------------------------------------------------------------------ données

async function refresh(force = false) {
  $("#loading").hidden = false;
  const q = new URLSearchParams({ leagues: settings.leagues.join("|"), halfLife: settings.halfLife });
  if (settings.demo) q.set("demo", "1");
  if (force) q.set("refresh", "1");
  try {
    const res = await api(`/api/analyse?${q}`);
    data = await res.json();
    renderLeagues(data.leagues);
    $("#demo").checked = data.demo;
    $("#key-hint").textContent = {
      demo: "Données simulées (championnat fictif).",
      "odds-api": "Cotes en direct via The Odds API (cache 15 min, ~4 crédits par championnat coché).",
      "football-data": "Source gratuite football-data.co.uk : tous les championnats dont les prochains matchs sont publiés (7 bookmakers). Les cases ci-dessous servent avec une clé The Odds API.",
    }[data.source];
    render();
  } catch (e) {
    if (e.message !== "non connecté") $("#warnings").textContent = `Erreur : ${e.message}`;
  } finally { $("#loading").hidden = true; }
}

// ------------------------------------------------------------------ value et mises

function evaluate(o) {
  const s = settings;
  // Le poids du modèle est réduit quand une équipe a peu d'historique (promu…).
  const w = s.modelWeight * (o.reliability ?? 1);
  const prob = o.modelProb == null ? o.marketProb : w * o.modelProb + (1 - w) * o.marketProb;
  const edge = prob * o.bestOdds - 1;
  const modelEdge = o.modelProb == null ? null : o.modelProb * o.bestOdds - 1;
  const marketEdge = o.marketProb * o.bestOdds - 1;
  const kelly = Math.max(0, edge / (o.bestOdds - 1));
  // Mise Kelly plafonnée, puis relevée au minimum choisi (si le pari a de la value).
  const kellyPct = Math.min(kelly * s.kelly, s.maxStake);
  const stakePct = kellyPct > 0 ? Math.max(kellyPct, s.minStake / s.bankroll) : 0;
  let confidence = 1;
  if (modelEdge != null && modelEdge > 0 && (o.reliability ?? 1) >= 0.5) confidence++;
  if (marketEdge > 0) confidence++;
  if (edge > 0.06) confidence++;
  if (o.nBookmakers >= 8 && o.bestOdds <= 3.5) confidence++;
  const label = LABELS[o.outcome].replace("{h}", o.homeTeam).replace("{a}", o.awayTeam).replace("{p}", o.point ?? "");
  return { ...o, prob, edge, fairOdds: 1 / prob, stakePct, stake: Math.round(stakePct * s.bankroll * 100) / 100, confidence, label };
}

function selectPicks(all) {
  const s = settings;
  const ok = all.filter((o) => o.edge >= s.minEdge && o.bestOdds >= s.minOdds && o.bestOdds <= s.maxOdds && o.nBookmakers >= 3 && o.stake > 0);
  const best = new Map();
  for (const o of ok.sort((a, b) => b.edge - a.edge)) { const k = `${o.eventId}|${o.market}`; if (!best.has(k)) best.set(k, o); }
  return [...best.values()].sort((a, b) => b.confidence - a.confidence || b.edge - a.edge);
}

// ------------------------------------------------------------------ rendu

const table = (head, rows) => rows.length
  ? `<div class="table-wrap"><table><thead><tr>${head.map(([h, c]) => `<th class="${c || ""}">${h}</th>`).join("")}</tr></thead>
     <tbody>${rows.map((r) => `<tr>${r.map((v, i) => `<td class="${head[i][1] || ""}">${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
  : `<div class="empty">Aucune donnée.</div>`;

function render() {
  if (!data) return;
  const all = data.outcomes.map(evaluate);
  picks = selectPicks(all);

  const minPct = settings.minStake / settings.bankroll;
  $("#stake-warning").hidden = minPct <= settings.maxStake;
  $("#stake-warning").textContent = `Attention : ${settings.minStake} € représente ${pct(minPct)} de ta bankroll par pari, au-dessus du plafond de ${pct(settings.maxStake)}. `
    + `Pour rester prudent avec des mises de ${settings.minStake} €, il faudrait une bankroll d'environ ${Math.ceil(settings.minStake / settings.maxStake)} €.`;

  $("#k-matches").textContent = data.matches.length;
  $("#k-picks").textContent = picks.length;
  $("#k-stake").textContent = `${picks.reduce((s, p) => s + p.stake, 0).toFixed(2)} €`;
  $("#k-credits").textContent = data.creditsRemaining ?? ({ demo: "démo", "football-data": "gratuit" }[data.source] ?? "–");
  $("#warnings").innerHTML = data.warnings.map((w) => `ℹ️ ${esc(w)}`).join("<br>");

  $("#picks").innerHTML = picks.length ? table(
    [["Date"], ["Championnat"], ["Match"], ["Pari"], ["Cote", "num"], ["Bookmaker"], ["Cote juste", "num"],
     ["Proba modèle", "num"], ["Proba marché", "num"], ["Proba retenue"], ["Value", "num"], ["Mise", "num"], ["Confiance"]],
    picks.map((p) => [date(p.commence), esc(p.league), `${esc(p.homeTeam)} – ${esc(p.awayTeam)}`, `<span class="bet">${esc(p.label)}</span>`,
      `<b>${odd(p.bestOdds)}</b>`, esc(p.bestBookmaker), odd(p.fairOdds), pct(p.modelProb), pct(p.marketProb),
      `<span class="bar"><i style="width:${(p.prob * 100).toFixed(0)}%"></i></span>${pct(p.prob)}`,
      signed(p.edge), `${p.stake.toFixed(2)} €`, `<span class="stars">${"★".repeat(p.confidence)}${"☆".repeat(5 - p.confidence)}</span>`]),
  ) + `<div class="cards">${picks.map((p) => `<article class="pick">
      <div class="pick-top"><span class="muted">${date(p.commence)} · ${esc(p.league)}</span>
        <span class="stars">${"★".repeat(p.confidence)}${"☆".repeat(5 - p.confidence)}</span></div>
      <div>${esc(p.homeTeam)} – ${esc(p.awayTeam)}</div>
      <div class="bet">${esc(p.label)}</div>
      <div class="pick-grid">
        <div><span>Cote</span><b>${odd(p.bestOdds)}</b><small>${esc(p.bestBookmaker)}</small></div>
        <div><span>Proba</span><b>${pct(p.prob)}</b><small>juste ${odd(p.fairOdds)}</small></div>
        <div><span>Value</span><b>${signed(p.edge)}</b></div>
        <div><span>Mise</span><b>${p.stake.toFixed(2)} €</b></div>
      </div></article>`).join("")}</div>`
  : `<div class="empty">Aucun pari ne passe les filtres actuels. Élargis la plage de cotes ou baisse la value minimale.</div>`;

  renderTop(picks);
  renderCombo(all);

  const matches = [...data.matches].sort((a, b) => a.commence.localeCompare(b.commence));
  $("#matches").innerHTML = table(
    [["Date"], ["Championnat"], ["Match"], ["1", "num"], ["N", "num"], ["2", "num"], ["+2.5", "num"],
     ["Les 2 marquent", "num"], ["xG dom.", "num"], ["xG ext.", "num"], ["Score probable", "num"], ["Fiabilité modèle", "num"]],
    matches.map((m) => [date(m.commence), esc(m.league), `${esc(m.homeTeam)} – ${esc(m.awayTeam)}`, pct(m.home), pct(m.draw),
      pct(m.away), pct(m.over), pct(m.btts_yes), m.xg_home?.toFixed(2) ?? "–", m.xg_away?.toFixed(2) ?? "–", esc(m.likely_score ?? "–"),
      m.reliability == null ? "–" : m.reliability >= 1 ? "✓" : `<span class="neg">${pct(m.reliability)}</span>`]),
  ) + `<p class="hint">Probabilités du modèle statistique seul. xG = buts attendus. Fiabilité &lt; 100 % : une équipe a peu
      d'historique dans ce championnat (promu…), le site s'appuie alors davantage sur les cotes du marché.</p>`;

  const sel = $("#match-select");
  const current = sel.value;
  sel.innerHTML = matches.map((m) => `<option value="${esc(m.eventId)}">${esc(m.homeTeam)} – ${esc(m.awayTeam)} (${date(m.commence)})</option>`).join("");
  if (matches.some((m) => m.eventId === current)) sel.value = current;
  renderDetail(all);
  sel.onchange = () => renderDetail(all);

  $("#ratings").innerHTML = data.ratings.map((r) => `<details ${data.ratings.length === 1 ? "open" : ""}><summary>${esc(r.league)}</summary>` +
    table([["#"], ["Équipe"], ["Attaque", "num"], ["Défense", "num"], ["Force", "num"], ["Matchs (pondérés)", "num"]],
      r.teams.map((t, i) => [i + 1, esc(t.team), t.attack.toFixed(2), t.defense.toFixed(2), t.strength.toFixed(2), t.weight.toFixed(1)])) +
    `<p class="hint">Attaque &gt; 1 : marque plus que la moyenne. Défense &lt; 1 : encaisse moins.
      Avantage du terrain ×${r.homeAdv.toFixed(2)} ; ${r.mu.toFixed(2)} but(s) par équipe en moyenne.</p></details>`).join("")
    || `<div class="empty">Aucune donnée.</div>`;
}

// Probabilité de chaque bilan possible (paris supposés indépendants : un seul pari par match).
function forecast(bets) {
  let dist = new Map([[0, 1]]);
  for (const b of bets) {
    const next = new Map();
    for (const [gain, p] of dist) {
      const win = Math.round((gain + b.stake * (b.bestOdds - 1)) * 100) / 100;
      const lose = Math.round((gain - b.stake) * 100) / 100;
      next.set(win, (next.get(win) ?? 0) + p * b.prob);
      next.set(lose, (next.get(lose) ?? 0) + p * (1 - b.prob));
    }
    dist = next;
  }
  let pProfit = 0;
  for (const [g, p] of dist) if (g > 0) pProfit += p;
  return {
    stake: bets.reduce((s, b) => s + b.stake, 0),
    expected: bets.reduce((s, b) => s + b.stake * b.edge, 0),
    best: bets.reduce((s, b) => s + b.stake * (b.bestOdds - 1), 0),
    worst: -bets.reduce((s, b) => s + b.stake, 0),
    pProfit,
    pAllLost: bets.reduce((s, b) => s * (1 - b.prob), 1),
  };
}

const euro = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(2)} €`;

function renderTop(picks) {
  const seen = new Set();
  const top = picks.filter((p) => !seen.has(p.eventId) && seen.add(p.eventId)).slice(0, 5);
  $("#top").hidden = !top.length;
  if (!top.length) return;
  $("#top-cards").innerHTML = top.map((p, i) => `<article class="top-card">
    <span class="rank">#${i + 1}</span>
    <div class="muted" style="font-size:.8rem">${date(p.commence)} · ${esc(p.league)}</div>
    <div>${esc(p.homeTeam)} – ${esc(p.awayTeam)}</div>
    <div class="bet">${esc(p.label)}</div>
    <span class="stars">${"★".repeat(p.confidence)}${"☆".repeat(5 - p.confidence)}</span>
    <dl>
      <dt>Cote</dt><dd><b>${odd(p.bestOdds)}</b> · ${esc(p.bestBookmaker)}</dd>
      <dt>Chance de gagner</dt><dd>${pct(p.prob)}</dd>
      <dt>Mise conseillée</dt><dd>${p.stake.toFixed(2)} €</dd>
      <dt>Gain si gagné</dt><dd class="pos">${euro(p.stake * (p.bestOdds - 1))}</dd>
      <dt>Gain moyen attendu</dt><dd>${euro(p.stake * p.edge)}</dd>
    </dl></article>`).join("");
  const f = forecast(top);
  $("#forecast").innerHTML = `<strong>📈 Prévision de gain si tu joues ces ${top.length} paris</strong>
    <div class="grid" style="margin-top:.6rem">
      <div><span>Mise totale</span><b>${f.stake.toFixed(2)} €</b></div>
      <div><span>Gain moyen attendu</span><b class="${f.expected >= 0 ? "pos" : "neg"}">${euro(f.expected)}</b></div>
      <div><span>Chance de finir gagnant</span><b>${pct(f.pProfit)}</b></div>
      <div><span>Meilleur cas (tout gagné)</span><b class="pos">${euro(f.best)}</b></div>
      <div><span>Pire cas (tout perdu, ${pct(f.pAllLost)})</span><b class="neg">${euro(f.worst)}</b></div>
    </div>
    <p>Le « gain moyen attendu » est une moyenne sur un très grand nombre de paris semblables, pas ce que tu
      gagneras cette fois-ci. Il repose sur les probabilités estimées : si le modèle se trompe, il est faux.</p>`;
}

// ------------------------------------------------------------------ combiné

const RISK = { prudent: [0.55, 1.2, 1.9], equilibre: [0.42, 1.4, 2.6], audacieux: [0.3, 1.8, 4.5] }; // [proba min, cote min, cote max]

// Fenêtre du prochain week-end (heure locale) : vendredi 18h → dimanche soir, ou un seul jour.
function comboWindow(matches, period) {
  if (period === "all") return null;
  const isWeekend = (d) => [6, 0].includes(d.getDay()) || (d.getDay() === 5 && d.getHours() >= 18);
  const first = matches.map((m) => new Date(m.commence)).filter((d) => isWeekend(d) && d > new Date())
    .sort((a, b) => a - b)[0];
  if (!first) return [new Date(0), new Date(0)];
  const saturday = new Date(first);
  saturday.setDate(saturday.getDate() + ({ 5: 1, 6: 0, 0: -1 })[saturday.getDay()]);
  saturday.setHours(0, 0, 0, 0);
  const start = new Date(saturday), end = new Date(saturday);
  if (period === "sunday") start.setDate(start.getDate() + 1);
  if (period === "weekend") start.setHours(-6); // vendredi 18h
  end.setDate(end.getDate() + (period === "saturday" ? 1 : 2));
  return [start, end];
}

function renderCombo(all) {
  const books = [...new Set(all.flatMap((o) => Object.keys(o.prices || {})))].sort();
  const sel = $("#combo-book");
  if (!books.includes(settings.comboBook) && books.length) settings.comboBook = books.find((b) => /betclic/i.test(b)) || books[0];
  sel.innerHTML = books.map((b) => `<option ${b === settings.comboBook ? "selected" : ""}>${esc(b)}</option>`).join("");

  const [minProb, minOdds, maxOdds] = RISK[settings.comboRisk];
  const win = comboWindow(data.matches, settings.comboPeriod);
  const book = settings.comboBook;
  // Candidats : pari coté chez ce bookmaker, dont la cote est au moins égale à la cote juste estimée.
  const legs = all.map((o) => ({ ...o, price: o.prices?.[book] }))
    .filter((o) => o.price && o.prob >= minProb && o.price >= minOdds && o.price <= maxOdds)
    .filter((o) => !win || (new Date(o.commence) >= win[0] && new Date(o.commence) < win[1]))
    .map((o) => ({ ...o, bookEdge: o.prob * o.price - 1 }))
    .filter((o) => settings.comboFill === "fill" || o.bookEdge >= 0)
    // D'abord les paris value, puis ceux dont la cote est la plus proche de la cote juste.
    .sort((a, b) => b.bookEdge - a.bookEdge);
  const chosen = [];
  for (const o of legs) {
    if (chosen.length >= settings.comboLegs) break;
    if (!chosen.some((c) => c.eventId === o.eventId)) chosen.push(o); // un seul pari par match
  }
  chosen.sort((a, b) => a.commence.localeCompare(b.commence));
  const nNoValue = chosen.filter((o) => o.bookEdge < 0).length;

  const day = (d) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const period = !win ? "sur tous les matchs à venir"
    : win[1] - win[0] <= 86400000 ? `du ${day(win[0])}` : `du ${day(win[0])} au ${day(new Date(win[1] - 1))}`;
  if (chosen.length < 2) {
    $("#combo").innerHTML = `<div class="empty">Pas assez de paris intéressants chez ${esc(book)} ${period} pour ce niveau de risque
      (il faut une cote ${esc(book)} au moins égale à la cote juste). Essaie un autre bookmaker, un autre niveau de risque ou « Tous les matchs ».</div>`;
    return;
  }
  const odds = chosen.reduce((m, o) => m * o.price, 1);
  const prob = chosen.reduce((m, o) => m * o.prob, 1);
  const stake = settings.comboStake;
  const ev = stake * (prob * odds - 1);
  const partial = (chosen.length < settings.comboLegs ? `<p class="hint">Seulement ${chosen.length} matchs trouvés qui respectent tes critères (demandé : ${settings.comboLegs}). Essaie « Tous les matchs à venir » ou un autre niveau de risque.</p>` : "")
    + (nNoValue ? `<p class="hint error">${nNoValue} pari(s) sur ${chosen.length} sans value (en rouge) : la cote ${esc(book)} y est inférieure à la cote juste.
      Chacun réduit ton gain moyen attendu.</p>` : "");
  $("#combo").innerHTML = `<p class="hint">Combiné ${esc(book)} ${period}. Tous les paris doivent être gagnés.</p>${partial}` +
    table([["Date"], ["Match"], ["Pari"], [`Cote ${esc(book)}`, "num"], ["Cote juste", "num"], ["Chance", "num"], ["Value", "num"]],
      chosen.map((o) => [date(o.commence), `${esc(o.homeTeam)} – ${esc(o.awayTeam)}`, `<span class="bet ${o.bookEdge < 0 ? "neg" : ""}">${esc(o.label)}</span>`,
        odd(o.price), odd(o.fairOdds), pct(o.prob), signed(o.bookEdge)])) +
    `<div class="forecast combo-summary"><strong>🎲 Ton combiné</strong>
      <div class="grid" style="margin-top:.6rem">
        <div><span>Cote totale</span><b>${odds.toFixed(2)}</b></div>
        <div><span>Mise</span><b>${stake.toFixed(2)} €</b></div>
        <div><span>Gain si tout passe</span><b class="pos">${euro(stake * (odds - 1)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}</b></div>
        <div><span>Chance de gagner</span><b>${prob < 0.001 ? "< 0,1 %" : pct(prob, 1)}</b><span>environ 1 fois sur ${Math.max(1, Math.round(1 / prob)).toLocaleString("fr-FR")}</span></div>
        <div><span>Gain moyen attendu</span><b class="${ev >= 0 ? "pos" : "neg"}">${euro(ev)}</b>
          <span>${ev >= 0 ? "en moyenne, à long terme" : `le bookmaker garde en moyenne ${pct(-ev / stake)} de ta mise`}</span></div>
      </div>
      <p>Un combiné gagne rarement : il faut répéter ce type de pari de nombreuses fois pour que le gain moyen se réalise.
        Garde des petites mises. Chaque match ajouté multiplie la cote mais divise la chance de gagner.</p></div>`;
}

function renderDetail(all) {
  const rows = all.filter((o) => o.eventId === $("#match-select").value);
  $("#match-detail").innerHTML = table(
    [["Pari"], ["Meilleure cote", "num"], ["Bookmaker"], ["Cote moyenne", "num"], ["Cote juste", "num"], ["Value", "num"], ["Bookmakers", "num"]],
    rows.map((o) => [esc(o.label), odd(o.bestOdds), esc(o.bestBookmaker), odd(o.avgOdds), odd(o.fairOdds), signed(o.edge), o.nBookmakers]));
}

$("#export").addEventListener("click", () => {
  const head = ["Date", "Championnat", "Match", "Pari", "Cote", "Bookmaker", "Cote juste", "Proba", "Value", "Mise", "Confiance"];
  const rows = picks.map((p) => [new Date(p.commence).toISOString(), p.league, `${p.homeTeam} - ${p.awayTeam}`, p.label, p.bestOdds,
    p.bestBookmaker, p.fairOdds.toFixed(2), p.prob.toFixed(3), p.edge.toFixed(3), p.stake, p.confidence]);
  const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })), download: "value_bets.csv" });
  a.click();
});

// ------------------------------------------------------------------ démarrage

(async () => {
  const res = await fetch("/api/session");
  if (res.ok) { showApp(); refresh(); } else showLogin();
})();
