// Modèle de données, référentiels et jeu de démonstration de la Plateforme nationale de l'Artisanat.
// Toutes les personnes, entreprises, montants et marchés du jeu de démonstration sont FICTIFS.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// ---------- Types ----------
export type StatutDossier = "en_attente" | "valide" | "rejete";
export interface Artisan {
  id: number; numero: string; nom: string; prenom: string; sexe: "F" | "M"; date_naissance: string; cni: string;
  telephone: string; email: string; region: string; departement: string; commune: string; adresse: string;
  filiere: string; metier: string; enseigne: string; statut_juridique: string; ninea: string; formation: string;
  annees_experience: number; apprentis: number; employes: number; site_id: number | null;
  besoins: string[]; visible_annuaire: boolean; statut: StatutDossier; motif: string; canal: string;
  date_inscription: string; date_decision: string | null; agent: string | null;
}
export interface Marche {
  id: number; reference: string; intitule: string; acheteur: string; filiere: string; region: string; description: string;
  montant: number; date_publication: string; date_limite: string; statut: "ouvert" | "clos" | "attribue"; quota_artisans: number;
}
export interface Candidature {
  id: number; marche_id: number; artisan_id: number; montant: number; delai_jours: number; note: string;
  statut: "soumise" | "retenue" | "non_retenue"; date: string;
}
export interface Financement {
  id: number; reference: string; artisan_id: number; instrument: string; objet: string; montant_demande: number;
  apport_personnel: number; duree_mois: number; montant_accorde: number; statut: "soumise" | "instruction" | "accordee" | "rejetee" | "decaissee";
  motif: string; date: string; date_decision: string | null;
}
export interface Contribution { id: number; artisan_id: number | null; source: string; montant: number; date: string; libelle: string }
export interface Site {
  id: number; nom: string; type: "chambre" | "village"; region: string; commune: string; superficie_m2: number; ateliers: number;
  statut_foncier: string; reference_fonciere: string; etat: "bon" | "moyen" | "degrade"; equipements: string[];
  projet: string; budget: number; avancement: number; echeance: string; observations: string;
}
export interface Actualite {
  id: number; titre: string; chapo: string; contenu: string; categorie: string; date: string; publie: boolean; illustration: string; auteur: string;
}
export type Role = "admin" | "agent" | "lecteur";
export interface User { id: number; username: string; nom: string; role: Role; region: string; password_hash: string; actif: boolean; created_at: string }
export interface AuditEntry { id: number; ts: string; user: string; action: string; objet: string; details: string }

export interface State {
  version: number; seq: number;
  artisans: Artisan[]; marches: Marche[]; candidatures: Candidature[]; financements: Financement[];
  contributions: Contribution[]; sites: Site[]; actualites: Actualite[]; users: User[]; audit: AuditEntry[];
}

// ---------- Référentiels ----------
export const REGIONS: Record<string, string[]> = {
  "Dakar": ["Dakar", "Guédiawaye", "Pikine", "Rufisque", "Keur Massar"],
  "Thiès": ["Thiès", "Mbour", "Tivaouane"],
  "Diourbel": ["Diourbel", "Bambey", "Mbacké"],
  "Fatick": ["Fatick", "Foundiougne", "Gossas"],
  "Kaolack": ["Kaolack", "Guinguinéo", "Nioro du Rip"],
  "Kaffrine": ["Kaffrine", "Birkelane", "Koungheul", "Malem Hodar"],
  "Kolda": ["Kolda", "Médina Yoro Foulah", "Vélingara"],
  "Sédhiou": ["Sédhiou", "Bounkiling", "Goudomp"],
  "Ziguinchor": ["Ziguinchor", "Bignona", "Oussouye"],
  "Tambacounda": ["Tambacounda", "Bakel", "Goudiry", "Koumpentoum"],
  "Kédougou": ["Kédougou", "Salémata", "Saraya"],
  "Saint-Louis": ["Saint-Louis", "Dagana", "Podor"],
  "Louga": ["Louga", "Kébémer", "Linguère"],
  "Matam": ["Matam", "Kanel", "Ranérou-Ferlo"],
};
export const FILIERES: Record<string, string[]> = {
  "Métaux et mécanique": ["Forgeron", "Soudeur métallique", "Mécanicien auto", "Mécanicien deux-roues", "Ferronnier", "Bijoutier"],
  "Bois et ameublement": ["Menuisier ébéniste", "Sculpteur sur bois", "Tapissier", "Vannier"],
  "Textile, habillement et cuir": ["Tailleur", "Couturière", "Brodeur", "Tisserand", "Teinturière", "Cordonnier", "Maroquinier"],
  "Bâtiment et travaux": ["Maçon", "Carreleur", "Plombier", "Électricien bâtiment", "Peintre en bâtiment", "Staffeur"],
  "Alimentation": ["Boulanger", "Pâtissier", "Transformatrice de céréales", "Transformatrice de produits halieutiques", "Boucher"],
  "Art et décoration": ["Potière", "Verrier", "Peintre sous-verre", "Sculpteur", "Instrumentiste (facteur d'instruments)"],
  "Services et réparation": ["Coiffeur", "Esthéticienne", "Réparateur électronique", "Réparateur de téléphones", "Frigoriste", "Photographe"],
};
export const STATUTS_JURIDIQUES = ["Informel", "Entreprise individuelle", "GIE", "Coopérative", "SUARL / SARL"];
export const FORMATIONS = ["Apprentissage traditionnel", "Certificat d'aptitude professionnelle (CAP)", "Brevet de technicien (BT)", "Formation qualifiante", "Aucune formation formelle"];
export const BESOINS = ["Financement", "Équipement", "Formation", "Local / atelier", "Accès aux marchés publics", "Certification / normalisation", "Couverture sociale"];
export const INSTRUMENTS = ["Crédit d'équipement", "Fonds de roulement", "Subvention d'équipement", "Garantie", "Crédit apprentissage"];
export const ACHETEURS = ["APDA", "Projet du Mobilier national", "Ministère de l'Éducation nationale", "Ministère des Forces armées", "Collectivité territoriale", "Ministère de la Santé"];
export const STATUTS_FONCIERS = ["Titre foncier au nom de l'État", "Bail emphytéotique", "Délibération communale", "Régularisation en cours", "Non régularisé"];
export const CATEGORIES_ACTU = ["Conseil des ministres", "Recensement", "Commande publique", "Financement", "Infrastructures", "Formation"];
export const PRESCRIPTIONS = [
  { code: "P1", titre: "Recensement général et enrôlement des artisans", texte: "Recensement général des artisans et enrôlement adéquat, pour faciliter la professionnalisation et l'accompagnement par les dispositifs d'encadrement et de financement." },
  { code: "P2", titre: "Accès à la commande publique", texte: "Amélioration de l'accès des artisans à la commande publique, notamment par la restructuration des activités de l'APDA et du projet du Mobilier national." },
  { code: "P3", titre: "Fonds spécial pour le financement de l'Artisanat", texte: "Mise en place à court terme d'un Fonds spécial intégrant les initiatives actuelles de l'État et la mobilisation solidaire des apports directs des artisans." },
  { code: "P4", titre: "Infrastructures et régularisation foncière", texte: "Renforcement et modernisation des infrastructures, équipements et parcs logistiques des Chambres de métiers ; régularisation foncière urgente des villages artisanaux." },
];

// ---------- Utilitaires ----------
export const now = () => new Date().toISOString();
export const nextId = (s: State) => ++s.seq;
export const normalizePhone = (v: string) => { let d = String(v || "").replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d.startsWith("221") && d.length === 12) d = d.slice(3); return d; };
export const isValidPhone = (v: string) => /^7[05678]\d{7}$|^3[03]\d{7}$/.test(normalizePhone(v));
export const normalizeCni = (v: string) => String(v || "").replace(/\D/g, "");
export const fold = (v: string) => String(v || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const hashPassword = (pwd: string, salt = randomBytes(8).toString("hex")) => `${salt}$${createHash("sha256").update(salt + pwd).digest("hex")}`;
export function verifyPassword(pwd: string, stored: string): boolean {
  const [salt, h] = stored.split("$");
  const cand = createHash("sha256").update(salt + pwd).digest();
  const ref = Buffer.from(h, "hex");
  return cand.length === ref.length && timingSafeEqual(cand, ref);
}
const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
export function signToken(secret: string, payload: Record<string, unknown>, minutes = 480): string {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + minutes * 60 }));
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
export function verifyToken(secret: string, token: string): Record<string, any> | null {
  const [b, s] = String(token || "").split(".");
  if (!b || !s) return null;
  const expected = createHmac("sha256", secret).update(b).digest();
  const given = Buffer.from(s, "base64url");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try { const p = JSON.parse(Buffer.from(b, "base64url").toString()); return p.exp > Date.now() / 1000 ? p : null; } catch { return null; }
}

export function numeroArtisan(s: State, region: string, date = new Date()): string {
  const code = fold(region).replace(/[^a-z]/g, "").slice(0, 3).toUpperCase();
  const n = s.artisans.filter((a) => a.numero.includes(`-${code}-`)).length + 1;
  return `ART-${date.getFullYear()}-${code}-${String(n).padStart(5, "0")}`;
}

// ---------- Jeu de démonstration (déterministe) ----------
function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }

const PRENOMS_F = ["Awa", "Fatou", "Aminata", "Mariama", "Khady", "Ndèye", "Coumba", "Astou", "Bineta", "Seynabou", "Adama", "Rokhaya", "Dieynaba", "Aïssatou", "Yacine"];
const PRENOMS_M = ["Moussa", "Ibrahima", "Mamadou", "Cheikh", "Abdoulaye", "Ousmane", "Modou", "Alioune", "Babacar", "Lamine", "Saliou", "Pape", "Souleymane", "Malick", "Demba"];
const NOMS = ["Diop", "Ndiaye", "Fall", "Sow", "Ba", "Gueye", "Faye", "Diallo", "Sarr", "Mbaye", "Cissé", "Thiam", "Diouf", "Kane", "Sy", "Ndour", "Camara", "Badji", "Diatta", "Sané", "Tall", "Wade", "Seck", "Niang"];
const POIDS_REGION: [string, number][] = [["Dakar", 26], ["Thiès", 14], ["Diourbel", 9], ["Saint-Louis", 7], ["Kaolack", 7], ["Ziguinchor", 6], ["Louga", 5], ["Fatick", 4], ["Kolda", 4], ["Tambacounda", 4], ["Kaffrine", 3], ["Sédhiou", 3], ["Matam", 3], ["Kédougou", 2]];
const FEMININ = new Set(["Couturière", "Teinturière", "Transformatrice de céréales", "Transformatrice de produits halieutiques", "Potière", "Esthéticienne"]);

const VILLAGES: [string, string, string, string, string][] = [
  ["Village artisanal de Soumbédioune", "Dakar", "Dakar", "Bail emphytéotique", "moyen"],
  ["Village artisanal de Thiès", "Thiès", "Thiès", "Régularisation en cours", "degrade"],
  ["Village artisanal de Mbour", "Thiès", "Mbour", "Non régularisé", "degrade"],
  ["Village artisanal de Kaolack", "Kaolack", "Kaolack", "Délibération communale", "moyen"],
  ["Village artisanal de Ziguinchor", "Ziguinchor", "Ziguinchor", "Régularisation en cours", "moyen"],
  ["Village artisanal de Saint-Louis", "Saint-Louis", "Saint-Louis", "Titre foncier au nom de l'État", "bon"],
  ["Village artisanal de Diourbel", "Diourbel", "Diourbel", "Non régularisé", "degrade"],
  ["Village artisanal de Tambacounda", "Tambacounda", "Tambacounda", "Délibération communale", "moyen"],
  ["Village artisanal de Louga", "Louga", "Louga", "Régularisation en cours", "degrade"],
  ["Village artisanal de Kolda", "Kolda", "Kolda", "Non régularisé", "moyen"],
];

const ARTICLES: Omit<Actualite, "id" | "publie" | "auteur">[] = [
  { titre: "Conseil des ministres : le Chef de l'État demande le repositionnement de l'Artisanat dans l'Agenda national de Transformation", categorie: "Conseil des ministres", date: "2026-10-28", illustration: "conseil",
    chapo: "Le Président de la République a demandé au Gouvernement de prendre toutes les mesures nécessaires au repositionnement de l'Artisanat et des Chambres de métiers.",
    contenu: "Au cours de la réunion du Conseil des ministres du mercredi 28 octobre 2026, le Président de la République a demandé au Gouvernement de « prendre toutes les mesures nécessaires au repositionnement de l'Artisanat et des Chambres des métiers dans l'Agenda national de Transformation, à travers le déploiement pragmatique de projets innovants et de réformes concertées sur l'étendue du pays ».\n\nQuatre orientations ont été prescrites : le recensement général et l'enrôlement des artisans ; l'amélioration de leur accès à la commande publique, notamment à travers l'APDA et le projet du Mobilier national ; la mise en place à court terme d'un Fonds spécial pour le Financement de l'Artisanat ; le renforcement des infrastructures des Chambres de métiers et la régularisation foncière urgente des villages artisanaux.\n\nLa présente plateforme est l'outil numérique de suivi de ces quatre prescriptions." },
  { titre: "Lancement du recensement général des artisans sur l'ensemble du territoire", categorie: "Recensement", date: "2026-11-09", illustration: "recensement",
    chapo: "Chaque artisan peut désormais s'enrôler en ligne ou auprès de la Chambre de métiers de sa région et obtenir un numéro d'identification artisan.",
    contenu: "Le recensement général des artisans démarre dans les 14 régions. L'enrôlement se fait en ligne sur cette plateforme ou au guichet des Chambres de métiers, qui saisissent les dossiers pour le compte des artisans.\n\nAprès vérification par la Chambre de métiers, l'artisan reçoit un numéro d'identification (ART-AAAA-RRR-NNNNN) et une carte professionnelle. Ce numéro donne accès aux marchés réservés, au Fonds spécial et aux programmes de formation.\n\n(Article de démonstration.)" },
  { titre: "Commande publique : des lots réservés aux artisans dans le programme du Mobilier national", categorie: "Commande publique", date: "2026-11-12", illustration: "commande",
    chapo: "Les premiers avis de marchés réservés aux artisans enrôlés sont publiés : tables-bancs, mobilier de bureau, tenues scolaires.",
    contenu: "En application des prescriptions du Conseil des ministres, l'APDA et le projet du Mobilier national publient sur la plateforme des avis réservés aux artisans enrôlés et validés. Les candidatures se déposent en ligne depuis l'espace artisan.\n\n(Article de démonstration.)" },
  { titre: "Fonds spécial pour le Financement de l'Artisanat : ouverture du guichet des demandes", categorie: "Financement", date: "2026-11-14", illustration: "financement",
    chapo: "Le Fonds associe les ressources de l'État et les apports solidaires des artisans. Les demandes de crédit d'équipement et de fonds de roulement sont ouvertes.",
    contenu: "Le Fonds spécial intègre les initiatives existantes de l'État et une mobilisation solidaire des apports directs des artisans. Chaque artisan validé peut cotiser et déposer une demande de financement depuis son espace.\n\n(Article de démonstration.)" },
  { titre: "Villages artisanaux : un plan de régularisation foncière urgent", categorie: "Infrastructures", date: "2026-11-15", illustration: "infrastructures",
    chapo: "Un inventaire du statut foncier des villages artisanaux et de l'état des équipements des Chambres de métiers est publié.",
    contenu: "L'inventaire recense le statut foncier de chaque village artisanal (titre foncier, bail, délibération, régularisation en cours, non régularisé) ainsi que l'état des infrastructures des 14 Chambres de métiers et l'avancement des projets de modernisation.\n\n(Article de démonstration.)" },
];

export function createState(adminPassword = "admin123"): State {
  const r = rng(20261028);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const t = now();
  const s: State = { version: 1, seq: 0, artisans: [], marches: [], candidatures: [], financements: [], contributions: [], sites: [], actualites: [], users: [], audit: [] };

  s.users.push(
    { id: nextId(s), username: "admin", nom: "Administrateur national", role: "admin", region: "", password_hash: hashPassword(adminPassword), actif: true, created_at: t },
    { id: nextId(s), username: "cm.thies", nom: "Agent Chambre de métiers de Thiès", role: "agent", region: "Thiès", password_hash: hashPassword("agent123"), actif: true, created_at: t },
    { id: nextId(s), username: "lecteur", nom: "Lecteur (cabinet)", role: "lecteur", region: "", password_hash: hashPassword("lecteur123"), actif: true, created_at: t },
  );

  // Chambres de métiers (une par région) et villages artisanaux
  for (const region of Object.keys(REGIONS)) {
    const etat = pick(["bon", "moyen", "moyen", "degrade"] as const);
    s.sites.push({ id: nextId(s), nom: `Chambre de métiers de ${region}`, type: "chambre", region, commune: REGIONS[region][0], superficie_m2: 800 + Math.round(r() * 30) * 100,
      ateliers: 2 + Math.floor(r() * 8), statut_foncier: pick(["Titre foncier au nom de l'État", "Titre foncier au nom de l'État", "Bail emphytéotique", "Délibération communale"]),
      reference_fonciere: `TF ${1000 + Math.floor(r() * 9000)}/${region.slice(0, 2).toUpperCase()}`, etat,
      equipements: ["Salle de formation", "Atelier partagé", "Magasin d'exposition", "Parc logistique", "Groupe électrogène"].filter(() => r() > 0.45),
      projet: etat === "bon" ? "Équipement numérique du guichet" : "Réhabilitation et extension des ateliers", budget: (50 + Math.floor(r() * 400)) * 1_000_000,
      avancement: Math.floor(r() * 9) * 10, echeance: `2027-${String(1 + Math.floor(r() * 12)).padStart(2, "0")}-30`, observations: "" });
  }
  for (const [nom, region, commune, statut_foncier, etat] of VILLAGES) {
    s.sites.push({ id: nextId(s), nom, type: "village", region, commune, superficie_m2: 3000 + Math.round(r() * 60) * 250, ateliers: 20 + Math.floor(r() * 120),
      statut_foncier, reference_fonciere: statut_foncier.startsWith("Non") ? "" : `Dossier ${Math.floor(r() * 900) + 100}/DGID`, etat: etat as Site["etat"],
      equipements: ["Boutiques", "Ateliers", "Espace d'exposition", "Sanitaires", "Éclairage public"].filter(() => r() > 0.4),
      projet: statut_foncier.startsWith("Titre") ? "Modernisation des boutiques" : "Régularisation foncière et sécurisation du site", budget: (30 + Math.floor(r() * 300)) * 1_000_000,
      avancement: Math.floor(r() * 7) * 10, echeance: `2027-${String(1 + Math.floor(r() * 12)).padStart(2, "0")}-15`,
      observations: statut_foncier === "Non régularisé" ? "Risque d'éviction signalé ; priorité de régularisation." : "" });
  }

  // Artisans
  const regions = POIDS_REGION.flatMap(([reg, w]) => Array(w).fill(reg) as string[]);
  const start = Date.parse("2026-11-02T08:00:00Z");
  for (let i = 0; i < 320; i++) {
    const filiere = pick(Object.keys(FILIERES));
    const metier = pick(FILIERES[filiere]);
    const sexe: "F" | "M" = FEMININ.has(metier) ? "F" : r() < 0.3 ? "F" : "M";
    const prenom = pick(sexe === "F" ? PRENOMS_F : PRENOMS_M); const nom = pick(NOMS);
    const region = pick(regions); const departement = pick(REGIONS[region]);
    const date = new Date(start + Math.floor(r() * 14 * 86400_000));
    const statut: StatutDossier = r() < 0.68 ? "valide" : r() < 0.85 ? "en_attente" : "rejete";
    const villages = s.sites.filter((x) => x.type === "village" && x.region === region);
    const a: Artisan = {
      id: nextId(s), numero: "", nom, prenom, sexe, date_naissance: `${1960 + Math.floor(r() * 45)}-${String(1 + Math.floor(r() * 12)).padStart(2, "0")}-${String(1 + Math.floor(r() * 28)).padStart(2, "0")}`,
      cni: String(1_000_000_000_000 + Math.floor(r() * 8_999_999_999_999)), telephone: `7${pick(["0", "6", "7", "8"])}${String(Math.floor(r() * 10_000_000)).padStart(7, "0")}`,
      email: "", region, departement, commune: departement, adresse: `Quartier ${pick(["Médina", "HLM", "Escale", "Santhiaba", "Darou Salam", "Grand Standing", "Liberté"])}`,
      filiere, metier, enseigne: r() < 0.5 ? `Atelier ${prenom} ${nom}` : "", statut_juridique: pick(STATUTS_JURIDIQUES.concat(["Informel", "Informel"])),
      ninea: "", formation: pick(FORMATIONS), annees_experience: 1 + Math.floor(r() * 30), apprentis: Math.floor(r() * 6), employes: Math.floor(r() * 4),
      site_id: villages.length && r() < 0.3 ? villages[0].id : null, besoins: BESOINS.filter(() => r() < 0.3), visible_annuaire: r() < 0.8,
      statut, motif: statut === "rejete" ? pick(["Pièce d'identité illisible", "Doublon d'un dossier existant", "Activité hors nomenclature artisanale"]) : "",
      canal: r() < 0.55 ? "En ligne" : "Guichet Chambre de métiers", date_inscription: date.toISOString(),
      date_decision: statut === "en_attente" ? null : new Date(date.getTime() + 2 * 86400_000).toISOString(), agent: statut === "en_attente" ? null : "admin",
    };
    if (a.statut_juridique !== "Informel") a.ninea = String(Math.floor(r() * 90_000_000) + 10_000_000);
    if (!a.besoins.length) a.besoins = [pick(BESOINS)];
    a.numero = numeroArtisan(s, region, date);
    s.artisans.push(a);
  }
  // Un artisan connu pour la démonstration de l'espace usager
  const demo = s.artisans.find((a) => a.statut === "valide" && a.region === "Thiès")!;
  Object.assign(demo, { prenom: "Awa", nom: "Diop", sexe: "F", telephone: "771234567", metier: "Couturière", filiere: "Textile, habillement et cuir", enseigne: "Atelier Awa Couture" });

  // Marchés (commande publique)
  const M: [string, string, string, string, number, string, Marche["statut"]][] = [
    ["Fourniture de 5 000 tables-bancs pour les écoles élémentaires", "Projet du Mobilier national", "Bois et ameublement", "Toutes régions", 450_000_000, "2026-12-15", "ouvert"],
    ["Confection de 20 000 tenues scolaires", "Ministère de l'Éducation nationale", "Textile, habillement et cuir", "Toutes régions", 180_000_000, "2026-12-05", "ouvert"],
    ["Mobilier de bureau des services déconcentrés (lot Thiès–Diourbel)", "Projet du Mobilier national", "Bois et ameublement", "Thiès", 95_000_000, "2026-12-20", "ouvert"],
    ["Rangers et ceinturons en cuir", "Ministère des Forces armées", "Textile, habillement et cuir", "Toutes régions", 120_000_000, "2027-01-10", "ouvert"],
    ["Grilles et portails métalliques des postes de santé", "Ministère de la Santé", "Métaux et mécanique", "Kolda", 38_000_000, "2026-12-01", "ouvert"],
    ["Objets d'art pour les cadeaux protocolaires", "APDA", "Art et décoration", "Dakar", 25_000_000, "2026-11-30", "ouvert"],
    ["Réhabilitation de salles de classe (maçonnerie, peinture)", "Collectivité territoriale", "Bâtiment et travaux", "Saint-Louis", 60_000_000, "2026-11-10", "clos"],
    ["Fourniture de pain pour les internats", "Ministère de l'Éducation nationale", "Alimentation", "Kaolack", 14_000_000, "2026-10-20", "attribue"],
  ];
  M.forEach(([intitule, acheteur, filiere, region, montant, limite, statut], i) => s.marches.push({
    id: nextId(s), reference: `MP-ART-2026-${String(i + 1).padStart(3, "0")}`, intitule, acheteur, filiere, region, montant, date_limite: limite, statut,
    date_publication: "2026-11-1" + (i % 6), quota_artisans: 30 + Math.floor(r() * 40),
    description: `Marché réservé aux artisans enrôlés et validés de la filière « ${filiere} ». Allotissement par département pour favoriser les petites unités. Avance de démarrage de 30 % garantie par le Fonds spécial.`,
  }));
  const valides = s.artisans.filter((a) => a.statut === "valide");
  for (const m of s.marches) {
    const eligibles = valides.filter((a) => a.filiere === m.filiere && (m.region === "Toutes régions" || a.region === m.region));
    for (const a of eligibles.slice(0, 4 + Math.floor(r() * 8))) {
      s.candidatures.push({ id: nextId(s), marche_id: m.id, artisan_id: a.id, montant: Math.round((m.montant / 20) * (0.5 + r()) / 1000) * 1000, delai_jours: 15 + Math.floor(r() * 60),
        note: "", statut: m.statut === "attribue" ? (r() < 0.4 ? "retenue" : "non_retenue") : "soumise", date: t });
    }
  }

  // Fonds spécial : dotation de l'État, partenaires, apports des artisans, demandes
  s.contributions.push(
    { id: nextId(s), artisan_id: null, source: "État", montant: 5_000_000_000, date: "2026-11-05T00:00:00Z", libelle: "Dotation initiale (loi de finances)" },
    { id: nextId(s), artisan_id: null, source: "Initiatives existantes", montant: 1_200_000_000, date: "2026-11-06T00:00:00Z", libelle: "Reprise des lignes FONGIP / DER-FJ dédiées à l'artisanat" },
  );
  for (const a of valides.filter(() => r() < 0.45)) s.contributions.push({ id: nextId(s), artisan_id: a.id, source: "Artisan", montant: pick([2000, 5000, 5000, 10000, 25000]), date: a.date_decision || t, libelle: "Apport solidaire" });
  const SF: Financement["statut"][] = ["soumise", "soumise", "instruction", "instruction", "accordee", "rejetee", "decaissee"];
  for (const a of valides.filter(() => r() < 0.18)) {
    const statut = pick(SF); const demande = pick([500_000, 1_000_000, 1_500_000, 2_500_000, 5_000_000]);
    s.financements.push({ id: nextId(s), reference: `FSA-2026-${String(s.financements.length + 1).padStart(5, "0")}`, artisan_id: a.id, instrument: pick(INSTRUMENTS),
      objet: pick(["Achat d'une machine à coudre industrielle", "Acquisition d'un poste à souder", "Stock de matières premières", "Outillage de menuiserie", "Four de boulangerie", "Aménagement de l'atelier"]),
      montant_demande: demande, apport_personnel: Math.round(demande * 0.1), duree_mois: pick([12, 18, 24, 36]),
      montant_accorde: statut === "accordee" || statut === "decaissee" ? demande : 0, statut, motif: statut === "rejetee" ? "Capacité de remboursement insuffisante" : "", date: a.date_decision || t,
      date_decision: ["accordee", "rejetee", "decaissee"].includes(statut) ? t : null });
  }

  ARTICLES.forEach((x) => s.actualites.push({ ...x, id: nextId(s), publie: true, auteur: "Cellule de communication" }));
  s.audit.push({ id: nextId(s), ts: t, user: "système", action: "initialisation", objet: "base", details: "Jeu de démonstration chargé (données fictives)" });
  return s;
}
