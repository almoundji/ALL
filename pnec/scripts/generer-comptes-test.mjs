// Génère les comptes de test à partir des données de démonstration.
// Sortie 1 : netlify/lib/test-users.json  (empreintes scrypt uniquement, versionné)
// Sortie 2 : <dossier>/comptes-test.json  (mots de passe en clair — NE PAS versionner)
// Usage : node scripts/generer-comptes-test.mjs <dossier-de-sortie-hors-depot>
import { randomBytes, scryptSync } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { load, finishSeed, db } from '../public/js/store.js';
import { scoreLocal } from '../public/js/ia.js';

const sortie = process.argv[2];
if (!sortie) { console.error('Dossier de sortie requis (hors du dépôt)'); process.exit(1); }

load(); finishSeed(db(), scoreLocal);
const ALPHA = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const CHIFFRES = '23456789';
const tirer = (s, n) => Array.from(randomBytes(n), (b) => s[b % s.length]).join('');
const motDePasse = () => `Pnec-${tirer(ALPHA, 4)}${tirer(CHIFFRES, 2)}-${tirer(ALPHA, 3)}${tirer(CHIFFRES, 2)}`;

const publics = [], clairs = [];
for (const u of db().users) {
  const mdp = motDePasse();
  const sel = randomBytes(16);
  const hash = scryptSync(mdp.normalize('NFKC'), sel, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  publics.push({ id: u.id, email: u.email.toLowerCase(), nom: u.nom, role: u.role, orgId: u.orgId, sel: sel.toString('base64'), hash: hash.toString('base64') });
  const org = u.role === 'entreprise' ? db().entreprises.find((e) => e.id === u.orgId)
    : u.role === 'stagiaire' ? db().stagiaires.find((s) => s.id === u.orgId) : null;
  clairs.push({ ...u, motDePasse: mdp, details: org ? (u.role === 'entreprise' ? `${org.secteur} · ${org.region} · ${org.statut}` : `${org.diplome} · ${org.region}`) : '' });
}
writeFileSync(new URL('../netlify/lib/test-users.json', import.meta.url), JSON.stringify(publics, null, 1));
mkdirSync(sortie, { recursive: true });
writeFileSync(`${sortie}/comptes-test.json`, JSON.stringify(clairs, null, 1));
console.log(`${publics.length} comptes générés`);
