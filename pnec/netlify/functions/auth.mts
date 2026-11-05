// API d'authentification : /api/auth/connexion, /deconnexion, /session, /inscription
import {
  json, origineValide, trouverCompte, verifier, estVerrouille, noterEchec, effacerEchecs, creerJeton, cookieSession,
  cookieEffacement, lireSession, creerCompte, politiqueMotDePasse, portailDuRole, publicDe, ROLES_PUBLICS, ROLES_AGENTS,
  type Portail,
} from '../lib/auth.mts';

const ERREUR_CONNEXION = 'Identifiant ou mot de passe incorrect.';
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

// Limitation simple du nombre de tentatives par adresse IP (par instance)
const tentatives = new Map<string, number[]>();
function tropDeTentatives(ip: string): boolean {
  const now = Date.now();
  const liste = (tentatives.get(ip) ?? []).filter((t) => now - t < 60_000);
  liste.push(now);
  tentatives.set(ip, liste);
  return liste.length > 20;
}

export default async (req: Request, context: { ip?: string }) => {
  const action = new URL(req.url).pathname.replace(/^\/api\/auth\/?/, '');
  if (!origineValide(req)) return json({ error: 'Requête refusée' }, 403);

  try {
    if (action === 'session' && req.method === 'GET') {
      const s = lireSession(req);
      return s ? json({ utilisateur: publicDe(s), portail: s.portail, expire: s.exp }) : json({ utilisateur: null });
    }

    if (action === 'deconnexion' && req.method === 'POST') {
      return json({ ok: true }, 200, { 'Set-Cookie': cookieEffacement() });
    }

    if (action === 'connexion' && req.method === 'POST') {
      if (tropDeTentatives(context?.ip ?? 'local')) return json({ error: 'Trop de tentatives, réessayez dans une minute.' }, 429);
      const { email, motDePasse, portail } = (await req.json()) as { email?: string; motDePasse?: string; portail?: Portail };
      if (typeof email !== 'string' || typeof motDePasse !== 'string' || !['public', 'agents'].includes(portail as string)) {
        return json({ error: ERREUR_CONNEXION }, 400);
      }
      if (await estVerrouille(email)) return json({ error: 'Compte temporairement verrouillé après plusieurs échecs. Réessayez dans 15 minutes.' }, 423);
      const compte = await trouverCompte(email);
      const ok = compte && compte.actif !== false && (await verifier(motDePasse, compte));
      // Un compte ne peut se connecter que sur son propre portail (réponse identique pour ne rien divulguer)
      if (!ok || portailDuRole(compte.role) !== portail) {
        await noterEchec(email);
        return json({ error: ERREUR_CONNEXION }, 401);
      }
      await effacerEchecs(email);
      const { jeton, maxAge } = creerJeton(compte, portail as Portail);
      return json({ utilisateur: publicDe(compte), portail }, 200, { 'Set-Cookie': cookieSession(jeton, maxAge) });
    }

    if (action === 'inscription' && req.method === 'POST') {
      const b = (await req.json()) as { email?: string; motDePasse?: string; nom?: string; role?: string; orgId?: string };
      const session = lireSession(req);
      const institutionnel = (ROLES_AGENTS as readonly string[]).includes(b.role ?? '');
      // Inscription libre pour les jeunes et les entreprises ; comptes de l'État créés uniquement par un administrateur
      if (institutionnel && session?.role !== 'admin') return json({ error: 'Création réservée aux administrateurs' }, 403);
      if (!institutionnel && !(ROLES_PUBLICS as readonly string[]).includes(b.role ?? '')) return json({ error: 'Rôle invalide' }, 400);
      if (typeof b.email !== 'string' || !EMAIL.test(b.email)) return json({ error: 'Adresse e-mail invalide.' }, 400);
      if (typeof b.nom !== 'string' || !b.nom.trim() || b.nom.length > 120) return json({ error: 'Nom invalide.' }, 400);
      const pb = politiqueMotDePasse(b.motDePasse ?? '');
      if (pb) return json({ error: pb }, 400);
      const id = `u-${crypto.randomUUID()}`;
      const orgId = typeof b.orgId === 'string' && /^[a-z]{2,4}-[a-z0-9-]{3,40}$/i.test(b.orgId) ? b.orgId : undefined;
      const cree = await creerCompte({ id, email: b.email, nom: b.nom.trim(), role: b.role!, orgId }, b.motDePasse!);
      if (!cree) return json({ error: 'Un compte existe déjà avec cette adresse e-mail.' }, 409);
      if (institutionnel) return json({ ok: true, utilisateur: { id, email: b.email.toLowerCase(), nom: b.nom.trim(), role: b.role } });
      const compte = await trouverCompte(b.email);
      const { jeton, maxAge } = creerJeton(compte!, 'public');
      return json({ utilisateur: publicDe(compte!), portail: 'public' }, 201, { 'Set-Cookie': cookieSession(jeton, maxAge) });
    }

    return json({ error: 'Introuvable' }, 404);
  } catch (err) {
    console.error('auth', err);
    const config = err instanceof Error && err.message.includes('SESSION_SECRET');
    return json({ error: config ? 'Service de connexion non configuré.' : 'Erreur interne' }, 500);
  }
};

export const config = { path: '/api/auth/*' };
