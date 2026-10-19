# Contrôle guichet (MRZ, puce NFC, biométrie)

L'application **Contrôle guichet** guide l'agent dans le contrôle d'un voyageur : lecture du document et de sa puce, capture biométrique, interrogation des fichiers, évaluation du risque et décision motivée. Elle est réservée aux rôles disposant du droit de contrôle (**Agent de contrôle**, **Superviseur**, **Administrateur**).

Pour démarrer, ouvrez la tuile **Contrôle guichet** ou la tuile de création **Nouveau contrôle**. Le bouton **Nouveau contrôle**, en haut à droite, abandonne le contrôle en cours et repart de zéro ; **Vérifier un QR** ouvre la vérification des e-Visa et WawPass.

L'assistant comporte quatre étapes, affichées en haut de page : **Document**, **Biométrie**, **Vérifications**, **Décision**. Les boutons **Précédent** et **Suivant** permettent de revenir en arrière sans perdre les données saisies.

## Étape 1 — Document

### Contexte du passage

1. Choisissez le sens : **Entrée** ou **Sortie**.
2. Vérifiez le poste (votre poste de rattachement est présélectionné).
3. Renseignez si besoin **Vol / navire / véhicule** (par exemple `HC 404`) et **Provenance / destination (code)** (par exemple `CDG`). Ces informations sont enregistrées avec le passage et peuvent déclencher des règles de ciblage.

### Lecture de la MRZ

Présentez le document au lecteur : la bande MRZ s'inscrit dans le champ **Zone de lecture automatique (MRZ)**. Sans lecteur, vous pouvez la saisir ou la coller. Deux formats sont reconnus :

- passeport **TD3** : 2 lignes de 44 caractères ;
- carte d'identité **TD1** : 3 lignes de 30 caractères.

Le panneau **Lecture du document** affiche aussitôt le type de document, le nom, les prénoms, la nationalité, l'État émetteur, la date de naissance, le sexe, le numéro de document et la date d'expiration (avec la mention **Expiré** le cas échéant). Sous ces données, la section **Chiffres de contrôle ICAO 9303** indique **Valide** ou **Invalide** pour chaque chiffre : numéro de document, date de naissance, date d'expiration, données personnelles (passeport) et contrôle composite. Un chiffre invalide signale une MRZ mal lue ou une page biographique altérée.

Si la MRZ contient des caractères interdits ou n'a pas le bon format, un message d'erreur s'affiche et l'étape suivante reste bloquée.

### Scénarios de démonstration

Les boutons **Scénarios de démonstration (lecteur simulé)** remplissent la MRZ avec un cas type : **Passeport valide**, **Notice rouge Interpol**, **Passeport volé (SLTD)**, **Sans e-Visa**, **Puce clonée** et **MRZ falsifiée** (date de naissance modifiée sur la page imprimée ; la puce contient les vraies données). Ils servent à la formation et aux démonstrations.

### Lecture de la puce (NFC)

Le panneau **Puce sans contact (NFC)** lit la puce des documents biométriques (données DG1, portrait DG2, signature SOD). La lecture est recommandée pour tout passeport biométrique.

1. Une fois la MRZ valide, cliquez sur **Lire la puce**.
2. Posez le document sur le lecteur. L'accès à la puce (PACE ou BAC) est dérivé de la MRZ lue.
3. Le panneau affiche le portrait de la puce et deux résultats :
   - **Authentification passive : valide / échec** : la signature de la puce est-elle authentique ? Un échec indique une puce clonée ou un document falsifié.
   - **Puce ↔ MRZ imprimée : concordantes / différentes** : les données de la puce (numéro, date de naissance, nom, nationalité, expiration) correspondent-elles à la MRZ imprimée ? Une différence indique une page biographique altérée.

Le navigateur ne peut pas dialoguer directement avec une puce de passeport. WawID passe par un **pont NFC local** installé sur le poste de travail et relié au lecteur de documents ; son adresse se règle dans **Paramètres**, rubrique **Lecteur NFC de ce poste**, avec un bouton **Tester**. Sans pont joignable, la lecture est **simulée** : le panneau l'indique par la mention « (simulé) » et le portrait affiché est un portrait de substitution. Si la puce ne peut pas être lue, vérifiez les sécurités physiques du document.

Modifier la MRZ après la lecture efface le résultat de la puce : relancez la lecture.

Cliquez sur **Capturer la biométrie** pour passer à l'étape suivante.

## Étape 2 — Biométrie

### Visage

1. Cliquez sur **Activer la caméra** : le navigateur demande l'autorisation d'utiliser la caméra du poste (accordez-la la première fois).
2. Placez le visage du voyageur dans le cadre, de face, sans lunettes de soleil ni couvre-chef.
3. Cliquez sur **Capturer**. L'image est figée et la caméra s'éteint.

Si aucune caméra n'est disponible, un message l'indique et une capture simulée est produite.

Le résultat affiche la **Correspondance 1:1 avec la puce** (en pourcentage, comparaison avec le portrait DG2 lorsque la puce a été lue) et la **Détection du vivant : réussie / échec**. Un score inférieur à 80 % apparaît en rouge.

> Dans cette version, les scores biométriques sont **simulés** : ils seront fournis par le SDK biométrique certifié du terminal en production.

### Simulation d'attaque

La liste à droite des boutons permet, pour la formation, de simuler une attaque de présentation : **Simuler : masque 3D**, **Simuler : rejeu écran**, **Simuler : photo imprimée**, **Simuler : deepfake / injection**. Laissez **Voyageur réel** pour un contrôle normal. Une attaque simulée fait échouer la détection du vivant, abaisse le score facial et ajoute le facteur « Attaque de présentation détectée ».

### Empreintes et iris

- **Empreintes (4 doigts)** : cliquez sur chaque doigt (**Index G**, **Index D**, **Pouce G**, **Pouce D**) ou sur **Capturer tout**. Chaque doigt capturé affiche sa qualité NFIQ.
- **Iris (optionnel)** : cliquez sur **Capturer**. Recommandé pour les profils à risque. Un score inférieur à 80 % ajoute un facteur de risque.

La capture du visage est obligatoire pour continuer ; les empreintes et l'iris sont facultatifs. Cliquez sur **Lancer les vérifications**.

### Comment l'image du voyageur est capturée et ce qui est conservé

- L'image est prise par la caméra du poste, dans le navigateur, uniquement après un clic sur **Capturer**. La caméra est coupée dès la capture ou lorsque vous quittez l'étape.
- La photo capturée et le portrait lu dans la puce **restent sur le poste de travail** : ils ne sont ni envoyés au serveur ni enregistrés dans le passage.
- Seuls des **résultats** sont transmis : score de correspondance faciale, résultat de détection du vivant, type d'attaque simulée le cas échéant, nombre d'empreintes capturées, score iris, et pour la puce : lue ou non, authentification passive, protocole, source (lecteur ou simulation) et données DG1 (pour vérifier la concordance avec la MRZ).
- Les gabarits biométriques sont chiffrés et ne quittent pas le terminal.

## Étape 3 — Vérifications

WawID interroge les fichiers nationaux et internationaux et calcule le score de risque. Le nombre de sources interrogées s'affiche en en-tête. Chaque ligne indique **OK**, **Attention** (orange) ou **Alerte** (rouge) :

| Vérification | Ce qui est contrôlé |
| --- | --- |
| **Authenticité MRZ (ICAO 9303)** | Chiffres de contrôle de la MRZ. |
| **Puce électronique (NFC)** | Authentification passive et concordance puce ↔ MRZ. « Non lue au guichet » (Attention) si la puce n'a pas été lue. |
| **Validité du document** | Date d'expiration. |
| **Interpol SLTD — documents perdus / volés** | Numéro de document dans les signalements de documents perdus ou volés. |
| **Interpol notices, FPR, WAPIS, POI** | Correspondance nominative (noms approchés, translittérations, date de naissance) dans les listes de surveillance. |
| **Autorisation de voyage (e-Visa)** | e-Visa approuvé et valide pour ce document, ou « Dispense de visa ». Non exigé à la sortie. |
| **Correspondance faciale** | Score facial par rapport au seuil ; Attention si le score est juste au-dessus du seuil. |
| **Détection du vivant et anti-deepfake (ISO 30107-3)** | Échec de vivacité ou attaque de présentation. |
| **Réutilisation d'identité** | Même document déjà présenté sous une autre identité (Alerte), ou même identité présentée avec plusieurs documents sur 90 jours (Attention). |
| **Règles de ciblage** | Règles actives déclenchées (nationalité, provenance, âge, fréquence de passage…). |
| **Historique de voyage** | Nombre de passages sur 30 jours (Attention au-delà de 6). |

Si une source externe est indisponible, un bandeau **Sources indisponibles** le signale : le contrôle est alors effectué sur la copie locale de la liste.

### Évaluation du risque

Le panneau **Évaluation du risque** présente :

- une jauge du **score de risque** de 0 à 100 et son niveau : **Faible** (0 à 29), **Modéré** (30 à 59), **Élevé** (60 à 100) ;
- la **Recommandation** :
  - **Autoriser le passage** si le score est inférieur à 30 ;
  - **Orienter en contrôle secondaire** à partir de 30 ;
  - **Refuser et retenir — escalade superviseur** à partir de 80, ou dès qu'un document est signalé perdu ou volé ou qu'une correspondance de gravité critique est trouvée, quel que soit le score ;
- les **Facteurs explicatifs** : chaque facteur retenu, son détail et les points ajoutés au score.

Pour le détail des facteurs et de leur pondération, voir la page « Comprendre le score de risque ».

Cliquez sur **Décider**.

## Étape 4 — Décision

1. Choisissez l'une des trois décisions : **Autoriser** (apposer le cachet et laisser passer), **Contrôle secondaire** (entretien et vérifications approfondies) ou **Refuser** (refus notifié, retenue si mandat). La décision recommandée porte la mention **Recommandé** et est présélectionnée.
2. Renseignez le **Motif**. Il est **obligatoire lorsque votre décision diffère de la recommandation** ; la validation est refusée tant qu'il est vide.
3. Ajoutez si besoin des **Observations**.
4. Vérifiez le **Récapitulatif** (voyageur, document, sens, poste, score facial, nombre d'empreintes, score de risque).
5. Cliquez sur **Valider la décision**.

## Ce qui est enregistré

À la validation, WawID recalcule l'évaluation côté serveur puis enregistre le passage, avec un identifiant de la forme `PX-…` :

- date et heure, poste, canal **Guichet**, sens, vol et provenance ;
- identité issue de la MRZ (nom, prénoms, date de naissance, sexe, nationalité, émetteur, type et numéro de document, expiration) ;
- résultats biométriques (score facial, vivacité, nombre d'empreintes, score iris) et résumé de la lecture de puce ;
- score, niveau, facteurs de risque et indicateur de fraude ;
- décision, motif, observations, nom de l'agent et durée du contrôle.

Une alerte est créée automatiquement dans le **Threat Monitor** lorsque le score atteint 35 ou que la décision est **Refusé**. La décision est inscrite au journal d'audit. La fiche du passage s'ouvre ensuite : vous pouvez y ouvrir un dossier, ajouter le voyageur comme personne d'intérêt ou imprimer la fiche (voir « Passages, recherche voyageur, QR et véhicules »).
