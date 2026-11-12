# Jotna — suivi des mensualités sur PI-SPI

**Jotna** (wolof *jot na* : « c'est l'heure ») est un outil de recouvrement récurrent pour les
écoles privées, les bailleurs et les salles de sport. Les parents ou locataires paient comme ils
veulent (Wave, Orange Money, banque, espèces) vers l'alias PI-SPI de l'établissement ; Jotna
pointe les paiements, relance les retardataires et produit les reçus. L'argent ne transite jamais
par l'outil : il va directement sur le compte du client, ce qui permet de démarrer sans agrément.

> Toutes les données du prototype sont fictives (familles, montants, numéros, références).

## Ce que fait le prototype

| Écran | Rôle |
| --- | --- |
| **Accueil** | Tuiles KPI du mois (taux de recouvrement, encaissé, retards, partiels, lignes à rapprocher, relances) et tuiles d'applications. |
| **Payeurs** | Rapport de liste : barre de filtres (recherche, classe, statut, canal), tableau avec statuts sémantiques, sélection multiple et barre d'actions (relancer, demander le paiement). |
| **Fiche payeur** | Page objet : en-tête avec facettes (mensualité, statut, solde dû, alias), ancres Échéances / Paiements / Relances / Coordonnées, actions Relancer, Demander le paiement, Marquer payé. |
| **Rapprochement** | Lignes reçues par l'API PI-SPI de la banque ou par relevé importé (CSV). Les lignes dont l'alias est reconnu sont associées automatiquement ; les autres (montant partiel, émetteur inconnu, doublon, fratrie) sont présentées avec un motif et un payeur proposé. |
| **Relances** | Liste de travail : un message WhatsApp pré-rempli par famille en retard (prénom, élève, montant, alias), à copier ou envoyer, modèle modifiable. |
| **Demande de paiement** | Boîte de dialogue : envoi d'une demande PI-SPI à une ou plusieurs familles, avec libellé et référence pour le rapprochement automatique. |

Les envois (WhatsApp, demandes de paiement, reçus) sont simulés et le signalent.

## Interface

Inspirée de **SAP Fiori 3** (thème Quartz), comme les autres outils du dépôt :

- barre de shell sombre, lanceur en tuiles de 11 rem avec indicateur KPI et couleur sémantique ;
- floorplans *List Report* (barre de filtres + tableau + barre de pied de page), *Object Page*
  (en-tête, facettes, barre d'ancres, sections) et *Worklist* (cartes) ;
- statuts d'objet (point coloré) et pilules, boîtes de dialogue et *message toast* ;
- couleurs Fiori : bleu `#0a6ed1`, positif `#107e3e`, critique `#e9730c`, négatif `#bb0000`,
  fond `#f7f7f7` ; thème sombre dérivé ; police « 72 » avec repli sur Inter.

## Lancer

Fichier unique, sans dépendance ni build : ouvrir `index.html` dans un navigateur, ou déployer le
dossier sur Netlify (`netlify.toml` fourni). Les vues sont adressables par ancre :
`#accueil`, `#payeurs`, `#payeur`, `#rapprochement`, `#relances`.

## Prochaines étapes

1. Remplacer les données d'exemple par une base (payeurs, échéances, paiements, relances).
2. Brancher le rapprochement sur une **API Business PI-SPI** d'une banque partenaire
   (24 interfaces homologuées par la BCEAO le 16 septembre 2026) et, en attendant, sur les
   webhooks Wave Business.
3. Envoi réel des relances via l'API WhatsApp Business et génération des reçus PDF.
4. Multi-établissements, rôles (gestionnaire, direction, comptable) et abonnement mensuel.
