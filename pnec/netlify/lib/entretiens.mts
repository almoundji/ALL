// Données partagées des entretiens (registre côté serveur)
import { magasin, type Session } from './auth.mts';

export type Entretien = {
  salle: string; date: string; heure: string; duree: number; statut: 'planifie' | 'realise' | 'annule';
  offreId: string; offreTitre: string; candidatureId: string; candidatEmail: string; candidatNom: string;
  entrepriseId: string; entrepriseNom: string; evaluateur: string; majLe: string;
};

export const SALLE = /^[A-Za-z0-9-]{8,96}$/;
export const db = () => magasin('pnec-entretiens');
export const cles = (e: Pick<Entretien, 'salle' | 'entrepriseId' | 'candidatEmail'>) => [
  `salle/${e.salle}`, `ent/${e.entrepriseId}/${e.salle}`, `cand/${e.candidatEmail.toLowerCase()}/${e.salle}`,
];

export async function lireEntretien(salle: string): Promise<Entretien | null> {
  if (!SALLE.test(salle)) return null;
  return (await db().get(`salle/${salle}`)) as Entretien | null;
}

// Rôle de l'utilisateur dans la salle, ou null s'il n'y est pas autorisé.
export function roleDans(e: Entretien, s: Session): 'recruteur' | 'candidat' | null {
  if (s.role === 'entreprise' && s.orgId && s.orgId === e.entrepriseId) return 'recruteur';
  if (s.role === 'stagiaire' && s.email.toLowerCase() === e.candidatEmail.toLowerCase()) return 'candidat';
  return null;
}

export async function enregistrer(e: Entretien) { for (const k of cles(e)) await db().set(k, e); }

