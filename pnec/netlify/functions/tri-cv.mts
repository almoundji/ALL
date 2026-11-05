// Pré-tri des candidatures par Claude.
// Activé seulement si la variable d'environnement ANTHROPIC_API_KEY est définie sur Netlify ;
// sinon le front-end utilise le moteur local (public/js/ia.js).
import Anthropic from '@anthropic-ai/sdk';

const SCHEMA = {
  type: 'object',
  properties: {
    resultats: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ref: { type: 'string' },
          score: { type: 'integer' },
          points_forts: { type: 'array', items: { type: 'string' } },
          points_vigilance: { type: 'array', items: { type: 'string' } },
          recommandation: { type: 'string' },
        },
        required: ['ref', 'score', 'points_forts', 'points_vigilance', 'recommandation'],
        additionalProperties: false,
      },
    },
  },
  required: ['resultats'],
  additionalProperties: false,
};

const SYSTEM = `Tu es le moteur de pré-tri des candidatures du Programme national d'Engagement citoyen (PNEC) du Sénégal.
Pour une offre de stage d'insertion, tu évalues l'adéquation de chaque profil anonymisé, de 0 à 100.
Critères : compétences demandées, niveau et domaine de formation, expérience (un stage d'insertion vise d'abord les jeunes primo-demandeurs ; le manque d'expérience n'est pas éliminatoire), mobilité.
Tu ne déduis jamais le genre, l'âge, l'origine ou la religion, et tu n'en tiens pas compte.
Ce tri est une aide à la décision : l'entreprise valide toujours la présélection.
Réponds en français, avec 1 à 3 points forts et 0 à 3 points de vigilance courts par profil.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req: Request) => {
  const enabled = Boolean(process.env.ANTHROPIC_API_KEY);
  if (req.method === 'GET') return json({ enabled });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  if (!enabled) return json({ error: 'Moteur distant non configuré' }, 503);

  let payload: { offre?: unknown; candidats?: unknown[] };
  try { payload = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }
  const candidats = Array.isArray(payload.candidats) ? payload.candidats.slice(0, 60) : [];
  if (!payload.offre || candidats.length === 0) return json({ error: 'Offre et candidats requis' }, 400);

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: process.env.PNEC_MODEL || 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Offre :\n${JSON.stringify(payload.offre)}\n\nProfils anonymisés :\n${JSON.stringify(candidats)}`,
      }],
    });
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
      return json({ error: `Réponse incomplète (${response.stop_reason})` }, 502);
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'Réponse vide' }, 502);
    return json(JSON.parse(text.text));
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'Trop de requêtes, réessayez' }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: `Erreur du moteur IA (${err.status ?? 'réseau'})` }, 502);
    return json({ error: 'Erreur interne' }, 500);
  }
};

export const config = { path: '/api/tri-cv' };
