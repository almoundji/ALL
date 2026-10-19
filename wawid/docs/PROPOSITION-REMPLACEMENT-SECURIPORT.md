# Remplacement du système Securiport par WawID — note de proposition

*Document de travail WAW Telecom. Analyse fondée sur les cinq textes transmis ; à valider par un conseil juridique et par l'Agence judiciaire de l'État avant toute démarche.*

## 1. Ce que prévoient les textes

| Texte | Date | Contenu utile |
| --- | --- | --- |
| Contrat de prestations de services du Système intégré de contrôle de l'immigration (IICS) — contrat CET | 11 janvier 2011 | Securiport finance, construit et exploite le système, puis le transfère à l'État (Construction-Exploitation-Transfert). **Non transmis : à obtenir.** |
| Décret 2011-652 | 26 mai 2011 | Institue la « redevance de sécurité » (12 USD par passager embarqué ou débarqué sur vol commercial international), incluse dans le billet, liquidée par la compagnie ; versement mensuel au plus tard le 5 ; pénalité de 5 %. La redevance « finance **exclusivement** les investissements » du système intégré. |
| Arrêté interministériel Intérieur / Transports | 3 février 2012 | Assujettissement à compter du 1er octobre 2011 ; exonérations (équipage, billets ID, enfants de 0 à 2 ans, transit ≤ 24 h, vols déroutés) ; facturation en FCFA au taux IATA du mois ; collecte des statistiques par l'opérateur du 1er au 9 M+1, factures le 10, échéance fin M+1. |
| Deuxième amendement au contrat | 1er mars 2012 | Exonération de droits et taxes sur le matériel et les logiciels importés pour l'IICS, par périodes de 5 ans renouvelables. |
| Décret 2012-519 | 18 mai 2012 | Le **recouvrement passe à la Direction générale de la Comptabilité publique et du Trésor (DGCPT)** ; les compagnies reversent au Receveur général du Trésor ; contrôle et contentieux par la DGCPT. |
| Décision du ministre de l'Économie et des Finances (sur décret 2012-1259) | 4 décembre 2012 | Versement mensuel à Securiport LLC de **75 % des recettes** collectées par le Trésor. |

### Lecture
- **La redevance appartient au dispositif réglementaire, pas à Securiport.** Depuis 2012, c'est le Trésor qui encaisse. Le nom de Securiport subsiste dans la décision de versement de 75 % (et le décret 2012-1259 qui l'autorise) et, bien sûr, dans le contrat.
- **L'État conserve 25 %** des recettes alors que le système, en CET, a vocation à lui revenir.
- **L'assiette dépend des déclarations des compagnies**, vérifiées a posteriori. Aucun comptage indépendant des passagers n'est prévu par les textes.

## 2. Points à vérifier avant toute décision
Le contrat principal et le premier amendement ne figurent pas dans les pièces transmises. Ils conditionnent la stratégie :
1. **Durée et échéance** du contrat, conditions de renouvellement.
2. **Clause de transfert** (CET) : date, contenu (matériel, logiciels, codes sources, données), état exigé des équipements.
3. **Résiliation** : pour faute, pour motif d'intérêt général, indemnités prévues, préavis.
4. **Exclusivité** éventuelle et clause de non-concurrence.
5. **Propriété et réversibilité des données** (biométrie, historiques de passages), lieu d'hébergement.
6. **Droit applicable et règlement des différends** (arbitrage international : risque financier à chiffrer).
7. **Montants réellement versés** depuis 2012 (source : DGCPT), pour établir la référence économique.

## 3. Voies de remplacement

| Voie | Principe | Délai | Risque |
| --- | --- | --- | --- |
| **A. Échéance / transfert** | Laisser le contrat arriver à son terme, exiger le transfert CET, confier l'exploitation à WawID | Selon échéance | Faible ; dépend de la date |
| **B. Résiliation négociée** | Accord de sortie (indemnité forfaitaire, transfert anticipé, période de recouvrement) | 6 à 12 mois | Moyen ; coût de sortie |
| **C. Résiliation pour motif d'intérêt général** | Décision de l'État, indemnisation selon le contrat et le droit administratif | Variable | Élevé si arbitrage |

Dans les trois cas, l'attribution à WawID passe par une procédure conforme au Code des marchés publics ou à la loi sur les contrats de partenariat public-privé (marché de services, PPP ou entente directe dûment motivée), puis par un nouvel acte de répartition remplaçant la décision du 4 décembre 2012.

## 4. Ce que WawID apporte
- **Périmètre fonctionnel équivalent et étendu** : contrôle guichet (MRZ, puce NFC, biométrie multimodale), eGates et kiosques ABC, Threat Monitor, listes Interpol / FPR / WAPIS / personnes d'intérêt, règles de ciblage, APIS / PNR avec passerelle pour les compagnies, e-Visa et pré-enrôlement eGate (la redevance de sécurité, incluse dans le billet, est perçue auprès des compagnies aériennes), supervision des équipements, journal d'audit infalsifiable.
- **Module Redevance de sécurité** : calcul de l'assiette, exonérations de l'arrêté, factures en FCFA au taux IATA, pénalités de 5 %, encaissements au Trésor, répartition paramétrable.
- **Comptage indépendant des passagers** : chaque passager contrôlé (biométrie, manifestes API/PNR) est compté. Le rapprochement avec les déclarations des compagnies fait apparaître l'assiette non déclarée, aujourd'hui invisible pour le Trésor.
- **Souveraineté** : hébergement au Sénégal, propriété des données et des codes par l'État, transfert de compétences (voir `ARCHITECTURE.md`).

## 5. Modèle économique proposé
Trois options, à chiffrer avec le simulateur du back-office (Finances → Simulateur de modèle) sur le trafic réel :
1. **Part réduite des recettes** (par exemple 30 à 40 % au lieu de 75 %), dégressive avec le trafic.
2. **Forfait annuel de services** (marché à prix fixe), l'État conservant toute la redevance au-delà.
3. **PPP à la performance** : rémunération liée à la disponibilité (≥ 99,95 %), aux délais de passage et au taux de complétude de l'assiette.

Le texte du décret 2011-652 (affectation « exclusive » aux investissements du système) doit être relu à la lumière de l'option retenue : une éventuelle modification par décret peut être nécessaire.

## 6. Plan de transition (sans interruption du contrôle)
1. **Mois 0–1** : obtention du contrat et des montants versés ; audit juridique et technique ; choix de la voie.
2. **Mois 1–3** : pilote WawID à l'AIBD en parallèle du système en place (quelques guichets et eGates), passerelle API/PNR ouverte aux compagnies, rapprochement de la redevance.
3. **Mois 3–6** : bascule par vagues (AIBD, puis postes terrestres et maritimes), reprise des données selon la clause de réversibilité, formation des agents.
4. **Mois 6+** : exploitation, maintien en condition opérationnelle, audits annuels de sécurité.

## 7. Risques et parades
| Risque | Parade |
| --- | --- |
| Contentieux / arbitrage | Voie A ou B privilégiée ; chiffrage préalable des indemnités ; avis de l'Agence judiciaire de l'État |
| Continuité du service | Fonctionnement en parallèle, bascule par vagues, mode hors ligne des postes |
| Accès aux données historiques | Activation de la clause de transfert / réversibilité ; à défaut, démarrage à blanc avec les listes de surveillance nationales |
| Intégrations (Interpol, WAPIS) | Raccordement via le BCN Interpol et la plateforme nationale, déjà prévu dans WawID |
| Certification biométrique | SDK certifiés (NIST, ISO 30107-3) sélectionnés lors de l'appel d'offres matériel |

## 8. Prochaines étapes
1. Obtenir le contrat du 11 janvier 2011, le premier amendement et le décret 2012-1259.
2. Obtenir auprès de la DGCPT les recettes mensuelles et les versements à l'opérateur depuis 2012.
3. Faire valider la voie de remplacement par un conseil juridique.
4. Présenter une démonstration de WawID (en ligne) aux ministères de l'Intérieur, des Finances et des Transports aériens.
5. Proposer un pilote à l'AIBD.
