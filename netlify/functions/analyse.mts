import type { Config } from "@netlify/functions";
import { currentUser, json } from "../lib/auth.mts";
import { LEAGUES, demoData, fetchOdds, loadResults } from "../lib/data.mts";
import { analyseLeague } from "../lib/engine.mts";

// Cache mémoire de l'instance : économise le quota The Odds API (cotes 15 min, résultats 6 h).
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
  const demo = params.get("demo") === "1" || !apiKey;
  const halfLife = Math.min(720, Math.max(30, Number(params.get("halfLife")) || 180));
  const refresh = params.get("refresh") === "1";
  if (refresh) for (const k of cache.keys()) if (k.startsWith("odds:")) cache.delete(k);
  const leagues = demo ? ["Championnat démo"] : (params.get("leagues") ?? "").split("|").filter((l) => l in LEAGUES);

  const out = { demo, apiKeyConfigured: Boolean(apiKey), outcomes: [] as unknown[], matches: [] as unknown[],
    ratings: [] as unknown[], warnings: [] as string[], creditsRemaining: null as string | null,
    leagues: Object.keys(LEAGUES), updatedAt: new Date().toISOString() };

  await Promise.all(leagues.map(async (league) => {
    try {
      let results, odds;
      if (demo) ({ results, odds } = demoData());
      else {
        const cfg = LEAGUES[league];
        const o = await cached(`odds:${cfg.odds}`, 15 * 60e3, () => fetchOdds(cfg.odds, apiKey!));
        out.creditsRemaining = o.remaining ?? out.creditsRemaining;
        if (!o.odds.length) { out.warnings.push(`${league} : aucun match à venir coté`); return; }
        odds = o.odds;
        results = await cached(`results:${cfg.fd}`, 6 * 3600e3, () => loadResults(cfg.fd));
      }
      const r = analyseLeague(league, results, odds, halfLife);
      out.outcomes.push(...r.outcomes); out.matches.push(...r.matches);
      out.ratings.push(r.ratings); out.warnings.push(...r.warnings);
    } catch (e) {
      out.warnings.push(`${league} : ${(e as Error).message}`);
    }
  }));
  return json(out);
};

export const config: Config = { path: "/api/analyse" };
