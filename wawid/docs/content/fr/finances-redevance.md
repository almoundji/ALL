# Redevance de sécurité

Le module **Redevance de sécurité** (espace **Finances** de l'espace DPAF) suit la redevance due par les compagnies aériennes pour chaque passager : assiette, exonérations, factures, paiements déclarés par les compagnies et leur validation, encaissements, pénalités de retard, rapprochement avec le comptage WawID, répartition des recettes et reversements de la part de l'État au Trésor public.

Il s'adresse aux **agents du Trésor** et aux administrateurs. Les compagnies, elles, consultent leurs factures et déclarent leurs paiements sur la *Plateforme des compagnies aériennes* (`/compagnies/`).

| Action | Droit nécessaire | Rôles |
|---|---|---|
| Consulter le module, exporter, calculer l'assiette du mois, enregistrer un encaissement | `finance` | Agent du Trésor (redevance), Administrateur |
| Valider ou rejeter un paiement déclaré par une compagnie, enregistrer un reversement à l'État | `finance` | Agent du Trésor (redevance), Administrateur |
| Modifier les **Paramètres** de la redevance (taux, part opérateur, pénalité, taux IATA, circuit de recouvrement) | `system` | Administrateur |

> **Volumes fictifs.** Dans la démonstration, les compagnies, passagers, montants, taux de change et encaissements sont générés pour l'exemple. Ils ne reflètent ni le trafic réel ni les recettes réelles.

## Base juridique

| Texte | Date | Apport |
|---|---|---|
| Décret n° 2011-652 | 26 mai 2011 | Institue la redevance de sécurité : **12 USD par passager embarqué ou débarqué** sur vol commercial international, incluse dans le billet et liquidée par la compagnie ; pénalité de **5 %** en cas de retard. |
| Arrêté interministériel (Intérieur / Transports) portant modalités de recouvrement | 3 février 2012 | Exonérations ; facturation en **FCFA au taux IATA du mois** ; collecte des statistiques du 1er au 9 du mois suivant, émission des factures le 10, échéance à la fin du mois suivant. |
| Décret n° 2012-519 | 18 mai 2012 | Le recouvrement est confié à la **Direction générale de la Comptabilité publique et du Trésor (DGCPT)** ; les compagnies reversent au **Receveur général du Trésor** ; contrôle et contentieux par la DGCPT. |
| Décision du ministre de l'Économie et des Finances | 4 décembre 2012 | Versement mensuel à l'opérateur du système de **75 % des recettes** encaissées par le Trésor (part actuelle). |

## Circuit de recouvrement

WawID gère deux circuits, choisis par l'administrateur dans **Répartition → Paramètres → Circuit de recouvrement** (paramètre `circuit`) :

| Circuit | Valeur | Qui encaisse | Part opérateur | Part de l'État |
|---|---|---|---|---|
| **Compagnies → WawID → Trésor public (proposé)** | `OPERATEUR` (par défaut) | WawID, sur son **compte de collecte** | Conservée par WawID | Reversée chaque mois par WawID au **Receveur général du Trésor (DGCPT)** |
| **Compagnies → Trésor public (DGCPT, décret 2012-519)** | `TRESOR` | Le Receveur général du Trésor | Versée mensuellement par le Trésor à l'opérateur | Conservée par le Trésor |

Dans le circuit `OPERATEUR` :

1. La compagnie perçoit la redevance dans le prix du billet et vire le montant de la facture au compte de collecte WawID.
2. Elle **déclare** le paiement sur la plateforme des compagnies (montant, référence du virement, mode) : le paiement est **À valider**.
3. Le service financier (droit `finance`) le **valide** ou le **rejette** dans l'onglet **Paiements à valider**, après rapprochement avec le relevé du compte de collecte. Seuls les paiements validés soldent les factures.
4. Chaque mois, WawID calcule la **part de l'État** des sommes encaissées et validées (encaissé × (1 − part opérateur)) et la reverse au Receveur général du Trésor ; le virement est enregistré dans l'onglet **Reversements à l'État**. WawID conserve la part opérateur.

Le bénéficiaire affiché aux compagnies suit le circuit : « WawID — compte de collecte de la redevance de sécurité » (`OPERATEUR`) ou « Receveur général du Trésor (DGCPT) » (`TRESOR`). Dans les deux circuits, les compagnies déclarent leurs paiements sur leur plateforme et ces déclarations sont validées dans WawID.

> **Avertissement juridique.** Le circuit « compagnies → WawID → Trésor public » **diffère du cadre juridique en vigueur** : le décret n° 2012-519 confie le recouvrement à la DGCPT (les compagnies reversent au Receveur général du Trésor), et la décision du ministre de l'Économie et des Finances du 4 décembre 2012 prévoit que le Trésor verse la part de l'opérateur. Sa mise en œuvre suppose **un nouveau texte réglementaire** et **une convention de mandat d'encaissement** entre l'État et WawID. Tant que ces textes ne sont pas adoptés, le circuit `TRESOR` reste le circuit légal. Le module affiche cet avertissement en tête de page lorsque le circuit `OPERATEUR` est actif.

## Assiette, exonérations et calendrier

**Assiette** : chaque passager embarqué ou débarqué sur un vol commercial international, au taux de 12 USD.

**Exonérations** (arrêté de février 2012), détaillées sur chaque facture :

- Équipage ;
- Billets ID (personnel) ;
- Enfants 0-2 ans ;
- Transit ≤ 24 h ;
- Vols déroutés.

**Calendrier réglementaire** (rappelé dans l'onglet **Synthèse**) :

| Étape | Échéance |
|---|---|
| Passages embarqués et débarqués, hors exonérations | Mois M |
| Collecte des statistiques : déclarations des compagnies et comptage WawID | Du 1er au 9 du mois M+1 |
| Émission des factures en FCFA au taux IATA du mois M | Le 10 du mois M+1 |
| Échéance. Circuit `OPERATEUR` : virement des compagnies au compte de collecte WawID, déclaré sur la plateforme des compagnies puis validé par WawID. Circuit `TRESOR` : reversement au Receveur général du Trésor | Fin du mois M+1 |
| Circuit `OPERATEUR` : reversement par WawID de la part de l'État au Receveur général du Trésor | Le 15 du mois M+2 |
| Pénalité de retard | 5 % par mois de retard après l'échéance |

## Les onglets

Le bouton **Exporter** (en haut à droite) télécharge toutes les factures au format CSV (`wawid-redevance.csv`) : passagers comptés, exonérés, taxables, déclarés, taux, montants, payé, reste dû, pénalité et statut.

### Synthèse

- Indicateurs sur 6 mois : **Facturé (6 mois)**, **Encaissé par WawID** (circuit `OPERATEUR`) ou **Encaissé au Trésor** (circuit `TRESOR`), avec le taux de recouvrement, **Restant dû** (et nombre de factures en retard), **Pénalités de retard**, **Passagers non déclarés** (et assiette manquante estimée).
- Graphique **Facturé et encaissé par mois**, en millions de FCFA.
- **Calendrier réglementaire**.
- Tableau **Par compagnie (6 mois)** : facturé, encaissé, reste dû, pénalités et passagers non déclarés.

### Factures compagnies

Une facture est émise par compagnie et par mois (référence `RS-AAAAMM-XX`, où `XX` est le code IATA). Filtrez par **Mois** et par **Statut**.

| Colonne | Contenu |
|---|---|
| **Facture** | Référence et date d'émission |
| **Compagnie** | Nom de la compagnie |
| **Passagers taxables** | Passagers déclarés par la compagnie, base de la facture |
| **Montant** | Montant en FCFA ; détail « USD × taux IATA » |
| **Échéance** | Fin du mois suivant la période |
| **Reste dû** | Solde **pénalités comprises** |
| **Statut** | **PAYÉE**, **PARTIELLE**, **ÉMISE** ou **EN RETARD** (avec le nombre de mois de retard) ; le montant des paiements déclarés **à valider** est indiqué en dessous |

**Montant de la facture** = passagers déclarés × 12 USD × taux IATA du mois (FCFA pour 1 USD), arrondi au franc.

**Pénalité** = reste dû × 5 % × nombre de mois de retard. Chaque période de 30 jours entamée après l'échéance compte pour un mois. La pénalité n'est pas capitalisée.

Seuls les paiements **validés** (et les encaissements saisis dans l'espace DPAF) sont pris en compte dans l'encaissé et le reste dû ; un paiement déclaré par une compagnie et non encore validé ne modifie ni le statut ni la pénalité.

#### Détail d'une facture

Cliquez sur la facture. La fenêtre détaille la période, les passagers comptés par WawID, chaque exonération, les passagers taxables, les passagers déclarés (avec l'écart éventuel), le taux, le montant, les dates, l'encaissé, le reste dû, les pénalités et la liste des **Paiements**. Chaque paiement indique sa date, sa référence, son origine (par exemple « Compagnie (Virement) » ou « Saisie back-office ») et son statut : **À valider**, **Validé** ou **Rejeté** (avec le motif et le nom de l'agent qui l'a traité). Un paiement **À valider** peut être validé ou rejeté directement depuis cette fenêtre (boutons **Valider** et **Rejeter**).

#### Enregistrer un encaissement

Pour un paiement qui n'a pas été déclaré par la compagnie sur sa plateforme :

1. Cliquez sur la facture.
2. Dans **Enregistrer un encaissement (relevé du compte de collecte)** (circuit `OPERATEUR`) ou **Enregistrer un encaissement (quittance du Trésor)** (circuit `TRESOR`), vérifiez le **Montant (FCFA)**, prérempli avec le reste dû augmenté des pénalités.
3. Saisissez la **Référence de quittance** (référence du relevé ou de la quittance ; à défaut, une référence `RGT-…` est générée).
4. Cliquez sur **Enregistrer**.

L'encaissement est daté, attribué à votre nom, enregistré directement comme **Validé** et inscrit au journal d'audit (`REDEVANCE_ENCAISSEMENT`). Un paiement partiel fait passer la facture **PARTIELLE** ; un solde nul la fait passer **PAYÉE**.

#### Calculer l'assiette du mois en cours

Le bouton **Assiette du mois en cours (WawID)** calcule une assiette provisoire à partir des passages enregistrés par WawID (guichets et eGates) pendant le mois en cours : par code compagnie, nombre de passagers contrôlés, dont enfants de 0 à 2 ans, et montant estimé en USD. Les factures définitives restent émises le 10 du mois suivant.

### Paiements à valider

L'onglet **Paiements à valider** (aussi accessible par la tuile du même nom de l'espace **Finances**, qui affiche le nombre de paiements déclarés) liste les paiements déclarés par les compagnies sur leur plateforme et pas encore traités : **Déclaré le**, **Compagnie**, **Facture**, **Référence** (du virement), **Mode**, **Montant**. Le nombre de paiements en attente s'affiche sur l'onglet.

1. Rapprochez chaque déclaration du relevé bancaire du compte de collecte (montant, référence du virement, référence de facture dans le libellé).
2. Cliquez sur **Valider** si le virement est retrouvé : le paiement passe **Validé** et solde la facture à hauteur de son montant.
3. Sinon, cliquez sur **Rejeter** et indiquez le **Motif du rejet** (prérempli : « Non retrouvé sur le relevé du compte de collecte ») : le paiement passe **Rejeté** et la compagnie voit le motif sur sa plateforme.

Un paiement déjà traité ne peut plus être validé ou rejeté. Chaque décision est inscrite au journal d'audit (`REDEVANCE_PAIEMENT_CONFIRME` ou `REDEVANCE_PAIEMENT_REJETE`) ; la déclaration de la compagnie l'est aussi (`REDEVANCE_PAIEMENT_DECLARE`).

### Reversements à l'État

L'onglet **Reversements à l'État** (tuile du même nom dans l'espace **Finances**) suit le reversement au Trésor public de la part de l'État des sommes encaissées par WawID.

- Indicateurs : **Part de l'État due** (avec son pourcentage, 1 − part opérateur), calculée sur les encaissements validés ; **Reversé au Trésor** (et nombre de virements) ; **Reste à reverser**.
- Tableau **Par mois de facturation** : **Encaissé (validé)**, **Part de l'État** (encaissé × (1 − part opérateur)), **Reversé**, **Reste à reverser**.
- Tableau **Virements au Receveur général du Trésor** : date, mois, référence, bénéficiaire, auteur et montant de chaque reversement.

Pour enregistrer un reversement :

1. Sur la ligne du mois, cliquez sur **Enregistrer le reversement**.
2. Vérifiez le **Montant (FCFA)**, prérempli avec le reste à reverser du mois.
3. Saisissez la **Référence du virement** (obligatoire).
4. Cliquez sur **Enregistrer**.

Le bénéficiaire est le **Receveur général du Trésor (DGCPT)**. Le reversement est inscrit au journal d'audit (`REDEVANCE_REVERSEMENT_ETAT`). Le bouton n'apparaît que dans le circuit `OPERATEUR` ; dans le circuit `TRESOR`, l'onglet indique que les compagnies paient directement le Trésor et qu'aucun reversement n'est dû par WawID.

### Rapprochement

Dans le dispositif actuel, l'assiette repose sur les **déclarations des compagnies**. WawID compte de son côté chaque passager **contrôlé** (biométrie aux guichets et eGates, manifestes API/PNR). L'onglet **Rapprochement** liste les factures où les deux chiffres diffèrent :

| Colonne | Contenu |
|---|---|
| **Mois**, **Compagnie** | Période et compagnie |
| **Comptés WawID (taxables)** | Passagers comptés moins exonérations |
| **Déclarés** | Passagers déclarés par la compagnie |
| **Écart** | Différence et pourcentage (en rouge au-delà de 3 %) |
| **Montant non facturé** | Écart × 12 USD × taux IATA |

Un écart positif révèle des passagers non déclarés. Le total figure dans le bandeau de l'onglet. Utilisez ces éléments pour le contrôle et le contentieux de la DGCPT.

### Répartition

L'onglet **Répartition** ventile chaque mois les sommes **encaissées** (et non facturées) :

- **Part opérateur** : 75 % actuellement (décision du 4 décembre 2012), **conservée par WawID** dans le circuit `OPERATEUR`, **versée mensuellement par le Trésor** dans le circuit `TRESOR` ;
- **Part État** : le solde, 25 %, pour le Trésor public.

Un administrateur peut ouvrir **Paramètres** pour modifier :

1. **Taux (USD par passager)** ;
2. **Part opérateur (%)** ;
3. **Pénalité mensuelle (%)** ;
4. **Taux IATA du mois (FCFA / USD)**, appliqué au mois en cours ;
5. **Circuit de recouvrement** : **Compagnies → WawID → Trésor public (proposé)** ou **Compagnies → Trésor public (DGCPT, décret 2012-519)** (voir « Circuit de recouvrement » et son avertissement juridique).

Cliquez sur **Enregistrer** ; la modification est journalisée (`REDEVANCE_PARAMETRES`). La clé de répartition est paramétrable pour refléter un nouveau contrat.

### Simulateur de modèle

Le **Simulateur de modèle** compare, sur plusieurs années, la part de l'État dans le contrat actuel et dans un modèle WawID. Renseignez :

- **Passagers taxables par an** (prérempli à partir des 6 mois de démonstration × 2), **Taux (USD)**, **FCFA pour 1 USD**, **Croissance annuelle du trafic (%)**, **Durée (années)** ;
- **Part opérateur actuelle (%)** ;
- **Gain d'assiette par le comptage WawID (%)** : passagers aujourd'hui non déclarés ;
- **Modèle WawID** : **Part des recettes** ou **Forfait annuel (marché de services)**, et la valeur correspondante (**Part WawID (%) ou forfait (M FCFA/an)**).

Le **Résultat pour l'État** affiche les recettes brutes sur la période, la part État dans le contrat actuel, la part État dans le modèle WawID et le gain pour l'État. Les résultats sont recalculés à chaque saisie.

> La simulation repose sur des hypothèses et sur des volumes de démonstration fictifs. Saisissez le trafic réel (statistiques AIBD / ANACIM) pour une étude chiffrée.

## Rôle du Trésor

L'**Agent du Trésor (redevance)** dispose des droits `read` et `finance` :

- il consulte la synthèse, les factures, le rapprochement, la répartition et les reversements ;
- il valide ou rejette les paiements déclarés par les compagnies, après rapprochement avec le relevé du compte de collecte (circuit `OPERATEUR`) ;
- il enregistre les reversements de la part de l'État au Receveur général du Trésor (circuit `OPERATEUR`) ;
- il enregistre les encaissements non déclarés par les compagnies, à partir du relevé du compte de collecte ou des quittances du Receveur général du Trésor ;
- il exporte les données pour la comptabilité publique ;
- il ne peut ni modifier les paramètres de la redevance (dont le circuit de recouvrement), ni intervenir sur les contrôles frontière, les alertes ou les e-Visa.

Toutes ses actions sont tracées dans le **Journal d'audit**.
