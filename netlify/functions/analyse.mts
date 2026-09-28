import type { Config } from "@netlify/functions";
import { currentUser, json } from "../lib/auth.mts";
import { FD_DIVISIONS, LEAGUES, demoData, fetchOdds, loadFixtures, loadIntlResults, loadResults } from "../lib/data.mts";
import { analyseLeague, type OddsRow, type Result } from "../lib/engine.mts";

// Cache mémoire de l'instance : économise les quotas (cotes 15 min, résultats 6 h).
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export default async (req: Request) => {
  if (!currentUser(req)) return json({ error: "non connecté" }, 401);

  const params = new URL(req.url).searchParams;
  const apiKey = Netlify.env.get("ODDS_API_KEY");
  const demo = params.get("demo") === "1";
  const source = demo ? "demo" : apiKey ? "odds-api" : "football-data";
  const halfLife = Math.min(720, Math.max(30, Number(params.get("halfLife")) || 180));
  if (params.get("refresh") === "1") for (const k of cache.keys()) if (!k.startsWith("results:")) cache.delete(k);

  const out = { demo, source, apiKeyConfigured: Boolean(apiKey), outcomes: [] as unknown[], matches: [] as unknown[],
    ratings: [] as unknown[], warnings: [] as string[], creditsRemaining: null as string | null,
    leagues: Object.keys(LEAGUES), intlLeagues: Object.keys(LEAGUES).filter((l) => LEAGUES[l].intl), updatedAt: new Date().toISOString() };

  // Liste des championnats à analyser : [nom, chargeur de cotes, source des résultats (code football-data, "intl" ou null = démo)]
  let jobs: [string, () => Promise<OddsRow[]>, string | null][] = [];
  if (source === "demo") {
    jobs = [["Championnat démo", async () => demoData().odds, null]];
  } else if (source === "odds-api") {
    const wanted = (params.get("leagues") ?? "").split("|").filter((l) => l in LEAGUES);
    jobs = wanted.map((league) => [league, async () => {
      const cfg = LEAGUES[league];
      const o = await cached(`odds:${cfg.odds}`, 15 * 60e3, () => fetchOdds(cfg.odds, apiKey!));
      out.creditsRemaining = o.remaining ?? out.creditsRemaining;
      return o.odds;
    }, LEAGUES[league].intl ? "intl" : LEAGUES[league].fd!]);
  } else {
    try {
      const fixtures = await cached("fixtures", 30 * 60e3, loadFixtures);
      jobs = Object.entries(fixtures).filter(([div, rows]) => div in FD_DIVISIONS && rows.length)
        .map(([div, rows]) => [FD_DIVISIONS[div], async () => rows, div]);
      if (!jobs.length) out.warnings.push("Aucun match à venir coté dans la source gratuite pour le moment : "
        + "elle est mise à jour avant chaque journée. Ajoute une clé The Odds API pour un suivi en continu.");
    } catch (e) {
      out.warnings.push(`Source gratuite indisponible : ${(e as Error).message}`);
    }
  }

  await Promise.all(jobs.map(async ([league, loadOdds, fd]) => {
    try {
      const odds = await loadOdds();
      if (!odds.length) { out.warnings.push(`${league} : aucun match à venir coté`); return; }
      const results: Result[] = fd === "intl" ? await cached("results:intl", 6 * 3600e3, loadIntlResults)
        : fd ? await cached(`results:${fd}`, 6 * 3600e3, () => loadResults(fd)) : demoData().results;
      // Les sélections jouent peu : on regarde deux fois plus loin dans le passé.
      const r = analyseLeague(league, results, odds, fd === "intl" ? halfLife * 2 : halfLife,
        { neutral: LEAGUES[league]?.neutral, intl: fd === "intl" });
      out.outcomes.push(...r.outcomes); out.matches.push(...r.matches);
      out.ratings.push(r.ratings); out.warnings.push(...r.warnings);
    } catch (e) {
      out.warnings.push(`${league} : ${(e as Error).message}`);
    }
  }));
  return json(out);
};

export const config: Config = { path: "/api/analyse" };
