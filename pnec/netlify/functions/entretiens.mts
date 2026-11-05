// Registre des entretiens (côté serveur) : l'entreprise planifie, le candidat les retrouve
// depuis n'importe quel appareil, et seuls ces deux participants peuvent ouvrir la salle vidéo.
//   GET  /api/entretiens            → entretiens de l'utilisateur connecté
//   POST /api/entretiens            → créer / mettre à jour (entreprise propriétaire)
//   POST /api/entretiens/annuler    → annuler (entreprise propriétaire)
import { json, lireSession, origineValide } from '../lib/auth.mts';
import { SALLE, db, cles, lireEntretien, roleDans, enregistrer, type Entretien } from '../lib/entretiens.mts';

const txt = (v: unknown, max = 160) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async (req: Request) => {
  if (!origineValide(req)) return json({ error: 'Requête refusée' }, 403);
  const s = lireSession(req);
  if (!s) return json({ error: 'Non connecté' }, 401);
  const action = new URL(req.url).pathname.replace(/^\/api\/entretiens\/?/, '');

  try {
    if (req.method === 'GET' && !action) {
      const prefixe = s.role === 'entreprise' && s.orgId ? `ent/${s.orgId}/` : s.role === 'stagiaire' ? `cand/${s.email.toLowerCase()}/` : null;
      if (!prefixe) return json({ entretiens: [] });
      const liste = await Promise.all((await db().list(prefixe)).map((k) => db().get(k)));
      return json({ entretiens: liste.filter(Boolean) });
    }

    if (req.method === 'POST' && !action) {
      if (s.role !== 'entreprise' || !s.orgId) return json({ error: 'Réservé aux entreprises' }, 403);
      const b = (await req.json()) as Partial<Entretien>;
      const salle = txt(b.salle, 96);
      if (!SALLE.test(salle)) return json({ error: 'Salle invalide' }, 400);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date ?? '') || !/^\d{2}:\d{2}$/.test(b.heure ?? '')) return json({ error: 'Date ou heure invalide' }, 400);
      const email = txt(b.candidatEmail, 200).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return json({ error: 'E-mail du candidat invalide' }, 400);
      const existant = await lireEntretien(salle);
      if (existant && existant.entrepriseId !== s.orgId) return json({ error: 'Salle déjà attribuée' }, 403);
      if (existant && existant.candidatEmail !== email) for (const k of cles(existant)) await db().del(k);
      const statut = (['planifie', 'realise', 'annule'] as const).includes(b.statut as 'planifie') ? b.statut! : 'planifie';
      const e: Entretien = {
        salle, date: b.date!, heure: b.heure!, duree: Math.min(180, Math.max(10, Number(b.duree) || 30)), statut,
        offreId: txt(b.offreId, 80), offreTitre: txt(b.offreTitre), candidatureId: txt(b.candidatureId, 80),
        candidatEmail: email, candidatNom: txt(b.candidatNom, 120), entrepriseId: s.orgId, entrepriseNom: s.nom,
        evaluateur: txt(b.evaluateur, 120), majLe: new Date().toISOString(),
      };
      await enregistrer(e);
      return json({ entretien: e });
    }

    if (req.method === 'POST' && action === 'annuler') {
      const { salle } = (await req.json()) as { salle?: string };
      const e = await lireEntretien(salle ?? '');
      if (!e || roleDans(e, s) !== 'recruteur') return json({ error: 'Introuvable' }, 404);
      e.statut = 'annule'; e.majLe = new Date().toISOString();
      await enregistrer(e);
      return json({ entretien: e });
    }

    return json({ error: 'Introuvable' }, 404);
  } catch (err) {
    console.error('entretiens', err);
    return json({ error: 'Erreur interne' }, 500);
  }
};

export const config = { path: ['/api/entretiens', '/api/entretiens/*'] };
