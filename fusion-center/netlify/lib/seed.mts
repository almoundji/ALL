// Jeu de données de démonstration (identique au backend Python). Toutes les personnes, organisations et numéros sont FICTIFS.
import { audit, evaluateAlerts, hashPassword, nextId, now, upsertEntity, upsertRelation, type Entity, type Source, type State } from "./core.mts";

export function createState(adminPassword: string): State {
  const s: State = { seq: 0, users: [], sources: [], entities: [], provenance: [], relations: [], cases: [], case_entities: [], case_notes: [], watchlists: [], alerts: [], jobs: [], audit: [] };
  const user = (username: string, full_name: string, role: any, clearance: number, compartments: string, unit: string, pwd: string) =>
    s.users.push({ id: nextId(s), username, full_name, password_hash: hashPassword(pwd), role, clearance, compartments, unit, is_active: true, created_at: now() });
  user("admin", "Administrateur", "admin", 3, "OPS,FIN,CYBER", "DRN / Direction technique", adminPassword);
  user("analyste", "Analyste DRN (CD, compartiments OPS/FIN)", "analyst", 2, "OPS,FIN", "DRN / Analyse", "analyste123");
  user("officier", "Officier FDS (DR, sans compartiment)", "analyst", 1, "", "Gendarmerie / SR", "officier123");
  user("lecteur", "Lecteur (NP)", "viewer", 0, "", "Cabinet", "lecteur123");

  const src = (name: string, type: string, reliability: string, description: string, classification: number): Source => { const x = { id: nextId(s), name, type, reliability, description, classification, created_at: now() }; s.sources.push(x); return x; };
  const humint = src("DEMO-HUMINT", "HUMINT", "B", "Comptes rendus de sources humaines (démo)", 2);
  const osint = src("DEMO-OSINT", "OSINT", "C", "Sources ouvertes (démo)", 0);
  const cdr = src("DEMO-CDR", "SIGINT", "A", "Relevés d'appels opérateur (démo)", 2);
  const fin = src("DEMO-FININT", "FININT", "B", "Déclarations de soupçon (démo)", 2);
  const adm = src("DEMO-ADMIN", "ADMIN", "A", "Fichiers administratifs : immatriculations, état civil (démo)", 1);

  const E: Record<string, Entity> = {};
  const ent = (k: string, type: string, label: string, attrs: Record<string, any> = {}, clr = 1, comp: string | null = null, lat: number | null = null, lon: number | null = null, source: Source = osint) => {
    E[k] = upsertEntity(s, { type, label, attributes: attrs, classification: clr, compartment: comp, lat, lon, source, created_by: "seed", confidence: 0.7 }).entity;
  };
  const rel = (a: string, b: string, t: string, attrs: Record<string, any> = {}, clr = 1, comp: string | null = null, w = 1) => upsertRelation(s, E[a].id, E[b].id, t, attrs, w, clr, comp, null);

  ent("p1", "PERSON", "Abdou Karim NDOUR", { birth_date: "1984-03-12", nationality: "SN", alias: "AK", occupation: "Transitaire" }, 2, "OPS", null, null, humint);
  ent("p2", "PERSON", "Mamadou FAYE", { birth_date: "1979-11-02", nationality: "SN", occupation: "Commerçant" }, 1, null, null, null, adm);
  ent("p3", "PERSON", "Ibrahima SOW", { birth_date: "1990-06-21", nationality: "SN", occupation: "Chauffeur" }, 1, null, null, null, adm);
  ent("p4", "PERSON", "Aminata DIALLO", { birth_date: "1988-01-15", nationality: "SN", occupation: "Gérante" }, 2, "FIN", null, null, fin);
  ent("p5", "PERSON", "Oumar BA", { birth_date: "1975-09-30", nationality: "ML", occupation: "Négociant" }, 2, "OPS", null, null, humint);
  ent("p6", "PERSON", "Cheikh GUEYE", { birth_date: "1992-04-04", nationality: "SN", occupation: "Étudiant" }, 0);
  ent("p7", "PERSON", "Fatou NIANG", { birth_date: "1986-12-08", nationality: "SN", occupation: "Comptable" }, 2, "FIN", null, null, fin);
  ent("p8", "PERSON", "Moussa KANE", { birth_date: "1981-07-19", nationality: "SN", occupation: "Pêcheur" }, 1, null, null, null, adm);
  ent("p9", "PERSON", "Samba DIOP", { birth_date: "1983-02-27", nationality: "SN", occupation: "Agent immobilier" }, 1);
  ent("p10", "PERSON", "Yacine MBAYE", { birth_date: "1995-10-10", nationality: "SN", occupation: "Développeuse" }, 3, "CYBER", null, null, humint);
  ent("p11", "PERSON", "Lamine SARR", { birth_date: "1970-05-05", nationality: "SN", occupation: "Armateur" }, 2, "OPS", null, null, humint);
  ent("p12", "PERSON", "Khady THIAM", { birth_date: "1991-08-23", nationality: "SN", occupation: "Vendeuse" }, 0);
  ent("o1", "ORGANIZATION", "SENTRANS LOGISTIQUE SARL", { ninea: "00912345", sector: "Transit portuaire", city: "Dakar" }, 1, null, 14.6937, -17.4441, adm);
  ent("o2", "ORGANIZATION", "Atlantic Trading Co", { registered: "Nouakchott", sector: "Import-export" }, 2, "FIN", null, null, fin);
  ent("o3", "ORGANIZATION", "Association Jeunesse Solidaire", { sector: "Associatif", city: "Thiès" }, 0, null, 14.7886, -16.926);
  ent("o4", "ORGANIZATION", "Sahel Fishing Ltd", { registered: "Banjul", sector: "Pêche" }, 2, "OPS", null, null, humint);
  const phones: Record<string, string> = { t1: "+221 77 123 45 67", t2: "+221 78 234 56 78", t3: "+221 76 345 67 89", t4: "+223 65 11 22 33", t5: "+221 70 456 78 90", t6: "+221 77 567 89 01", t7: "+220 301 23 45", t8: "+221 78 678 90 12" };
  for (const [k, n] of Object.entries(phones)) ent(k, "PHONE", n, { number: n, operator: n.includes("77") || n.includes("78") ? "Orange" : "Free/Autre" }, 2, null, null, null, cdr);
  ent("v1", "VEHICLE", "DK-4521-AB", { plate: "DK-4521-AB", brand: "Toyota Hilux", color: "Blanc" }, 1, null, null, null, adm);
  ent("v2", "VEHICLE", "TH-8890-CD", { plate: "TH-8890-CD", brand: "Mercedes Sprinter", color: "Gris" }, 1, null, null, null, adm);
  ent("v3", "VEHICLE", "DK-1177-EF", { plate: "DK-1177-EF", brand: "Hyundai Tucson", color: "Noir" }, 1, null, null, null, adm);
  ent("l1", "LOCATION", "Port autonome de Dakar - Môle 8", { kind: "Infrastructure critique", city: "Dakar" }, 1, null, 14.6808, -17.429);
  ent("l2", "LOCATION", "Entrepôt zone industrielle Thiès", { kind: "Entrepôt" }, 2, "OPS", 14.791, -16.918, humint);
  ent("l3", "LOCATION", "Poste frontière Rosso", { kind: "Point de passage" }, 1, null, 16.513, -15.805);
  ent("l4", "LOCATION", "Marché Sandaga", { kind: "Marché" }, 0, null, 14.673, -17.438);
  ent("l5", "LOCATION", "Quai de pêche Mbour", { kind: "Quai" }, 1, null, 14.405, -16.965);
  ent("l6", "LOCATION", "Poste frontière Karang", { kind: "Point de passage" }, 1, null, 13.589, -16.523);
  ent("l7", "LOCATION", "Cybercafé Liberté 6", { kind: "Commerce" }, 2, "CYBER", 14.723, -17.465, humint);
  ent("a1", "ACCOUNT", "SN08 SN01 0152 0000 1234 5678 901", { iban: "SN08SN0101520000123456789 01", bank: "Banque A" }, 2, "FIN", null, null, fin);
  ent("a2", "ACCOUNT", "MR13 0002 0001 0100 0012 3456 753", { iban: "MR1300020001010000123456753", bank: "Banque B (MR)" }, 2, "FIN", null, null, fin);
  ent("a3", "ACCOUNT", "SN08 SN02 0199 0000 9876 5432 109", { iban: "SN08SN0201990000987654321 09", bank: "Banque C" }, 2, "FIN", null, null, fin);
  ent("s1", "VESSEL", "F/V TERANGA II", { imo: "DEMO-7788", flag: "GM", type: "Chalutier" }, 2, "OPS", 14.4, -17.1, humint);
  ent("ev1", "EVENT", "Saisie de 120 kg au Môle 8", { date: "2026-09-14", kind: "Saisie", unit: "Douanes" }, 2, "OPS", 14.6808, -17.429, humint);
  ent("ev2", "EVENT", "Virement suspect 45 M FCFA", { date: "2026-10-02", kind: "Déclaration de soupçon" }, 2, "FIN", null, null, fin);
  ent("ev3", "EVENT", "Réunion entrepôt Thiès", { date: "2026-10-20", kind: "Observation", confidence: "B2" }, 2, "OPS", null, null, humint);
  ent("ev4", "EVENT", "Intrusion réseau opérateur télécom", { date: "2026-10-28", kind: "Incident cyber" }, 3, "CYBER", null, null, humint);
  ent("d1", "DEVICE", "Portable IMEI 35-209900-176148-1", { imei: "352099001761481", model: "Android" }, 2, "OPS", null, null, cdr);
  ent("d2", "DEVICE", "Portable IMEI 86-123456-789012-3", { imei: "861234567890123", model: "Android" }, 3, "CYBER", null, null, cdr);
  ent("doc1", "DOCUMENT", "Compte rendu HUMINT 2026-10-21", { content: "Source B rapporte une réunion à l'entrepôt de Thiès entre AK et un négociant malien.", date: "2026-10-21" }, 2, "OPS", null, null, humint);

  rel("p1", "o1", "EMPLOYED_BY", { role: "Gérant" }); rel("p2", "o1", "OWNS", { share: "60%" }); rel("p3", "o1", "EMPLOYED_BY", { role: "Chauffeur" });
  rel("p4", "o2", "OWNS", { share: "100%" }, 2, "FIN"); rel("p7", "o2", "EMPLOYED_BY", { role: "Comptable" }, 2, "FIN"); rel("p5", "o2", "MEMBER_OF", { role: "Associé" }, 2, "FIN");
  rel("p6", "o3", "MEMBER_OF", {}, 0); rel("p12", "o3", "MEMBER_OF", {}, 0);
  rel("p11", "o4", "OWNS", {}, 2, "OPS"); rel("p8", "o4", "EMPLOYED_BY", { role: "Capitaine" }, 2, "OPS"); rel("o4", "s1", "OWNS", {}, 2, "OPS");
  for (const [p, t] of [["p1", "t1"], ["p2", "t2"], ["p3", "t3"], ["p5", "t4"], ["p4", "t5"], ["p7", "t6"], ["p11", "t7"]]) rel(p, t, "USES", {}, 2);
  rel("p10", "t8", "USES", {}, 3, "CYBER");
  for (const [a, b, n] of [["t1", "t4", 23], ["t1", "t2", 11], ["t1", "t3", 40], ["t4", "t7", 6], ["t5", "t6", 18], ["t1", "t5", 4], ["t7", "t3", 9], ["t8", "t1", 2]] as [string, string, number][]) rel(a, b, "CALLED", { calls_30d: n, last_call: "2026-10-30" }, 2, null, n);
  rel("t1", "d1", "USES", {}, 2, "OPS"); rel("t8", "d2", "USES", {}, 3, "CYBER");
  rel("p1", "v1", "OWNS"); rel("p3", "v2", "USES"); rel("p9", "v3", "OWNS");
  rel("v2", "l3", "TRAVELLED_TO", { date: "2026-10-18", direction: "sortie" }); rel("v2", "l6", "TRAVELLED_TO", { date: "2026-10-25", direction: "entrée" });
  rel("v1", "l2", "LOCATED_AT", { date: "2026-10-20", time: "22:40" }, 2, "OPS"); rel("o1", "l1", "LOCATED_AT", { kind: "Activité" });
  rel("p1", "l2", "LOCATED_AT", { date: "2026-10-20" }, 2, "OPS"); rel("p5", "l2", "LOCATED_AT", { date: "2026-10-20" }, 2, "OPS");
  rel("p6", "l4", "LOCATED_AT", {}, 0); rel("p8", "l5", "LOCATED_AT"); rel("s1", "l5", "LOCATED_AT", { date: "2026-09-12" }, 2, "OPS"); rel("p10", "l7", "LOCATED_AT", {}, 2, "CYBER");
  rel("p4", "a1", "OWNS", {}, 2, "FIN"); rel("o2", "a2", "OWNS", {}, 2, "FIN"); rel("o1", "a3", "OWNS", {}, 2, "FIN");
  rel("a3", "a2", "TRANSFERRED_TO", { amount: "45 000 000", currency: "XOF", date: "2026-10-02" }, 2, "FIN", 3);
  rel("a1", "a2", "TRANSFERRED_TO", { amount: "12 500 000", currency: "XOF", date: "2026-09-20" }, 2, "FIN", 2);
  rel("ev1", "l1", "LOCATED_AT", {}, 2, "OPS"); rel("p3", "ev1", "PARTICIPATED_IN", { role: "Conducteur du véhicule" }, 2, "OPS"); rel("v2", "ev1", "PARTICIPATED_IN", {}, 2, "OPS");
  rel("ev2", "a3", "RELATED_TO", {}, 2, "FIN"); rel("p1", "ev3", "PARTICIPATED_IN", {}, 2, "OPS"); rel("p5", "ev3", "PARTICIPATED_IN", {}, 2, "OPS"); rel("ev3", "l2", "LOCATED_AT", {}, 2, "OPS");
  rel("doc1", "ev3", "MENTIONS", {}, 2, "OPS"); rel("doc1", "p1", "MENTIONS", {}, 2, "OPS");
  rel("p10", "ev4", "PARTICIPATED_IN", { role: "Suspect" }, 3, "CYBER"); rel("d2", "ev4", "RELATED_TO", {}, 3, "CYBER");
  rel("p1", "p5", "KNOWS", { since: "2024" }, 2, "OPS"); rel("p2", "p9", "FAMILY_OF", { link: "Cousins" }); rel("p6", "p12", "KNOWS", {}, 0); rel("p1", "p11", "KNOWS", {}, 2, "OPS"); rel("p8", "p11", "KNOWS");

  const wl = (name: string, entity_type: string | null, field: string, operator: string, value: string, severity: string) => s.watchlists.push({ id: nextId(s), name, entity_type, field, operator, value, severity, is_active: true, created_by: "seed", created_at: now() });
  wl("Personnes d'intérêt - trafic", "PERSON", "label", "fuzzy", "Abdou Karim Ndour", "HIGH");
  wl("Passage frontière Rosso", "LOCATION", "label", "contains", "Rosso", "MEDIUM");
  wl("Indicatif Mali", "PHONE", "attributes.number", "regex", "^\\+?223", "LOW");
  wl("Infrastructures critiques", "LOCATION", "attributes.kind", "equals", "Infrastructure critique", "HIGH");
  for (const e of Object.values(E)) evaluateAlerts(s, e);

  const year = new Date().getFullYear(); const t = Date.now(); const ago = (d: number) => new Date(t - d * 86400000).toISOString();
  const cs = (reference: string, title: string, status: string, priority: string, classification: number, compartment: string | null, owner: string, description: string) => { const c = { id: nextId(s), reference, title, description, status, priority, classification, compartment, owner, created_at: ago(20), updated_at: ago(2) }; s.cases.push(c); return c; };
  const c1 = cs(`DRN-${year}-0001`, "Opération TERANGA - filière portuaire", "IN_PROGRESS", "P1", 2, "OPS", "analyste", "Réseau présumé de trafic via le Port de Dakar, ramifications Mali / Gambie.");
  const c2 = cs(`DRN-${year}-0002`, "Flux financiers Atlantic Trading", "OPEN", "P2", 2, "FIN", "analyste", "Virements vers la Mauritanie sans justification économique.");
  const c3 = cs(`DRN-${year}-0003`, "Veille associative Thiès", "CLOSED", "P3", 0, null, "officier", "Vérification de routine, sans suite.");
  const ce = (c: any, k: string, role: string, by: string) => s.case_entities.push({ id: nextId(s), case_id: c.id, entity_id: E[k].id, role, added_by: by, added_at: ago(10) });
  for (const [k, r] of [["p1", "SUBJECT"], ["p5", "SUBJECT"], ["p3", "ASSOCIATE"], ["o1", "SUBJECT"], ["v2", "ASSET"], ["ev1", "SUBJECT"], ["l2", "ASSET"]]) ce(c1, k, r, "analyste");
  for (const [k, r] of [["p4", "SUBJECT"], ["o2", "SUBJECT"], ["a2", "ASSET"], ["ev2", "SUBJECT"], ["p7", "WITNESS"]]) ce(c2, k, r, "analyste");
  for (const [k, r] of [["o3", "SUBJECT"], ["p6", "ASSOCIATE"]]) ce(c3, k, r, "officier");
  const note = (c: any, author: string, kind: string, content: string, d: number) => s.case_notes.push({ id: nextId(s), case_id: c.id, author, kind, content, created_at: ago(d) });
  note(c1, "analyste", "HYPOTHESIS", "AK NDOUR coordonne la logistique ; le camion TH-8890-CD assure la liaison Rosso / Karang.", 12);
  note(c1, "analyste", "ACTION", "Demander les relevés d'appels de +223 65 11 22 33 sur 90 jours.", 5);
  note(c1, "officier", "NOTE", "Observation terrain : véhicule DK-4521-AB stationné devant l'entrepôt le 20/10 à 22h40.", 3);
  note(c2, "analyste", "DECISION", "Transmission à la CENTIF pour analyse approfondie des comptes.", 2);
  audit(s, "system", "SEED", "state", "demo", { entities: s.entities.length, relations: s.relations.length });
  return s;
}
