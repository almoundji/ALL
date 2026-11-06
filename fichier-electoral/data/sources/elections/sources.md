# Sources, couverture et niveau de confiance

Données collectées le 2026-11-06. Aucun chiffre n'a été estimé ou inventé. Quand une donnée manque, la case est vide.
Les fichiers sont en UTF-8, séparateur `;`, format long.

## Format des fichiers

Colonnes communes : `election;niveau;region;departement;liste_ou_candidat;voix;inscrits;votants;exprimes;sieges;pct`

- J'ai ajouté une colonne `pct` en fin de ligne. C'est le pourcentage des suffrages exprimés du niveau concerné, calculé à partir des voix et arrondi à 2 décimales. Je l'ai ajoutée parce que la consigne demande « votes et % ».
- Les fichiers des législatives ont deux colonnes de plus : `sieges_proportionnel;sieges_majoritaire`. Sur une ligne `national`, `sieges` donne le total des sièges de la liste. Sur une ligne `departement` ou `diaspora`, il donne les sièges du scrutin majoritaire remportés dans cette circonscription.
- `niveau` vaut `national`, `region`, `departement` ou `diaspora`. Pour la diaspora, `region` = `ETRANGER` et `departement` = nom de la circonscription.
- Le fichier des locales utilise le niveau `commune` et ajoute les colonnes `commune;maire_elu;statut`.
- Noms des départements : en majuscules, sans accents (BIRKELANE, MBOUR, NIORO DU RIP, RANEROU FERLO, SAINT LOUIS, MEDINA YORO FOULAH, KEUR MASSAR…). Le PDF de l'UE écrit « Birkilane », je l'ai normalisé en BIRKELANE.

---

## presidentielle_2024.csv : présidentielle du 24 mars 2024

Couverture : **national, 14 régions, 46 départements et 8 circonscriptions de la diaspora** (plus une ligne « TOTAL DIASPORA »). Les 19 candidats figurent à chaque niveau. Lignes `departement` et `diaspora` : 54 circonscriptions × 19 candidats.

Sources :
- **Niveau département / diaspora** : rapport final de la Mission d'observation électorale de l'UE (MOE UE Sénégal 2024), Annexe II, « Élection présidentielle — Résultats définitifs Conseil constitutionnel ». Le tableau est daté du 28/03/2024 et donne, par département, le nombre de bureaux, les inscrits, les votants, les nuls, les exprimés et les voix des 19 candidats.
  - Copie utilisée : https://www.vie-publique.sn/documents/8211/rapport-final-mission-observation-electorale-union-europeenne-presidentielle-senegal-2024 (PDF : https://www.vie-publique.sn/docs/15b8188c-4723-4670-bd3e-0ef90ab8c2aa/rapport-final-mission-observation-electorale-union-europeenne-presidentielle-senegal-2024.pdf)
  - Original EEAS, qui renvoie une erreur 403 aux robots : https://www.eeas.europa.eu/sites/default/files/documents/2024/Rapport%20final_MOE%20UE%20Senegal_240524.pdf
  - Extraction : `pdftotext -layout`, puis analyse automatique. **Contrôles réussis** : la somme des 54 circonscriptions est égale au total du tableau et au total officiel pour les inscrits (7 371 890), les votants (4 519 253), les nuls (34 125), les exprimés (4 485 128) et chacun des 19 candidats. Dans chaque circonscription, la somme des voix est égale aux exprimés, et votants − nuls = exprimés.
- **Niveau national** : DGE, « Résultats de l'élection présidentielle 2024 », https://dge.sn/wp-content/uploads/2024/09/Resultats-de-lelection-presidentielle-2024.pdf. Les chiffres sont identiques à ceux de l'annexe UE et de Wikipédia FR.
- **Niveau région** : agrégé par mes soins, en additionnant les départements selon le découpage administratif (14 régions). C'est une valeur dérivée, pas une publication officielle.

Confiance : **élevée**. Il s'agit de résultats définitifs reproduits par la MOE UE, et tous les totaux se recoupent exactement. Recoupement ponctuel avec la presse (Sud Quotidien) : Amadou Ba obtient 86 730 voix à Matam, 56 542 à Kanel et 12 576 à Ranérou, comme dans le fichier. Le rapport UE donne aussi 64,44 % à Faye à Keur Massar, ce qui correspond.
Remarque : la RTS a publié par erreur 1 655 014 voix pour Amadou Ba. Le chiffre officiel est 1 605 086.

## legislatives_2024.csv : législatives anticipées du 17 novembre 2024

Couverture :
- **National, complet et officiel** : les 41 listes, avec voix, inscrits (7 371 891), votants (3 650 120), exprimés (3 623 633), nuls (26 487) et sièges au proportionnel et au majoritaire. Sources :
  - Décision n° 20/E/2024 du Conseil constitutionnel (27/11/2024), PDF scanné : https://www.cena.sn/rapports/decision/Decision-20.E.2024.pdf (également sur https://www.vie-publique.sn/documents/8039/...). J'ai lu les pages 2 à 4 visuellement : le tableau des 41 listes et les totaux.
  - DGE : https://dge.sn/wp-content/uploads/2025/05/Resultats-des-elections-legislatives-anticipees-2024.pdf (identique).
  - Contrôles : la somme des 41 listes vaut 3 623 633 (les exprimés), le proportionnel totalise 53 sièges et le majoritaire 112.
- **Départements et diaspora : seulement les sièges majoritaires et la liste gagnante**, sans les voix. Les 46 départements totalisent 97 sièges et les 8 circonscriptions de la diaspora 15. Source : Wikipédia EN « 2024 Senegalese parliamentary election », tableaux « By department » et « By overseas constituency » (https://en.wikipedia.org/wiki/2024_Senegalese_parliamentary_election). Contrôles : PASTEF obtient 87 sièges dans les départements et 14 dans la diaspora, soit 101. Takku Wallu en obtient 6 + 2 = 8 (Goudiry, Kanel, Matam, Ranérou, Afrique centrale), ce qui correspond à la décision du CC. Jàmm ak Njariñ obtient 2 sièges (Podor) et Andu Nawlé 1 (Gossas). La presse confirme : PressAfrik (« Pastef battu à Matam, Goudiry, Ranérou ») et Le Quotidien (« Jamm ak Njariñ gagne à Podor »).
- **Manquant : les voix par département.** Je n'ai trouvé aucun tableau complet, officiel ou fiable :
  - le site du Conseil constitutionnel ne publie pas les annexes « bureau par bureau » ;
  - le rapport CENA et le JO n° 7785 ne contiennent que la décision ;
  - le portail vie-publique.sn affiche une carte alimentée par une API non documentée, que je n'ai pas interrogée ;
  - la presse publie des chiffres départementaux provisoires épars, par exemple Pikine (Pastef 116 898, Takku Wallu 27 632, Samm Sa Kaddu 9 771, Dakaractu), Mbour (Pastef 100 933, TWS 19 918, Andu Nawlé 16 903, Le Quotidien), Kaolack (Pastef 67 114, TWS 17 430, Seneweb), Dagana (Pastef 34 065, TWS 25 233), Fatick (Pastef 28 052, APS) et Ranérou (TWS 8 289, Pastef 5 550, PressAfrik). Ce sont des chiffres **provisoires des commissions départementales**, pas les chiffres définitifs, et ils ne sont **pas** intégrés au CSV.
- Remarque : dans la plupart des départements, Takku Wallu, Jàmm ak Njariñ et Sàmm Sa Kàddu ont présenté des **listes communes (« inter-coalition »)** au scrutin majoritaire (Sud Quotidien, 30/09/2024). Les sièges départementaux d'une coalition d'opposition reflètent donc parfois une liste commune.
- Pulse indique 26 326 bulletins nuls ; le CC et la DGE donnent 26 487. J'ai retenu 26 487.

Confiance : **élevée** pour le niveau national et la répartition des sièges, **nulle** pour les voix départementales (absentes).

## legislatives_2022.csv : législatives du 31 juillet 2022

Couverture : **national uniquement** (8 listes, voix, inscrits 7 036 466, votants 3 279 110, exprimés 3 260 886, nuls 18 224, sièges au proportionnel et au majoritaire).
Sources :
- Wikipédia FR « Élections législatives sénégalaises de 2022 » et EN « 2022 Senegalese parliamentary election ». Ces pages citent la décision n° 20-E-2022 du Conseil constitutionnel (11/08/2022). L'URL d'origine https://conseilconstitutionnel.sn/decision-n-20-e-2022-affaires-n-28-e-22-et-n-29-e-22/ renvoie aujourd'hui une erreur 404, et je n'ai pas pu consulter l'archive web.archive.org, inaccessible depuis cet environnement.
- Recoupement presse des 3 premières listes : Dakaractu, résultats provisoires CNRV (BBY 1 518 137, YAW 1 071 139, Wallu 471 517) ; Senegal7 et Sud Quotidien pour la répartition des sièges (BBY 57 au majoritaire + 25 au proportionnel ; YAW 39 + 17 ; Wallu 16 + 8).
- Contrôles : la somme des voix vaut 3 260 886 (les exprimés), votants − nuls = exprimés, et on compte 53 sièges au proportionnel et 112 au majoritaire.
- **Manquant : les résultats par département.** Le nombre de sièges par département est connu (fichier `referentiel_departements_sieges.csv`, identique en 2022 et en 2024 ; source Senegal Direct/PressAfrik du 01/08/2022 et Wikipédia FR 2024). En revanche, je n'ai pas trouvé de liste fiable des listes gagnantes ni des voix par département. Pulse.sn (« Législatives 2022 : les résultats par département [Provisoire] ») donne des chiffres provisoires partiels et parfois incohérents (deux valeurs pour Bignona, regroupements YAW/Wallu variables). Je ne les ai pas intégrés.
- Remarque : en 2022, **Yewwi Askan Wi et Wallu Sénégal ont présenté des listes communes dans les départements** (inter-coalition), mais des listes nationales séparées. Au proportionnel, la liste des titulaires de YAW et la liste des suppléants de BBY ont été déclarées irrecevables (rapport CENA législatives 2022, p. 51-52, https://www.cena.sn/rapports/Rapport_CENA_Legislatives_2022_OK.pdf). C'est pourquoi Ousmane Sonko ne figurait pas sur la liste nationale.

Confiance : **bonne** (Wikipédia, qui cite le CC, et recoupement presse) ; je n'ai pas pu vérifier le document du CC lui-même.

## presidentielle_2019.csv : présidentielle du 24 février 2019

Couverture : **national uniquement** (5 candidats, inscrits 6 683 043, votants 4 428 680, nuls 42 541, exprimés 4 386 139).
Sources : DGE, https://dge.sn/wp-content/uploads/2024/09/Resultats-de-lelection-presidentielle-2019.pdf (officiel) ; mêmes chiffres sur Wikipédia FR et EN, qui citent la décision n° 4-E-2019 du CC, et dans le rapport CENA 2019 (https://www.cena.sn/rapports/Rapport_CENA_Presidentielle2019.pdf).
- **Manquant : les résultats par département.** Le rapport final de la MOE UE 2019 (https://www.eods.eu/library/senegal_moe_ue_2019_rapport_final.pdf, p. 44-47) ne contient pas de tableau, seulement des cartes et quelques pourcentages cités dans le texte. Je les donne ici pour information, sans les intégrer au CSV puisque les voix manquent :
  - Thiès : Seck 47,15 %, Sall 39,44 % ;
  - Mbacké : Seck 58,29 %, Sall 30,44 % ;
  - Bignona : Sonko 62,89 %, Sall 33,50 % ;
  - Oussouye : Sonko 49,37 %, Sall 46,68 % ;
  - Ziguinchor : Sonko 53,19 %, Sall 42,32 % ;
  - Podor : Sall 93,40 % ;
  - Sonko obtient 22,28 % à Dakar et 19,66 % à Pikine ;
  - Sonko est en tête en Amérique-Océanie (45,87 %) et obtient 40,85 % en Europe ouest-centre-nord.

Confiance : **élevée** au niveau national.

## locales_2022_principales_villes.csv : municipales du 23 janvier 2022

Couverture : maire élu et coalition dans les 20 communes les plus peuplées. **Aucune voix.**
Source : Wikipédia FR « Élections municipales sénégalaises de 2022 », tableau « Résultats dans les 20 villes les plus peuplées » (repris à l'identique sur la page EN « 2022 Senegalese local elections »). Le rattachement des communes aux départements est de mon fait (Touba et Mbacké → MBACKE ; Richard-Toll → DAGANA ; Bargny → RUFISQUE ; Joal-Fadiouth → MBOUR).
Confiance : **moyenne** (Wikipédia seul ; étiquettes de coalition simplifiées, par exemple « Nay Leer - Benno Bokk Yakaar » à Kolda).

## referentiel_departements_sieges.csv

Contient la correspondance région → département pour les 46 départements, ainsi que le nombre de sièges du scrutin majoritaire par département et par circonscription de la diaspora (identique en 2022 et en 2024 : 97 + 15 = 112).

## Pistes non abouties, pour compléter plus tard

- vie-publique.sn : la carte des résultats repose sur des données par département et par commune (endpoints `/api/carte/result` et `/api/elections/results/constituency/...`). Je n'ai pas utilisé cette API non documentée. Elle mériterait d'être demandée ou consultée avec l'accord de l'éditeur.
- cadakar.org (Cour d'appel de Dakar, qui publiait les « résultats définitifs détaillés ») : le domaine est aujourd'hui détourné vers un site de jeux. Les archives web.archive.org sont inaccessibles depuis cet environnement.
- elections.sec.gouv.sn (portail lié depuis dge.sn) : erreur 503 lors de la collecte.
