# Référence API (compagnies, équipements, connecteurs)

Cette page décrit les interfaces de WawID ouvertes aux systèmes tiers : le portail voyageur et l'app iPhone, la passerelle des compagnies aériennes (API/PNR) et les routes de la plateforme des compagnies, les eGates et kiosques ABC, et le contrat des connecteurs externes.

## Généralités

| Élément | Valeur |
| --- | --- |
| URL de base | `https://wawid-waw-telecom.netlify.app` |
| Préfixe | Toutes les routes sont sous `/api/` |
| Transport | HTTPS uniquement |
| Format | JSON (`Content-Type: application/json`), encodage UTF-8 |
| Cache | Toutes les réponses portent `Cache-Control: no-store` |
| Codes et libellés | Les valeurs d'énumération (statuts, issues) sont des codes fixes en français ; les messages d'erreur sont rédigés en français |

### Familles de routes

| Famille | Authentification | Public visé |
| --- | --- | --- |
| `/api/public/*` | Aucune | Portail voyageur, app iPhone |
| `/api/carrier/messages` | En-tête `X-Carrier-Key` | Compagnies aériennes (systèmes) |
| `/api/compagnie/*` | Session d'un compte **Compagnie aérienne** (cookie signé, connexion avec `platform: "compagnies"`) | Plateforme des compagnies aériennes (`/compagnies/`) |
| `/api/gate/*` | En-tête `X-Gate-Key` | eGates, kiosques ABC |
| `/api/docs`, `/api/docs/:lang/:slug` | Aucune pour les pages publiques ; session de l'espace DPAF pour les pages internes | Centre d'aide |
| Autres routes (`/api/session`, `/api/data`, `/api/crossings`, `/api/evisas/…`, etc.) | Session agent (cookie signé) | Espace DPAF uniquement |

Les routes de l'espace DPAF ne sont pas documentées ici : elles exigent une session authentifiée et un rôle disposant de la permission correspondante, et ne constituent pas une interface d'intégration. Un compte compagnie n'a accès à aucune d'entre elles (`403`), ni aux pages internes de la documentation (`403` ; `401` sans session).

### Format des erreurs

Toute erreur renvoie un objet JSON avec un champ `error` :

```json
{ "error": "Champ obligatoire manquant : E-mail" }
```

| Code | Signification |
| --- | --- |
| 400 | Requête invalide (JSON mal formé, champ manquant ou incorrect) |
| 401 | Clé d'équipement / de transporteur ou session invalide |
| 403 | Rôle insuffisant (espace DPAF), compte refusé sur cette plateforme, ou page de documentation interne demandée par un compte compagnie |
| 404 | Ressource introuvable ou route inconnue (`{"error":"Route inconnue"}`) |
| 409 | Action incompatible avec l'état (ex. réponse alors qu'aucune information n'est attendue) |
| 413 | Corps trop volumineux |
| 422 | Message transporteur rejeté (format propre, voir plus bas) |
| 500 | Erreur serveur (`{"error":"Erreur serveur"}`) |

## API publique voyageur

### GET /api/public/info

Paramètres publics : postes frontières, pays, nationalités dispensées de visa, montants.

```http
GET /api/public/info
```

```json
{
  "postes": [
    { "id": "AIBD", "name": "Aéroport Int. Blaise Diagne", "type": "Aérien", "region": "Thiès" },
    { "id": "PDK", "name": "Port Autonome de Dakar", "type": "Maritime", "region": "Dakar" }
  ],
  "countries": { "SEN": "Sénégal", "FRA": "France" },
  "visaExempt": ["SEN", "MLI", "FRA"],
  "evisaFee": 50000,
  "passFee": 15000
}
```

Les montants sont en FCFA (XOF). Identifiants de postes : `AIBD`, `PDK`, `ROS`, `KID`, `KAR`, `ZIG`.

### POST /api/public/evisa

Dépôt d'une demande d'e-Visa.

```http
POST /api/public/evisa
Content-Type: application/json
```

```json
{
  "applicant": {
    "surname": "MARTIN", "given": "CLAIRE", "dob": "1978-12-24", "sex": "F", "nat": "FRA",
    "docNo": "21CX88341", "expiry": "2031-05-30", "email": "claire.martin@example.org", "phone": "+33600000000"
  },
  "trip": { "purpose": "Tourisme", "arrival": "2026-11-20", "nights": 10, "port": "AIBD", "address": "Hôtel, Dakar" },
  "health": { "yellowFever": true, "symptoms": false, "countriesVisited": "FRA" },
  "paymentMethod": "Wave",
  "consent": true,
  "channel": "Web",
  "chip": { "read": true, "dg1": "P<FRAMARTIN<<CLAIRE…\n21CX88341…", "passiveAuth": true, "protocol": "PACE", "source": "iPhone NFC" }
}
```

| Champ | Obligatoire | Remarque |
| --- | --- | --- |
| `applicant.surname`, `given`, `dob`, `nat`, `docNo`, `expiry`, `email` | Oui | Dates `AAAA-MM-JJ`, nationalité ISO 3166 alpha-3, e-mail valide |
| `trip.arrival` | Oui | `AAAA-MM-JJ` |
| `consent` | Oui | Doit valoir `true` |
| `applicant.sex`, `phone`, `trip.*`, `health.*`, `paymentMethod`, `channel` | Non | `port` par défaut `AIBD`, paiement par défaut « Carte bancaire » |
| `chip` | Non | Résultat de lecture NFC ; WawID recalcule la concordance DG1 ↔ données saisies |
| `ekyc`, `deviceId` | Non | Résultats eKYC (scores et indicateurs uniquement, jamais d'images) et identifiant d'appareil |

Réponse `200` :

```json
{ "ref": "EV1234567", "status": "SOUMISE", "receipt": "PAY-MH3K2A1B", "amount": 50000 }
```

### POST /api/public/evisa/status

Consultation d'une demande. La référence **et** le numéro de passeport doivent correspondre.

```json
{ "ref": "EV1234567", "docNo": "21CX88341" }
```

Réponse `200` :

```json
{
  "ref": "EV1234567", "status": "APPROUVEE", "createdAt": "2026-10-19T08:12:00.000Z",
  "applicant": { "surname": "MARTIN", "given": "CLAIRE", "nat": "FRA", "docNo": "21CX88341" },
  "trip": { "purpose": "Tourisme", "arrival": "2026-11-20", "nights": 10, "port": "AIBD", "address": "Hôtel, Dakar" },
  "messages": [{ "from": "Agent VMS", "at": "2026-10-19T10:00:00.000Z", "text": "Demande approuvée." }],
  "visaNo": "SN-EV-1234567", "validUntil": "2027-01-17",
  "token": "EV.EV1234567.Xk3…"
}
```

| `status` | Signification |
| --- | --- |
| `SOUMISE` | Soumise |
| `EN_EXAMEN` | En examen |
| `INFO_DEMANDEE` | Information demandée |
| `APPROUVEE` | Approuvée (le champ `token` est alors renseigné) |
| `REFUSEE` | Refusée |

`token` est le contenu du QR code e-Visa (`EV.<référence>.<signature>`), `null` tant que la demande n'est pas approuvée. Erreur `404` si le couple référence/passeport ne correspond à aucune demande.

### POST /api/public/evisa/reply

Réponse du demandeur à une demande d'information.

```json
{ "ref": "EV1234567", "docNo": "21CX88341", "text": "Ci-joint la réservation d'hôtel : …" }
```

Réponse `200` : même objet que `/evisa/status`, avec `status` repassé à `EN_EXAMEN`. Erreurs : `409` si le statut n'est pas `INFO_DEMANDEE`, `400` si le message est vide. Texte limité à 1 000 caractères.

### POST /api/public/pass

Paiement de la taxe de sécurité (WawPass).

```json
{
  "surname": "NDIAYE", "given": "FATOU", "nat": "SEN", "docNo": "A07711223",
  "flight": "HC 404", "travelDate": "2026-11-20", "paymentMethod": "Orange Money"
}
```

Tous les champs sauf `paymentMethod` sont obligatoires ; `travelDate` au format `AAAA-MM-JJ`, aujourd'hui ou plus tard ; `nat` sur 3 lettres.

Réponse `200` :

```json
{
  "ref": "WP7654321", "createdAt": "2026-10-19T08:30:00.000Z", "surname": "NDIAYE", "given": "FATOU",
  "docNo": "A07711223", "nat": "SEN", "flight": "HC 404", "travelDate": "2026-11-20",
  "amount": 15000, "currency": "XOF", "method": "Orange Money", "used": false,
  "token": "WP.WP7654321.a9F…"
}
```

Le `token` est le contenu du QR code. Il est vérifié une seule fois à l'aéroport.

### POST /api/public/enrol

Pré-enrôlement eGate.

```json
{
  "mrz": "P<FRAMARTIN<<CLAIRE<<<<<<<<<<<<<<<<<<<<<<<<<\n21CX883416FRA7812248F3105308<<<<<<<<<<<<<<08",
  "email": "claire.martin@example.org", "phone": "+33600000000", "consent": true
}
```

Contrôles : MRZ lisible avec chiffres de contrôle valides, `consent: true`, e-mail valide, âge ≥ 18 ans, passeport non expiré.

```json
{ "ref": "EN1234567", "status": "EN_ATTENTE" }
```

Si le passeport est déjà pré-enrôlé : `{ "ref": "EN…", "status": "…", "already": true }`.

## Passerelle transporteurs : POST /api/carrier/messages

Point d'entrée machine-à-machine pour la transmission des données **API** (UN/EDIFACT PAXLST) et **PNR** (texte IATA).

| Élément | Valeur |
| --- | --- |
| Authentification | `X-Carrier-Key: <CLE_TRANSPORTEUR>` : une clé par compagnie, liée à son code IATA |
| Corps brut | `Content-Type: text/plain` ou `application/edifact` ; format détecté automatiquement |
| Corps JSON | `{ "format": "PAXLST" \| "PNR", "message": "…" }` avec `Content-Type: application/json` |
| Taille maximale | 2 Mo par message |

Un message portant sur un vol d'une autre compagnie que celle de la clé est rejeté.

### Exemple PAXLST

```http
POST /api/carrier/messages
X-Carrier-Key: <CLE_TRANSPORTEUR>
Content-Type: text/plain
```

```text
UNA:+.? '
UNB+UNOA:4+HC:ZZ+SNPIU:ZZ+261120:0900+000001'
UNH+1+PAXLST:D:02B:UN:IATA+HC404+01:F'
BGM+745'
TDT+20+HC404'
LOC+125+CDG'
DTM+189:2611201000:201'
LOC+87+DSS'
DTM+232:2611201500:201'
NAD+FL+++NDIAYE:FATOU'
ATT+2++F'
DTM+329:900211'
LOC+178+CDG'
LOC+179+DSS'
NAT+2+SEN'
RFF+AVF:QX7K2P'
RFF+SEA:12A'
DOC+P:110:111+A07711223'
DTM+36:300101'
LOC+91+SEN'
CNT+42:1'
UNT+20+1'
UNZ+1+000001'
```

Segments exploités : `UNH` (PAXLST), `BGM` (745 passagers, 250 équipage), `TDT` (vol), `LOC+125/87` et `DTM+189/232` (départ, arrivée), `NAD+FL/FM` (nom, prénoms), `ATT+2` (sexe), `DTM+329` (naissance), `NAT+2` (nationalité), `RFF+AVF` (localisateur), `RFF+SEA` (siège), `DOC` (type et numéro), `DTM+36` (expiration), `LOC+91` (pays émetteur), `LOC+178/179` (embarquement, débarquement). Le segment `UNA` et le caractère d'échappement `?` sont pris en charge.

### Exemple PNR

Un ou plusieurs PNR, séparés par une ligne `END` ou une ligne vide.

```text
RLOC QX7K2P
BKD 02OCT26
FP CC
1.SOW/MARIAMA MRS
HC 404 Y 20NOV CDGDSS
HC 405 Y 30NOV DSSCDG
SSR DOCS HC HK1 P/SEN/A05544332/SEN/03MAR88/F/12DEC31/SOW/MARIAMA/P1
SSR CTCE HC HK1 MARIAMA.SOW//EXEMPLE.SN/P1
SSR CTCM HC HK1 221770000000/P1
END
```

| Élément | Contenu |
| --- | --- |
| `RLOC` | Localisateur de réservation |
| `BKD` | Date de réservation (`JJMMMAA`) |
| `FP` | Moyen de paiement (`CASH`/`CA` : espèces, `CC` : carte) |
| `n.NOM/PRENOM` | Passagers |
| Ligne de segment | `XX 999 Y JJMMM ORGDST` ; plusieurs lignes = itinéraire |
| `SSR DOCS` | `type/émetteur/numéro/nationalité/naissance/sexe/expiration/nom/prénom/Pn` |
| `SSR CTCE` / `CTCM` | E-mail (`//` = `@`) / téléphone, rattachés au passager `Pn` |

Les messages PNRGOV (EDIFACT) sont acceptés après conversion par le service d'intégration.

### Réponses

| Code | Signification | Corps |
| --- | --- | --- |
| 202 | Accepté (`ACCEPTÉ` ou `ACCEPTÉ AVEC AVERTISSEMENTS`) | Accusé de réception complet |
| 422 | Rejeté : format inconnu, vol absent, aucun passager, vol d'une autre compagnie | `{ "status": "REJETÉ", "reference": "MSG-…", "errors": [ … ] }` |
| 401 | Clé transporteur invalide | `{ "status": "REJETÉ", "errors": ["Clé transporteur invalide"] }` |
| 400 | Message vide ou JSON invalide | `{ "error": "…" }` |
| 413 | Message de plus de 2 Mo | `{ "error": "…" }` |

Exemple `202` :

```json
{
  "status": "ACCEPTÉ AVEC AVERTISSEMENTS",
  "reference": "MSG-MH3K9Z01",
  "flight": "HC 404",
  "passengers": 3,
  "completeness": 67,
  "onTime": true,
  "errors": ["PNR QX7K2P : passager 2 sans SSR DOCS"]
}
```

- `reference` identifie le message dans le journal de l'Unité ; conservez-la pour tout échange.
- `completeness` : pourcentage de passagers ayant numéro de document, date de naissance et nationalité. Objectif : **≥ 98 %**.
- `onTime` : respect du délai de transmission.
- **Aucun résultat de ciblage n'est communiqué au transporteur** : l'accusé ne contient ni le nombre de passagers signalés, ni l'identifiant interne du vol. Le résultat du pré-contrôle reste dans l'espace DPAF.

Les messages API et PNR d'un même vol sont **fusionnés** (rapprochement par numéro de document, à défaut par nom).

### Délais de transmission

| Donnée | Délai attendu | Contrôle appliqué par WawID |
| --- | --- | --- |
| PNR | H-48 puis H-24 avant le départ (mises à jour possibles jusqu'à la fermeture du vol) | Reçu au plus tard 24 h avant l'heure prévue du vol |
| API (PAXLST) | À la clôture de l'enregistrement, au plus tard à la fermeture des portes | Reçu au plus tard à l'heure de départ (`DTM+189`) |

Un vol dont un message arrive hors délai est marqué « transmission tardive » dans le suivi de conformité des transporteurs (objectif de ponctualité : ≥ 95 % des vols).

### Essai avec curl

```bash
curl -X POST https://wawid-waw-telecom.netlify.app/api/carrier/messages \
  -H "X-Carrier-Key: <CLE_TRANSPORTEUR>" \
  -H "Content-Type: text/plain" \
  --data-binary @paxlst.edi
```

## Plateforme des compagnies : routes de session

Ces routes servent la *Plateforme des compagnies aériennes* (`/compagnies/`). Elles exigent la session d'un compte du rôle **Compagnie aérienne**, ouverte par `POST /api/session` avec `{ "username": "…", "password": "…", "platform": "compagnies" }`, et ne portent que sur la compagnie du compte (son code IATA). Tout autre compte reçoit `403`. Pour l'intégration de système à système, utilisez la passerelle `POST /api/carrier/messages`.

| Route | Rôle | Réponse |
| --- | --- | --- |
| `GET /api/compagnie/overview` | Vue d'ensemble de la compagnie | `carrier` (code, nom), `flights` (200 derniers vols : trajet, horaire, sens, sources, passagers, complétude, ponctualité), `messages` (300 derniers accusés), `invoices` (factures de redevance et paiements), `redevance` (`rateUSD`, `penaltyRate`, `circuit`, `beneficiary`) |
| `GET /api/compagnie/flights/:id` | Détail d'un vol de la compagnie | Vol et liste des passagers (`surname`, `given`, `docNo`, `nat`, `seat`, `missing` : champs manquants parmi `docNo`, `dob`, `nat`) ; `404` pour le vol d'une autre compagnie |
| `POST /api/compagnie/messages` | Transmission d'un message PAXLST ou PNR | Même corps et même accusé que la passerelle (`202`, `422`) |
| `GET /api/compagnie/samples` | Messages d'exemple | `{ "PAXLST": "…", "PNR": "…" }` adaptés au code de la compagnie |
| `POST /api/compagnie/payments` | Déclaration d'un paiement de redevance | Corps `{ "invoiceId": "RS-…", "amount": 1000000, "ref": "VIR-…", "method": "Virement" }` (`method` : `Virement`, `SWIFT`, `Mobile money` ou `Chèque`) ; renvoie la facture avec le paiement au statut `DECLARE` ; `400` si le montant est invalide ou la référence absente, `404` si la facture n'est pas celle de la compagnie |

Aucune de ces réponses ne contient de résultat de pré-contrôle (score, facteurs, passagers signalés). Un paiement déclaré reste au statut `DECLARE` jusqu'à sa validation (`CONFIRME`) ou son rejet (`REJETE`, avec un motif `reason`) par le service financier ; seuls les paiements `CONFIRME` soldent la facture.

## Équipements eGate et kiosques ABC

Les équipements s'authentifient par l'en-tête `X-Gate-Key: <CLE_EGATE>`. Une clé invalide renvoie `401` (`Clé d'équipement invalide`).

### GET /api/gate/list

```http
GET /api/gate/list
X-Gate-Key: <CLE_EGATE>
```

```json
[
  {
    "id": "EG-AIBD-A01", "name": "eGate Arrivées 1", "posteId": "AIBD", "zone": "Arrivées", "type": "eGate",
    "status": "EN_SERVICE", "mode": "AUTO",
    "config": { "faceThreshold": 0.82, "livenessRequired": true, "minAge": 18, "eligibility": "TOUS",
                "eligibleNats": "", "maxRisk": 29, "requireVisaCheck": true, "maxSessionSec": 45 }
  }
]
```

`status` : `EN_SERVICE`, `HORS_SERVICE`, `MAINTENANCE` (ou `ALARME` signalé par la supervision). `mode` : `AUTO`, `MANUEL`, `FERME`. `eligibility` : `TOUS`, `CEDEAO`, `LISTE` (avec `eligibleNats`).

### POST /api/gate/transaction

Soumet un passage à la décision de la porte.

```json
{
  "gateId": "EG-AIBD-A01",
  "mrz": "P<FRAMARTIN<<CLAIRE<<<<<<<<<<<<<<<<<<<<<<<<<\n21CX883416FRA7812248F3105308<<<<<<<<<<<<<<08",
  "chip": { "read": true, "dg1": "…", "passiveAuth": true, "protocol": "PACE", "source": "Lecteur eGate" },
  "faceScore": 0.91,
  "liveness": true,
  "attack": null,
  "flight": "HC 404",
  "durationSec": 14
}
```

| Champ | Description |
| --- | --- |
| `gateId` | Identifiant de la porte (obligatoire, `404` si inconnu) |
| `mrz` | MRZ lue optiquement (2 ou 3 lignes) |
| `chip` | Résultat de lecture NFC : `read` (`false` si la puce n'a pas été lue), `dg1` (MRZ stockée dans la puce), `passiveAuth`, `protocol` (`PACE`/`BAC`), `source` |
| `faceScore` | Score de correspondance faciale de 0 à 1 (calculé sur l'équipement) |
| `liveness` | Résultat de la détection du vivant |
| `attack` | Attaque de présentation détectée : `masque`, `ecran`, `impression`, `deepfake` |
| `irisScore` | Score iris facultatif |
| `flight`, `durationSec` | Vol (facultatif) et durée de la transaction |

Le sens (entrée ou sortie) est déduit de la zone de la porte. WawID recalcule la concordance entre DG1 et la MRZ imprimée.

Réponses (`200`) :

```json
{
  "outcome": "OUVERTURE", "code": "OK", "message": "Bon voyage ! Les portes s'ouvrent.",
  "crossingId": "PX-MH3KA1B2", "traveler": { "surname": "MARTIN", "given": "CLAIRE" }, "visa": null
}
```

| `outcome` | Signification |
| --- | --- |
| `OUVERTURE` | Les portes s'ouvrent (`code: "OK"`) |
| `ORIENTATION` | Le voyageur est orienté vers un guichet ; `code` indique le motif |
| `INDISPONIBLE` | Porte hors service ou pas en mode `AUTO` |

Codes d'orientation : `ILLISIBLE`, `MRZ`, `AGE`, `ELIGIBILITE`, `BIOMETRIE`, `LIVENESS`, `PUCE`, `FRAUDE`, `FACE`, `EXPIRE`, `VISA`, `RISQUE`. Le champ `message` est le texte à afficher au voyageur. Chaque transaction lisible est enregistrée comme passage et peut générer une alerte.

## Contrat des connecteurs externes

WawID peut interroger en temps réel des fichiers externes (Interpol, WAPIS, fichier des personnes recherchées…). Sans configuration, la copie synchronisée locale est utilisée (« Simulé »).

### Requête envoyée par WawID

```http
POST <WAWID_CONNECTOR_<ID>_URL>
Content-Type: application/json
Authorization: Bearer <WAWID_CONNECTOR_<ID>_TOKEN>
```

```json
{ "surname": "MARTIN", "given": "CLAIRE", "dob": "1978-12-24", "nat": "FRA", "docNo": "21CX88341", "issuer": "FRA" }
```

### Réponse attendue

```json
{
  "hits": [
    { "list": "Interpol SLTD", "severity": "critique", "reason": "Document déclaré volé", "reference": "SLTD-2026-0001", "kind": "document" }
  ]
}
```

| Champ | Valeurs |
| --- | --- |
| `kind` | `document` ou `person` (par défaut) |
| `severity` | `critique`, `haute` (par défaut), `moyenne`, `basse` |
| `surname`, `given`, `dob`, `docNo` | Facultatifs ; à défaut, les valeurs de la requête |

Contraintes : réponse HTTP 2xx en moins de **2,5 s** (sinon le connecteur est signalé indisponible et le contrôle se poursuit) ; le test de connexion envoie `{ "ping": true }` avec un délai de 4 s.

### Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `WAWID_CONNECTOR_<ID>_URL` | URL du service ; sa présence fait passer le connecteur en « Connecté » |
| `WAWID_CONNECTOR_<ID>_TOKEN` | Jeton envoyé en `Authorization: Bearer` (facultatif) |

`<ID>` reprend l'identifiant du connecteur sans le préfixe `CN-` : `INTERPOL_SLTD`, `INTERPOL_NOM`, `WAPIS`, `FPR`, `JUD`, `ETATCIVIL`, `PAXLST`.

## Limites

| Limite | Valeur |
| --- | --- |
| Corps JSON (toutes routes sauf transporteurs) | 1 000 000 caractères (`413` au-delà) |
| Message transporteur | 2 Mo (`413` au-delà) |
| Champs texte | Tronqués à leur longueur maximale (ex. 1 000 caractères pour une réponse) |
| Délai connecteur externe | 2,5 s |
| Consultation e-Visa infructueuse | Réponse `404` volontairement retardée |

Le démonstrateur n'applique pas de quota de requêtes par client. En production, un pare-feu applicatif (WAF) avec limitation de débit doit protéger les routes publiques et la passerelle transporteurs.
