# Jotna — suivi des mensualités, loyers et cotisations sur PI-SPI

**Jotna** (wolof *jot na* : « c'est l'heure ») est un outil de recouvrement récurrent pour les
écoles privées, les bailleurs et les salles de sport. Les parents ou locataires paient comme ils
veulent (Wave, Orange Money, banque, espèces) vers l'alias PI-SPI de l'établissement ; Jotna
pointe les paiements, relance les retardataires et produit les reçus. L'argent ne transite jamais
par l'outil : il va directement sur le compte du client, ce qui permet de démarrer sans agrément.

> Toutes les données du prototype sont fictives (familles, montants, numéros, références).

## Ce que fait l'application

| Écran | Rôle |
| --- | --- |
| **Accueil** | Tuiles KPI du mois (taux de recouvrement, encaissé, retards, partiels, lignes à rapprocher, relances) et tuiles d'applications. |
| **Payeurs** | Rapport de liste : barre de filtres (recherche, classe, statut, canal), tableau avec statuts sémantiques, sélection multiple et barre d'actions (relancer, demander le paiement). |
| **Fiche payeur** | Page objet : en-tête avec facettes (mensualité, statut, solde dû, alias), ancres Échéances / Paiements / Relances / Coordonnées, actions Relancer, Demander le paiement, Marquer payé. |
| **Rapprochement** | Lignes reçues par l'API PI-SPI de la banque ou par relevé importé (CSV). Les lignes dont l'alias est reconnu sont associées automatiquement ; les autres (montant partiel, émetteur inconnu, doublon, fratrie) sont présentées avec un motif et un payeur proposé. |
| **Relances** | Liste de travail : un message WhatsApp pré-rempli par famille en retard (prénom, élève, montant, alias), à copier ou envoyer, modèle modifiable. |
| **Demande de paiement** | Boîte de dialogue : envoi d'une demande PI-SPI à une ou plusieurs familles, avec libellé et référence pour le rapprochement automatique. |

Les envois (WhatsApp, demandes de paiement, reçus) sont simulés et le signalent.

**Téléphone et alias PI-SPI sont deux champs distincts.** Le téléphone sert au contact (relances WhatsApp).
L'alias PI-SPI est l'identifiant de paiement que le payeur a choisi auprès de sa banque ou de son opérateur ; il est
facultatif. Le rapprochement se fait d'abord par l'alias ou la référence élève dans le libellé, puis par le numéro émetteur
pour Wave et Orange Money, et manuellement pour les espèces. L'école a son propre alias (`keur-xaleyi` dans la démo).

## Interface

Inspirée de **SAP Fiori 3** (thème Quartz), comme les autres outils du dépôt :

- barre de shell sombre, lanceur en tuiles de 11 rem avec indicateur KPI et couleur sémantique ;
- floorplans *List Report* (barre de filtres + tableau + barre de pied de page), *Object Page*
  (en-tête, facettes, barre d'ancres, sections) et *Worklist* (cartes) ;
- statuts d'objet (point coloré) et pilules, boîtes de dialogue et *message toast* ;
- couleurs Fiori : bleu `#0a6ed1`, positif `#107e3e`, critique `#e9730c`, négatif `#bb0000`,
  fond `#f7f7f7` ; thème sombre dérivé ; police « 72 » avec repli sur Inter.

## Version en ligne

Déployée sur Netlify : **https://jotna.netlify.app** (interface statique `public/`, API en fonction serverless
`netlify/functions/api.mts`, état par établissement dans Netlify Blobs).

| Compte de démonstration | Mot de passe | Activité |
| --- | --- | --- |
| `demo-ecole@jotna.sn` | `demo2026` | École (30 élèves, échéance le 5) |
| `demo-bailleur@jotna.sn` | `demo2026` | Résidence (12 lots) |

Tout visiteur peut aussi créer son établissement (essai de 30 jours). Les démos se réinitialisent depuis l'accueil.

| Variable d'environnement Netlify | Rôle |
| --- | --- |
| `SESSION_SECRET` | clé de signature du cookie de session (obligatoire en production) |
| `ADMIN_EMAILS` | adresses, séparées par des virgules, qui voient l'écran « Administration Jotna » (établissements, plans) |
| `DEMO_PASSWORD` | mot de passe des comptes de démonstration (défaut `demo2026`) |

Tests de scénario de l'API sans Netlify : `npm test`. Déploiement : `npm run deploy` (Netlify CLI connecté au site `jotna`).

### Limites de cette version

- Netlify Blobs conserve un document JSON par établissement : suffisant pour le pilote, à remplacer par une base
  (Netlify DB ou PostgreSQL) au sprint 1 du planning, avant la montée en charge.
- Les relances s'envoient depuis le WhatsApp du gestionnaire (lien pré-rempli) ; l'API WhatsApp Business viendra avec l'abonnement.
- Les demandes de paiement PI-SPI partent par WhatsApp avec l'alias et la référence ; l'envoi dans l'application bancaire passe par l'API Business de la banque partenaire.
- Le format du contenu QR est indicatif, à aligner sur la spécification du participant PI-SPI.

## Lancer en local

`npm install` puis `npm test` pour l'API. Pour l'interface complète, un serveur qui sert `public/` et route `/api/*`
vers `netlify/functions/api.mts` (voir `netlify dev`, ou un petit serveur Node avec `--experimental-strip-types`).
Le prototype statique d'origine reste dans `docs/prototype-fiori.html`.

## Prochaines étapes

1. Remplacer les données d'exemple par une base (payeurs, échéances, paiements, relances).
2. Brancher le rapprochement sur une **API Business PI-SPI** d'une banque partenaire
   (24 interfaces homologuées par la BCEAO le 16 septembre 2026) et, en attendant, sur les
   webhooks Wave Business.
3. Envoi réel des relances via l'API WhatsApp Business et génération des reçus PDF.
4. Multi-établissements, rôles (gestionnaire, direction, comptable) et abonnement mensuel.

## Planning

- `docs/SCRUM.md` : méthode Scrum, équipe, cadence, backlog, 15 sprints de deux semaines du 16 novembre 2026
  à la rentrée d'octobre 2027, jalons J0 à J5, indicateurs et risques.
- `docs/planning-scrum.html` : la même feuille de route en page visuelle (frise, chantiers, cartes de sprint), style Fiori.
