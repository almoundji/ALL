import type { Config } from "@netlify/functions";
import { checkCredentials, clearCookie, currentUser, json, sessionCookie } from "../lib/auth.mts";

export default async (req: Request) => {
  if (req.method === "GET") {
    const user = currentUser(req);
    return user ? json({ user }) : json({ error: "non connecté" }, 401);
  }
  if (req.method === "DELETE") return json({ ok: true }, 200, { "set-cookie": clearCookie });
  if (req.method !== "POST") return json({ error: "méthode non autorisée" }, 405);

  const { username = "", password = "" } = await req.json().catch(() => ({}));
  if (!checkCredentials(String(username), String(password))) {
    await new Promise((r) => setTimeout(r, 800)); // freine les essais en rafale
    return json({ error: "Identifiant ou mot de passe incorrect" }, 401);
  }
  return json({ user: username }, 200, { "set-cookie": sessionCookie(String(username)) });
};

export const config: Config = { path: "/api/session" };
