// Collecte : résultats football-data.co.uk, cotes The Odds API, données démo.
import { marketProbs, scoreMatrix, type OddsRow, type Result } from "./engine.mts";

export const LEAGUES: Record<string, { fd: string; odds: string }> = {
  "Premier League (ANG)": { fd: "E0", odds: "soccer_epl" },
  "Championship (ANG)": { fd: "E1", odds: "soccer_efl_champ" },
  "League One (ANG)": { fd: "E2", odds: "soccer_england_league1" },
  "League Two (ANG)": { fd: "E3", odds: "soccer_england_league2" },
  "Ligue 1 (FRA)": { fd: "F1", odds: "soccer_france_ligue_one" },
  "Ligue 2 (FRA)": { fd: "F2", odds: "soccer_france_ligue_two" },
  "La Liga (ESP)": { fd: "SP1", odds: "soccer_spain_la_liga" },
  "Segunda (ESP)": { fd: "SP2", odds: "soccer_spain_segunda_division" },
  "Bundesliga (ALL)": { fd: "D1", odds: "soccer_germany_bundesliga" },
  "2. Bundesliga (ALL)": { fd: "D2", odds: "soccer_germany_bundesliga2" },
  "Serie A (ITA)": { fd: "I1", odds: "soccer_italy_serie_a" },
  "Serie B (ITA)": { fd: "I2", odds: "soccer_italy_serie_b" },
  "Eredivisie (P-B)": { fd: "N1", odds: "soccer_netherlands_eredivisie" },
  "Liga Portugal (POR)": { fd: "P1", odds: "soccer_portugal_primeira_liga" },
  "Pro League (BEL)": { fd: "B1", odds: "soccer_belgium_first_div" },
  "Premiership (ECO)": { fd: "SC0", odds: "soccer_spl" },
  "Süper Lig (TUR)": { fd: "T1", odds: "soccer_turkey_super_league" },
  "Super League (GRE)": { fd: "G1", odds: "soccer_greece_super_league" },
};

export function seasonCodes(today = new Date(), n = 2): string[] {
  const start = today.getUTCMonth() >= 6 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  const yy = (y: number) => String(((y % 100) + 100) % 100).padStart(2, "0");
  return Array.from({ length: n }, (_, k) => yy(start - k) + yy(start - k + 1));
}

export function parseResultsCsv(text: string): Result[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const head = lines[0].replace(/^(\uFEFF|\u00EF\u00BB\u00BF)/, "").split(",");
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

// ------------------------------------------------------------------ source gratuite : fixtures football-data

// Toutes les divisions couvertes par football-data.co.uk (résultats + prochains matchs cotés).
export const FD_DIVISIONS: Record<string, string> = {
  E0: "Premier League (ANG)", E1: "Championship (ANG)", E2: "League One (ANG)", E3: "League Two (ANG)",
  EC: "National League (ANG)", SC0: "Premiership (ECO)", SC1: "Championship (ECO)", SC2: "League One (ECO)",
  SC3: "League Two (ECO)", D1: "Bundesliga (ALL)", D2: "2. Bundesliga (ALL)", I1: "Serie A (ITA)",
  I2: "Serie B (ITA)", SP1: "La Liga (ESP)", SP2: "Segunda (ESP)", F1: "Ligue 1 (FRA)", F2: "Ligue 2 (FRA)",
  N1: "Eredivisie (P-B)", B1: "Pro League (BEL)", P1: "Liga Portugal (POR)", T1: "Süper Lig (TUR)", G1: "Super League (GRE)",
};

// Colonnes de cotes du fichier fixtures : préfixe -> bookmaker.
const FD_BOOKS: Record<string, string> = {
  B365: "Bet365", BFD: "Betfred", BV: "BetVictor", BW: "Bwin", PP: "Paddy Power", SKB: "Sky Bet", BFE: "Betfair Exchange",
};

// Heure de Londres -> instant UTC (gère l'heure d'été).
function londonToUtc(y: number, mo: number, d: number, h: number, mi: number): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(guess));
  const lh = Number(parts.find((p) => p.type === "hour")!.value), lm = Number(parts.find((p) => p.type === "minute")!.value);
  const offsetMin = ((lh * 60 + lm) - (h * 60 + mi) + 1440) % 1440; // 0 ou 60
  return new Date(guess - (offsetMin > 720 ? offsetMin - 1440 : offsetMin) * 60000);
}

export function parseFixturesCsv(text: string, now = Date.now()): Record<string, OddsRow[]> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return {};
  const head = lines[0].replace(/^(\uFEFF|\u00EF\u00BB\u00BF)/, "").split(",");
  const col = new Map(head.map((h, i) => [h, i]));
  const byDiv: Record<string, OddsRow[]> = {};
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    const get = (k: string) => f[col.get(k) ?? -1] ?? "";
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(get("Date"));
    if (!m || !get("HomeTeam") || !get("AwayTeam")) continue;
    const [hh, mm] = (get("Time") || "15:00").split(":").map(Number);
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const kickoff = londonToUtc(year, Number(m[2]), Number(m[1]), hh, mm);
    if (kickoff.getTime() <= now) continue; // uniquement les matchs à venir
    const div = get("Div");
    const base = {
      eventId: `${div}-${get("Date")}-${get("HomeTeam")}-${get("AwayTeam")}`, commence: kickoff.toISOString(),
      homeTeam: get("HomeTeam"), awayTeam: get("AwayTeam"),
    };
    const rows = (byDiv[div] ??= []);
    for (const [pre, name] of Object.entries(FD_BOOKS)) {
      const trio = [["home", "H"], ["draw", "D"], ["away", "A"]].map(([o, s]) => [o, Number(get(pre + s))] as const);
      if (trio.every(([, p]) => p > 1)) for (const [o, p] of trio) rows.push({ ...base, bookmaker: name, market: "h2h", outcome: o, point: null, price: p });
      const over = Number(get(`${pre}>2.5`)), under = Number(get(`${pre}<2.5`));
      if (over > 1 && under > 1) {
        rows.push({ ...base, bookmaker: name, market: "totals", outcome: "over", point: 2.5, price: over });
        rows.push({ ...base, bookmaker: name, market: "totals", outcome: "under", point: 2.5, price: under });
      }
    }
  }
  return byDiv;
}

export async function loadFixtures(): Promise<Record<string, OddsRow[]>> {
  const res = await fetch("https://www.football-data.co.uk/fixtures.csv");
  if (!res.ok) throw new Error(`football-data fixtures : ${res.status}`);
  return parseFixturesCsv(new TextDecoder("latin1").decode(await res.arrayBuffer()));
}
