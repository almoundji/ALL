# Redevance de sécurité

Le module **Redevance de sécurité** (espace **Finances**) suit la redevance due par les compagnies aériennes pour chaque passager : assiette, exonérations, factures, encaissements au Trésor, pénalités de retard, rapprochement avec le comptage WawID et répartition des recettes.

Il s'adresse aux **agents du Trésor** et aux administrateurs.

| Action | Droit nécessaire | Rôles |
|---|---|---|
| Consulter le module, exporter, calculer l'assiette du mois, enregistrer un encaissement | `finance` | Agent du Trésor (redevance), Administrateur |
| Modifier les **Paramètres** de la redevance (taux, part opérateur, pénalité, taux IATA) | `system` | Administrateur |

> **Volumes fictifs.** Dans la démonstration, les compagnies, passagers, montants, taux de change et encaissements sont générés pour l'exemple. Ils ne reflètent ni le trafic réel ni les recettes réelles.

## Base juridique

| Texte | Date | Apport |
|---|---|---|
| Décret n° 2011-652 | 26 mai 2011 | Institue la redevance de sécurité : **12 USD par passager embarqué ou débarqué** sur vol commercial international, incluse dans le billet et liquidée par la compagnie ; pénalité de **5 %** en cas de retard. |
| Arrêté interministériel (Intérieur / Transports) portant modalités de recouvrement | 3 février 2012 | Exonérations ; facturation en **FCFA au taux IATA du mois** ; collecte des statistiques du 1er au 9 du mois suivant, émission des factures le 10, échéance à la fin du mois suivant. |
| Décret n° 2012-519 | 18 mai 2012 | Le recouvrement est confié à la **Direction générale de la Comptabilité publique et du Trésor (DGCPT)** ; les compagnies reversent au **Receveur général du Trésor** ; contrôle et contentieux par la DGCPT. |
| Décision du ministre de l'Économie et des Finances | 4 décembre 2012 | Versement mensuel à l'opérateur du système de **75 % des recettes** encaissées par le Trésor (part actuelle). |

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
| Échéance et reversement au Receveur général du Trésor | Fin du mois M+1 |
| Pénalité de retard | 5 % par mois de retard après l'échéance |

## Les onglets

Le bouton **Exporter** (en haut à droite) télécharge toutes les factures au format CSV (`wawid-redevance.csv`) : passagers comptés, exonérés, taxables, déclarés, taux, montants, payé, reste dû, pénalité et statut.

### Synthèse

- Indicateurs sur 6 mois : **Facturé (6 mois)**, **Encaissé au Trésor** (avec le taux de recouvrement), **Restant dû** (et nombre de factures en retard), **Pénalités de retard**, **Passagers non déclarés** (et assiette manquante estimée).
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
| **Statut** | **PAYÉE**, **PARTIELLE**, **ÉMISE** ou **EN RETARD** (avec le nombre de mois de retard) |

**Montant de la facture** = passagers déclarés × 12 USD × taux IATA du mois (FCFA pour 1 USD), arrondi au franc.

**Pénalité** = reste dû × 5 % × nombre de mois de retard. Chaque période de 30 jours entamée après l'échéance compte pour un mois. La pénalité n'est pas capitalisée.

#### Enregistrer un encaissement du Trésor

1. Cliquez sur la facture.
2. La fenêtre détaille la période, les passagers comptés par WawID, chaque exonération, les passagers taxables, les passagers déclarés (avec l'écart éventuel), le taux, le montant, les dates, l'encaissé, le reste dû, les pénalités et les encaissements déjà enregistrés.
3. Dans **Enregistrer un encaissement (quittance du Trésor)**, vérifiez le **Montant (FCFA)**, prérempli avec le reste dû augmenté des pénalités.
4. Saisissez la **Référence de quittance** délivrée par le Trésor (à défaut, une référence `RGT-…` est générée).
5. Cliquez sur **Enregistrer**.

L'encaissement est daté, attribué à votre nom et inscrit au journal d'audit (`REDEVANCE_ENCAISSEMENT`). Un paiement partiel fait passer la facture **PARTIELLE** ; un solde nul la fait passer **PAYÉE**.

#### Calculer l'assiette du mois en cours

Le bouton **Assiette du mois en cours (WawID)** calcule une assiette provisoire à partir des passages enregistrés par WawID (guichets et eGates) pendant le mois en cours : par code compagnie, nombre de passagers contrôlés, dont enfants de 0 à 2 ans, et montant estimé en USD. Les factures définitives restent émises le 10 du mois suivant.

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

- **Part opérateur** : 75 % actuellement (décision du 4 décembre 2012), versée mensuellement ;
- **Part État** : le solde, 25 %, pour le Trésor public.

Un administrateur peut ouvrir **Paramètres** pour modifier :

1. **Taux (USD par passager)** ;
2. **Part opérateur (%)** ;
3. **Pénalité mensuelle (%)** ;
4. **Taux IATA du mois (FCFA / USD)**, appliqué au mois en cours.

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

- il consulte la synthèse, les factures, le rapprochement et la répartition ;
- il enregistre les encaissements à partir des quittances du Receveur général du Trésor ;
- il exporte les données pour la comptabilité publique ;
- il ne peut ni modifier les paramètres de la redevance, ni intervenir sur les contrôles frontière, les alertes ou les e-Visa.

Toutes ses actions sont tracées dans le **Journal d'audit**.
