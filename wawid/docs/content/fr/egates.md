# eGates et kiosques ABC

L'application **eGates & ABC** supervise en temps réel les équipements de passage automatisé : portes biométriques (eGates), kiosques ABC et corridor biométrique d'embarquement. Elle permet de suivre les transactions, de comprendre les orientations vers les guichets et, pour les superviseurs et administrateurs, de piloter les équipements à distance.

Tous les rôles peuvent consulter la page. Les commandes et les paramètres sont réservés au droit **Pilotage des eGates** (**Superviseur**, **Administrateur**).

## En-tête de la page

- La liste **Tous les postes** filtre les équipements et les statistiques sur un poste (par exemple l'aéroport AIBD ou le Port de Dakar).
- **Ouvrir le kiosque** lance l'écran du kiosque eGate (`/gate/`) dans un nouvel onglet.

La page se rafraîchit automatiquement toutes les 30 secondes.

## Indicateurs clés

| Indicateur | Calcul |
| --- | --- |
| **Ouvertes** | Équipements **En service** et en mode automatique, sur le nombre total d'équipements. |
| **Alarmes** | Équipements au statut **Alarme** (intervention requise). En rouge s'il y en a. |
| **Transactions 24 h** | Passages par eGate ou kiosque sur les 24 dernières heures, avec le nombre d'ouvertures. |
| **Taux d'orientation guichet** | Part des transactions de 24 h qui n'ont pas abouti à une ouverture (rejets et contrôles complémentaires). |
| **Durée moyenne** | Durée moyenne d'un passage automatisé, en secondes. |

## Cartes des équipements

Chaque équipement est présenté par une carte :

- nom, identifiant (par exemple `EG-AIBD-A01`) et zone (**Arrivées**, **Départs**, **Embarquement**, **Terminal passagers**) ;
- **statut** et **mode** ;
- type (eGate, Kiosque ABC, Corridor biométrique) et version du micrologiciel ;
- **passages aujourd'hui** et nombre **orientés guichet** (24 h glissantes) ;
- état des périphériques : **Lecteur**, **Caméra**, **Empreintes**, **Portes** (vert si OK, rouge en cas de défaut) ;
- rappel des paramètres (seuil facial, âge minimal, éligibilité) et heure du dernier signal de vie (heartbeat).

Une carte en alarme est mise en évidence.

### Statuts et modes

| Statut | Signification |
| --- | --- |
| **En service** | L'équipement fonctionne. |
| **Maintenance** | Retiré du service pour intervention ; il est fermé. |
| **Hors service** | Arrêté. |
| **Alarme** | Défaut détecté (par exemple caméra en défaut) ; intervention requise. |

| Mode | Signification |
| --- | --- |
| **Mode automatique** | La porte accepte les voyageurs et décide seule de l'ouverture. |
| **Mode assisté** | Passage sous la conduite d'un agent. |
| **Mode fermé** | La porte n'accepte aucun voyageur. |

Une porte n'accepte de transaction que si elle est **En service** et en **mode automatique**. Dans tous les autres cas, le kiosque affiche « Porte fermée » et invite le voyageur à se diriger vers un guichet.

## Commandes à distance

Les boutons apparaissent en bas de chaque carte pour les rôles autorisés :

| Bouton | Effet |
| --- | --- |
| **Paramètres** | Ouvre la fenêtre de paramétrage de l'équipement (voir ci-dessous). |
| **Fermer** | Passe la porte en mode fermé (elle reste En service). |
| **Ouvrir** | Repasse une porte fermée en mode automatique. |
| **Remettre en service** | Pour un équipement en maintenance, hors service ou en alarme : statut En service et mode automatique. |
| Bouton marche (icône d'alimentation) | **Redémarrer à distance**. |
| Bouton cadenas | **Passer en maintenance** : statut Maintenance et mode fermé. |
| Bouton lecture | **Ouvrir ce kiosque** : ouvre l'écran du kiosque directement sur cet équipement. |

Chaque commande affiche « Commande envoyée à … » et est inscrite au journal d'audit avec le nom de l'utilisateur. Le kiosque concerné relit son état toutes les 15 secondes lorsqu'il est au repos : une fermeture ou une remise en service à distance y est donc appliquée en moins de 15 secondes, sans interrompre un voyageur en cours de passage.

## Paramètres d'un équipement

1. Cliquez sur **Paramètres** sur la carte.
2. Modifiez les valeurs.
3. Cliquez sur **Appliquer à distance** (ou **Annuler**).

| Paramètre | Valeur par défaut | Effet |
| --- | --- | --- |
| **Seuil de correspondance faciale (%)** | 82 | En dessous de ce score, le visage est jugé non conforme et le voyageur est orienté au guichet. Valeurs de 50 à 99. |
| **Score de risque maximal accepté** | 29 | Au-delà, orientation au guichet. Valeurs de 0 à 100. |
| **Âge minimal** | 18 | Les voyageurs plus jeunes sont orientés au guichet. Valeurs de 0 à 21. |
| **Éligibilité** | Toutes nationalités | **Toutes nationalités**, **Ressortissants CEDEAO** ou **Liste personnalisée**. |
| **Nationalités éligibles** | vide | Utilisé avec **Liste personnalisée** : codes ISO à 3 lettres séparés par des virgules (par exemple `SEN, FRA, MLI`). |
| **Détection du vivant obligatoire** | coché | Si coché, toute transaction sans détection du vivant réussie est orientée au guichet. |
| **Vérifier l'autorisation de voyage** | coché | Si coché, un voyageur soumis à visa sans e-Visa valide est orienté avec le motif « Autorisation de voyage introuvable ». |

> **Important** : le score de risque maximal ne peut que **durcir** la politique. Quelle que soit sa valeur, l'eGate n'ouvre jamais lorsque la recommandation du moteur de risque n'est pas « autoriser » (score de 30 ou plus), ni en cas de correspondance sur une liste de surveillance ou de document perdu ou volé. De même, décocher **Vérifier l'autorisation de voyage** ne fait que changer le motif : l'absence d'e-Visa ajoute des points au score et conduit en général à une orientation pour « Contrôle complémentaire requis ».

## Règles de décision d'une eGate

Pour chaque voyageur, l'eGate évalue le document et le risque comme au guichet (fichiers, règles, puce, biométrie), avec le seuil facial de l'équipement. Les règles sont appliquées dans l'ordre ci-dessous ; la première qui s'applique détermine une **orientation au guichet** et son message. Si aucune ne s'applique, les portes s'ouvrent.

| Ordre | Condition | Message affiché au voyageur |
| --- | --- | --- |
| 1 | MRZ illisible | Document illisible — veuillez vous présenter au guichet. |
| 2 | Chiffres de contrôle MRZ invalides | Le document n'a pas pu être authentifié. |
| 3 | Âge inférieur à l'âge minimal | Les voyageurs mineurs sont traités au guichet. |
| 4 | Nationalité hors éligibilité (CEDEAO ou liste) | Nationalité non éligible au passage automatisé. |
| 5 | Visage non capturé | Capture du visage impossible — veuillez vous présenter au guichet. |
| 6 | Vivacité non confirmée alors qu'elle est obligatoire | Vérification biométrique impossible. |
| 7 | Puce non lue, authentification passive échouée ou puce différente de la MRZ | La puce de votre passeport n'a pas pu être vérifiée. |
| 8 | Attaque de présentation ou document réutilisé | Contrôle complémentaire requis — un agent va vous accompagner. |
| 9 | Échec de détection du vivant | Vérification biométrique impossible. |
| 10 | Score facial inférieur au seuil | Votre visage ne correspond pas suffisamment à la photo du document. |
| 11 | Document expiré | Document expiré. |
| 12 | e-Visa requis et absent (si la vérification est activée) | Autorisation de voyage introuvable. |
| 13 | Correspondance critique, liste de surveillance, document SLTD ou recommandation autre que « autoriser » | Contrôle complémentaire requis — un agent va vous accompagner. |
| 14 | Score supérieur au score maximal accepté | Contrôle complémentaire requis — un agent va vous accompagner. |
| — | Aucune des conditions | Bon voyage ! Les portes s'ouvrent. |

Chaque transaction dont la MRZ est lisible est enregistrée comme un passage (canal **eGate / ABC**, agent « eGate (automatique) ») : décision **Autorisé** en cas d'ouverture, **Contrôle secondaire** en cas d'orientation, avec le motif préfixé par « eGate : ». Le sens (entrée ou sortie) est déduit de la zone de l'équipement : **Départs** et **Embarquement** pour les sorties, les autres zones pour les entrées. Comme au guichet, une alerte est créée dans le Threat Monitor si le score atteint 35. Les rejets de MRZ illisible ne créent pas de passage mais sont inscrits au journal d'audit.

## Flux en direct

Le panneau **Flux en direct** liste les 12 dernières transactions automatisées de 24 h : heure, voyageur (nom et initiale du prénom), équipement et résultat (**Ouverture** en vert ou **Guichet** en orange). Cliquez sur une ligne pour ouvrir la fiche du passage.

## Motifs d'orientation (24 h)

Le panneau **Motifs d'orientation (24 h)** classe les six motifs de non-ouverture les plus fréquents sur 24 heures (les messages du tableau ci-dessus). Il aide à repérer un problème récurrent : un seuil facial trop strict, une caméra mal réglée, un afflux de voyageurs non éligibles ou de passeports dont la puce est illisible.
