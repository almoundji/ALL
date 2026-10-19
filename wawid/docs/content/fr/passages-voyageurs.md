# Passages, recherche voyageur, QR et véhicules

Cette page décrit quatre applications de l'espace **Contrôle frontière**, accessibles à tous les rôles en consultation :

- **Passages** : l'historique de tous les franchissements et la fiche détaillée de chaque passage ;
- **Recherche voyageur** : le profil 360° d'un voyageur ;
- **Vérifier un QR** : le contrôle des QR codes e-Visa ;
- **Véhicules (VRS)** : les véhicules et occupants aux postes terrestres.

## Passages : la liste

La tuile **Passages** affiche tous les franchissements enregistrés aux guichets, eGates et kiosques ABC sur les 14 derniers jours. Le titre du tableau indique le nombre de passages correspondant aux filtres, par exemple **Passages (1 284)**.

### Filtrer

| Filtre | Effet |
| --- | --- |
| **Recherche** | Nom, prénoms, numéro de document, vol ou identifiant de passage. Insensible aux accents et aux majuscules. |
| **Poste** | Un poste frontière ou **Tous**. |
| **Sens** | **Entrée**, **Sortie** ou **Tous**. |
| **Canal** | **Guichet**, **eGate / ABC** ou **Tous**. |
| **Décision** | **Autorisé**, **Contrôle secondaire**, **Refusé** ou **Toutes**. |
| **Risque** | **Faible**, **Modéré**, **Élevé** ou **Tous**. |
| **Période** | **24 h**, **7 jours** ou **14 jours**. |
| **Suspicion de fraude** | Case à cocher : seulement les passages présentant un facteur de fraude. |

Les filtres s'appliquent immédiatement, sans bouton de validation. Le lien **Tout voir** du tableau de bord ouvre cette liste déjà filtrée sur les suspicions de fraude.

### Colonnes et tri

Le tableau affiche **Date / heure**, **Voyageur** (et nationalité), **Document**, **Poste** (avec le canal, l'eGate et le vol), **Sens**, **Risque** (score, niveau et badge **Fraude** le cas échéant), **Décision** et **Agent**.

Par défaut, les passages sont triés du plus récent au plus ancien. Cliquez sur l'en-tête d'une colonne pour trier selon cette colonne ; cliquez à nouveau pour inverser l'ordre.

### Afficher plus de lignes

Le tableau affiche 50 lignes. Le bouton **Plus [50 / 1 284]** en bas du tableau ajoute les 50 suivantes ; les deux nombres indiquent les lignes affichées et le total.

### Exporter en CSV

**Exporter CSV** télécharge `wawid-passages.csv` avec **tous** les passages correspondant aux filtres (pas seulement les lignes affichées) : identifiant, date, poste, canal, eGate, sens, nom, prénoms, nationalité, document, vol, score, fraude (oui / non), décision, motif et agent. Le séparateur est le point-virgule, pour Excel en français.

## Passages : la fiche d'un passage

Cliquez sur une ligne pour ouvrir la fiche du passage. Le fil d'Ariane **Passages › PX-…** permet de revenir à la liste.

### En-tête

L'en-tête présente le voyageur : initiales, nom et prénoms, type et numéro de document, nationalité, date de naissance, et des pastilles pour la décision, la suspicion de fraude, le sens et le canal. À droite : **Score de risque**, score **Visage** et nombre de **Passages connus** pour ce document.

La barre d'ancres **Informations**, **Évaluation du risque**, **Historique du voyageur** et **Journal** fait défiler la page jusqu'à la section choisie.

### Sections

- **Informations générales** : date, poste, canal (guichet ou eGate et son identifiant), vol et provenance, agent, durée ; correspondance faciale, détection du vivant, empreintes (sur 4), iris, puce NFC (**Authentifiée**, **Authentification passive échouée** ou **Non lue**, avec le protocole et la mention « simulé » le cas échéant), expiration du document et motif. Les **Observations** de l'agent apparaissent en dessous.
- **Évaluation du risque** : jauge du score, niveau, recommandation correspondant au score et facteurs explicatifs avec leurs points.
- **Historique du voyageur** : les autres passages avec le même numéro de document (20 au plus), ou « Premier passage connu ». Cliquez sur une ligne pour ouvrir ce passage.
- **Journal** : l'enregistrement du passage (guichet ou eGate et agent), puis l'historique des alertes liées (création, prise en charge, notes, clôture).

### Actions

| Action | Rôles | Effet |
| --- | --- | --- |
| **Ouvrir un dossier** | Droit Dossiers (agent, analyste, superviseur, administrateur) | Crée un dossier de contrôle secondaire lié au passage et à son alerte, puis l'ouvre. Si un dossier est déjà ouvert pour cette alerte, il est réutilisé. |
| **Ajouter comme personne d'intérêt** | Droit Listes de surveillance (analyste, superviseur, administrateur) | Ajoute le voyageur (nom, prénoms, date de naissance, nationalité) à la liste **Personne d'intérêt**, gravité moyenne, avec la référence du passage. Les contrôles suivants le signaleront. |
| **Profil 360°** | Tous | Ouvre la **Recherche voyageur** sur le numéro de document. |
| **Imprimer** | Tous | Imprime la fiche (les boutons d'action sont masqués à l'impression). |

## Recherche voyageur (profil 360°)

La **Recherche voyageur** regroupe tout ce que WawID sait d'une même personne : passages, demandes d'e-Visa, annonces APIS et signalements. Elle s'ouvre depuis sa tuile, depuis le bouton **Profil 360°** d'une fiche, ou depuis la recherche globale de la barre supérieure.

1. Saisissez un nom, des prénoms ou un numéro de document dans **Nom, prénoms ou n° de document**.
2. Cliquez sur **Rechercher**.

### Résolution d'identité

WawID ne se limite pas à une recherche exacte :

- **par document** : un numéro de document identique retrouve tous les passages et e-Visa associés ;
- **par nom approché** : la comparaison tolère les fautes de frappe, les accents, l'inversion nom / prénom et les variantes de translittération courantes (par exemple Mohamed, Mouhamed, Mamadou ; Abdoulaye, Abdullahi ; Ousmane, Usman) ;
- **par date de naissance** : deux passages avec des documents différents sont regroupés sous la même identité si les noms sont très proches et la date de naissance identique.

### Résultats

- Un bandeau rouge signale les **correspondances en liste de surveillance**, avec la liste, le nom ou le document et la référence.
- Chaque identité retrouvée forme une carte : nom, nationalité, date de naissance, documents utilisés, pastille **Plusieurs documents** si la personne a voyagé avec plusieurs documents, nombre de passages et d'e-Visa. La carte liste les 12 passages les plus récents et les demandes d'e-Visa ; cliquez sur une ligne pour ouvrir le passage ou la demande.
- La section **Annoncé sur des vols (APIS)** liste les vols sur lesquels la personne a été annoncée par une compagnie, avec le score de pré-contrôle.

Sans résultat, le message « Aucun résultat pour … » s'affiche.

## Vérifier un QR (e-Visa)

Les voyageurs présentent le QR code de leur e-Visa approuvé, délivré par le portail. Le contenu d'un QR a la forme `EV.EV2600001.ab12cd34ef56gh78` : un type, une référence et une signature cryptographique calculée par le serveur. La redevance de sécurité est incluse dans le billet : aucun reçu de paiement n'est demandé au voyageur.

1. Ouvrez **Vérifier un QR** (tuile ou bouton du contrôle guichet).
2. Lisez le QR :
   - avec une **douchette** : placez le curseur dans **Contenu du QR code** et scannez ;
   - avec la **caméra** : cliquez sur **Scanner** et présentez le QR ; la lecture est automatique. Cette fonction dépend du navigateur (lecture de QR intégrée, disponible notamment dans Chrome et Edge) ; sinon un message vous invite à utiliser une douchette ou à coller le contenu ;
   - ou **collez** le contenu.
3. Cliquez sur **Vérifier** (inutile après un scan caméra).

Le résultat indique **Valide** ou **Non valide** avec un message, puis le type, la **Référence**, le **Titulaire** et le **Document**. Comparez toujours le titulaire et le numéro avec le document présenté.

| Cas | Résultat |
| --- | --- |
| Signature incorrecte (QR modifié ou fabriqué) | Non valide — « QR code invalide ou falsifié (signature incorrecte). » |
| e-Visa approuvé et non échu | Valide — numéro de visa et date de fin de validité. |
| e-Visa non approuvé ou échu | Non valide — statut de la demande. |
| Ancien reçu WawPass (`WP.…`), première vérification | Valide — « Taxe acquittée », vol et date du voyage (historique). |
| Ancien reçu WawPass déjà vérifié | Non valide — « Reçu déjà utilisé. » |

> Le paiement WawPass par le voyageur a été supprimé ; les reçus émis auparavant restent vérifiables à titre historique. Leur première vérification les marque comme utilisés et est inscrite au journal d'audit. Leur liste figure dans **Pré-enrôlements eGate**, onglet **Historique WawPass**.

## Véhicules (VRS)

L'application **Véhicules (VRS)** recense les véhicules et leurs occupants aux postes terrestres (Rosso, Kidira, Karang…), à partir de la lecture des plaques et de la déclaration des occupants. La tuile indique le nombre de véhicules signalés.

- **Plaque, conducteur** : recherche sur la plaque ou le nom du conducteur.
- **Signalés uniquement** : n'affiche que les véhicules signalés.

Le tableau affiche **Date**, **Plaque** (avec le badge **Signalé** et la note associée), **Type** et chargement, **Conducteur** et nombre d'occupants, **Poste** et sens. Le tri par colonne et le bouton **Plus** fonctionnent comme dans la liste des passages.
