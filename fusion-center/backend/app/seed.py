"""Jeu de données de démonstration. Toutes les personnes, organisations et numéros sont FICTIFS."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .core.config import settings
from .core.security import hash_password
from .models import Case, CaseEntity, CaseNote, Source, User, Watchlist
from .services import alerts as alert_engine
from .services.ingestion import upsert_entity, upsert_relation


def ensure_admin(db: Session) -> None:
    if not db.execute(select(User).where(User.username == settings.admin_username)).scalar_one_or_none():
        db.add(User(username=settings.admin_username, full_name="Administrateur", hashed_password=hash_password(settings.admin_password),
                    role="admin", clearance=3, compartments="OPS,FIN,CYBER", unit="DRN / Direction technique"))
        db.commit()


def seed_demo(db: Session) -> None:
    if db.execute(select(Source).where(Source.name == "DEMO-HUMINT")).scalar_one_or_none():
        return
    users = [
        ("analyste", "Analyste DRN (CD, compartiments OPS/FIN)", "analyst", 2, "OPS,FIN", "DRN / Analyse"),
        ("officier", "Officier FDS (DR, sans compartiment)", "analyst", 1, "", "Gendarmerie / SR"),
        ("lecteur", "Lecteur (NP)", "viewer", 0, "", "Cabinet"),
    ]
    for username, full_name, role, clr, comps, unit in users:
        if not db.execute(select(User).where(User.username == username)).scalar_one_or_none():
            db.add(User(username=username, full_name=full_name, hashed_password=hash_password(f"{username}123"), role=role,
                        clearance=clr, compartments=comps, unit=unit))
    humint = Source(name="DEMO-HUMINT", type="HUMINT", reliability="B", description="Comptes rendus de sources humaines (démo)", classification=2)
    osint = Source(name="DEMO-OSINT", type="OSINT", reliability="C", description="Sources ouvertes (démo)", classification=0)
    cdr = Source(name="DEMO-CDR", type="SIGINT", reliability="A", description="Relevés d'appels opérateur (démo)", classification=2)
    fin = Source(name="DEMO-FININT", type="FININT", reliability="B", description="Déclarations de soupçon (démo)", classification=2)
    admin_src = Source(name="DEMO-ADMIN", type="ADMIN", reliability="A", description="Fichiers administratifs : immatriculations, état civil (démo)", classification=1)
    db.add_all([humint, osint, cdr, fin, admin_src])
    db.flush()

    E = {}

    def ent(key, type_, label, attrs=None, clr=1, comp=None, lat=None, lon=None, src=osint):
        e, _ = upsert_entity(db, type_=type_, label=label, attributes=attrs or {}, classification=clr, compartment=comp,
                             lat=lat, lon=lon, source=src, created_by="seed", confidence=0.7)
        E[key] = e
        return e

    def rel(a, b, t, attrs=None, clr=1, comp=None, w=1.0, src=None):
        upsert_relation(db, E[a].id, E[b].id, t, attrs or {}, weight=w, classification=clr, compartment=comp, data_source=src)

    # --- Personnes (fictives) ---
    ent("p1", "PERSON", "Abdou Karim NDOUR", {"birth_date": "1984-03-12", "nationality": "SN", "alias": "AK", "occupation": "Transitaire"}, 2, "OPS", src=humint)
    ent("p2", "PERSON", "Mamadou FAYE", {"birth_date": "1979-11-02", "nationality": "SN", "occupation": "Commerçant"}, 1, src=admin_src)
    ent("p3", "PERSON", "Ibrahima SOW", {"birth_date": "1990-06-21", "nationality": "SN", "occupation": "Chauffeur"}, 1, src=admin_src)
    ent("p4", "PERSON", "Aminata DIALLO", {"birth_date": "1988-01-15", "nationality": "SN", "occupation": "Gérante"}, 2, "FIN", src=fin)
    ent("p5", "PERSON", "Oumar BA", {"birth_date": "1975-09-30", "nationality": "ML", "occupation": "Négociant"}, 2, "OPS", src=humint)
    ent("p6", "PERSON", "Cheikh GUEYE", {"birth_date": "1992-04-04", "nationality": "SN", "occupation": "Étudiant"}, 0)
    ent("p7", "PERSON", "Fatou NIANG", {"birth_date": "1986-12-08", "nationality": "SN", "occupation": "Comptable"}, 2, "FIN", src=fin)
    ent("p8", "PERSON", "Moussa KANE", {"birth_date": "1981-07-19", "nationality": "SN", "occupation": "Pêcheur"}, 1, src=admin_src)
    ent("p9", "PERSON", "Samba DIOP", {"birth_date": "1983-02-27", "nationality": "SN", "occupation": "Agent immobilier"}, 1)
    ent("p10", "PERSON", "Yacine MBAYE", {"birth_date": "1995-10-10", "nationality": "SN", "occupation": "Développeuse"}, 3, "CYBER", src=humint)
    ent("p11", "PERSON", "Lamine SARR", {"birth_date": "1970-05-05", "nationality": "SN", "occupation": "Armateur"}, 2, "OPS", src=humint)
    ent("p12", "PERSON", "Khady THIAM", {"birth_date": "1991-08-23", "nationality": "SN", "occupation": "Vendeuse"}, 0)

    # --- Organisations ---
    ent("o1", "ORGANIZATION", "SENTRANS LOGISTIQUE SARL", {"ninea": "00912345", "sector": "Transit portuaire", "city": "Dakar"}, 1, src=admin_src, lat=14.6937, lon=-17.4441)
    ent("o2", "ORGANIZATION", "Atlantic Trading Co", {"registered": "Nouakchott", "sector": "Import-export"}, 2, "FIN", src=fin)
    ent("o3", "ORGANIZATION", "Association Jeunesse Solidaire", {"sector": "Associatif", "city": "Thiès"}, 0, lat=14.7886, lon=-16.9260)
    ent("o4", "ORGANIZATION", "Sahel Fishing Ltd", {"registered": "Banjul", "sector": "Pêche"}, 2, "OPS", src=humint)

    # --- Téléphones ---
    phones = {"t1": "+221 77 123 45 67", "t2": "+221 78 234 56 78", "t3": "+221 76 345 67 89", "t4": "+223 65 11 22 33",
              "t5": "+221 70 456 78 90", "t6": "+221 77 567 89 01", "t7": "+220 301 23 45", "t8": "+221 78 678 90 12"}
    for k, n in phones.items():
        ent(k, "PHONE", n, {"number": n, "operator": "Orange" if "77" in n or "78" in n else "Free/Autre"}, 2, src=cdr)

    # --- Véhicules ---
    ent("v1", "VEHICLE", "DK-4521-AB", {"plate": "DK-4521-AB", "brand": "Toyota Hilux", "color": "Blanc"}, 1, src=admin_src)
    ent("v2", "VEHICLE", "TH-8890-CD", {"plate": "TH-8890-CD", "brand": "Mercedes Sprinter", "color": "Gris"}, 1, src=admin_src)
    ent("v3", "VEHICLE", "DK-1177-EF", {"plate": "DK-1177-EF", "brand": "Hyundai Tucson", "color": "Noir"}, 1, src=admin_src)

    # --- Lieux ---
    ent("l1", "LOCATION", "Port autonome de Dakar - Môle 8", {"kind": "Infrastructure critique", "city": "Dakar"}, 1, lat=14.6808, lon=-17.4290)
    ent("l2", "LOCATION", "Entrepôt zone industrielle Thiès", {"kind": "Entrepôt"}, 2, "OPS", lat=14.7910, lon=-16.9180, src=humint)
    ent("l3", "LOCATION", "Poste frontière Rosso", {"kind": "Point de passage"}, 1, lat=16.5130, lon=-15.8050)
    ent("l4", "LOCATION", "Marché Sandaga", {"kind": "Marché"}, 0, lat=14.6730, lon=-17.4380)
    ent("l5", "LOCATION", "Quai de pêche Mbour", {"kind": "Quai"}, 1, lat=14.4050, lon=-16.9650)
    ent("l6", "LOCATION", "Poste frontière Karang", {"kind": "Point de passage"}, 1, lat=13.5890, lon=-16.5230)
    ent("l7", "LOCATION", "Cybercafé Liberté 6", {"kind": "Commerce"}, 2, "CYBER", lat=14.7230, lon=-17.4650, src=humint)

    # --- Comptes bancaires ---
    ent("a1", "ACCOUNT", "SN08 SN01 0152 0000 1234 5678 901", {"iban": "SN08SN0101520000123456789 01", "bank": "Banque A"}, 2, "FIN", src=fin)
    ent("a2", "ACCOUNT", "MR13 0002 0001 0100 0012 3456 753", {"iban": "MR1300020001010000123456753", "bank": "Banque B (MR)"}, 2, "FIN", src=fin)
    ent("a3", "ACCOUNT", "SN08 SN02 0199 0000 9876 5432 109", {"iban": "SN08SN0201990000987654321 09", "bank": "Banque C"}, 2, "FIN", src=fin)

    # --- Navires / Événements / Appareils ---
    ent("s1", "VESSEL", "F/V TERANGA II", {"imo": "DEMO-7788", "flag": "GM", "type": "Chalutier"}, 2, "OPS", lat=14.40, lon=-17.10, src=humint)
    ent("ev1", "EVENT", "Saisie de 120 kg au Môle 8", {"date": "2026-09-14", "kind": "Saisie", "unit": "Douanes"}, 2, "OPS", lat=14.6808, lon=-17.4290, src=humint)
    ent("ev2", "EVENT", "Virement suspect 45 M FCFA", {"date": "2026-10-02", "kind": "Déclaration de soupçon"}, 2, "FIN", src=fin)
    ent("ev3", "EVENT", "Réunion entrepôt Thiès", {"date": "2026-10-20", "kind": "Observation", "confidence": "B2"}, 2, "OPS", src=humint)
    ent("ev4", "EVENT", "Intrusion réseau opérateur télécom", {"date": "2026-10-28", "kind": "Incident cyber"}, 3, "CYBER", src=humint)
    ent("d1", "DEVICE", "Portable IMEI 35-209900-176148-1", {"imei": "352099001761481", "model": "Android"}, 2, "OPS", src=cdr)
    ent("d2", "DEVICE", "Portable IMEI 86-123456-789012-3", {"imei": "861234567890123", "model": "Android"}, 3, "CYBER", src=cdr)
    ent("doc1", "DOCUMENT", "Compte rendu HUMINT 2026-10-21", {"content": "Source B rapporte une réunion à l'entrepôt de Thiès entre AK et un négociant malien.", "date": "2026-10-21"}, 2, "OPS", src=humint)

    # --- Relations ---
    rel("p1", "o1", "EMPLOYED_BY", {"role": "Gérant"}, 1)
    rel("p2", "o1", "OWNS", {"share": "60%"}, 1)
    rel("p3", "o1", "EMPLOYED_BY", {"role": "Chauffeur"}, 1)
    rel("p4", "o2", "OWNS", {"share": "100%"}, 2, "FIN")
    rel("p7", "o2", "EMPLOYED_BY", {"role": "Comptable"}, 2, "FIN")
    rel("p5", "o2", "MEMBER_OF", {"role": "Associé"}, 2, "FIN")
    rel("p6", "o3", "MEMBER_OF", {}, 0)
    rel("p12", "o3", "MEMBER_OF", {}, 0)
    rel("p11", "o4", "OWNS", {}, 2, "OPS")
    rel("p8", "o4", "EMPLOYED_BY", {"role": "Capitaine"}, 2, "OPS")
    rel("o4", "s1", "OWNS", {}, 2, "OPS")
    rel("p1", "t1", "USES", {}, 2)
    rel("p2", "t2", "USES", {}, 2)
    rel("p3", "t3", "USES", {}, 2)
    rel("p5", "t4", "USES", {}, 2)
    rel("p4", "t5", "USES", {}, 2)
    rel("p7", "t6", "USES", {}, 2)
    rel("p11", "t7", "USES", {}, 2)
    rel("p10", "t8", "USES", {}, 3, "CYBER")
    for a, b, n in [("t1", "t4", 23), ("t1", "t2", 11), ("t1", "t3", 40), ("t4", "t7", 6), ("t5", "t6", 18), ("t1", "t5", 4), ("t7", "t3", 9), ("t8", "t1", 2)]:
        rel(a, b, "CALLED", {"calls_30d": n, "last_call": "2026-10-30"}, 2, w=float(n))
    rel("t1", "d1", "USES", {}, 2, "OPS")
    rel("t8", "d2", "USES", {}, 3, "CYBER")
    rel("p1", "v1", "OWNS", {}, 1)
    rel("p3", "v2", "USES", {}, 1)
    rel("p9", "v3", "OWNS", {}, 1)
    rel("v2", "l3", "TRAVELLED_TO", {"date": "2026-10-18", "direction": "sortie"}, 1)
    rel("v2", "l6", "TRAVELLED_TO", {"date": "2026-10-25", "direction": "entrée"}, 1)
    rel("v1", "l2", "LOCATED_AT", {"date": "2026-10-20", "time": "22:40"}, 2, "OPS")
    rel("o1", "l1", "LOCATED_AT", {"kind": "Activité"}, 1)
    rel("p1", "l2", "LOCATED_AT", {"date": "2026-10-20"}, 2, "OPS")
    rel("p5", "l2", "LOCATED_AT", {"date": "2026-10-20"}, 2, "OPS")
    rel("p6", "l4", "LOCATED_AT", {}, 0)
    rel("p8", "l5", "LOCATED_AT", {}, 1)
    rel("s1", "l5", "LOCATED_AT", {"date": "2026-09-12"}, 2, "OPS")
    rel("p10", "l7", "LOCATED_AT", {}, 2, "CYBER")
    rel("p4", "a1", "OWNS", {}, 2, "FIN")
    rel("o2", "a2", "OWNS", {}, 2, "FIN")
    rel("o1", "a3", "OWNS", {}, 2, "FIN")
    rel("a3", "a2", "TRANSFERRED_TO", {"amount": "45 000 000", "currency": "XOF", "date": "2026-10-02"}, 2, "FIN", w=3)
    rel("a1", "a2", "TRANSFERRED_TO", {"amount": "12 500 000", "currency": "XOF", "date": "2026-09-20"}, 2, "FIN", w=2)
    rel("ev1", "l1", "LOCATED_AT", {}, 2, "OPS")
    rel("p3", "ev1", "PARTICIPATED_IN", {"role": "Conducteur du véhicule"}, 2, "OPS")
    rel("v2", "ev1", "PARTICIPATED_IN", {}, 2, "OPS")
    rel("ev2", "a3", "RELATED_TO", {}, 2, "FIN")
    rel("p1", "ev3", "PARTICIPATED_IN", {}, 2, "OPS")
    rel("p5", "ev3", "PARTICIPATED_IN", {}, 2, "OPS")
    rel("ev3", "l2", "LOCATED_AT", {}, 2, "OPS")
    rel("doc1", "ev3", "MENTIONS", {}, 2, "OPS")
    rel("doc1", "p1", "MENTIONS", {}, 2, "OPS")
    rel("p10", "ev4", "PARTICIPATED_IN", {"role": "Suspect"}, 3, "CYBER")
    rel("d2", "ev4", "RELATED_TO", {}, 3, "CYBER")
    rel("p1", "p5", "KNOWS", {"since": "2024"}, 2, "OPS")
    rel("p2", "p9", "FAMILY_OF", {"link": "Cousins"}, 1)
    rel("p6", "p12", "KNOWS", {}, 0)
    rel("p1", "p11", "KNOWS", {}, 2, "OPS")
    rel("p8", "p11", "KNOWS", {}, 1)

    # --- Veille ---
    wls = [
        Watchlist(name="Personnes d'intérêt - trafic", entity_type="PERSON", field="label", operator="fuzzy", value="Abdou Karim Ndour", severity="HIGH", created_by="seed"),
        Watchlist(name="Passage frontière Rosso", entity_type="LOCATION", field="label", operator="contains", value="Rosso", severity="MEDIUM", created_by="seed"),
        Watchlist(name="Indicatif Mali", entity_type="PHONE", field="attributes.number", operator="regex", value=r"^\+?223", severity="LOW", created_by="seed"),
        Watchlist(name="Infrastructures critiques", entity_type="LOCATION", field="attributes.kind", operator="equals", value="Infrastructure critique", severity="HIGH", created_by="seed"),
    ]
    db.add_all(wls)
    db.flush()
    for e in E.values():
        alert_engine.evaluate(db, e)

    # --- Dossiers ---
    now = datetime.now(timezone.utc)
    c1 = Case(reference=f"DRN-{now.year}-0001", title="Opération TERANGA - filière portuaire", status="IN_PROGRESS", priority="P1",
              classification=2, compartment="OPS", owner="analyste",
              description="Réseau présumé de trafic via le Port de Dakar, ramifications Mali / Gambie.")
    c2 = Case(reference=f"DRN-{now.year}-0002", title="Flux financiers Atlantic Trading", status="OPEN", priority="P2",
              classification=2, compartment="FIN", owner="analyste", description="Virements vers la Mauritanie sans justification économique.")
    c3 = Case(reference=f"DRN-{now.year}-0003", title="Veille associative Thiès", status="CLOSED", priority="P3", classification=0, owner="officier",
              description="Vérification de routine, sans suite.")
    db.add_all([c1, c2, c3])
    db.flush()
    for key, role in [("p1", "SUBJECT"), ("p5", "SUBJECT"), ("p3", "ASSOCIATE"), ("o1", "SUBJECT"), ("v2", "ASSET"), ("ev1", "SUBJECT"), ("l2", "ASSET")]:
        db.add(CaseEntity(case_id=c1.id, entity_id=E[key].id, role=role, added_by="analyste"))
    for key, role in [("p4", "SUBJECT"), ("o2", "SUBJECT"), ("a2", "ASSET"), ("ev2", "SUBJECT"), ("p7", "WITNESS")]:
        db.add(CaseEntity(case_id=c2.id, entity_id=E[key].id, role=role, added_by="analyste"))
    for key, role in [("o3", "SUBJECT"), ("p6", "ASSOCIATE")]:
        db.add(CaseEntity(case_id=c3.id, entity_id=E[key].id, role=role, added_by="officier"))
    db.add_all([
        CaseNote(case_id=c1.id, author="analyste", kind="HYPOTHESIS", content="AK NDOUR coordonne la logistique ; le camion TH-8890-CD assure la liaison Rosso / Karang.", created_at=now - timedelta(days=12)),
        CaseNote(case_id=c1.id, author="analyste", kind="ACTION", content="Demander les relevés d'appels de +223 65 11 22 33 sur 90 jours.", created_at=now - timedelta(days=5)),
        CaseNote(case_id=c1.id, author="officier", kind="NOTE", content="Observation terrain : véhicule DK-4521-AB stationné devant l'entrepôt le 20/10 à 22h40.", created_at=now - timedelta(days=3)),
        CaseNote(case_id=c2.id, author="analyste", kind="DECISION", content="Transmission à la CENTIF pour analyse approfondie des comptes.", created_at=now - timedelta(days=2)),
    ])
    db.commit()
