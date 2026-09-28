// Collecte : résultats football-data.co.uk, cotes The Odds API, données démo.
import { marketProbs, scoreMatrix, type OddsRow, type Result } from "./engine.mts";

export const LEAGUES: Record<string, { fd: string; odds: string }> = {
  "Premier League (ANG)": { fd: "E0", odds: "soccer_epl" },
  "Championship (ANG)": { fd: "E1", odds: "soccer_efl_champ" },
  "Ligue 1 (FRA)": { fd: "F1", odds: "soccer_france_ligue_one" },
  "Ligue 2 (FRA)": { fd: "F2", odds: "soccer_france_ligue_two" },
  "La Liga (ESP)": { fd: "SP1", odds: "soccer_spain_la_liga" },
  "Bundesliga (ALL)": { fd: "D1", odds: "soccer_germany_bundesliga" },
  "Serie A (ITA)": { fd: "I1", odds: "soccer_italy_serie_a" },
  "Eredivisie (P-B)": { fd: "N1", odds: "soccer_netherlands_eredivisie" },
  "Liga Portugal (POR)": { fd: "P1", odds: "soccer_portugal_primeira_liga" },
};

export function seasonCodes(today = new Date(), n = 2): string[] {
  const start = today.getUTCMonth() >= 6 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  const yy = (y: number) => String(((y % 100) + 100) % 100).padStart(2, "0");
  return Array.from({ length: n }, (_, k) => yy(start - k) + yy(start - k + 1));
}

export function parseResultsCsv(text: string): Result[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const head = lines[0].replace(/^﻿/, "").split(",");
  const col = (name: string) => head.indexOf(name);
  const [d, h, a, hg, ag] = ["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG"].map(col);
  if ([d, h, a, hg, ag].some((c) => c < 0)) return [];
  const out: Result[] = [];
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(f[d] ?? "");
    if (!m || f[hg] === "" || f[ag] === "" || !f[h] || !f[a]) continue;
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const date = Date.UTC(year, Number(m[2]) - 1, Number(m[1]));
    const x = Number(f[hg]), y = Number(f[ag]);
    if (Number.isFinite(x) && Number.isFinite(y)) out.push({ date, home: f[h], away: f[a], hg: x, ag: y });
  }
  return out;
}

export async function loadResults(fdCode: string): Promise<Result[]> {
  const texts = await Promise.all(seasonCodes().map(async (s) => {
    const res = await fetch(`https://www.football-data.co.uk/mmz4281/${s}/${fdCode}.csv`);
    return res.ok ? new TextDecoder("latin1").decode(await res.arrayBuffer()) : "";
  }));
  const results = texts.flatMap(parseResultsCsv);
  if (!results.length) throw new Error(`aucun résultat téléchargé (${fdCode})`);
  return results;
}

export async function fetchOdds(sport: string, apiKey: string): Promise<{ odds: OddsRow[]; remaining: string | null }> {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
  url.search = new URLSearchParams({ apiKey, regions: "eu,uk", markets: "h2h,totals", oddsFormat: "decimal" }).toString();
  const res = await fetch(url);
  if (res.status === 401) throw new Error("clé The Odds API invalide");
  if (res.status === 429) throw new Error("quota The Odds API épuisé");
  if (!res.ok) throw new Error(`The Odds API a répondu ${res.status}`);
  return { odds: parseOdds(await res.json()), remaining: res.headers.get("x-requests-remaining") };
}

export function parseOdds(events: any[]): OddsRow[] {
  const rows: OddsRow[] = [];
  for (const ev of events) {
    for (const bk of ev.bookmakers ?? []) {
      for (const mk of bk.markets ?? []) {
        if (mk.key !== "h2h" && mk.key !== "totals") continue;
        for (const o of mk.outcomes ?? []) {
          const outcome = mk.key === "h2h"
            ? o.name === ev.home_team ? "home" : o.name === ev.away_team ? "away" : "draw"
            : String(o.name).toLowerCase();
          rows.push({
            eventId: ev.id, commence: ev.commence_time, homeTeam: ev.home_team, awayTeam: ev.away_team,
            bookmaker: bk.title ?? bk.key, market: mk.key, outcome,
            point: mk.key === "totals" ? Number(o.point) : null, price: Number(o.price),
          });
        }
      }
    }
  }
  return rows;
}

// ------------------------------------------------------------------ démo

const DEMO_TEAMS = [
  "Olympique Nord", "Racing Est", "Stade Ouest", "AS Littoral", "FC Montagne", "US Vallée",
  "Sporting Plaine", "Athletic Port", "Union Forêt", "Real Colline", "Dynamo Rivière", "Inter Capitale",
  "Etoile Sud", "Red Star Lac", "Royal Plateau", "Juventus Île", "Atlético Cap", "Celtic Bocage",
];
const DEMO_BOOKS = ["Betclic", "Unibet", "Winamax", "PMU", "Bet365", "Pinnacle", "Betfair"];

function rng(seed: number) {
  let s = seed >>> 0;
  const uniform = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const normal = (sd: number) => sd * Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform());
  const poisson = (lam: number) => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= uniform(); } while (p > L); return k - 1; };
  return { uniform, normal, poisson };
}

export function demoData(seed = 7, now = Date.now()): { results: Result[]; odds: OddsRow[] } {
  const r = rng(seed);
  const n = DEMO_TEAMS.length;
  const att = DEMO_TEAMS.map(() => Math.exp(r.normal(0.25)));
  const def = DEMO_TEAMS.map(() => Math.exp(r.normal(0.2)));
  const mu = 1.25, home = 1.2, day = 86400000;
  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) pairs.push([i, j]);
  const shuffle = <T,>(v: T[]) => { const c = [...v]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r.uniform() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };

  const results: Result[] = [];
  const start = now - 420 * day;
  for (const [seasonStart, span, take] of [[start, 280, pairs.length], [start + 365 * day, 55, 54]]) {
    shuffle(pairs).slice(0, take).forEach(([i, j], k) => results.push({
      date: seasonStart + Math.floor((span * k) / take) * day, home: DEMO_TEAMS[i], away: DEMO_TEAMS[j],
      hg: r.poisson(mu * home * att[i] * def[j]), ag: r.poisson(mu * att[j] * def[i]),
    }));
  }

  const odds: OddsRow[] = [];
  const order = shuffle([...Array(n).keys()]);
  for (let k = 0; k < n / 2; k++) {
    const i = order[2 * k], j = order[2 * k + 1];
    const commence = new Date(now + (1 + (k % 4)) * day + Math.floor(r.uniform() * 8) * 3600000).toISOString();
    const truth = marketProbs(scoreMatrix(mu * home * att[i] * def[j], mu * att[j] * def[i])) as Record<string, number>;
    for (const bk of DEMO_BOOKS) {
      const margin = bk === "Pinnacle" || bk === "Betfair" ? 1.03 : 1.06;
      for (const [market, outs, point] of [["h2h", ["home", "draw", "away"], null], ["totals", ["over", "under"], 2.5]] as const) {
        const noisy = outs.map((o) => truth[o] * Math.exp(r.normal(0.025)));
        const tot = noisy.reduce((s, x) => s + x, 0);
        outs.forEach((o, m) => odds.push({
          eventId: `demo-${k}`, commence, homeTeam: DEMO_TEAMS[i], awayTeam: DEMO_TEAMS[j], bookmaker: bk,
          market, outcome: o, point, price: Math.max(1.01, Math.round((tot / margin / noisy[m]) * 100) / 100),
        }));
      }
    }
  }
  return { results, odds };
}
