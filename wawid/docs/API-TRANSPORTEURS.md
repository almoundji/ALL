# WawID — Spécification de la passerelle API / PNR pour les compagnies aériennes

Document destiné aux transporteurs desservant le Sénégal. Il décrit la transmission des données
**API** (Advance Passenger Information) et **PNR** (Passenger Name Record) à l'Unité d'information passagers.
Bases : OACI annexe 9 (normes 9.5 à 9.38), lignes directrices OMD/IATA/OACI sur l'API et le PNR.

## 1. Raccordement

| Élément | Valeur |
| --- | --- |
| Point d'accès | `POST https://<domaine WawID>/api/carrier/messages` |
| Transport | HTTPS (TLS 1.2+) uniquement |
| Authentification | En-tête `X-Carrier-Key: <clé>` — une clé par compagnie, remise par l'administration |
| Corps | Message brut (`Content-Type: text/plain` ou `application/edifact`) ou JSON `{ "format": "PAXLST" \| "PNR", "message": "…" }` |
| Taille maximale | 2 Mo par message |

La clé est liée au code IATA de la compagnie : un message portant sur un vol d'une autre compagnie est rejeté.

## 2. Formats acceptés

### API — UN/EDIFACT PAXLST (D02B, profil IATA/OMD)
Segments exploités : `UNH` (PAXLST), `BGM` (745 passagers / 250 équipage), `TDT` (vol), `LOC+125/87` et
`DTM+189/232` (départ / arrivée), `NAD+FL/FM` (nom, prénoms), `ATT+2` (sexe), `DTM+329` (naissance),
`NAT+2` (nationalité), `RFF+AVF` (localisateur PNR), `RFF+SEA` (siège), `DOC` (type et numéro),
`DTM+36` (expiration), `LOC+91` (pays émetteur), `LOC+178/179` (embarquement / débarquement).
Les séparateurs `UNA` et le caractère d'échappement `?` sont pris en charge.

### PNR — texte IATA
Un ou plusieurs PNR séparés par une ligne `END`. Éléments exploités :
```
RLOC ABC123                    localisateur
BKD 18OCT26                    date de réservation
FP CASH | FP CC                moyen de paiement
1.MARTIN/PAUL MR               passagers
HC 404 Y 25OCT CDGDSS          segments (itinéraire complet)
SSR DOCS HC HK1 P/FRA/19AB12345/FRA/01JAN80/M/01JAN32/MARTIN/PAUL/P1
SSR CTCE HC HK1 PAUL//MARTIN.FR/P1        e-mail (// = @)
SSR CTCM HC HK1 33612345678/P1            téléphone
```
Les messages PNRGOV (EDIFACT) sont acceptés après conversion par le service d'intégration de l'Unité.

## 3. Calendrier de transmission

| Donnée | Moment |
| --- | --- |
| PNR | H-48 puis H-24 avant le départ prévu (mise à jour possible jusqu'à la fermeture du vol) |
| API (PAXLST) | à la clôture de l'enregistrement, au plus tard à la fermeture des portes ; correctif après décollage si besoin |

Un vol dont les données arrivent hors délai est marqué « transmission tardive » dans le suivi de conformité.

## 4. Réponses

| Code | Signification | Corps |
| --- | --- | --- |
| 202 | Accepté (éventuellement avec avertissements) | `{ status, reference, flightId, flight, passengers, flagged, completeness, onTime, errors[] }` |
| 422 | Rejeté (format inconnu, vol absent, aucun passager, vol d'une autre compagnie) | `{ status: "REJETÉ", reference, errors[] }` |
| 401 | Clé transporteur invalide | — |
| 413 | Message trop volumineux | — |

La référence (`MSG-…`) identifie le message dans le journal de l'Unité ; la conserver pour tout échange.
Les messages API et PNR d'un même vol sont **fusionnés** (rapprochement par n° de document ou par nom).

## 5. Traitement côté État (pour information)
Chaque passager est confronté aux listes de surveillance (Interpol, fichiers nationaux, personnes d'intérêt,
listes noires de coordonnées), aux règles de ciblage, aux autorisations de voyage (e-Visa) et aux indicateurs
de réservation (paiement en espèces, aller simple, réservation de dernière minute, coordonnées partagées entre
passagers sans lien). Les correspondances produisent une alerte pour les agents ; aucun résultat n'est renvoyé
au transporteur, conformément aux règles de confidentialité.

## 6. Qualité des données exigée
Pour chaque passager : nom, prénoms, date de naissance, sexe, nationalité, type, numéro, pays émetteur et date
d'expiration du document. Objectif de complétude : ≥ 98 % ; ponctualité : ≥ 95 % des vols.

## 7. Essai
```bash
curl -X POST https://<domaine WawID>/api/carrier/messages \
  -H "X-Carrier-Key: <clé>" -H "Content-Type: text/plain" --data-binary @paxlst.edi
```
Des messages d'exemple sont disponibles dans le back-office (APIS & PNR → « Recevoir un message »).
