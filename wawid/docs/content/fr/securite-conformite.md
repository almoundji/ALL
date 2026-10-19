# Sécurité, données personnelles et conformité

Cette page décrit le modèle de sécurité de WawID tel qu'il est implémenté dans le démonstrateur, le traitement des données personnelles au regard de la loi sénégalaise, et les limites connues. Elle s'adresse aux responsables sécurité, au délégué à la protection des données et aux équipes d'exploitation.

## Principes

- **Moindre privilège** : chaque rôle ne dispose que des permissions nécessaires ; les droits sont vérifiés **côté serveur** à chaque appel.
- **Traçabilité** : toute action sensible est inscrite dans un journal d'audit chaîné.
- **Minimisation** : les images biométriques ne quittent pas le poste ; seuls des scores et des indicateurs sont transmis.
- **Séparation des canaux** : voyageurs (sans compte), agents (session), équipements et compagnies (clés distinctes).
- **Plateformes dissociées** : espace DPAF (`/dpaf/`), plateforme voyageurs (`/`, `/aide/`), applications mobiles (`/app/`) et plateforme des compagnies aériennes (`/compagnies/`). Un compte n'ouvre que la plateforme de son rôle, et aucune plateforme publique ne renvoie vers l'espace DPAF.

## Rôles et permissions

| Rôle | Permissions |
| --- | --- |
| Agent de contrôle | `read`, `control`, `alerts`, `cases` |
| Analyste renseignement | `read`, `alerts`, `cases`, `watchlist`, `rules`, `apis`, `evisa` |
| Superviseur | `read`, `control`, `alerts`, `cases`, `watchlist`, `rules`, `apis`, `evisa`, `gates` |
| Agent du Trésor | `read`, `finance` |
| Administrateur | Toutes les permissions de l'espace DPAF, dont `users`, `system` et `finance` |
| Compagnie aérienne | `carrier` uniquement (plateforme des compagnies, limitée à la compagnie du compte) |

| Permission | Autorise |
| --- | --- |
| `read` | Consulter les données de l'espace DPAF, vérifier un QR code, lire le journal d'audit |
| `control` | Évaluer un voyageur et enregistrer une décision de passage |
| `alerts`, `cases` | Traiter les alertes, ouvrir et mettre à jour les dossiers |
| `watchlist`, `rules` | Gérer les listes de surveillance, les règles de ciblage, tester les connecteurs |
| `apis` | Charger des manifestes et des messages API/PNR |
| `evisa` | Instruire les demandes d'e-Visa |
| `gates` | Commander et paramétrer les eGates |
| `finance` | Redevance de sécurité (assiette, encaissements, validation des paiements déclarés par les compagnies, reversements à l'État) |
| `carrier` | Plateforme des compagnies : vols, messages, factures et déclaration de paiements de **sa** compagnie (code IATA du compte) |
| `users`, `system` | Gérer les comptes ; paramètres, connecteurs, réinitialisation |

Une requête sans session valide reçoit `401` ; une session dont le rôle n'a pas la permission reçoit `403`. Un administrateur ne peut ni désactiver ni rétrograder son propre compte.

La connexion précise la plateforme demandée : un compte **Compagnie aérienne** est refusé (`403`) sur l'espace DPAF et un compte de la DPAF sur la plateforme des compagnies ; le refus est journalisé (`ECHEC_CONNEXION`). Un compte compagnie ne voit que les données de sa compagnie, jamais les résultats du pré-contrôle, et n'a pas accès aux pages internes de la documentation (réservées aux sessions de l'espace DPAF).

## Authentification des agents

### Sessions

- Cookie `wawid_session` contenant l'identifiant de l'utilisateur, une date d'expiration et une **signature HMAC-SHA256** calculée avec `SESSION_SECRET`.
- Attributs : `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, durée **12 heures** (une vacation).
- À chaque requête, la signature est vérifiée en temps constant, l'expiration contrôlée et le compte doit être **actif** : désactiver un compte coupe immédiatement ses sessions.
- La déconnexion efface le cookie et est journalisée.
- Sur Netlify, l'absence de `SESSION_SECRET` bloque l'API (aucun secret par défaut).

### Mots de passe

- Hachage **scrypt** avec un sel aléatoire de 16 octets par compte ; comparaison en temps constant.
- Longueur minimale de **10 caractères** pour les comptes créés ou modifiés depuis l'espace DPAF.
- Échec de connexion : réponse retardée (environ 0,7 s), message générique et entrée `ECHEC_CONNEXION` dans l'audit.
- Les comptes initiaux sont créés à partir de `WAWID_ADMIN_PASSWORD` (et `WAWID_DEMO_PASSWORD` si défini) uniquement lorsqu'aucun compte n'existe.

## Clés d'équipements et de transporteurs

| Canal | En-tête | Configuration | Contrôles |
| --- | --- | --- | --- |
| eGates et kiosques | `X-Gate-Key` | `WAWID_GATE_KEY` (clé partagée) | Comparaison en temps constant ; aucune clé par défaut sur Netlify |
| Compagnies aériennes | `X-Carrier-Key` | `WAWID_CARRIER_KEYS` (`CODE:clé`, une par compagnie) | La clé identifie la compagnie ; un message portant sur le vol d'une autre compagnie est rejeté |

Les clés doivent être longues, aléatoires, transmises par un canal sûr et renouvelées périodiquement ou après tout incident. Elles ne figurent jamais dans le code ni dans la documentation.

## QR codes signés

Les e-Visa approuvés et les reçus WawPass sont présentés sous forme de QR code contenant un jeton `TYPE.REFERENCE.SIGNATURE` (`EV` ou `WP`), signé par HMAC-SHA256 avec `SESSION_SECRET` (signature tronquée à 16 caractères).

- La vérification est réservée aux agents connectés (permission `read`).
- Un jeton modifié est rejeté (« QR code invalide ou falsifié »).
- Pour un e-Visa, le statut et la date de validité sont revérifiés **en temps réel** : un e-Visa révoqué ou expiré est refusé même si la signature est correcte.
- Un WawPass n'est accepté **qu'une seule fois** ; toute validation est journalisée.

## Journal d'audit chaîné

Chaque entrée comporte un numéro de séquence, un horodatage, l'acteur, l'action, l'objet, des détails, l'empreinte de l'entrée précédente et sa propre empreinte **SHA-256**.

- Toute modification d'une entrée, suppression ou insertion rompt la chaîne.
- Le back-office (**Administration → Journal d'audit**) recalcule la chaîne et indique « Chaîne intègre » ou le numéro de l'entrée en défaut.
- Le journal n'est jamais tronqué automatiquement ; son archivage (export signé) relève de l'exploitation.
- Actions tracées : connexions et échecs, décisions de passage, transactions eGate, dépôts et décisions e-Visa, paiements et validations WawPass, pré-enrôlements, messages API/PNR, modifications de listes, règles, utilisateurs, paramètres, connecteurs, commandes d'eGate, encaissements, réinitialisation.

Limite : une personne disposant d'un accès en écriture au stockage pourrait recalculer toute la chaîne. En production, la tête de chaîne doit être **ancrée périodiquement** par une signature HSM.

## Validation des entrées

- Corps JSON limités à 1 000 000 caractères (2 Mo pour les messages transporteurs) ; JSON invalide rejeté en `400`.
- Chaque champ texte est nettoyé et tronqué à une longueur maximale ; les valeurs énumérées (statuts, rôles, décisions, sévérités) sont filtrées sur une liste blanche ; les paramètres numériques sont bornés.
- La MRZ est vérifiée (chiffres de contrôle ICAO 9303). La concordance entre la puce (DG1) et la MRZ imprimée est **recalculée côté serveur**, sans faire confiance au terminal.
- Les résultats eKYC transmis par le client sont normalisés en types stricts (booléens, scores entre 0 et 1).
- Une décision de passage différente de la recommandation exige un motif.
- Les erreurs internes renvoient un message générique (« Erreur serveur ») sans détail technique.
- La consultation publique d'une demande exige la référence **et** le numéro de passeport ; un échec est retardé pour freiner l'énumération.

### En-têtes HTTP

`Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy` (caméra limitée au site, micro et géolocalisation désactivés), `Cache-Control: no-store` sur l'API, `noindex` sur l'espace DPAF, la plateforme des compagnies et le kiosque.

## Pont NFC local

- Écoute uniquement sur la boucle locale `127.0.0.1` : il n'est pas joignable depuis le réseau.
- CORS restreint aux origines listées dans `NFC_BRIDGE_ORIGIN` ; toute autre origine reçoit `403`. L'en-tête Private Network Access est géré.
- Les données lues ne quittent le poste que via l'application WawID.

## Minimisation des données

| Source | Ce qui est transmis au serveur | Ce qui reste local |
| --- | --- | --- |
| eGate / kiosque | MRZ, résultat de lecture de la puce (DG1, authentification passive, protocole), score facial, détection du vivant, type d'attaque détectée | Images du visage, flux caméra, photo de la puce |
| Guichet | MRZ, résultats de puce, scores visage et iris, nombre d'empreintes capturées | Images et gabarits biométriques |
| App iPhone | MRZ de la puce, résultat de l'authentification passive, protocole | Photo de la puce (DG2) |
| e-Visa (eKYC) | Indicateurs de qualité, d'authenticité et scores | Photos du document et selfie |
| Passerelle et plateforme des compagnies | Accusé de réception : référence, vol, passagers, complétude, ponctualité, erreurs | Aucun résultat de ciblage n'est renvoyé à la compagnie (ni nombre de passagers signalés, ni score, ni identifiant interne du vol) |

## Données personnelles : loi n° 2008-12

WawID traite des données d'identité, de voyage, de santé déclarative et biométriques. Ces traitements relèvent de la **loi n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel**, sous le contrôle de la **Commission de protection des données personnelles (CDP)**.

| Exigence | Mise en œuvre dans WawID |
| --- | --- |
| Finalité déterminée | Instruction des autorisations de voyage, contrôle aux frontières, sûreté aérienne |
| Information et consentement | Case de consentement obligatoire pour l'e-Visa et le pré-enrôlement biométrique ; mention de la loi sur le portail |
| Minimisation | Voir ci-dessus ; la consultation publique ne renvoie qu'un sous-ensemble des données |
| Sécurité | Contrôle d'accès par rôle, chiffrement en transit, audit chaîné |
| Durée de conservation | Paramètre `retentionDays` (1 825 jours, soit 5 ans, par défaut) |
| Formalités | Les traitements biométriques et de sécurité publique nécessitent les formalités préalables auprès de la CDP avant la mise en production |
| Droits des personnes | Procédure d'accès et de rectification à définir par l'administration (point de contact, délais) |
| Transferts | Les données ne doivent pas quitter le territoire sans base légale ; voir l'hébergement ci-dessous |

### Durée de conservation

La durée est affichée dans **Administration → Paramètres** (« Conservation »). Dans le démonstrateur, **aucune purge automatique n'est encore appliquée** : les collections sont seulement plafonnées en nombre (20 000 passages, 300 vols, 2 000 messages transporteurs). Une tâche de purge et d'archivage conforme à la durée fixée doit être implémentée avant la production.

## Hébergement et souveraineté (production)

Le démonstrateur est hébergé sur Netlify (hors du territoire). Pour une exploitation réelle :

- hébergement dans un **centre de données national** (par exemple Diamniadio) et site de secours **sur le territoire** ;
- **aucune donnée biométrique hors du pays** ;
- seuls le portail public, la plateforme des compagnies et la passerelle transporteurs exposés, en DMZ derrière un CDN/WAF anti-DDoS ;
- clés et signatures dans un **HSM** ; sauvegardes chiffrées hors ligne ;
- identité des agents par **OIDC, MFA et cartes agents PKI** ;
- supervision **SIEM/SOC**, tests d'intrusion avant mise en service, tests de bascule semestriels.

## Limites connues du démonstrateur

Ces limites sont assumées : le démonstrateur valide les parcours, pas une exploitation nationale.

| Limite | Conséquence | Réponse cible |
| --- | --- | --- |
| Stockage Netlify Blobs : une collection = un document JSON réécrit à chaque écriture | Deux écritures simultanées peuvent perdre une donnée (dernier écrivain gagnant) | PostgreSQL transactionnel + Kafka |
| Biométrie simulée | Les scores faciaux, iris et la détection du vivant ne proviennent pas d'un SDK certifié | ABIS certifié, ISO/IEC 30107-3 |
| Lecture de puce simulée sans pont ni lecteur | Une lecture simulée est signalée comme telle | Lecteurs RFID, ICAO PKD |
| Résultats eKYC et de puce fournis par le client | Un client malveillant pourrait transmettre de faux indicateurs | Vérification côté serveur par le fournisseur eKYC |
| Paiements fictifs | Aucun encaissement réel | Intégration des opérateurs de paiement |
| Mot de passe seul, sans MFA ni verrouillage de compte | Exposition au vol d'identifiants | OIDC + MFA + PKI |
| Pas de limitation de débit | Exposition aux abus sur les routes publiques | WAF avec limitation de débit |
| Clé eGate unique partagée | Une fuite concerne tous les équipements | Certificats par équipement (mTLS) |
| `SESSION_SECRET` sert aux sessions et aux QR codes | Sa rotation invalide aussi les QR émis | Clés séparées gérées en HSM |
| Pas de purge automatique | La durée de conservation n'est pas encore appliquée | Tâche de purge et d'archivage |
| Hébergement hors du territoire | Non conforme pour des données réelles | Centre de données national |

Toutes les données de démonstration sont **fictives**. Aucune donnée personnelle réelle ne doit être saisie dans le démonstrateur.
