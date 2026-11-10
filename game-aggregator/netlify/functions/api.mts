// API de Yoon en fonction serverless Netlify — port du socle FastAPI (Sprint 0).
// Le backend de référence reste `backend/app` (Python) ; cette fonction expose les mêmes routes pour la recette en ligne.
import type { Config } from "@netlify/functions";

const env = (k: string, d = "") => (globalThis as any).Netlify?.env.get(k) ?? process.env[k] ?? d;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const APP = { app: "Yoon", version: "0.0.1-sprint0" };

// Même registre que backend/app/modules/__init__.py
const MODULES = [
  ["operators", "Opérateurs", 1], ["providers", "Fournisseurs", 1], ["catalog", "Catalogue", 1], ["players", "Joueurs", 1],
  ["wallet", "Portefeuille", 1], ["sessions", "Sessions", 1], ["rounds", "Tours de jeu", 1], ["rng", "RNG équitable", 1],
  ["audit", "Journal d'audit", 1], ["responsible", "Jeu responsable", 2], ["bonus", "Bonus", 5], ["reporting", "Reporting et facturation", 6],
].map(([key, name, sprint]) => ({ key, name, sprint, status: "planifié" }));

export default async (req: Request) => {
  const url = new URL(req.url);
  if (req.method !== "GET") return json({ detail: "Méthode non autorisée" }, 405);
  switch (url.pathname.replace(/\/$/, "")) {
    case "/api/health":
      return json({ status: "ok", ...APP, environment: env("YOON_ENVIRONMENT", "recette") });
    case "/api/modules":
      return json(MODULES);
    default:
      return json({ detail: "Route inconnue" }, 404);
  }
};

export const config: Config = { path: ["/api", "/api/*"] };
