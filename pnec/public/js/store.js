// Données et persistance du prototype PNEC.
// Tout est stocké dans le navigateur (localStorage) : la couche d'accès ci-dessous
// est le seul point à remplacer pour brancher une vraie API / base de données.

const KEY = 'pnec.v2';

export const REGIONS = ['Dakar', 'Thiès', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Kolda',
  'Louga', 'Matam', 'Saint-Louis', 'Sédhiou', 'Tambacounda', 'Kédougou', 'Ziguinchor'];

export const SECTEURS = ['Numérique & télécoms', 'Agriculture & agro-industrie', 'BTP & infrastructures',
  'Banque & assurance', 'Énergie', 'Logistique & transport', 'Santé', 'Tourisme & hôtellerie',
  'Commerce & distribution', 'Pêche & économie bleue', 'Industrie', 'Mines'];

export const VOLETS = ['Stage citoyen professionnalisant', 'Service civique professionnalisant', "Saison d'Engagement citoyen"];

export const COMPETENCES = {
  'Numérique & télécoms': ['JavaScript', 'Python', 'Réseaux', 'SQL', 'Cybersécurité', 'Support utilisateur', 'Cloud'],
  'Agriculture & agro-industrie': ['Agronomie', 'Irrigation', 'Contrôle qualité', 'HACCP', 'Gestion de stock', 'Mécanisation'],
  'BTP & infrastructures': ['AutoCAD', 'Topographie', 'Métré', 'Conduite de chantier', 'Sécurité chantier', 'Électricité bâtiment'],
  'Banque & assurance': ['Comptabilité', 'Analyse financière', 'Relation client', 'Excel', 'Conformité', 'Crédit'],
  'Énergie': ['Électricité', 'Photovoltaïque', 'Maintenance', 'Habilitation électrique', 'Dimensionnement'],
  'Logistique & transport': ['Gestion de stock', 'Transit', 'Douane', 'Excel', 'Supply chain', 'Permis C'],
  'Santé': ['Soins infirmiers', 'Accueil patient', 'Hygiène', 'Pharmacie', 'Secrétariat médical'],
  'Tourisme & hôtellerie': ['Accueil', 'Anglais', 'Cuisine', 'Service en salle', 'Réservation', 'Housekeeping'],
  'Commerce & distribution': ['Vente', 'Merchandising', 'Caisse', 'Relation client', 'Gestion de stock', 'Marketing digital'],
  'Pêche & économie bleue': ['Transformation halieutique', 'Froid industriel', 'Hygiène', 'Contrôle qualité', 'Navigation'],
  'Industrie': ['Maintenance industrielle', 'Électromécanique', 'Production', 'Sécurité industrielle', 'Contrôle qualité'],
  'Mines': ['Géologie', 'Sécurité minière', 'Maintenance engins', 'Topographie', 'Environnement'],
};

export const NIVEAUX = ['CAP / BEP', 'BT / BTS', 'Licence', 'Master', 'Ingénieur', 'Doctorat'];

export const ROLES = {
  admin: { label: 'Administrateur PNEC', court: 'Administration' },
  mfp: { label: 'Ministère de la Formation professionnelle', court: 'Ministère (MFPAI)' },
  de: { label: "Direction de l'Emploi", court: "Direction de l'Emploi" },
  primature: { label: 'Primature — Cellule de suivi', court: 'Primature' },
  entreprise: { label: 'Entreprise partenaire', court: 'Entreprise' },
  stagiaire: { label: 'Jeune candidat(e) / stagiaire', court: 'Stagiaire' },
};

export const STATUTS_CAND = {
  soumise: { label: 'Soumise', ton: 'neutre' },
  preselectionnee: { label: 'Présélectionnée (IA)', ton: 'info' },
  non_retenue_ia: { label: 'Non retenue au tri', ton: 'gris' },
  entretien_planifie: { label: 'Entretien planifié', ton: 'info' },
  entretien_realise: { label: 'Entretien réalisé', ton: 'attention' },
  retenue: { label: 'Retenue', ton: 'ok' },
  refusee: { label: 'Non retenue', ton: 'gris' },
  en_stage: { label: 'En stage', ton: 'ok' },
};

export const TYPES_CONV = {
  CADRE: { label: 'Convention cadre Ministère – Entreprise', court: 'Cadre MFPAI' },
  PRISE_EN_CHARGE: { label: "Convention de prise en charge Entreprise – Direction de l'Emploi", court: 'Prise en charge 50/50' },
  STAGE: { label: 'Convention de stage Stagiaire – Entreprise', court: 'Convention de stage' },
};

export const PARTIES = {
  MFP: 'Ministère de la Formation professionnelle',
  ENTREPRISE: 'Entreprise',
  DE: "Direction de l'Emploi",
  STAGIAIRE: 'Stagiaire',
};

// ---------- Générateur pseudo-aléatoire déterministe (données de démo) ----------
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const iso = (d) => d.toISOString();
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

function seed() {
  const r = rng(2026);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const between = (a, b) => a + Math.floor(r() * (b - a + 1));
  // Mélange de Fisher-Yates : résultat identique dans tous les moteurs JavaScript (contrairement à sort aléatoire)
  const melanger = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const now = new Date();
  const ago = (n) => iso(addDays(now, -n));

  const entreprisesDef = [
    ['Teranga Digital SA', 'Numérique & télécoms', 'Dakar', 420],
    ['Sahel Agro Industries', 'Agriculture & agro-industrie', 'Saint-Louis', 260],
    ['Dakar BTP Services', 'BTP & infrastructures', 'Dakar', 610],
    ['Banque Populaire du Littoral', 'Banque & assurance', 'Dakar', 890],
    ['Casamance Énergie Solaire', 'Énergie', 'Ziguinchor', 85],
    ['Atlantique Logistique', 'Logistique & transport', 'Thiès', 340],
    ['Clinique Baobab', 'Santé', 'Kaolack', 120],
    ['Saloum Hôtels & Resorts', 'Tourisme & hôtellerie', 'Fatick', 210],
    ['Marché Central Distribution', 'Commerce & distribution', 'Diourbel', 150],
    ['Pêcheries du Cap-Vert', 'Pêche & économie bleue', 'Louga', 95],
    ['Ciments du Sine', 'Industrie', 'Thiès', 1200],
    ['Or du Sénégal Oriental', 'Mines', 'Kédougou', 480],
    ['Niayes Maraîchage Coop', 'Agriculture & agro-industrie', 'Thiès', 60],
    ['Fleuve Riz SA', 'Agriculture & agro-industrie', 'Matam', 140],
    ['Kolda Transformation', 'Industrie', 'Kolda', 70],
  ];

  const entreprises = entreprisesDef.map(([raisonSociale, secteur, region, effectif], i) => ({
    id: `ent-${i + 1}`,
    raisonSociale, secteur, region, effectif,
    ninea: `00${between(1000000, 9999999)}2G${between(1, 3)}`,
    rccm: `SN-${region.slice(0, 3).toUpperCase()}-20${between(10, 23)}-B-${between(1000, 9999)}`,
    contact: pick(['M. Diop', 'Mme Fall', 'M. Sarr', 'Mme Ba', 'M. Ndiaye', 'Mme Sow', 'M. Faye', 'Mme Gueye']),
    fonction: pick(['DRH', 'Directeur général', 'Responsable formation', 'Directrice administrative']),
    email: `rh@${raisonSociale.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '').slice(0, 14)}.sn`,
    tel: `+221 33 ${between(800, 899)} ${between(10, 99)} ${between(10, 99)}`,
    adresse: `${region}, Sénégal`,
    statut: i < 12 ? 'validee' : 'en_attente',
    dateInscription: ago(between(20, 160)),
  }));

  const competencesParSecteur = COMPETENCES;
  const domaines = Object.keys(competencesParSecteur);

  const titres = {
    'Numérique & télécoms': ['Développeur·se web junior', 'Technicien·ne réseaux', 'Assistant·e support IT', 'Analyste données junior'],
    'Agriculture & agro-industrie': ['Technicien·ne agricole', 'Assistant·e qualité agroalimentaire', 'Agent·e de production'],
    'BTP & infrastructures': ['Assistant·e conducteur de travaux', 'Dessinateur·rice projeteur', 'Technicien·ne topographe'],
    'Banque & assurance': ['Chargé·e de clientèle junior', 'Assistant·e comptable', 'Analyste crédit junior'],
    'Énergie': ['Technicien·ne photovoltaïque', 'Électricien·ne de maintenance'],
    'Logistique & transport': ['Agent·e logistique', 'Assistant·e transit et douane'],
    'Santé': ['Aide-soignant·e', 'Secrétaire médical·e'],
    'Tourisme & hôtellerie': ['Réceptionniste', 'Commis de cuisine', 'Serveur·se'],
    'Commerce & distribution': ['Conseiller·ère de vente', 'Assistant·e marketing digital'],
    'Pêche & économie bleue': ['Technicien·ne de transformation', 'Agent·e qualité produits de la mer'],
    'Industrie': ['Technicien·ne de maintenance', 'Opérateur·rice de production'],
    'Mines': ['Assistant·e géologue', 'Technicien·ne sécurité minière'],
  };

  const offres = [];
  entreprises.filter((e) => e.statut === 'validee').forEach((e) => {
    const n = between(1, 3);
    for (let k = 0; k < n; k++) {
      const comp = competencesParSecteur[e.secteur];
      const sel = melanger(comp).slice(0, between(3, 4));
      const titre = titres[e.secteur][k % titres[e.secteur].length];
      offres.push({
        id: `off-${offres.length + 1}`,
        entrepriseId: e.id,
        titre,
        description: `Au sein de ${e.raisonSociale}, vous serez accompagné·e par un tuteur pour participer aux activités du service. Stage d'insertion professionnelle dans le cadre du Programme national d'Engagement citoyen.`,
        missions: ['Participer aux activités quotidiennes du service', 'Appliquer les procédures qualité et sécurité', 'Rendre compte à votre tuteur'],
        competences: sel,
        niveau: pick(NIVEAUX.slice(0, 4)),
        domaine: e.secteur,
        region: e.region,
        duree: pick([6, 6, 9, 12]),
        places: between(1, 4),
        salaire: pick([100000, 120000, 150000, 175000, 200000]),
        dateLimite: iso(addDays(now, between(-5, 40))),
        datePublication: ago(between(5, 90)),
        statut: 'publiee',
        volet: k === 2 ? 'Service civique professionnalisant' : 'Stage citoyen professionnalisant',
      });
    }
  });

  const prenomsF = ['Awa', 'Fatou', 'Aminata', 'Mariama', 'Khady', 'Ndeye', 'Aïssatou', 'Coumba', 'Bineta', 'Seynabou', 'Rokhaya', 'Astou'];
  const prenomsH = ['Moussa', 'Ibrahima', 'Cheikh', 'Mamadou', 'Ousmane', 'Abdoulaye', 'Pape', 'Modou', 'Alioune', 'Babacar', 'Serigne', 'Lamine'];
  const noms = ['Ndiaye', 'Diop', 'Fall', 'Sow', 'Ba', 'Gueye', 'Faye', 'Sarr', 'Diallo', 'Mbaye', 'Cissé', 'Kane', 'Thiam', 'Seck', 'Diouf', 'Camara', 'Mané', 'Sané'];

  const stagiaires = [];
  for (let i = 0; i < 70; i++) {
    const sexe = r() < 0.48 ? 'F' : 'M';
    const prenom = pick(sexe === 'F' ? prenomsF : prenomsH);
    const nom = pick(noms);
    const domaine = pick(domaines);
    const comp = melanger(competencesParSecteur[domaine]).slice(0, between(2, 5));
    if (r() < 0.4) comp.push(pick(['Excel', 'Anglais', 'Relation client', 'Gestion de projet']));
    const niveau = pick(NIVEAUX.slice(0, 5));
    stagiaires.push({
      id: `stg-${i + 1}`,
      prenom, nom, sexe,
      email: `${prenom}.${nom}${i}`.toLowerCase().normalize('NFD').replace(/[^a-z0-9.]/g, '') + '@mail.sn',
      tel: `+221 7${pick([0, 6, 7, 8])} ${between(100, 999)} ${between(10, 99)} ${between(10, 99)}`,
      dateNaissance: iso(new Date(now.getFullYear() - between(19, 34), between(0, 11), between(1, 28))).slice(0, 10),
      region: r() < 0.45 ? 'Dakar' : pick(REGIONS),
      niveau, domaine,
      diplome: `${niveau} — ${domaine}`,
      competences: [...new Set(comp)],
      experience: pick([0, 0, 0, 3, 6, 12, 18, 24]),
      cvTexte: `Jeune diplômé·e en ${domaine.toLowerCase()}, motivé·e et rigoureux·se. Compétences : ${comp.join(', ')}.`,
      dateInscription: ago(between(3, 150)),
    });
  }

  // Candidatures et parcours
  const candidatures = [];
  const conventions = [];
  entreprises.forEach((e) => {
    if (e.statut !== 'validee') return;
    const d = new Date(e.dateInscription);
    conventions.push({
      id: `cv-${conventions.length + 1}`,
      reference: `PNEC/MFPAI/${d.getFullYear()}/${String(conventions.length + 1).padStart(4, '0')}`,
      type: 'CADRE', entrepriseId: e.id,
      dateCreation: iso(addDays(d, 3)),
      parties: [
        { role: 'MFP', signe: true, date: iso(addDays(d, 6)), signataire: 'Le Directeur de la Formation professionnelle' },
        { role: 'ENTREPRISE', signe: true, date: iso(addDays(d, 5)), signataire: `${e.contact}, ${e.fonction}` },
      ],
    });
  });

  offres.forEach((o) => {
    const pool = melanger(stagiaires);
    const n = between(3, 9);
    const affines = pool.filter((s) => s.domaine === o.domaine).slice(0, Math.ceil(n * 0.6));
    const autres = pool.filter((s) => s.domaine !== o.domaine).slice(0, n - affines.length);
    [...affines, ...autres].forEach((s) => {
      const c = {
        id: `cand-${candidatures.length + 1}`,
        offreId: o.id, stagiaireId: s.id,
        date: iso(addDays(new Date(o.datePublication), between(1, 10))),
        lettre: `Madame, Monsieur, je souhaite rejoindre ${entreprises.find((x) => x.id === o.entrepriseId).raisonSociale} pour mettre mes compétences au service de votre équipe.`,
        statut: 'soumise',
      };
      const avance = r();
      if (avance > 0.25) c.statut = 'triee';
      candidatures.push(c);
      c._avance = avance;
    });
  });

  return {
    version: 1,
    params: { tauxEtat: 50, seuilIA: 55, salaireMin: 75000, dureeMax: 12, visioBase: 'https://meet.jit.si/', iaDistante: true },
    entreprises, offres, stagiaires, candidatures, conventions,
    users: [],
    audit: [],
    _seedPending: true,
  };
}

// La suite du parcours (tri, entretiens, sélection, conventions) dépend du moteur IA :
// elle est finalisée par finishSeed() une fois les modules chargés.
export function finishSeed(state, scorer) {
  if (!state._seedPending) return;
  const r = rng(77);
  const now = new Date();
  const { offres, stagiaires, entreprises, conventions } = state;
  const byId = (arr, id) => arr.find((x) => x.id === id);
  let nConv = conventions.length;
  const ref = (type, d) => `PNEC/${type === 'PRISE_EN_CHARGE' ? 'DE' : type === 'STAGE' ? 'STG' : 'MFPAI'}/${d.getFullYear()}/${String(++nConv).padStart(4, '0')}`;

  offres.forEach((o) => {
    const cands = state.candidatures.filter((c) => c.offreId === o.id);
    let retenus = 0;
    cands.forEach((c) => {
      const avance = c._avance;
      delete c._avance;
      if (c.statut !== 'triee') return;
      const s = byId(stagiaires, c.stagiaireId);
      const res = scorer(o, s);
      c.scoreIA = res.score; c.detailIA = res; c.moteurIA = 'local';
      c.dateTri = iso(addDays(new Date(c.date), 3));
      if (res.score < state.params.seuilIA) { c.statut = 'non_retenue_ia'; return; }
      c.statut = 'preselectionnee';
      if (avance < 0.4) return;
      const dEnt = addDays(new Date(c.dateTri), 4 + Math.floor(r() * 10));
      c.entretien = {
        date: iso(dEnt).slice(0, 10), heure: ['09:00', '10:30', '14:00', '15:30'][Math.floor(r() * 4)],
        duree: 30, salle: `PNEC-${o.id}-${c.id}`.replace(/[^A-Za-z0-9-]/g, ''), evaluateur: byId(entreprises, o.entrepriseId).contact,
      };
      c.statut = 'entretien_planifie';
      if (dEnt > now || avance < 0.55) return;
      const notes = { motivation: 3 + Math.floor(r() * 3), technique: 2 + Math.floor(r() * 4), communication: 2 + Math.floor(r() * 4), adequation: 2 + Math.floor(r() * 4) };
      c.entretien.notes = notes;
      c.entretien.note = Math.round(((notes.motivation + notes.technique + notes.communication + notes.adequation) / 20) * 20 * 10) / 10;
      c.entretien.commentaire = 'Candidat·e motivé·e, bon échange.';
      c.statut = 'entretien_realise';
      if (avance < 0.7) return;
      if (retenus < o.places && c.entretien.note >= 12) {
        retenus++;
        c.statut = 'retenue';
        c.dateDecision = iso(addDays(dEnt, 3));
        const e = byId(entreprises, o.entrepriseId);
        const d = new Date(c.dateDecision);
        const pecSignee = avance > 0.78;
        conventions.push({
          id: `cv-${nConv + 1}`, reference: ref('PRISE_EN_CHARGE', d), type: 'PRISE_EN_CHARGE',
          entrepriseId: e.id, stagiaireId: s.id, candidatureId: c.id, offreId: o.id,
          salaire: o.salaire, duree: o.duree, tauxEtat: state.params.tauxEtat,
          dateDebut: iso(addDays(d, 15)).slice(0, 10),
          dateCreation: iso(d),
          parties: [
            { role: 'ENTREPRISE', signe: pecSignee || avance > 0.74, date: iso(addDays(d, 1)), signataire: `${e.contact}, ${e.fonction}` },
            { role: 'DE', signe: pecSignee, date: iso(addDays(d, 4)), signataire: "Le Directeur de l'Emploi" },
          ],
        });
        if (pecSignee) {
          const stageSignee = avance > 0.84;
          conventions.push({
            id: `cv-${nConv + 1}`, reference: ref('STAGE', d), type: 'STAGE',
            entrepriseId: e.id, stagiaireId: s.id, candidatureId: c.id, offreId: o.id,
            salaire: o.salaire, duree: o.duree, tauxEtat: state.params.tauxEtat,
            dateDebut: iso(addDays(d, 15)).slice(0, 10),
            dateCreation: iso(addDays(d, 5)),
            parties: [
              { role: 'ENTREPRISE', signe: true, date: iso(addDays(d, 6)), signataire: `${e.contact}, ${e.fonction}` },
              { role: 'STAGIAIRE', signe: stageSignee, date: iso(addDays(d, 7)), signataire: `${s.prenom} ${s.nom}` },
            ],
          });
          if (stageSignee) c.statut = 'en_stage';
        }
      } else if (avance > 0.8) {
        c.statut = 'refusee';
        c.dateDecision = iso(addDays(dEnt, 3));
      }
    });
  });

  state.users = [
    { id: 'u-admin', nom: 'Administrateur PNEC', email: 'admin@pnec.sn', role: 'admin', actif: true },
    { id: 'u-mfp', nom: 'Direction de la Formation professionnelle', email: 'dfp@mfpai.gouv.sn', role: 'mfp', actif: true },
    { id: 'u-de', nom: "Direction de l'Emploi", email: 'de@emploi.gouv.sn', role: 'de', actif: true },
    { id: 'u-prim', nom: 'Cellule de suivi — Primature', email: 'suivi@primature.sn', role: 'primature', actif: true },
    ...entreprises.map((e) => ({ id: `u-${e.id}`, nom: e.raisonSociale, email: e.email, role: 'entreprise', orgId: e.id, actif: true })),
    ...stagiaires.map((s) => ({ id: `u-${s.id}`, nom: `${s.prenom} ${s.nom}`, email: s.email, role: 'stagiaire', orgId: s.id, actif: true })),
  ];
  state.audit = [{ date: iso(now), user: 'Système', action: 'Initialisation des données de démonstration' }];
  delete state._seedPending;
}

// ---------- Accès ----------
let state = null;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { state = JSON.parse(raw); return state; }
  } catch { /* stockage indisponible : on repart des données de démo */ }
  state = seed();
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* mode navigation privée */ }
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  state = seed();
  return state;
}

export const db = () => state;

export function log(user, action) {
  state.audit.unshift({ date: new Date().toISOString(), user, action });
  if (state.audit.length > 500) state.audit.length = 500;
}

// Session : fournie par le serveur (/api/auth/session, cookie HttpOnly signé). Rien n'est stocké côté navigateur.
let _session = null;
export const session = () => _session;
export const setSession = (s) => { _session = s; };

export async function api(chemin, corps) {
  const r = await fetch(`/api/${chemin}`, {
    method: corps === undefined ? 'GET' : 'POST',
    headers: corps === undefined ? {} : { 'Content-Type': 'application/json' },
    body: corps === undefined ? undefined : JSON.stringify(corps),
    credentials: 'same-origin',
  });
  let data = {};
  try { data = await r.json(); } catch { /* réponse vide */ }
  return { ok: r.ok, status: r.status, data };
}

export async function chargerSession() {
  try {
    const { ok, data } = await api('auth/session');
    _session = ok && data.utilisateur ? data.utilisateur : null;
  } catch { _session = null; }
  return _session;
}

export function nextReference(type) {
  const y = new Date().getFullYear();
  const prefix = type === 'PRISE_EN_CHARGE' ? 'DE' : type === 'STAGE' ? 'STG' : 'MFPAI';
  return `PNEC/${prefix}/${y}/${String(state.conventions.length + 1).padStart(4, '0')}`;
}

export function convComplete(c) { return c.parties.every((p) => p.signe); }

export function coutConvention(c) {
  const total = (c.salaire || 0) * (c.duree || 0);
  const etat = Math.round(total * (c.tauxEtat ?? 50) / 100);
  return { mensuel: c.salaire, total, etat, entreprise: total - etat, etatMensuel: Math.round(c.salaire * (c.tauxEtat ?? 50) / 100) };
}
