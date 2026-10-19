# Tableau de bord

Le **Tableau de bord** consolide les flux d'entrées et de sorties, les canaux de passage (guichet ou eGate) et les indicateurs de fraude de tous les postes frontières. Il est accessible à tous les rôles depuis la tuile **Tableau de bord** de l'espace **Contrôle frontière**.

Les chiffres sont calculés à partir des passages enregistrés (contrôles guichet et transactions eGate / ABC). La page se met à jour automatiquement toutes les 30 secondes, sans perdre les filtres choisis.

## Filtres

La barre de filtres se trouve sous le titre de la page.

| Filtre | Valeurs | Effet |
| --- | --- | --- |
| **Période** | **24 heures**, **7 jours** (par défaut), **14 jours** | 24 heures : les 24 dernières heures pleines, découpées par heure. 7 ou 14 jours : les N derniers jours calendaires, aujourd'hui compris, découpés par jour. |
| **Poste** | **Tous les postes** ou un poste (AIBD, Port de Dakar, Rosso, Kidira, Karang, Ziguinchor…) | Limite tous les indicateurs, graphiques et tableaux à ce poste. |
| **Canal** | **Tous**, **Guichet**, **eGate / ABC** | Limite les calculs aux passages de ce canal. |

Les filtres sont inscrits dans l'adresse de la page : vous pouvez l'ajouter aux favoris ou la partager avec un collègue pour retrouver exactement la même vue.

> Astuce : dans le tableau **Par poste frontière**, un clic sur une ligne applique directement le filtre sur ce poste.

## Indicateurs clés

| Indicateur | Calcul | Sous-titre |
| --- | --- | --- |
| **Passages** | Nombre de passages sur la période filtrée. | Évolution en % par rapport à la période précédente de même durée (▲ hausse, ▼ baisse, « stable »). |
| **Entrées** | Passages au sens Entrée. | Part des entrées dans le flux total. |
| **Sorties** | Passages au sens Sortie. | Solde net (entrées moins sorties). |
| **Part eGate / ABC** | Passages par eGate ou kiosque ABC ÷ total des passages. | Nombre de passages automatisés. |
| **Suspicions de fraude** | Passages dont l'évaluation a relevé au moins un facteur de fraude (document perdu ou volé, MRZ invalide, puce invalide ou différente de la MRZ, échec de détection du vivant, correspondance faciale insuffisante, attaque de présentation, document réutilisé…). | Évolution par rapport à la période précédente. Le chiffre s'affiche en rouge s'il est non nul. |
| **Refus d'entrée / sortie** | Passages dont la décision est **Refusé**. | Nombre d'alertes non clôturées (pour le poste filtré, le cas échéant). |
| **Durée moyenne** | Moyenne des durées de passage, en secondes. | Durée moyenne au guichet et à l'eGate. |

La durée d'un passage guichet est mesurée du début de l'assistant de contrôle à la validation de la décision ; celle d'un passage eGate, de la présentation du passeport au résultat.

## Graphiques

### Entrées et sorties par jour (ou par heure)

Histogramme des entrées et des sorties, par heure sur 24 heures ou par jour sur 7 et 14 jours. Survolez une barre pour afficher les valeurs exactes. Le sélecteur **Graphique** / **Tableau** affiche les mêmes données sous forme de tableau (avec en plus la colonne **Fraude**) ; ce choix est conservé pendant la session.

### Décisions et canal de passage

Deux barres de répartition :

- **Décisions** : part des passages **Autorisé**, **Contrôle secondaire** et **Refusé** ;
- **Canal de passage** : part **Guichet** et **eGate / ABC**.

### Suspicions de fraude par jour (ou par heure)

Courbe du nombre de passages suspects, avec le total de la période en en-tête.

### Fraude et signalements par type

Barres horizontales classant les signalements par type, du plus fréquent au moins fréquent : document perdu / volé (SLTD), document réutilisé sous une autre identité, puce invalide (authentification passive), puce différente de la MRZ imprimée, attaque de présentation ou deepfake, personne recherchée ou personne d'intérêt, non-correspondance faciale, échec de détection du vivant, MRZ falsifiée, document expiré, absence d'autorisation de voyage. Un même passage peut compter dans plusieurs types.

### Par poste frontière

Tableau des postes ayant au moins un passage sur la période : **Entrées**, **Sorties**, **eGate**, **Fraude**, **Refus** et **Durée moy.** Le nom de chaque poste est suivi de son type (aérien, maritime, terrestre) et de sa région. Cliquez sur une ligne pour filtrer le tableau de bord sur ce poste.

### Principales nationalités

Les huit nationalités les plus représentées dans les passages de la période.

### Dernières suspicions de fraude

Les huit passages suspects les plus récents : date et heure, voyageur, nationalité et document, facteurs de risque majeurs, poste et canal, score de risque et décision. Cliquez sur une ligne pour ouvrir la fiche du passage, ou sur **Tout voir** pour ouvrir la liste **Passages** filtrée sur les suspicions de fraude de la période.

## Exporter et imprimer

- **Exporter** télécharge un fichier CSV (`wawid-tableau-de-bord-<période>.csv`) reprenant le tableau **Par poste frontière** pour les filtres en cours : poste, entrées, sorties, eGate/ABC, suspicions de fraude, refus et durée moyenne en secondes. Le séparateur est le point-virgule, pour une ouverture directe dans Excel en français.
- **Imprimer** ouvre l'impression du navigateur. La barre de filtres et la barre supérieure sont masquées à l'impression ; choisissez « Enregistrer en PDF » pour obtenir un document à transmettre.

## Questions fréquentes

**Pourquoi le total diffère-t-il de la tuile de l'accueil ?** La tuile **Tableau de bord** compte les passages des 24 dernières heures glissantes, tous postes et canaux confondus, alors que le tableau de bord applique la période et les filtres choisis.

**Une évolution affiche « — ».** Il n'y a aucun passage sur la période précédente : la comparaison n'est pas calculable.
