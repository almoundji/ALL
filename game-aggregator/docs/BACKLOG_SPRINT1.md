# Backlog du Sprint 1 — « Une partie de bout en bout »

> **Sprint Review :** objectif atteint. S1-1 à S1-11 livrées (les deux stories de réserve comprises), 34 tests backend
> et un test de bout en bout de la fonction Netlify. Démo : connexion avec la clé de l’opérateur démo, création d’un joueur,
> crédit, activation du jeu « Dés de Yoon », session, tours joués et vérifiés publiquement, journal d’audit intègre.

**Objectif de sprint :** en tant qu'opérateur, je lance un jeu de démonstration pour un joueur, le joueur mise et gagne,
et le solde est juste.

Durée : 2 semaines. Capacité estimée : 40 points (équipe de 4 développeurs). Points de Fibonacci.
Toutes les stories respectent la *Definition of Ready* de `SCRUM.md` § 5 : module, critères Gherkin, estimation.

| # | Story | Module | Pts | Critères d'acceptation | État |
| --- | --- | --- | --- | --- | --- |
| S1-1 | En tant qu'admin Yoon, je crée un opérateur et j'obtiens sa clé d'API | M1 | 5 | **Étant donné** un admin authentifié, **quand** il crée l'opérateur « Casino Dakar », **alors** une clé d'API est renvoyée une seule fois et stockée hachée ; un second appel `GET` ne la montre plus. | ✅ |
| S1-2 | En tant qu'opérateur, je m'authentifie par clé d'API | M1 | 3 | Une clé valide donne accès à `/api/operators/me` ; une clé révoquée ou inconnue renvoie 401. | ✅ |
| S1-3 | En tant qu'admin, j'enregistre le fournisseur de démonstration et son jeu « Dés de Yoon » | M2, M3 | 5 | Le fournisseur `demo` est créé avec son adaptateur interne ; le jeu apparaît dans `GET /api/catalog/games` avec catégorie, RTP 96 %, mises min/max en XOF. | ✅ |
| S1-4 | En tant qu'opérateur, j'active un jeu du catalogue pour mon compte | M3 | 3 | Un jeu non activé ne peut pas être lancé ; la liste des jeux actifs est filtrable par fournisseur. | ✅ |
| S1-5 | En tant qu'opérateur, je crée un joueur rattaché à mon compte | M4 | 3 | Un joueur de moins de 18 ans est refusé (422 avec motif) ; l'identifiant externe de l'opérateur est unique par opérateur. | ✅ |
| S1-6 | En tant qu'opérateur, je crédite et débite le portefeuille interne d'un joueur | M5 | 8 | Chaque écriture porte une clé d'idempotence ; rejouer la même clé renvoie la même réponse sans second débit ; un débit supérieur au solde est refusé ; le solde est la somme du grand livre. | ✅ |
| S1-7 | En tant qu'opérateur, je lance une session de jeu | M6 | 5 | Renvoie un jeton opaque et une URL de lancement ; le jeton expire après 30 min d'inactivité ; mode démo ou argent réel. | ✅ |
| S1-8 | En tant que joueur, je joue un tour (mise + gain) | M7, M8 | 8 | Solde final = solde initial − mise + gain ; le tour passe par les états ouvert → gain → clos ; le résultat est produit par le RNG avec graine serveur + graine client + nonce, vérifiable après coup. | ✅ |
| S1-9 | Toute action sensible est journalisée dans l'audit chaîné | M10 | 5 | Création d'opérateur, de joueur, écriture de portefeuille et clôture de tour produisent une entrée ; `GET /api/audit/verify` renvoie `ok` et détecte une entrée altérée. | ✅ |
| S1-10 | Lanceur opérateur avec chiffres réels | UX | 3 | Les tuiles Jeux actifs, Joueurs et Sessions affichent les compteurs de l'opérateur connecté. | ✅ |
| S1-11 | Liste et fiche jeu (List Report / Object Page) | UX, M3 | 5 | Filtres par catégorie et fournisseur ; action principale « Activer » ; fiche avec RTP, volatilité, mises. | ✅ |

**Total : 53 points** pour 40 de capacité. Les stories S1-10 et S1-11 (8 pts) étaient en **réserve** ; elles sont entrées
une fois S1-1 à S1-9 terminées et ont été livrées.

## Ordre conseillé

1. S1-1, S1-2 (authentification : tout le reste en dépend).
2. S1-6 (portefeuille) en parallèle de S1-3, S1-4, S1-5.
3. S1-7 puis S1-8 (la partie elle-même).
4. S1-9 au fil de l'eau : chaque story ajoute ses entrées d'audit dans sa propre *Definition of Done*.

## Risques identifiés au Planning

| Risque | Mitigation |
| --- | --- |
| Idempotence mal comprise → doubles débits | Test automatique de rejeu obligatoire dans S1-6 avant tout autre test |
| RNG « maison » non certifiable | S1-8 isole le RNG derrière une interface ; le fournisseur de démo l'utilise, les vrais fournisseurs apportent le leur |
| Partenaire agréé (banque / EME) non identifié | Hors sprint : action du PO, point au Comité de pilotage |

## Rétrospective (points pour le Sprint 2)

- `/docs` était pris par Swagger : la documentation interactive est désormais sur `/api/docs`, l’onglet utilisateur sur `/documentation`.
- Les noms de modules sont désormais renvoyés en FR et EN par l’API (`name`, `name_en`).
- La fonction Netlify (recette) duplique le métier Python : prévoir au Sprint 2 une extraction des règles communes
  (limites, états) dans un fichier de spécification partagé pour éviter la dérive.
- Dette : horodatages en UTC naïf, pas de pagination sur les listes, pas de limites de jeu responsable (Sprint 2).
