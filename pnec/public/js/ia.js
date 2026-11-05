// Moteur de pré-tri des CV.
// 1) Moteur local (toujours disponible) : score explicable sur 100.
// 2) Moteur distant (fonction Netlify /api/tri-cv, Claude) si une clé API est configurée.
// Dans les deux cas, les données personnelles non pertinentes (nom, sexe, âge, photo)
// ne sont PAS prises en compte, pour limiter les biais de sélection.

import { NIVEAUX } from './store.js';

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim();

function competenceTrouvee(comp, candidat) {
  const c = norm(comp);
  const corpus = ' ' + norm([...(candidat.competences || []), candidat.cvTexte, candidat.diplome].join(' ')) + ' ';
  if (corpus.includes(' ' + c + ' ')) return true;
  // correspondance partielle sur les mots significatifs (ex. « Gestion de stock » ~ « stock »)
  const mots = c.split(' ').filter((m) => m.length > 3);
  return mots.length > 0 && mots.every((m) => corpus.includes(m));
}

export function scoreLocal(offre, candidat) {
  const points = [];
  const vigilance = [];

  // Compétences demandées (50 pts)
  const req = offre.competences || [];
  const ok = req.filter((c) => competenceTrouvee(c, candidat));
  const sComp = req.length ? (ok.length / req.length) * 50 : 25;
  if (ok.length) points.push(`Compétences attendues : ${ok.join(', ')}`);
  const manquantes = req.filter((c) => !ok.includes(c));
  if (manquantes.length) vigilance.push(`À vérifier en entretien : ${manquantes.join(', ')}`);

  // Niveau de formation (20 pts)
  const iReq = NIVEAUX.indexOf(offre.niveau);
  const iCand = NIVEAUX.indexOf(candidat.niveau);
  let sNiv = 10;
  if (iReq >= 0 && iCand >= 0) {
    const ecart = iCand - iReq;
    sNiv = ecart >= 0 ? (ecart > 2 ? 14 : 20) : Math.max(0, 20 + ecart * 8);
    if (ecart >= 0) points.push(`Niveau ${candidat.niveau} (requis : ${offre.niveau})`);
    else vigilance.push(`Niveau ${candidat.niveau} inférieur au niveau requis (${offre.niveau})`);
    if (ecart > 2) vigilance.push('Profil sur-qualifié : vérifier la motivation pour un stage');
  }

  // Domaine de formation (15 pts)
  const sDom = candidat.domaine === offre.domaine ? 15 : 4;
  if (candidat.domaine === offre.domaine) points.push(`Formation dans le domaine (${offre.domaine})`);

  // Expérience (10 pts) — un stage d'insertion vise d'abord les primo-demandeurs
  const exp = candidat.experience || 0;
  const sExp = exp === 0 ? 6 : exp <= 12 ? 10 : 8;
  if (exp > 0) points.push(`${exp} mois d'expérience`);

  // Mobilité (5 pts)
  const sReg = candidat.region === offre.region ? 5 : 2;
  if (candidat.region !== offre.region) vigilance.push(`Réside à ${candidat.region} (poste à ${offre.region}) : mobilité à confirmer`);

  const score = Math.round(sComp + sNiv + sDom + sExp + sReg);
  return {
    score,
    criteres: { competences: Math.round(sComp), niveau: Math.round(sNiv), domaine: sDom, experience: sExp, mobilite: sReg },
    pointsForts: points,
    pointsVigilance: vigilance,
    recommandation: score >= 75 ? 'Très bonne adéquation' : score >= 55 ? 'Adéquation correcte' : 'Adéquation faible',
  };
}

// Profil anonymisé envoyé au moteur distant.
export function profilAnonyme(c) {
  return {
    ref: c.id, niveau: c.niveau, domaine: c.domaine, diplome: c.diplome,
    competences: c.competences, experienceMois: c.experience, region: c.region, cv: c.cvTexte,
  };
}

let distantDispo = null;
export async function moteurDistantDisponible() {
  if (distantDispo !== null) return distantDispo;
  try {
    const r = await fetch('/api/tri-cv', { method: 'GET' });
    distantDispo = r.ok && (await r.json()).enabled === true;
  } catch { distantDispo = false; }
  return distantDispo;
}

// Retourne { moteur: 'claude' | 'local', resultats: Map(stagiaireId -> resultat) }
export async function trierCandidats(offre, candidats, { autoriserDistant = true } = {}) {
  const local = new Map(candidats.map((c) => [c.id, scoreLocal(offre, c)]));
  if (!autoriserDistant || !(await moteurDistantDisponible())) return { moteur: 'local', resultats: local };
  try {
    const r = await fetch('/api/tri-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offre: { titre: offre.titre, description: offre.description, missions: offre.missions, competences: offre.competences, niveau: offre.niveau, domaine: offre.domaine, region: offre.region },
        candidats: candidats.map(profilAnonyme),
      }),
    });
    if (!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    const out = new Map();
    for (const c of candidats) {
      const d = data.resultats?.find((x) => x.ref === c.id);
      if (!d) { out.set(c.id, local.get(c.id)); continue; }
      out.set(c.id, {
        score: Math.max(0, Math.min(100, Math.round(d.score))),
        criteres: local.get(c.id).criteres,
        pointsForts: d.points_forts || [],
        pointsVigilance: d.points_vigilance || [],
        recommandation: d.recommandation || '',
      });
    }
    return { moteur: 'claude', resultats: out };
  } catch {
    return { moteur: 'local', resultats: local };
  }
}
