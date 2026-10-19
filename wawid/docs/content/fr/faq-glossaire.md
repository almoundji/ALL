# FAQ et glossaire

## Questions fréquentes

### Voyageurs

#### Comment savoir si j'ai besoin d'un visa ?

Sur la page d'accueil du portail voyageur, choisissez votre nationalité dans **Ai-je besoin d'un visa ?**. Le portail indique si vous êtes dispensé (séjour de 90 jours au plus) ou si un e-Visa est requis. La liste des dispenses est fixée par l'administration.

#### Combien de temps faut-il pour obtenir un e-Visa ?

La réponse est généralement donnée sous **72 heures**. Déposez votre demande suffisamment tôt avant le départ. Lorsque la puce du passeport a été lue avec l'app iPhone, l'instruction est en général plus rapide.

#### J'ai perdu ma référence de demande. Que faire ?

La référence (commençant par `EV`) figure sur l'écran de confirmation et dans l'app. Le suivi exige la référence **et** le numéro de passeport ; sans la référence, contactez les services de l'immigration.

#### L'administration me demande une information complémentaire. Comment répondre ?

Ouvrez **Suivi**, saisissez la référence et le numéro de passeport, lisez le message de l'agent puis répondez dans **Votre réponse**. La demande repasse automatiquement en examen.

#### Dois-je imprimer mon e-Visa ?

Ce n'est pas obligatoire : le QR code peut être présenté sur votre téléphone. Une version imprimée est utile en cas de batterie déchargée. Présentez toujours le QR code **avec votre passeport**.

#### Dois-je payer une taxe de sécurité ?

Non. La redevance de sécurité est **incluse dans le prix de votre billet d'avion** et perçue par votre compagnie aérienne : vous n'avez rien à payer, ni en ligne ni à l'aéroport, et aucun reçu n'est à présenter. Méfiez-vous de toute demande de paiement à ce titre. L'ancien paiement en ligne WawPass a été supprimé.

#### Pourquoi l'eGate m'a-t-elle orienté vers un guichet ?

Une orientation ne préjuge de rien : elle se produit par exemple si vous êtes mineur, si la puce ou le document n'a pas pu être vérifié, si la comparaison faciale ou la détection du vivant a échoué, si votre nationalité n'est pas éligible sur cette porte ou si un contrôle complémentaire est nécessaire. Un agent traite alors votre passage au guichet.

#### Mon iPhone ne lit pas la puce du passeport.

Il faut un iPhone 7 ou plus récent et un passeport biométrique. Vérifiez la MRZ (une seule erreur bloque l'accès à la puce), retirez la coque, posez le passeport fermé sur une surface non métallique, approchez le haut de l'iPhone et ne bougez plus pendant 5 à 15 secondes. Vous pouvez aussi continuer sans lecture de la puce.

### Organisateurs de délégations

#### Comment déclarer une délégation ?

Sur le portail voyageur, onglet **Délégations**, rubrique **Déclarer une délégation**. Ministères, ambassades, fédérations sportives et comités d'organisation y annoncent une visite officielle, une équipe sportive, une conférence ou un événement culturel, **au moins 72 h avant l'arrivée** (recommandé). Les membres se saisissent une ligne par personne (`Nom;Prénoms;Nationalité;Sexe;Naissance;Passeport;Fonction;Type de passeport`), par copier-coller depuis Excel si besoin. Conservez la référence `DL…` : avec l'e-mail du contact, elle permet de suivre la décision dans **Suivre une délégation**.

#### Les membres d'une délégation validée ont-ils besoin d'un e-Visa ?

Pas si la DPAF a accordé une **autorisation collective d'entrée** : elle vaut e-Visa pour chaque membre pendant le séjour. Sinon, chaque membre soumis à visa doit obtenir un e-Visa individuel. Dans tous les cas, chaque membre passe le contrôle habituel au guichet.

### Compagnies aériennes

#### Où nous connecter ?

Sur la **plateforme des compagnies aériennes** (`/compagnies/`), avec un compte nominatif créé par WawID et rattaché au code IATA de votre compagnie. Vous y transmettez vos messages, consultez vos accusés de réception, la complétude de vos vols et vos factures de redevance. Les comptes compagnie n'ouvrent pas l'espace DPAF. Voir *Plateforme des compagnies aériennes*.

#### Comment obtenir une clé de la passerelle API/PNR ?

La clé `X-Carrier-Key` est remise par l'administration à chaque compagnie et liée à son code IATA. Elle ne permet de transmettre que les vols de cette compagnie.

#### Quels formats sont acceptés ?

UN/EDIFACT **PAXLST** (D02B, profil IATA/OMD) pour l'API et le **PNR au format texte IATA** (RLOC, segments, SSR DOCS, CTCE/CTCM, FP). Les messages PNRGOV sont acceptés après conversion par le service d'intégration. Taille maximale : 2 Mo.

#### Quand transmettre les données ?

PNR à H-48 puis H-24 avant le départ ; API à la clôture de l'enregistrement, au plus tard à la fermeture des portes. Les retards sont suivis dans la conformité des transporteurs (objectif : ≥ 95 % des vols à l'heure, ≥ 98 % de complétude).

#### Recevons-nous le résultat du contrôle de nos passagers ?

Non. La passerelle et la plateforme renvoient un accusé de réception (référence `MSG-…`, vol, nombre de passagers, complétude, ponctualité, erreurs) mais **aucun résultat de ciblage** n'est communiqué au transporteur : ni passagers signalés, ni score.

#### Comment payer la redevance de sécurité ?

Virez le montant de la facture au bénéficiaire affiché sur la plateforme (par défaut : WawID, compte de collecte de la redevance de sécurité ; WawID reverse ensuite la part de l'État au Trésor public), avec la référence de la facture dans le libellé. Déclarez ensuite le paiement dans l'écran **Redevance** : il apparaît **À valider** jusqu'au rapprochement bancaire, puis **Validé** ou **Rejeté** (avec un motif). Ce circuit diffère du cadre fixé par le décret n° 2012-519 (recouvrement par la DGCPT) et suppose un nouveau texte réglementaire et une convention de mandat d'encaissement avec l'État.

### Agents

#### Où se connecter ?

Sur l'**espace DPAF** (`/dpaf/`, l'ancienne adresse `/admin/` reste valable). Le portail voyageur ne contient pas de lien vers l'espace DPAF : enregistrez l'adresse dans vos favoris.

#### La puce est indiquée « simulée » au guichet. Est-ce normal ?

Oui, si le pont NFC n'est pas lancé ou si aucun lecteur n'est branché. Vérifiez l'adresse du pont dans **Administration → Paramètres → Lecteur NFC de ce poste** et cliquez sur **Tester**.

#### Comment vérifier un QR code e-Visa ?

Utilisez **Vérifier un QR** dans l'espace DPAF (session requise). La signature est contrôlée, puis le statut de l'e-Visa est vérifié en temps réel. Les anciens reçus WawPass, émis avant la suppression du paiement voyageur, restent vérifiables à titre historique.

#### Pourquoi dois-je saisir un motif pour certaines décisions ?

Lorsque votre décision diffère de la recommandation du score de risque, un motif est obligatoire. Il est conservé avec le passage et tracé dans le journal d'audit.

#### Ma session a expiré.

Les sessions durent 12 heures (une vacation). Reconnectez-vous. Si votre compte a été désactivé, contactez un administrateur.

## Glossaire

| Terme | Définition |
| --- | --- |
| ABC (Automated Border Control) | Contrôle automatisé aux frontières : eGates, kiosques et corridors biométriques permettant le passage sans agent. |
| Alerte | Signal créé lorsqu'un passage ou un passager annoncé présente un score de risque élevé ou une correspondance sur une liste. |
| API (Advance Passenger Information) | Données d'identité et de document des passagers transmises par la compagnie avant l'arrivée ou le départ du vol. |
| APIS | Système de traitement des données API : réception des manifestes et pré-contrôle des passagers annoncés. |
| Authentification active (AA) / chip | Mécanisme prouvant que la puce n'a pas été clonée (clé privée stockée dans la puce, DG15/DG14). |
| Authentification passive (PA) | Vérification de la signature numérique des données de la puce (EF.SOD) à l'aide des certificats de l'État émetteur (CSCA). Elle prouve que les données n'ont pas été modifiées. |
| Autorisation collective d'entrée | Décision de la DPAF, prise à la validation d'une délégation, qui vaut e-Visa pour chacun de ses membres de 3 jours avant l'arrivée à 3 jours après le départ. Elle ne dispense pas des contrôles au guichet. |
| BAC (Basic Access Control) | Protocole d'accès à la puce d'un passeport, utilisant des clés dérivées de la MRZ. Remplacé progressivement par PACE. |
| CDP | Commission de protection des données personnelles, autorité sénégalaise de contrôle (loi n° 2008-12). |
| Chiffres de contrôle | Chiffres de la MRZ calculés selon l'ICAO 9303 pour détecter les erreurs de lecture ou de saisie. |
| CSCA / ICAO PKD | Certificats racines des États émetteurs de passeports ; le PKD de l'OACI les distribue pour l'authentification passive. |
| DG1, DG2 | Groupes de données de la puce : DG1 contient la MRZ, DG2 la photo du titulaire. |
| Délégation | Groupe annoncé à l'avance (visite officielle, compétition sportive, conférence, événement culturel), enregistré par la DPAF ou déclaré par l'organisateur sur le portail (référence `DL…`). Ses membres sont pré-contrôlés, puis la délégation est validée ou refusée. |
| Détection du vivant (liveness) | Vérification qu'un visage présenté est celui d'une personne réelle et non une photo, un écran ou un masque. |
| Espace DPAF | Plateforme WawID des agents, analystes, superviseurs, agents du Trésor et administrateurs (`/dpaf/`), anciennement appelée back-office. |
| e-Visa | Autorisation de voyage demandée et délivrée en ligne, présentée à la frontière sous forme de QR code signé. |
| eGate | Porte automatique qui lit le passeport, compare le visage du voyageur à la photo de la puce et s'ouvre ou oriente vers un guichet. |
| eKYC | Vérification d'identité à distance : authenticité du document, comparaison faciale avec un selfie, détection du vivant. |
| FCFA (XOF) | Franc CFA d'Afrique de l'Ouest, monnaie des frais e-Visa et de la facturation de la redevance de sécurité. |
| ICAO 9303 (OACI Doc 9303) | Norme internationale des documents de voyage lisibles à la machine : MRZ, puce, protocoles de sécurité. |
| MRZ (Machine Readable Zone) | Bande de 2 lignes (passeport, format TD3) ou 3 lignes (carte, TD1) en bas de la page d'identité, lisible par machine. |
| NFC | Communication sans contact à courte portée utilisée pour lire la puce des passeports biométriques. |
| PACE (Password Authenticated Connection Establishment) | Protocole d'accès à la puce plus robuste que BAC, également fondé sur la MRZ. |
| Plateforme des compagnies aériennes | Plateforme WawID réservée aux compagnies (`/compagnies/`) : transmission API/PNR, accusés de réception, complétude, factures et paiements de la redevance de sécurité. |
| PAXLST | Message UN/EDIFACT « Passenger List » utilisé par les compagnies pour transmettre les données API. |
| PNR (Passenger Name Record) | Dossier de réservation : itinéraire, date de réservation, moyen de paiement, coordonnées. |
| PNRGOV | Format UN/EDIFACT de transmission des PNR aux autorités publiques. |
| POI (personne d'intérêt) | Personne signalée par les services de renseignement sur une liste de surveillance. |
| Pré-enrôlement | Enregistrement préalable du passeport sur le portail pour pouvoir utiliser les eGates. |
| Redevance de sécurité | Redevance perçue par les compagnies dans le prix du billet sur les passagers des vols commerciaux internationaux (12 USD), payée à WawID (compte de collecte) qui reverse la part de l'État au Trésor public, ou directement au Trésor selon le circuit retenu ; suivie dans le module Finances. |
| Score de risque | Note de 0 à 100 calculée à partir de facteurs explicables (listes, règles, document, biométrie) ; elle produit une recommandation : Autorisé, Contrôle secondaire ou Refusé. |
| SLTD (Stolen and Lost Travel Documents) | Base Interpol des documents de voyage perdus ou volés. |
| SSR DOCS | Élément du PNR contenant les données du document de voyage du passager. |
| Taxe de sécurité | Voir *Redevance de sécurité* : incluse dans le billet, elle n'est plus payée séparément par le voyageur. |
| WAPIS | Système d'information policière d'Afrique de l'Ouest, programme régional appuyé par Interpol. |
| WawPass | Ancien service (supprimé) de paiement en ligne de la taxe de sécurité par le voyageur, avec reçu QR valable une fois. Les reçus déjà émis restent consultables dans l'onglet **Historique WawPass** et vérifiables à titre historique. |
