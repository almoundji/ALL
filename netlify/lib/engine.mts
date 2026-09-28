// Moteur statistique (portage de betdash/ en TypeScript pour Netlify Functions).
// Serveur : collecte des cotes et résultats, modèle de Poisson, consensus du marché.
// Le calcul de la value et des mises se fait côté navigateur (curseurs en direct).

export type Result = { date: number; home: string; away: string; hg: number; ag: number };
export type OddsRow = {
  eventId: string; commence: string; homeTeam: string; awayTeam: string;
  bookmaker: string; market: "h2h" | "totals"; outcome: string; point: number | null; price: number;
};

// ------------------------------------------------------------------ modèle

export type Ratings = {
  teams: string[]; attack: number[]; defense: number[]; homeAdv: number; mu: number; weight: number[];
};

export function fitRatings(results: Result[], halfLifeDays = 180, prior = 3, iterations = 200): Ratings {
  if (!results.length) throw new Error("Aucun résultat pour estimer le modèle");
  const ref = Math.max(...results.map((r) => r.date));
  const teams = [...new Set(results.flatMap((r) => [r.home, r.away]))].sort();
  const idx = new Map(teams.map((t, i) => [t, i]));
  const n = teams.length;
  const h = results.map((r) => idx.get(r.home)!);
  const a = results.map((r) => idx.get(r.away)!);
  const w = results.map((r) => 0.5 ** (Math.max(0, (ref - r.date) / 86400000) / halfLifeDays));
  const hg = results.map((r) => r.hg);
  const ag = results.map((r) => r.ag);
  const sum = (f: (k: number) => number) => w.reduce((s, _, k) => s + f(k), 0);

  let att = new Array(n).fill(1);
  let def = new Array(n).fill(1);
  let mu = sum((k) => w[k] * (hg[k] + ag[k])) / (2 * sum((k) => w[k]));
  let home = 1;
  const norm = (v: number[]) => { const m = v.reduce((s, x) => s + x, 0) / v.length; return v.map((x) => x / m); };

  for (let it = 0; it < iterations; it++) {
    const prev = att;
    const sc = new Array(n).fill(0), esc = new Array(n).fill(0);
    for (let k = 0; k < w.length; k++) {
      sc[h[k]] += w[k] * hg[k]; sc[a[k]] += w[k] * ag[k];
      esc[h[k]] += w[k] * mu * home * def[a[k]]; esc[a[k]] += w[k] * mu * def[h[k]];
    }
    att = norm(sc.map((s, i) => (s + prior * mu) / (esc[i] + prior * mu)));
    const co = new Array(n).fill(0), eco = new Array(n).fill(0);
    for (let k = 0; k < w.length; k++) {
      co[a[k]] += w[k] * hg[k]; co[h[k]] += w[k] * ag[k];
      eco[a[k]] += w[k] * mu * home * att[h[k]]; eco[h[k]] += w[k] * mu * att[a[k]];
    }
    def = norm(co.map((s, i) => (s + prior * mu) / (eco[i] + prior * mu)));
    mu = sum((k) => w[k] * ag[k]) / sum((k) => w[k] * att[a[k]] * def[h[k]]);
    home = sum((k) => w[k] * hg[k]) / sum((k) => w[k] * mu * att[h[k]] * def[a[k]]);
    if (Math.max(...att.map((x, i) => Math.abs(x - prev[i]))) < 1e-7) break;
  }
  const weight = new Array(n).fill(0);
  for (let k = 0; k < w.length; k++) { weight[h[k]] += w[k]; weight[a[k]] += w[k]; }
  return { teams, attack: att, defense: def, homeAdv: home, mu, weight };
}

function poissonPmf(lam: number, max: number): number[] {
  const out: number[] = [];
  let p = Math.exp(-lam);
  for (let k = 0; k <= max; k++) { out.push(p); p *= lam / (k + 1); }
  return out;
}

export function scoreMatrix(lh: number, la: number, rho = -0.05, max = 10): number[][] {
  const ph = poissonPmf(lh, max), pa = poissonPmf(la, max);
  const m = ph.map((x) => pa.map((y) => x * y));
  m[0][0] *= 1 - lh * la * rho; m[0][1] *= 1 + lh * rho; m[1][0] *= 1 + la * rho; m[1][1] *= 1 - rho;
  const tot = m.flat().reduce((s, x) => s + x, 0);
  return m.map((r) => r.map((x) => x / tot));
}

export function marketProbs(m: number[][], line = 2.5) {
  let home = 0, draw = 0, away = 0, over = 0, btts = 0;
  m.forEach((row, i) => row.forEach((p, j) => {
    if (i > j) home += p; else if (i === j) draw += p; else away += p;
    if (i + j > line) over += p;
    if (i > 0 && j > 0) btts += p;
  }));
  return { home, draw, away, over, under: 1 - over, btts_yes: btts };
}

export function predict(r: Ratings, home: string, away: string, line = 2.5) {
  const i = r.teams.indexOf(home), j = r.teams.indexOf(away);
  const lh = r.mu * r.homeAdv * r.attack[i] * r.defense[j];
  const la = r.mu * r.attack[j] * r.defense[i];
  const m = scoreMatrix(lh, la);
  let best = [0, 0], bp = -1;
  m.forEach((row, x) => row.forEach((p, y) => { if (p > bp) { bp = p; best = [x, y]; } }));
  return { ...marketProbs(m, line), xg_home: lh, xg_away: la, likely_score: `${best[0]}-${best[1]}` };
}

// ------------------------------------------------------------------ consensus du marché

export type Outcome = {
  eventId: string; market: string; outcome: string; point: number | null;
  marketProb: number; avgOdds: number; nBookmakers: number; bestOdds: number; bestBookmaker: string;
  modelProb: number | null; commence: string; homeTeam: string; awayTeam: string; league?: string;
};

export function consensus(odds: OddsRow[]): Outcome[] {
  // Regroupe par (match, marché, ligne, bookmaker) et retire la marge de chaque bookmaker.
  const books = new Map<string, OddsRow[]>();
  for (const o of odds) {
    const k = `${o.eventId}|${o.market}|${o.point ?? ""}|${o.bookmaker}`;
    (books.get(k) ?? books.set(k, []).get(k)!).push(o);
  }
  const agg = new Map<string, { rows: OddsRow[]; fair: number[]; books: Set<string> }>();
  for (const rows of books.values()) {
    const expected = rows[0].market === "h2h" ? 3 : 2;
    if (new Set(rows.map((r) => r.outcome)).size !== expected) continue;
    const total = rows.reduce((s, r) => s + 1 / r.price, 0);
    for (const r of rows) {
      const k = `${r.eventId}|${r.market}|${r.point ?? ""}|${r.outcome}`;
      const g = agg.get(k) ?? agg.set(k, { rows: [], fair: [], books: new Set() }).get(k)!;
      g.rows.push(r); g.fair.push(1 / r.price / total); g.books.add(r.bookmaker);
    }
  }
  return [...agg.values()].map(({ rows, fair, books }) => {
    const best = rows.reduce((b, r) => (r.price > b.price ? r : b));
    const r0 = rows[0];
    return {
      eventId: r0.eventId, market: r0.market, outcome: r0.outcome, point: r0.point,
      marketProb: fair.reduce((s, x) => s + x, 0) / fair.length,
      avgOdds: rows.reduce((s, r) => s + r.price, 0) / rows.length,
      nBookmakers: books.size, bestOdds: best.price, bestBookmaker: best.bookmaker,
      modelProb: null, commence: r0.commence, homeTeam: r0.homeTeam, awayTeam: r0.awayTeam,
    };
  });
}

// ------------------------------------------------------------------ noms d'équipes

const ALIASES: Record<string, string> = {
  "manchester united": "Man United", "manchester city": "Man City", "tottenham hotspur": "Tottenham",
  "wolverhampton wanderers": "Wolves", "newcastle united": "Newcastle", "nottingham forest": "Nott'm Forest",
  "brighton and hove albion": "Brighton", "west ham united": "West Ham", "leeds united": "Leeds",
  "sheffield wednesday": "Sheffield Weds", "queens park rangers": "QPR", "paris saint germain": "Paris SG",
  "saint etienne": "St Etienne", "atletico madrid": "Ath Madrid", "athletic bilbao": "Ath Bilbao",
  "real betis": "Betis", "celta vigo": "Celta", "rayo vallecano": "Vallecano", "real sociedad": "Sociedad",
  "espanyol": "Espanol", "borussia dortmund": "Dortmund", "borussia monchengladbach": "M'gladbach",
  "bayer leverkusen": "Leverkusen", "eintracht frankfurt": "Ein Frankfurt", "1. fc koln": "FC Koln",
  "fc koln": "FC Koln", "inter milan": "Inter", "ac milan": "Milan", "as roma": "Roma",
  "hellas verona": "Verona", "sporting lisbon": "Sp Lisbon", "sporting cp": "Sp Lisbon",
  "fc porto": "Porto", "sc braga": "Sp Braga", "vitoria sc": "Guimaraes", "vitoria guimaraes": "Guimaraes",
  "fortuna sittard": "For Sittard", "go ahead eagles": "Go Ahead Eagles", "nec nijmegen": "Nijmegen",
};

const norm = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and")
    .replace(/[^a-z0-9. ]/g, " ")
    .replace(/\b(fc|afc|cf|sc|ac|as|ss|sv|vfb|vfl|us|rc|ogc|stade|club)\b/g, " ")
    .replace(/\s+/g, " ").trim();

function similarity(a: string, b: string): number {
  // Coefficient de Dice sur les bigrammes de caractères.
  const bi = (s: string) => { const m = new Map<string, number>(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) ?? 0) + 1); } return m; };
  const A = bi(a), B = bi(b);
  let inter = 0;
  for (const [g, c] of A) inter += Math.min(c, B.get(g) ?? 0);
  return (2 * inter) / Math.max(1, a.length - 1 + b.length - 1);
}

export function matchTeam(name: string, known: string[]): string | null {
  const alias = ALIASES[name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()];
  if (alias && known.includes(alias)) return alias;
  if (known.includes(name)) return name;
  const target = norm(name);
  const normed = known.map((k) => [norm(k), k] as const);
  for (const [n, k] of normed) if (n === target) return k;
  for (const [n, k] of normed) if (n.length >= 4 && target.length >= 4 && (n.includes(target) || target.includes(n))) return k;
  let best: string | null = null, bs = 0.75;
  for (const [n, k] of normed) { const s = similarity(n, target); if (s > bs) { bs = s; best = k; } }
  return best;
}

// ------------------------------------------------------------------ analyse d'un championnat

export function analyseLeague(league: string, results: Result[], odds: OddsRow[], halfLifeDays: number) {
  const r = fitRatings(results, halfLifeDays);
  const warnings: string[] = [];
  const matches: Record<string, unknown>[] = [];
  const modelProbs = new Map<string, Record<string, number>>();
  const events = [...new Map(odds.map((o) => [o.eventId, o])).values()];
  for (const ev of events) {
    const home = matchTeam(ev.homeTeam, r.teams), away = matchTeam(ev.awayTeam, r.teams);
    const row: Record<string, unknown> = { league, eventId: ev.eventId, commence: ev.commence, homeTeam: ev.homeTeam, awayTeam: ev.awayTeam };
    if (!home || !away) {
      const missing = [[ev.homeTeam, home], [ev.awayTeam, away]].filter(([, m]) => !m).map(([t]) => t);
      warnings.push(`${league} : pas d'historique pour ${missing.join(", ")} (analyse basée sur le marché uniquement)`);
      matches.push(row);
      continue;
    }
    const lines = new Set([2.5, ...odds.filter((o) => o.eventId === ev.eventId && o.point != null).map((o) => o.point!)]);
    for (const line of lines) modelProbs.set(`${ev.eventId}|${line}`, predict(r, home, away, line) as never);
    const p = predict(r, home, away, 2.5);
    modelProbs.set(`${ev.eventId}|h2h`, p as never);
    matches.push({ ...row, ...p });
  }
  const outcomes = consensus(odds).map((o) => {
    const p = modelProbs.get(`${o.eventId}|${o.market === "h2h" ? "h2h" : o.point}`);
    return { ...o, league, modelProb: p ? p[o.outcome] ?? null : null };
  });
  const ratings = r.teams.map((t, i) => ({
    team: t, attack: r.attack[i], defense: r.defense[i], strength: r.attack[i] / r.defense[i], weight: r.weight[i],
  })).sort((x, y) => y.strength - x.strength);
  return { outcomes, matches, ratings: { league, homeAdv: r.homeAdv, mu: r.mu, teams: ratings }, warnings };
}
