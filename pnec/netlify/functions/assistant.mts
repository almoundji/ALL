// Assistant IA du recruteur (Claude) : fiche de poste et rapport de fin de recrutement.
// Réservé aux recruteurs connectés. Sans ANTHROPIC_API_KEY, le front-end utilise ses générateurs locaux.
import Anthropic from '@anthropic-ai/sdk';
import { lireSession, origineValide, env, json } from '../lib/auth.mts';

const SCHEMAS = {
  fiche: {
    type: 'object',
    properties: {
      description: { type: 'string' },
      missions: { type: 'array', items: { type: 'string' } },
      competences: { type: 'array', items: { type: 'string' } },
      profil: { type: 'string' },
    },
    required: ['description', 'missions', 'competences', 'profil'],
    additionalProperties: false,
  },
  rapport: {
    type: 'object',
    properties: {
      synthese: { type: 'string' },
      finalistes: {
        type: 'array',
        items: {
          type: 'object',
          properties: { ref: { type: 'string' }, analyse: { type: 'string' } },
          required: ['ref', 'analyse'], additionalProperties: false,
        },
      },
      recommandations: { type: 'array', items: { type: 'string' } },
    },
    required: ['synthese', 'finalistes', 'recommandations'],
    additionalProperties: false,
  },
} as const;

const SYSTEMES = {
  fiche: `Tu rédiges des fiches de poste de stage pour le Programme national d'Engagement citoyen (PNEC) du Sénégal.
Stage citoyen professionnalisant destiné à des jeunes : ton clair, inclusif (écriture « ·e » acceptée), concret.
Donne une description de 2 à 3 phrases, 4 à 6 missions, 4 à 6 compétences courtes (2 à 3 mots), et un paragraphe « profil recherché ».
N'introduis aucun critère discriminatoire (âge, sexe, origine, religion, situation familiale).`,
  rapport: `Tu rédiges le rapport de fin de recrutement d'une offre de stage du PNEC pour la direction de l'entreprise et le Ministère.
À partir des données fournies (profils anonymisés par référence, scores, notes d'entretien, appréciations), produis :
une synthèse factuelle du processus (4 à 6 phrases), une analyse courte de chaque finaliste, et 2 à 4 recommandations.
Reste factuel, n'invente aucune donnée, n'utilise jamais le genre ou l'âge.`,
};

export default async (req: Request) => {
  const actif = Boolean(env('ANTHROPIC_API_KEY'));
  if (req.method === 'GET') return json({ enabled: actif });
  const session = lireSession(req);
  if (!origineValide(req) || !session || !['entreprise', 'admin'].includes(session.role)) return json({ error: 'Non autorisé' }, 401);
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  if (!actif) return json({ error: 'Assistant IA non configuré' }, 503);

  let b: { type?: 'fiche' | 'rapport'; donnees?: unknown };
  try { b = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }
  if (b.type !== 'fiche' && b.type !== 'rapport') return json({ error: 'Type inconnu' }, 400);
  const donnees = JSON.stringify(b.donnees ?? {});
  if (donnees.length > 60_000) return json({ error: 'Données trop volumineuses' }, 413);

  const client = new Anthropic();
  try {
    const r = await client.messages.create({
      model: env('PNEC_MODEL') || 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMAS[b.type] } },
      system: SYSTEMES[b.type],
      messages: [{ role: 'user', content: donnees }],
    });
    if (r.stop_reason === 'refusal' || r.stop_reason === 'max_tokens') return json({ error: `Réponse incomplète (${r.stop_reason})` }, 502);
    const t = r.content.find((x) => x.type === 'text');
    if (!t || t.type !== 'text') return json({ error: 'Réponse vide' }, 502);
    return json(JSON.parse(t.text));
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'Trop de requêtes, réessayez' }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: `Erreur du moteur IA (${err.status ?? 'réseau'})` }, 502);
    return json({ error: 'Erreur interne' }, 500);
  }
};

export const config = { path: '/api/assistant' };
