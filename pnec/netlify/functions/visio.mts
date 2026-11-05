// Signalisation WebRTC des entretiens vidéo intégrés à la plateforme.
// Le flux audio/vidéo passe directement entre les deux navigateurs (chiffré DTLS-SRTP) ;
// le serveur ne relaie que les messages de mise en relation, et seulement entre les deux participants autorisés.
//   GET  /api/visio/:salle          → infos de la salle, rôle, serveurs ICE
//   POST /api/visio/:salle/signal   → envoyer un message à l'autre participant
//   GET  /api/visio/:salle/signal   → relever les messages reçus
import { json, lireSession, origineValide, magasin, env } from '../lib/auth.mts';
import { lireEntretien, roleDans } from '../lib/entretiens.mts';

const TYPES = new Set(['pret', 'offre', 'reponse', 'ice', 'chat', 'quitte', 'etat']);
const sig = () => magasin('pnec-visio');

function serveursIce() {
  const ice: { urls: string | string[]; username?: string; credential?: string }[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const turn = env('PNEC_TURN_URL');
  if (turn) ice.push({ urls: turn.split(','), username: env('PNEC_TURN_USERNAME'), credential: env('PNEC_TURN_CREDENTIAL') });
  return ice;
}

export default async (req: Request) => {
  if (!origineValide(req)) return json({ error: 'Requête refusée' }, 403);
  const s = lireSession(req);
  if (!s) return json({ error: 'Non connecté' }, 401);
  const [salle, sous] = new URL(req.url).pathname.replace(/^\/api\/visio\/?/, '').split('/');
  const e = await lireEntretien(decodeURIComponent(salle ?? ''));
  const role = e ? roleDans(e, s) : null;
  if (!e || !role) return json({ error: 'Salle introuvable ou accès non autorisé' }, 404);
  if (e.statut === 'annule') return json({ error: 'Cet entretien a été annulé' }, 410);
  const autre = role === 'recruteur' ? 'candidat' : 'recruteur';

  try {
    if (!sous && req.method === 'GET') {
      return json({ entretien: e, role, moi: s.nom, iceServers: serveursIce() });
    }
    if (sous === 'signal' && req.method === 'POST') {
      const b = (await req.json()) as { type?: string; data?: unknown };
      if (!b.type || !TYPES.has(b.type)) return json({ error: 'Type invalide' }, 400);
      const corps = JSON.stringify(b.data ?? null);
      if (corps.length > 20_000) return json({ error: 'Message trop volumineux' }, 413);
      const cle = `${e.salle}/${autre}/${Date.now().toString().padStart(15, '0')}-${crypto.randomUUID().slice(0, 8)}`;
      await sig().set(cle, { type: b.type, data: b.data ?? null, de: role, nom: s.nom, date: new Date().toISOString() });
      return json({ ok: true });
    }
    if (sous === 'signal' && req.method === 'GET') {
      const cles = await sig().list(`${e.salle}/${role}/`);
      const messages = [];
      for (const k of cles.slice(0, 100)) {
        const m = await sig().get(k);
        if (m) messages.push(m);
        await sig().del(k);
      }
      return json({ messages });
    }
    return json({ error: 'Introuvable' }, 404);
  } catch (err) {
    console.error('visio', err);
    return json({ error: 'Erreur interne' }, 500);
  }
};

export const config = { path: ['/api/visio/:salle', '/api/visio/:salle/signal'] };
