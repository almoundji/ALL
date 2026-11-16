# Guide de l'administrateur

Console : **`/admin`**. Elle suit les principes **SAP Fiori** : page d'accueil en tuiles, rapports en liste filtrables, pages objet, actions en pied de page.

## Comptes et rôles

| Rôle | Périmètre | Droits |
| --- | --- | --- |
| **Administrateur** | National | Tout : validation, marchés, décisions du Fonds, actualités, utilisateurs, journal, réinitialisation |
| **Agent de Chambre de métiers** | Sa région (ou national si aucune région) | Enrôlement au guichet, modification et validation/rejet des dossiers, mise à jour des sites de sa région ; lecture des marchés et du Fonds |
| **Lecteur** | National | Consultation seule (tableaux de bord, listes, fiches) |

Comptes de démonstration : `admin / admin123`, `cm.thies / agent123` (région de Thiès), `lecteur / lecteur123`. **En production, changer ces mots de passe** (voir *Architecture*).

## Page d'accueil (launchpad)

Salutation, date, périmètre, puis une **section de tuiles par prescription** :

- **P1** : dossiers à valider (orange s'il y en a), artisans recensés, part des femmes, unités informelles, emplois, tuiles d'action *Enrôler au guichet* et *Exporter le registre (CSV)*.
- **P2** : marchés ouverts, candidatures, *Publier un marché*.
- **P3** : ressources, demandes à instruire, apports solidaires, financements accordés.
- **P4** : villages non régularisés (rouge), sites dégradés, avancement moyen.

Chaque tuile ouvre la liste pré-filtrée. La section **Aperçu** présente les inscriptions par jour, la répartition par région, par filière, les besoins exprimés, le statut foncier et les dernières opérations.

La recherche de la barre shell (nom, numéro, téléphone, CNI) ouvre la liste des artisans filtrée.

## Artisans (P1)

**Liste** : barre de filtres (recherche, statut, région, filière, canal, statut juridique) puis bouton *Lancer* ; tri par clic sur les en-têtes ; pagination par 50 ; export CSV des résultats filtrés (séparateur `;`, UTF-8, lisible dans Excel).

**Validation groupée** : cocher les dossiers *En attente* puis *Valider la sélection*.

**Fiche artisan** : en-tête (statut, région, expérience, emplois, apports), sections *Identité*, *Activité*, *Candidatures*, *Financements*, *Historique* (journal propre au dossier). Un bandeau signale un **doublon potentiel** (même nom, prénom et date de naissance). Barre d'actions : *Valider*, *Rejeter* (motif obligatoire), *Remettre en attente*, *Modifier*.

**Enrôlement au guichet** : même formulaire que le portail, pour les artisans qui se présentent à la Chambre de métiers ; le canal est enregistré comme « Guichet Chambre de métiers ».

## Commande publique (P2)

- *Publier un marché* : intitulé, acheteur (APDA, Mobilier national, ministères, collectivité), filière, zone (une région ou toutes), montant, date limite, nombre d'artisans visés, description.
- Fiche marché : candidatures avec offre, délai et note ; boutons *Retenir* / *Écarter* ; *Clore les candidatures*, *Marquer attribué*, *Modifier*.

## Fonds spécial (P3)

- Tuiles : ressources, engagé, décaissé, disponible ; répartition par origine.
- *Enregistrer une ressource* : dotation de l'État, initiatives existantes, partenaire.
- *Décider* sur une demande : mettre en instruction, **accorder** (montant ≤ montant demandé et ≤ disponible du Fonds), **rejeter** (motif obligatoire), puis **décaisser** une demande accordée.

## Infrastructures (P4)

Tableau des Chambres de métiers et villages artisanaux, filtrable par type, statut foncier et état. Un clic ouvre la mise à jour : statut et référence fonciers, état, projet, budget, avancement, échéance, observations.

Statuts fonciers : *Titre foncier au nom de l'État*, *Bail emphytéotique* (sécurisés, en vert), *Délibération communale*, *Régularisation en cours* (orange), *Non régularisé* (rouge, prioritaire).

## Actualités

Rédiger, modifier, publier/dépublier ou supprimer un article (titre, catégorie, date, illustration, chapeau, contenu en paragraphes). Les articles publiés apparaissent sur la page d'accueil du portail.

## Administration

- **Utilisateurs** : créer un compte (identifiant, nom, rôle, périmètre régional, mot de passe d'au moins 8 caractères), modifier le rôle, le périmètre, le mot de passe, désactiver.
- **Journal d'audit** : connexions (et échecs), consultations de fiches, validations, rejets, exports, décisions, modifications — avec l'auteur et l'horodatage.
- **Réinitialiser la démonstration** : recharge le jeu de données fictif (irréversible).
