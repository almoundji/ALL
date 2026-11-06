# Inventaire : résultats électoraux du Sénégal à la commune et au bureau de vote (recherche du 2026-11-06)

## Synthèse

| Élection | Source publique la plus fine trouvée | Niveau commune / bureau ? |
|---|---|---|
| Présidentielle 24 mars 2024 | Annexe du rapport final MOE UE (déjà connue) ; PDF DGE national | **Non.** Aucun fichier public trouvé à la commune ou au bureau. |
| Législatives 17 nov. 2024 | **SAGE (Small-Area Global Elections Archive), parquet par bureau de vote** | **Partiel** : 27 départements sur 46, pas de diaspora, et une liste majeure (Takku Wallu) absente (voir plus bas) |
| Législatives 31 juil. 2022 | Articles de presse par département (Pulse.sn, provisoire) | Non |
| Présidentielle 2019 | PDF DGE national ; cartes par commune dans un article d'*Afrique contemporaine* (images seulement) | Non (pas de tableau) |

## 1. Téléchargé et converti : SAGE, législatives 2024 (`sage_legislatives2024/`)

- Source : <https://storage.googleapis.com/sage-archive/parquet/country=Senegal/year=2024/part-0.parquet> (750 Ko, lecture anonyme publique). Projet : <https://github.com/noahdasanaike/sage>, licence MIT, citation Dasanaike, *SAGE Dataset*, Harvard Dataverse doi:10.7910/DVN/YGJR1L. Le codebook (gs://sage-archive/codebook.pdf, §106) indique comme source « Conseil Constitutionnel » et précise « Election data are incomplete ». La version v1.4 date du 2026-11-01.
- Fichiers :
  - `senegal_2024_part-0.parquet` : l'original.
  - `legislatives2024_bureaux_SAGE.csv` : 404 484 lignes (bureau × liste) au format demandé. Les colonnes `departement`, `commune` et `lieu_vote` sont passées en majuscules. `region` est ajoutée depuis la carte électorale 2024. `inscrits` correspond à `reg` de SAGE. `votants` et `exprimes` sont **laissés vides** (voir le défaut ci-dessous).
  - `legislatives2024_communes_SAGE_agrege.csv` : agrégation par commune (332 communes). `inscrits` reste vide quand un bureau de la commune n'a pas cette donnée.
  - `couverture_par_departement.csv` : bureaux et inscrits de SAGE comparés à la carte électorale de la présidentielle de février 2024.
  - `sage2csv.py` : le script de conversion.
- Noms des listes : ils sont repris de SAGE, qui en a traduit certains en anglais. Exemple : « Patriots of Senegal » = PASTEF ; « The March of the Territories / Andu Nawlé » = La Marche des territoires.
- **Couverture** :
  - 27 départements sur 46. Dans chacun d'eux, 100 % des bureaux de la carte sont présents (10 932 bureaux, soit 69,9 % des 15 633 bureaux du territoire national et 66,5 % de l'ensemble avec la diaspora).
  - Les 19 départements absents sont Foundiougne, Malem Hodar, Guinguinéo, Kaolack, Nioro du Rip, Kédougou, Salémata, Saraya, Kolda, Médina Yoro Foulah, Vélingara, Kébémer, Linguère, Louga, Kanel, Matam, Ranérou Ferlo, Dagana et Oussouye. Les 8 circonscriptions de la diaspora sont absentes aussi.
  - PASTEF : 1 470 436 voix contre 1 991 770 au niveau national, soit **73,8 %**.
  - Somme des voix des listes présentes : 2 184 241 contre 3 623 633 exprimés, soit 60,3 %. Ce chiffre n'est pas comparable aux exprimés officiels, à cause des listes manquantes.
- **Défauts constatés** (ne pas utiliser sans précaution) :
  - **Takku Wallu Sénégal (531 466 voix au niveau national) est absente de 26 des 27 départements.** Elle n'apparaît qu'à Guédiawaye, avec 6 223 voix. Or Guédiawaye est justement le seul département où il manque d'autres listes (Jàmm ak Njariñ, Gox Yu Bess, Union Naatall Kaaw-Gui, Xaal Yoon) : il y a donc un soupçon de décalage de colonnes. La liste AKS (21 391 voix au national selon la décision du CC) ne compte que 200 voix dans SAGE, et Jël Linu Moom et la coalition Sopi manquent dans plusieurs départements.
  - Dans SAGE, `total_votes` n'est que la somme des listes présentes, et non les exprimés du PV. C'est pourquoi `exprimes` est laissé vide.
  - `reg` (inscrits) manque pour 751 bureaux à Thiès, 210 à Ziguinchor et 161 à Kaffrine.
- **Recoupements avec des chiffres publiés** :
  - Pikine : PASTEF 116 898 dans SAGE, 116 898 dans Dakaractu (CDRV).
  - Département de Thiès : PASTEF 119 578, Sàmm Sa Kàddu 28 232, Jàmm ak Njariñ 11 604, Sénégal Kesé 3 822 et And Soxali 3 481 sont identiques à l'article de Seneweb. En revanche, Takku Wallu (6 065 selon Seneweb) manque, et la somme des voix (182 976) est inférieure aux exprimés officiels (190 856).
  - Bureau 20 de l'école Ouakam Camp : PASTEF 168, identique à Senego.
  - Bureau 1 de l'école 3 de Bakel : 523 inscrits, identique à la carte électorale.
  - Conclusion : les voix présentes semblent fidèles aux PV, mais le jeu est incomplet.

## 2. Autres sources examinées (non retenues ou sans détail communal)

- **DGE**, <https://dge.sn/resultats-officiels-des-elections-anterieures/> : PDF de 2 pages, uniquement nationaux, pour les présidentielles 2019 et 2024 et les législatives 2024. Il n'y a pas de PDF pour les législatives 2022. Les copies sont dans `../src_dge/`.
- **vie-publique.sn** : les onglets Résultats et Statistiques sont seulement nationaux et n'offrent pas d'export. Les documents « Implantation des bureaux de vote législatives 2024 » et « Carte électorale de l'étranger » ne contiennent pas de résultats. La décision CC n° 20/E/2024 (PDF scanné de 7,8 Mo, 9 pages) ne donne que le tableau national et les sièges. La fiche de vie-publique rappelle que « les résultats bureau de vote par bureau de vote doivent être publiés au Journal officiel ». La décision CC n° 7/E/2024 (présidentielle) est seulement nationale.
- **conseilconstitutionnel.sn** : inaccessible depuis cet environnement (connexion réinitialisée, HTTP 503).
- **GitHub** :
  - senegalouvert/carte-electorale-2024, senegalouvert/Carte-electorale-2019, Thialala/sunu-election-pr-2024 et woralal12/senegal-election-2024 (`Senegal-carte-electorale-2024.xlsx`, récupéré dans `../src_carte/`) contiennent la **carte électorale** (bureaux et électeurs) mais **aucun résultat**. Ils restent utiles comme référentiel bureau / commune pour la jointure.
  - mumairr/Senegal-Elections-GIS (2019, régions et départements) ne publie pas ses données.
- **HDX** : l'API a refusé l'accès (403). **Kaggle** : rien trouvé.
- **Presse** : seulement des articles isolés par département ou par bureau (Dakaractu pour Pikine, Seneweb pour Thiès et Oussouye, Seneweb pour le centre de Paris en 2024, Pulse.sn pour les départements en 2022 provisoires : <https://www.pulse.sn/article/legislatives-2022-les-resultats-par-departement-provisoire-2024073013353547805>). Aucune table nationale par commune.
- **Présidentielle 2019** : l'article de N. Robin dans *Afrique contemporaine* 267 (Cairn) cartographie les résultats par commune en citant le Conseil constitutionnel. Cela laisse penser qu'un tableau par commune a circulé, mais il n'a pas été trouvé en ligne (Cairn renvoie un 403). Le rapport final de la MOE UE 2019 est sur eods.eu (non vérifié).

## 3. Lacunes et demandes officielles possibles

Il n'existe aucun jeu public complet à la commune ou au bureau pour 2024P, 2022L ou 2019P, et seulement un jeu partiel pour 2024L. Démarches possibles :
1. **DGE / Ministère de l'Intérieur (DAGAT)** : demander les fichiers de résultats par bureau de vote (export du logiciel de centralisation) pour 2019, 2022 et 2024P/2024L, ou les PV des commissions départementales de recensement des votes (CDRV).
2. **Conseil constitutionnel** : demander les annexes de résultats bureau par bureau des décisions 7/E/2024 et 20/E/2024. La fiche vie-publique de la décision 20/E/2024 indique qu'ils doivent être publiés au Journal officiel. On peut aussi consulter les **numéros du JORS** qui suivent ces décisions.
3. **CENA** : rapports généraux et PV collectés par ses contrôleurs.
4. **Cour d'appel de Dakar** (Commission nationale de recensement des votes) : PV nationaux et départementaux.
5. **SAGE (N. Dasanaike)** : demander la source exacte des données sénégalaises (PV du CC ?) et signaler la colonne Takku Wallu manquante.
6. Partis et coalitions (PASTEF, Takku Wallu), ainsi que les plateformes d'observation (COSCE, PACTE) : leurs bases de PV compilés le soir du scrutin, d'après la MOE UE.
