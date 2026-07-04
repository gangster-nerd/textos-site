# ENTITY-GRAPH-DRAFT.md

## 1. Contexte de phase

Document canonique de **Phase 1 — extraction de doctrine (READ-ONLY)**. Il extrait la doctrine réelle du produit `textos-v0` (`~/Desktop/textos`) afin que le futur site témoin public `textos.xyz` (placeholder ; produit derrière authentification `app.textos.xyz`) ne survende jamais ce que TextOS fait aujourd'hui.

Contraintes de cette phase : aucune implémentation, aucun code, aucun package, aucun composant, aucune migration, aucun commit. `textos-v0` reste inchangé.

Objectif directeur : rendre impossible pour le site public d'overclaimer. Toute affirmation non prouvée est marquée. L'absence d'une source attendue est documentée comme un fait, jamais compensée par extrapolation.

### 1.1 Décisions Product Owner validées (2026-07-04)

Décisions explicites de Marc, contraintes canoniques du site. Elles restreignent le périmètre ; elles n'ajoutent aucune capacité.

1. Authority Score composite : abandonné en V1 ; les trois mesures restent séparées.
2. Pas d'intervalle de confiance en V1 : seulement dispersion / complétude / méthode / panel.
3. Tables sans logique métier : jamais au présent marketing.
4. Understand / Act / RepOS intersection : roadmap ou premium `planned`, jamais « available today ».
5. Indirect Mention Share non observable avec Perplexity V0 : afficher « non observable », jamais « 0 % ».
6. Site V1 : éditorial + méthodologie + glossaire + doctrine, pas branché sur donnée live.
7. Dogfooding réel : phase ultérieure, uniquement quand un export / run réel post-S7 existe.

### 1.2 Delta post-snapshot — S8 (Claim Evidence Layer) commité (2026-07-04)

Fraîcheur produit : entre la lecture initiale de Phase 1 et cette mise à jour, S8 est passé de `planned` à **commité**. Ce delta est documenté ici ; il ne transforme aucune capacité en argument marketing disponible.

Fichiers observés (commit `1178684` — « feat(textos): claim evidence layer (S8 — answer evidence + extraction deterministe) ») :

- `src/server/textos/observe/answer-evidence.ts` (+ `.test.ts`)
- `src/server/textos/observe/claims.ts` (+ `.test.ts`)
- `src/server/textos/observe/claims-reader.ts` (+ `.test.ts`)
- `src/server/textos/db/schema/answer-evidence.ts` (nouvelle table `answer_evidence`)
- `drizzle/0003_*.sql` (+ snapshot) ; modifs `observe/orchestrator.ts`, `providers/perplexity/transform.ts`, `engine/types.ts`, `db/schema/index.ts`.

Ce que le commit implémente réellement :

- **Capture d'answer evidence** : texte de synthèse IA (`message.content`) normalisé (NFC, trim, collapse horizontal préservant `\n`), hashé SHA-256, **persisté** (échantillon non reproductible), additif, idempotent. Ce n'est pas le raw body (toujours refusé).
- **Extraction déterministe de claims** : fonction pure, lexique figé versionné (`claims-det-2b@0.1`), **aucun LLM**, **non persistée** (dérivation rejouable), oracle « 13 claims » validé par Marc.
- **`readClaims`** : enveloppe de lecture ; rejoue l'extraction, n'écrit rien.

Ce qui reste NON construit (inchangé) : typage des gaps (S9), jugement / Opportunity Brief (S10), logique TruthCheck, logique EvidenceBundle, intersection RepOS, extraction LLM riche (sprint 2A). Le code `readClaims` « ne type aucun gap, ne juge pas » (`ADR-012` §8).

Tests : présents ET **exécutés dans cette session** (`pnpm exec vitest run` sur les 3 fichiers) → **20/20 passent** (`claims` 7, `claims-reader` 4, `answer-evidence` 9). Commité (`1178684`), `git status` clean après lecture et après exécution des tests.

Statuts mis à jour :

| Objet | Avant (instantané) | Maintenant |
|---|---|---|
| Answer evidence (capture) | absent | `wip_committed_tested` (committed, 20 tests verts) |
| Extraction déterministe de claims | `planned` | `wip_committed_tested` — déterministe, non persistée |
| `claims-reader` | absent | `wip_committed_tested` |
| `Claim` (table) | `implemented_schema_only` | table inchangée ; extraction associée désormais commitée + testée |
| `EvidenceBundle` / `TruthCheck` / `OpportunityBrief` / `AuthorityGap` / `RepOSIntersection` | `planned` | `planned` (inchangé) |

Note de statut : ces objets S8 sont commités et testés, mais **pas encore validés PO pour le marketing**. Tant que cette validation n'est pas donnée, ils restent au statut `wip_committed_tested` du point de vue du site (marketable seulement une fois : committed + testé + validé PO).

Formulation critique (remplace tout absolu « S8 n'est pas implémenté ») : S8 était `planned` dans l'instantané initial. Une implémentation a depuis été **commitée et ses tests passent** ; elle couvre uniquement la capture d'evidence et l'extraction déterministe de claims. Elle ne doit pas être marketée comme disponible tant que le product owner ne l'a pas validée pour le site.

Conséquence marketing pour textos.xyz — restent `forbidden` sur le site public :

- « TextOS produces Opportunity Briefs »
- « TextOS verifies claims automatically » (S8 **extrait** des claims de façon déterministe ; il ne les **vérifie** pas — le TruthCheck n'est pas construit)
- « TextOS explains causality » / « TextOS understands why »
- « TextOS connects RepOS demand to authority gaps »
- « TextOS has an Authority Score »
- « TextOS guarantees Google rankings »
- « TextOS makes your brand appear in AI answers »

---

## 2. Méthode & hiérarchie de preuve

### 2.1 Hiérarchie d'autorité des sources (du plus fort au plus faible)

| Niveau | Type de source | Autorité | Ce que ça prouve |
|---|---|---|---|
| L1 | Tests (`*.test.ts`) | La plus forte | Invariant exécutable : comportement vrai, vérifié à l'exécution |
| L2 | Schémas / types / code métier | Vérité opérationnelle | Le code existe et impose des contraintes |
| L3 | ADR 001–012 (`docs/adr/`) | Doctrine validée | Une décision a été prise et figée |
| L4 | Vision / Measurement Vision (`docs/product/`) | Intention produit | Ce qu'on veut faire, pas ce qui est livré |
| L5 | README / notes | Contexte non normatif | Orientation, pas une preuve |

Règle d'arbitrage : en cas de tension, le niveau le plus bas (L1) gagne. Un test qui contredit une phrase de vision fait foi. La Vision décrit une destination ; les tests décrivent l'état.

### 2.2 Taxonomie de statut (attachée à chaque concept)

- `canonical` — vocabulaire / valeur de référence figée (enum, contrat de frontière).
- `implemented` — code + tests le prouvent (L1/L2).
- `doctrine` — un ADR le décide (L3), pas forcément de code.
- `planned` — spécifié (ADR / schéma), logique non construite.
- `candidate` — ambigu / proposition de site, à valider.
- `risky` — promesse marketing à encadrer strictement.
- `unsupported` — aucune preuve dans le repo.
- `forbidden` — interdit explicite par la doctrine.

### 2.3 Confiance (par concept)

`high` (ancré L1/L2) · `medium` (ancré L3) · `low` (L4/L5 ou inféré).

### 2.4 Sources trouvées, classées par niveau

- **L1 — Tests** (18 fichiers, ~175 cas). Les plus porteurs de doctrine : `observe/authority-presence.test.ts`, `observe/authority-presence-reader.test.ts`, `observe/quality-ledger.test.ts`, `db/__tests__/schema.test.ts`. Autres : `canonicalization`, `conformity`, `fixture-provider`, `measurement-method`, `query-hash`, `entity/resolution`, `entity/repository`, `observe/quality`, `observe/window`, `observe/orchestrator`, `query-panel/*`, `providers/perplexity/transform`, `providers/perplexity/transport.live`.
- **L2 — Schémas / code** : `db/schema/{enums,entities,observe,know,act,query-panel,setup,entity-domains,index}.ts` + `premium/repos-intersection.ts` ; `observe/{authority-presence,authority-presence-reader,quality-ledger,quality,window,orchestrator,repository}.ts` ; `engine/{canonicalization,conformity,fixture-provider,measurement-method,query-hash,types}.ts` + `providers/perplexity/*` + `fixtures/*` ; `entity/*` ; `query-panel/*`. (Racine : `src/server/textos/`.)
- **L3 — ADR** (12). Lus intégralement : 003, 004, 008, 009, 010, 011, 012. Lus par référence : 001, 002, 005, 006, 007.
- **L4 — Vision** : `docs/product/PRODUCT-VISION-TEXTOS.md` (contraignant) ; `docs/product/TextOS-MEASUREMENT-VISION.md` (non contraignant, tags 🟢/🟡/🔵).
- **L5** : `README.md`, `docs/adr/README.md`, `docs/inbox/SPRINT-V0-*.md`, `AGENTS.md`.

---

## 3. Sources attendues absentes (documenté comme fait)

Recherche exhaustive effectuée (motifs `glossar`, `principle`, `doctrine`, `invariant`, `lexicon`, `vocab`, hors `node_modules` / `.git` / `.next`) : résultat vide.

| Source attendue | Statut | Conséquence |
|---|---|---|
| `GLOSSARY.md` | ABSENT | Pas de glossaire canonique unique. Le vocabulaire de §6 est reconstruit depuis enums (L2) + ADR (L3), jamais copié d'un glossaire. Ne rien inventer d'absent. |
| `PRINCIPLES.md` | ABSENT | Les principes vivent dispersés dans les ADR et la Vision. §5 les consolide en citant chaque source. |
| `PRODUCT-SPEC-TEXTOS-V1.md` lu | PARTIEL | Non lu en Phase 1 : objets d'écran / workflow non couverts. |
| `PRODUCT-MARKET-LANDSCAPE-TEXTOS.md` lu | PARTIEL | Non lu : positionnement concurrentiel détaillé non couvert. |
| ADR 001 / 002 / 005 / 006 / 007 lus en entier | PARTIEL | Cités par référence via 008–012 ; passe complémentaire recommandée avant la spec du site (§24). |

Règle appliquée : l'absence d'un glossaire n'autorise aucune définition aspirationnelle. Chaque définition ci-dessous est ancrée à un test, un schéma ou un ADR, ou marquée `candidate`.

---

## 4. Résumé exécutif

TextOS est un Authority Intelligence System : un observatoire qui mesure, de façon reproductible et défendable, la présence d'autorité d'une entité auprès des moteurs de réponse IA. `L3` `ADR-004` §2 · `L4` `PRODUCT-VISION-TEXTOS.md` §1.

Trois faits qui gouvernent tout le site :

1. Le contenu est une conséquence de l'analyse, jamais le produit. `L4` `PRODUCT-VISION-TEXTOS.md` §0.
2. Aucun score d'autorité composite unique — anti-objectif explicite. `L3` `ADR-011` §2. Ceci interdit l'« Authority Score ».
3. État de build : seule la couche OBSERVE (S1–S7) est `implemented`. Tout l'aval (Understand / Act / gaps / briefs / RepOS) est `planned`.

Piège d'overclaim n°1 (le plus dangereux). Le schéma DB contient 14 tables, dont `claim`, `authority_gap`, `evidence_bundle`, `truth_check`, `opportunity_brief`, `content_draft`, `repos_intersection` (`L1` `schema.test.ts` : « montent proprement et créent les 14 tables »). L'existence d'une table ne prouve pas que la fonctionnalité existe. Ces tables sont créées et contraintes au niveau S0 ; la logique qui les peuple (détection de gaps, génération de briefs, TruthCheck, intersection RepOS) n'est pas implémentée. Le site ne doit jamais dire « TextOS produit des Opportunity Briefs » : aucun code ne le fait aujourd'hui. Mise à jour de fraîcheur : S8 (Claim Evidence Layer) a depuis été commité et testé — voir §1.2 ; il ajoute la capture d'evidence et l'extraction déterministe de claims, mais ni les briefs, ni le TruthCheck, ni le typage de gaps, et reste non validé PO pour le marketing.

---

## 5. Doctrine canonique TextOS

1. Une réponse IA est un échantillon, pas une vérité ; toute affirmation de visibilité sans échantillon / dispersion est interdite comme conclusion. `doctrine` `medium` · `L3` `ADR-008` §2.
2. Séparation 4 couches Observation → Agrégation → Interprétation → Décision ; séquence *S5 collecte · S6 qualifie · S7 mesure · S8+ interprète*. `doctrine` `medium` · `L3` `ADR-008` §3 ; `ADR-009/010/011`.
3. On ne compte que les observations éligibles (`ok` + `no_citations`) ; un échec de transport n'est jamais « marque absente ». `implemented` `high` · `L1` `authority-presence-reader.test.ts` ; `L3` `ADR-008` §4.
4. Invariants de comparabilité : jamais d'agrégation à travers une rupture de méthode / panel / locale / moteur. `doctrine` `medium` · `L3` `ADR-008` §5.
5. Share of Model = estimateur, jamais score brut. `doctrine` `medium` · `L3` `ADR-008` §6 ; `ADR-011` §6.
6. `not_available` n'est pas `0`. `implemented` `high` · `L1` `authority-presence.test.ts` + `authority-presence-reader.test.ts` ; `L3` `ADR-011` §4.
7. Le moat est en aval de la mesure ; la mesure est une commodité. `doctrine` `medium` · `L3` `ADR-004` §1–§4.
8. Contrat de véracité : ne jamais publier un claim que les preuves contredisent. `doctrine` `medium` · `L4/L3` `PRODUCT-VISION` §0/§6 (`truth_check_verdict = block` figé dans `enums.ts`, logique non implémentée).
9. Anti-content-farm au niveau schéma : un `content_draft` ne peut pas exister sans `brief_id`. `implemented (schema)` `high` · `L1` `schema.test.ts`.
10. Gouvernance repo : artefacts canoniques modifiés uniquement sur décision de Marc ; aucun agent ne touche l'identité git ; STOP sur écart. `doctrine` `medium` · `L4/L5` `PRODUCT-VISION` ; `AGENTS.md §3`.

---

## 6. Vocabulaire canonique

Tous `canonical`, `high`, ancrés L1/L2 sauf mention.

- 8 statuts d'observation (ordre / libellés figés) : `ok`, `no_citations`, `no_answer_surface`, `skipped`, `rate_limited`, `timeout`, `provider_empty_response`, `provider_error`. `L2` `enums.ts` ; `L1` `schema.test.ts`.
- Éligible = `ok` + `no_citations`. `no_answer_surface` = valide mais hors dénominateur. `L3` `ADR-010` §2.
- `citation_kind` : `direct` / `indirect_mention` (nullable = tierce sans entité suivie). `L2` `enums.ts` ; `L1` `schema.test.ts`.
- `canonical_source_entity_id` (qui est cité) n'est pas `matched_tracked_entity_id` (quelle marque en bénéficie). `L2` `observe.ts`.
- `measurement_method_version` = dérivée de 4 versions (provider / extractor / aggregation / canonicalization), écrite une fois. `L2` `observe.ts` ; `L1` `measurement-method.test.ts`.
- Fenêtre de mesure = bucket ISO hebdo UTC `YYYY-Www`. `L3` `ADR-009` §4 ; `L1` `window.test.ts`.
- 3 taux de qualité (métadonnées, aucun n'est un signal d'autorité) : `run_completion_rate`, `share_of_model_eligible_rate`, `answer_surface_trigger_rate`. `L2` `observe.ts` ; `L1` `quality-ledger.test.ts`.
- Autres enums figés : `opportunity_brief_status` (proposed / accepted / rejected / published) ; `publication_policy_mode` (supervised / trusted / locked_back) ; `truth_check_verdict` (pass / alert / block) ; `domain_profile_type` (editorial_standalone / competitive / market_keyword) ; `measurement_setup_kind` (entity_only / market_subject_only / entity_in_market). `L2` `enums.ts`. Enums figés n'est pas logique implémentée (voir §15).
- Primitives : Observe → Understand → Act. `L4` `PRODUCT-VISION` §2. Capabilities de sprint (vocabulaire fermé) : FOUNDATIONS, OBSERVE, KNOW, DECIDE, ACT, PREMIUM. `L5` `README.md`.

---

## 7. Entités canoniques

| Entité | Statut | Conf. | Preuve | Note |
|---|---|---|---|---|
| `TrackedEntity` (`canonical_entity`) | canonical / implemented | high | `L1` `schema.test.ts` · `L2` `entities.ts` · `L3` `ADR-003` §2.1 | acteur dont on mesure la présence |
| `MarketSubject` (`market_subject`) | canonical / implemented (schema) | high | `L2` `enums.ts` · `L3` `ADR-003` §2.2 | espace de demande ; `market_subject_only` ne produit pas de SoM propriétaire (`ADR-003` §3) |
| `measurement_setup` (3 kinds) | canonical / implemented | high | `L1` `schema.test.ts` · `L2` `enums.ts` | `entity_in_market` = cas le plus vendeur |
| `QueryPanel` (versionné) | canonical / implemented | high | `L1` `query-panel/*.test.ts` · `L2` `query-panel.ts` | instrument figé (`id`, `version`) |
| `EngineRun` | canonical / implemented | high | `L1` `orchestrator.test.ts` · `L2` `observe.ts` | porte le contrat de mesure |
| `EngineObservationResult` | canonical / implemented | high | `L1` `schema.test.ts` · `L2` `observe.ts` | append-only, 8 statuts |
| `Citation` | canonical / implemented | high | `L1` `schema.test.ts` · `L2` `observe.ts` | source vs bénéficiaire |
| `AuthorityPresence` (read model) | implemented (non persisté) | high | `L1` `authority-presence*.test.ts` · `L2` `authority-presence*.ts` | calculé à la demande |

Note de désambiguïsation : « entity graph » a deux sens à ne jamais confondre — (a) le modèle d'entités du produit ci-dessus (ce que TextOS mesure) ; (b) l'entity graph SEO du site (autorité de l'entreprise TextOS, §20). Ne jamais écrire de `sameAs` SEO dans la base produit.

---

## 8. Métriques de présence d'autorité

Source de vérité : `L3` `ADR-011` + `L2` `observe/authority-presence.ts` + `L1` `observe/authority-presence.test.ts`.

Ce que le produit calcule réellement, pour un run et une `tracked_entity_id` donnés, sur les observations éligibles (`ok` + `no_citations`) : trois mesures séparées, jamais fusionnées en un score composite (`ADR-011` §2). Chaque mesure est un estimateur `variance-ready`.

- Dénominateur commun = nombre d'observations éligibles, jamais déduit du nombre de citations ; les `no_citations` comptent au dénominateur mais jamais à un numérateur. `L1` `authority-presence.test.ts` ; `L3` `ADR-011` §3.
- Comptage par observation, pas par citation : une observation compte 1 dès qu'elle contient ≥1 citation qualifiante. `L1` `authority-presence.test.ts` ; `L3` `ADR-011` §3.
- `variance-ready` n'est pas `variance-aware` : chaque mesure porte `estimate` + `perQuery[]` + `dispersion {min, max, mean, standardDeviation (population), volatileQueryCount}`. Pas d'intervalle de confiance, pas de bêta-binomial en V0. `L2` `authority-presence.ts` ; `L3` `ADR-011` §6.

Métadonnées de qualité (ne sont pas des métriques d'autorité) : `run_completion_rate = (ok + no_citations + no_answer_surface) / planned` ; `share_of_model_eligible_rate = (ok + no_citations) / planned` ; `answer_surface_trigger_rate = (ok + no_citations) / (ok + no_citations + no_answer_surface)` ; `planned = query_count × n_executions` (jointure panel, jamais comptage de lignes) ; oracle exécuté `0.6 / 0.5 / 0.8333`. `share_of_model_eligible_rate` n'est pas le Share of Model. `L1` `quality-ledger.test.ts` ; `L2` `quality-ledger.ts` + `fixtures/runs.ts` ; `L3` `ADR-010` §3 (formules) + §4 (oracle).

---

## 9. Direct Share of Model

- Statut : `canonical` / `implemented` — Confiance : `high` — Preuve : test + code + ADR
- Définition : part des observations éligibles contenant ≥1 citation avec `citation_kind = "direct"` ET `matched_tracked_entity_id = trackedEntityId`. Comptage par observation (une obs avec 2 citations directes compte 1).
- Invariant : filtre par `matched_tracked_entity_id`, jamais par `is_tracked_entity_citation` seul ; dénominateur = éligibles, jamais nombre de citations.
- Forbidden wording : « Share of Model : 8 % » (nombre sec, sans échantillon / dispersion / complétude).
- Raison : un score nu est explicitement interdit (`ADR-008` §6) ; le produit est un estimateur.
- Sources : `L1` `observe/authority-presence.test.ts` (« direct 0.5 ») + `authority-presence-reader.test.ts` (V0 réel : 0.5) · `L2` `observe/authority-presence.ts` (prédicat `isDirect`) · `L3` `ADR-011` §2–§3.

---

## 10. Indirect Mention Share

- Statut : `canonical` / `implemented` — Confiance : `high` — Preuve : test + code + ADR
- Définition : part des observations éligibles avec ≥1 citation `citation_kind = "indirect_mention"` ET `matched_tracked_entity_id = trackedEntityId`.
- Invariant : `null` (`indirectMentionAvailable: false`) quand la méthode ne produit pas le signal ; `0` seulement quand la méthode le produit et n'en trouve aucun. `null` n'est pas `0`. La capacité est une propriété de la méthode, jamais inférée depuis les données (méthode inconnue → erreur typée).
- État V0 réel : Perplexity Sonar V0 → `null` / non observable (`resolveIndirectMentionCapability(METHOD_V0)` renvoie `false`).
- Forbidden wording : « 0 % de mentions indirectes » sur un run Perplexity.
- Raison : confondre absence de capacité et mesure à zéro est une faute de mesure (`ADR-008` / `ADR-011` §4).
- Sources : `L1` `authority-presence-reader.test.ts` (« Perplexity Sonar V0 → false » ; « indirect null ») + `authority-presence.test.ts` (Oracle B) · `L2` `observe/authority-presence-reader.ts` · `L3` `ADR-011` §4.

---

## 11. Total Authority Presence

- Statut : `canonical` / `implemented` — Confiance : `high` — Preuve : test + code + ADR
- Définition : part des observations éligibles où l'entité est présente directement OU indirectement — union par observation.
- Invariant : union, jamais somme. Une observation direct+indirect compte 1, pas 2. Si l'indirect n'est pas observable → `total = direct` = plancher (« au moins cette présence directe »), à ne jamais présenter comme total définitif ; porte `signalCoverage {direct, indirect}`.
- Forbidden wording : « Direct Share + Indirect Share = Total Authority Presence ».
- Raison : l'addition double-compterait les observations où l'entité est à la fois source directe et mentionnée indirectement → surreprésentation de la métrique.
- Sources : `L1` `authority-presence.test.ts` (Oracle A : « total 0.75 (union, obs3 comptée 1×) », `total.numerator = 3` non 4) + `authority-presence-reader.test.ts` (méthode capable : total `2/3` = union) · `L2` `observe/authority-presence.ts` (`isDirect(o) || isIndirect(o)`) · `L3` `ADR-011` §2, §3, §5.

---

## 12. Invariant union-not-sum

- Statut : `canonical` (invariant) — Confiance : `high` — Preuve : test + code + ADR
- Énoncé : Total Authority Presence est une union, jamais une somme. Protégé par l'oracle `obs3` (direct + indirect dans la même observation) sans lequel le double comptage passerait.
- Sources : `L1` `authority-presence.test.ts` · `L2` `authority-presence.ts` (commentaire « compte 1, jamais 2 ») · `L3` `ADR-011` §7.

---

## 13. Autres invariants

- Par entité et par run uniquement ; aucune comparaison / somme / agrégation inter-runs en V0. `L3` `ADR-011` §9 ; `ADR-008` §5.
- Calcul à la demande, non persisté ; aucune table d'agrégat Share of Model. `L3` `ADR-011` §10.
- `aggregation_version` canonique pinée et vérifiée (`aggregation@1.0.0`) ; méthode inconnue → erreur typée, jamais recalcul silencieux. `L1` `authority-presence-reader.test.ts` ; `L2` `authority-presence-reader.ts` ; `L3` `ADR-011` §8.
- Capacité indirect = propriété de la méthode, jamais inférée depuis les données. `L1`/`L2` `authority-presence-reader.ts`.
- Écart-type = population, pas échantillon ; `volatileQueryCount` = queries dont l'estimate est strictement entre 0 et 1. `L2` `authority-presence.ts`.
- Idempotence de collecte : clé `(run_id, engine, surface, query_hash, locale, execution_index)` ; changement de panel / fenêtre / méthode → nouveau `run_id`. `L3` `ADR-009` §6 ; `L2` `observe.ts`.
- Observation append-only, jamais réécrite. `L2` `observe.ts` ; `L3` `ADR-001` §6.1.
- Aucune table du tronc standalone ne dépend de RepOS. `L1` `schema.test.ts` ; `L4` `PRODUCT-VISION` §4.

---

## 14. Capacités implémentées

Ce qui est réellement construit et testé (couche OBSERVE, S1–S7) :

- Résolution / déclaration d'entités et de sujets, setup de mesure typé (3 kinds). `L1` `entity/*.test.ts`, `schema.test.ts`.
- QueryPanel versionné (instrument de mesure). `L1` `query-panel/*.test.ts`.
- Providers : FixtureEngineProvider (hors-ligne) + PerplexityProvider (live). `L1` `fixture-provider.test.ts`, `providers/perplexity/transform.test.ts`, `transport.live.test.ts`.
- Orchestrateur de run (collecte, persistance run / observation / citation). `L1` `orchestrator.test.ts`.
- Measurement Quality Ledger (3 taux, oracle `0.6 / 0.5 / 0.8333`). `L1` `quality-ledger.test.ts`.
- Authority Presence (Direct / Indirect / Total + dispersion), calculée à la demande. `L1` `authority-presence.test.ts`, `authority-presence-reader.test.ts`.

Statut global : `implemented` `high`. C'est le socle que le site peut présenter comme réel, avec le vocabulaire de §6 et les garde-fous de §17.

---

## 15. Capacités « schéma existant, logique non implémentée »

Section la plus sensible pour l'overclaim. Les tables existent (S0, `L1` `schema.test.ts`). Aucun code ne produit ces objets.

| Entité / capability | Table existe ? | Logique ? | Statut | Preuve |
|---|---|---|---|---|
| `Claim` (Authority Graph) | oui | **partiel — voir §1.2** : extraction déterministe (S8) commitée + testée (20 tests verts), claims non persistés ; typage / jugement non construits | table `implemented_schema_only` ; extraction `wip_committed_tested` | `L1` `schema.test.ts` + `claims.test.ts` + `claims-reader.test.ts` · `L2` `observe/claims.ts` · `L3` `ADR-012` (Accepted, S8 commité) |
| `answer_evidence` (capture, S8) | oui (nouvelle table) | oui — capture normalisée persistée, additive | `wip_committed_tested` — voir §1.2 | `L1` `answer-evidence.test.ts` (9 tests) · `L2` `observe/answer-evidence.ts`, `db/schema/answer-evidence.ts` · `L3` `ADR-012` §5 |
| `authority_gap` | oui | non | planned | `L1` `schema.test.ts` |
| `EvidenceBundle` | oui | non | planned | `L1` `schema.test.ts` (`repos_evidence` nullable = standalone) |
| `TruthCheck` (verdict pass / alert / block) | oui (enum) | non | planned / doctrine | `L2` `enums.ts` · `L4` `PRODUCT-VISION` §6 |
| `OpportunityBrief` | oui | non | planned | `L2` `enums.ts` · `L4` `PRODUCT-VISION` §4 |
| `content_draft` | oui | non | planned + invariant implemented | `L1` `schema.test.ts` (rejette sans `brief_id`) |
| `publication_policy` | oui (défauts supervised / 100 / 0) | non | planned + défauts implemented | `L1` `schema.test.ts` |
| `RepOSIntersection` (premium) | oui | non | planned / premium | `L1` `schema.test.ts` · `L2` `premium/repos-intersection.ts` · `L4` `PRODUCT-VISION` §5 |
| Couche Understand (patterns) | non | non | planned | `L4` `PRODUCT-VISION` §2 ; prérequis S8 désormais commité (§1.2), mais la couche Understand (pourquoi / patterns, S9+) reste non construite |
| Couche Act / génération contenu | tables oui | non | planned | `L4` `PRODUCT-VISION` §2, §9 |
| Wedge commercial (LRAS, DQAG, Lead Brief, intervention loop) | non | non | candidate / unsupported (hypothèses 🔵/🟡) | `L4` `MEASUREMENT-VISION` §2–§8 (non contraignant) |
| Authority Simulator | non | non | planned (roadmap) | `L4` `PRODUCT-VISION` §9 |

---

## 16. Promesses produit soutenables

| Promesse | Statut | Conf. | Ancrage |
|---|---|---|---|
| Mesurer la présence d'une marque dans les réponses IA, de façon reproductible | implemented | high | `L1` `authority-presence*.test.ts` |
| Distinguer citation directe / mention indirecte, et dire quand un signal n'est pas observable | implemented | high | `L1` `authority-presence-reader.test.ts` |
| Share of Model avec sa dispersion, sur panel versionné et observations éligibles | implemented | high | `L1`/`L3` `authority-presence.ts` + `ADR-011` §6 |
| Séparer qualité de mesure et présence de marque | implemented | high | `L1` `quality-ledger.test.ts` |
| Cartographier qui fait autorité dans un espace de demande (`market_subject_only`) | implemented (schema) / doctrine | medium | `L3` `ADR-003` §3 |
| Honnêteté méthodologique : savoir dire « je ne sais pas encore » | implemented (est vrai) | high | `L3` `ADR-008` §6 + `L1` warnings mécaniques |
| Expliquer les patterns qui distinguent sources citées / non-citées | planned | low | `L4` `PRODUCT-VISION` §2 — formuler au futur |
| Relier autorité IA et demande client réelle (RepOS) | planned / premium | low | `L4` `PRODUCT-VISION` §5 — jamais en standalone |

North Star réelle (à ne pas confondre avec une promesse de mesure) : nombre d'Authority Gaps qualifiés par demande client convertis en Opportunity Briefs défendables acceptés — `planned`. `L3` `ADR-004` §4.

---

## 17. Promesses marketing risquées ou non soutenues

Pour chaque thème, trois niveaux : Acceptable (ancré) / Risky (à encadrer) / Forbidden (interdit).

Mesure de présence
- Acceptable : « TextOS measures Authority Presence across model outputs. »
- Risky : « TextOS shows your Share of Model. » — seulement avec dispersion + complétude + versions.
- Forbidden : « TextOS makes your brand appear in all AI answers. »

SEO / moteurs classiques
- Acceptable : « TextOS observes how AI answer engines cite sources. »
- Risky : « TextOS improves your AI visibility. » — « improve » implique une action non construite (`planned`).
- Forbidden : « TextOS guarantees higher rankings in Google. »

Autorité chiffrée
- Acceptable : « Three separate measures: direct, indirect, total presence. »
- Risky : « Your authority is at X. » — seulement par mesure nommée + entité + run, jamais agrégée.
- Forbidden : « TextOS Authority Score: 72/100. » (score composite = anti-objectif, `ADR-011` §2)

Causalité / leads
- Acceptable : « This is a lead-relevant decision surface. » (`L4` `MEASUREMENT-VISION` §8ter)
- Risky : « This intervention will change your presence. » — hypothèse d'intervention seulement, tant que non réobservé.
- Forbidden : « TextOS explains the cause of your invisibility (82% confidence). » (`PRODUCT-VISION` §7)

Périmètre produit
- Acceptable : « TextOS observes and measures authority (Observe layer, live). »
- Risky : « TextOS generates Opportunity Briefs. » — schéma existe, logique non → « coming soon », jamais au présent.
- Forbidden : « TextOS + RepOS unified platform, available today. » (`PRODUCT-VISION` §10/§15)

Fiabilité
- Acceptable : « Measurement carries its completeness and comparability. »
- Risky : comparer deux fenêtres — seulement si méthode / panel / locale identiques.
- Forbidden : « Your visibility grew 24% to 31% » à travers une rupture de version (faux signal, `ADR-008` §5).

Statut consolidé des concepts non soutenus : `unsupported` — LRAS, DQAG, lead impact, intervention loop (hypothèses 🔵 `MEASUREMENT-VISION`), toute affirmation d'effet / causalité sans protocole de réobservation. `forbidden` — Authority Score composite ; « appear in all AI answers » ; « guarantees Google rankings » ; plateforme unifiée « available today ».

---

## 18. Forbidden wording

| Interdit | Autorisé | Source |
|---|---|---|
| « Authority Score » (chiffre unique) | « présence d'autorité » (3 mesures) | `ADR-011` §2 |
| « Share of Model : 8 % » | « SoM estimé 8 %, dispersion […], complétude […], méthode vX » | `ADR-008` §6 |
| « intervalle de confiance » (V0) | « dispersion : min / max / moyenne / écart-type par requête » | `ADR-011` §6 |
| « 0 % de mentions indirectes » (Perplexity) | « mentions indirectes : non observables avec cette méthode » | `ADR-011` §4 |
| « la cause de votre invisibilité » | « les patterns qui distinguent les sources citées » | `PRODUCT-VISION` §7 |
| « génère des leads » | « surface de décision pertinente (lead-relevant) » | `MEASUREMENT-VISION` §8ter |
| « TextOS produit des Opportunity Briefs » | « en construction / roadmap » | §15 (schéma sans logique) |
| Understand / Act / RepOS au présent | « vision / à venir » | `PRODUCT-VISION` §9 |

---

## 19. Vocabulaire marketing approuvé

Authority Intelligence System · Authority Presence · Direct Share of Model · Indirect Mention Share · Total Authority Presence · reproductible / défendable / comparable / auditable · query panel versionné · observations éligibles · dispersion · complétude · « patterns qui distinguent » · « savoir dire je ne sais pas encore » · standalone vs premium (RepOS) · « simple en features, exigeant en preuve » (`ADR-004` §5). Chaque terme ancré §6–§16.

---

## 20. Entity graph candidat pour le site public (schema.org / GEO)

Statut : `candidate` — proposition de conception du site, non issue de `textos-v0`. Entity graph SEO de l'entreprise TextOS, distinct du modèle d'entités du produit (§7). Ne jamais écrire de `sameAs` SEO dans la base produit.

- `Organization: TextOS` — `sameAs` vers nœuds réels et vérifiables uniquement (LinkedIn / Crunchbase / GitHub / Wikidata s'ils existent). Garde-fou : zéro placeholder.
- `SoftwareApplication` / `Product: TextOS` — catégorie « AI authority measurement ».
- `Person` (auteurs) — credentials réels seulement.
- `DefinedTermSet` / `DefinedTerm` — glossaire canonique dérivé de §6–§16 (meilleur pont GEO).
- `Dataset` — `risky` : seulement avec méthodologie complète (panel / N / fenêtres / variance), sinon viole `ADR-008`.

---

## 21. Mappings schema.org candidats

Statut : `candidate`.

| Page site | Types schema.org candidats | Note doctrine |
|---|---|---|
| Home | `Organization` + `WebSite` + `SoftwareApplication` | `sameAs` réels uniquement (§20) |
| Méthode / Produit | `SoftwareApplication` + `TechArticle` | doctrine de mesure, pas de promesses roadmap |
| Glossaire | `DefinedTermSet` / `DefinedTerm` | source = §6–§16, définitions verbatim |
| Méthodologie (whitepaper) | `TechArticle` / `Article` | « estimateur, pas score » |
| Blog | `BlogPosting` / `Article` | `dateModified` réel |
| Changelog | `CreativeWork` | reflète l'état de build réel |
| FAQ (si réelle) | `FAQPage` | uniquement si le contenu est vraiment une FAQ |

Non recommandé : tout markup d'une métrique d'autorité chiffrée sans qualité de mesure (viole `ADR-008` §6).

---

## 22. Concepts de pages GEO / lisibles par LLM

Statut : `candidate`.

- `/llms.txt` + miroirs markdown des pages clés (convention émergente, pas un standard Google).
- Blocs « réponse courte » en tête de page (définitions §6–§16, citables telles quelles).
- Page méthodologie citable (union-not-sum, `not_available` n'est pas `0`).
- Dogfooding par mesure réelle : `candidate`, uniquement si un run réel post-S7 existe (décision PO n°7, §1.1), et en respectant §9–§11 et §17.

---

## 23. Pages publiques candidates pour textos.xyz

Statut : `candidate`. Placeholder `textos.xyz` ; produit derrière auth `app.textos.xyz`.

Arborescence candidate : `/` (positionnement honnête) · `/method` (doctrine de mesure) · `/metrics` (Direct / Indirect / Total + union-not-sum) · `/glossary` (`DefinedTermSet`) · `/methodology` (whitepaper, tag « thèse ») · `/changelog` (build réel) · `/vision` ou `/roadmap` (Understand / Act / RepOS clairement étiquetés).

Absent volontairement de V1 : toute page « Authority Score », toute page premium RepOS présentée comme disponible.

---

## 24. Questions ouvertes pour validation

Les décisions 1–7 (§1.1) sont actées et ne figurent plus ici. Restent réellement ouvertes :

1. Passe complémentaire de lecture : faut-il lire `PRODUCT-SPEC-TEXTOS-V1.md`, `PRODUCT-MARKET-LANDSCAPE-TEXTOS.md` et les ADR 001 / 002 / 005 / 006 / 007 en entier avant la spec du site ?
2. Nommage public des 3 métriques : garder les termes produit tels quels, ou un lexique grand-public encadré (sans trahir §9–§11) ?
3. Fil rouge de démonstration : « Les Jardiniers Cosmopolites » (`PRODUCT-VISION` §11) sert-il aussi de vitrine publique, ou reste-t-il interne ?

Rappel acté hors périmètre : repo `textos-site` séparé ; domaine final = décision ultérieure non bloquante.

---

## 25. Fin de Phase 1

Aucun code de site, package, composant, migration ni commit. `textos-v0` inchangé. Chaque concept porte source + type de preuve + confiance + statut. Règle directrice tenue : le site ne peut pas overclaimer — tout ce qui n'est pas prouvé par un test, un schéma ou un ADR est marqué `planned`, `candidate`, `risky`, `unsupported` ou `forbidden`.

Prochaine étape (Phase 2), à ne lancer qu'après validation de ce document : produire d'abord la spec d'entity graph, dans l'ordre `entity-graph.spec.md` → `entity-graph.ts` → page map → schema.org map → copy safety rules → site scaffold. Le site ne doit pas d'abord vendre ; il doit d'abord prouver qu'il pense l'autorité proprement.
