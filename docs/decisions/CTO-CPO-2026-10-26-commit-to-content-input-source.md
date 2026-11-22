# CTO/CPO — Commit-to-Content, source d'entrée du produit (26/10/2026)

> Instruction de Marc du 26/10/2026 : faire de Commit-to-Content (CTC) une partie intégrante du
> produit TextOS — une source d'entrée de contenu au même titre que l'opportunité mesurée — en
> reprenant tout l'existant, et, dans un premier temps, poursuivre le dogfood en traitant TextOS
> Site comme un client de production de cette source. Ce document consigne ce qui a été fait ce
> jour, ce qui reste gouverné, et le plan produit. Il **ne change aucun statut de publication** : ceux-ci
> restent des décisions de Marc, exécutées côté produit.

## Ce qui existait (inventaire repris)

| Où | Quoi | État |
|---|---|---|
| textos-site `lib/commit-to-content/**` | Pipeline V1 : bundles de vérité produit, 4 états de publishability, maturité 7 états, candidats éditoriaux | en place (PR #15), lit le produit par `git show` local |
| textos-site `content/insights/**` | 12 notes « how we build » (COMPANY_TECHNOLOGY) rédigées par agent, converties en ContentDocument (PR #21) | brouillons, Preview seulement |
| textos-v0 `src/server/textos/act/ctc/**` | Couture CTC → Geo Writer : provenance CTC adjacente au plan, jamais de lignée Site Intelligence | sur le tronc de certification |
| textos-v0 `changes/content-impact/**` | Décision d'impact éditorial exigée par la CI pour tout changement (C0B, C0B.1) | 161 décisions au 26/10 |
| textos-v0 API V1.1 | Décision humaine liée à l'enveloppe exacte, TrustGrant à usage unique, livraison headless (#74, ouverte) | certifiée jusqu'au brouillon WordPress (26/10) |
| shortsos-site `textos/**` | Premier client CTC complet : brief → intake CTC → rédacteur → TruthCheck → ContentDocument, reçus revérifiés sans TextOS | 5 articles (23–24/09) |
| repos-site `textos-client/**` | Client CTC avec deux portes humaines (preuves, publication) | vague w1 publiée |

Constat : la chaîne marche, mais **chez les clients**, par un pilote local épinglé. Le produit ne
l'expose ni dans son API ni dans son interface, ne la déclare pas au manifeste, et n'a pas de
stratégie éditoriale propre à une note issue de commits.

## Ce qui a été fait le 26/10

1. **TextOS Site devient client de production de CTC** (`textos/**`, `scripts/textos/**`,
   `lib/textos-client/**`). Pilote porté de ShortsOS, épinglé sur la tête du tronc de certification
   `308aa32` (rédacteur ET vérité produit). Quatre notes rédigées par le rédacteur TextOS, toutes
   **TruthCheck = pass** :
   - *TextOS's API keeps WordPress draft creation behind a human decision* ;
   - *Every new TextOS API credential now expires, after 30 days by default* ;
   - *At TextOS, a writing-model outage no longer kills an article* ;
   - *At TextOS, every product change carries a written content decision*.
   Chaque phrase factuelle cite une preuve verbatim (message de commit ou fichier au SHA épinglé) ;
   14 commits au registre. Les reçus sont revérifiés au build sans TextOS ; un run altéré fait
   échouer le build. Les quatre articles sont des **brouillons** (Preview, noindex, sans CTA) jusqu'à
   la revue humaine consignée dans leur brief.
2. **Vague CTC ShortsOS** (shortsos-site, branche `claude/compassionate-johnson-3kwq7g`) : trois
   notes d'ingénierie, TruthCheck = pass, revue humaine en attente.
3. **Vague CTC RepOS w2** (repos-site, même branche) : trois sujets préparés jusqu'à la **porte 1**
   (approbation des preuves), qui est une décision humaine ; rien n'est rédigé avant elle.

## Ce qui reste gouverné (et pourquoi le site ne vend toujours pas CTC)

- `CPO-2026-09-12-commit-to-content-disclosure` reste en vigueur pour la **communication
  publique** : CTC n'est pas déclaré au manifeste produit. Le site ne peut donc ni l'annoncer comme
  fonctionnalité, ni proposer un CTA, une liste d'attente ou un accès. Les quatre notes ci-dessus
  sont des récits « how we build », conformes à cette décision.
- La vérité produit utilisée est le **candidat de certification**, pas `main` (encore à `91b6180`).
  Après fusion du tronc dans `main` : ré-importer le manifeste (`product-manifest/IMPORT.md`) et
  déplacer la paire d'épingles `textos/tool.json` vers un SHA de `main`.
- Les décisions humaines restent humaines : approbation des preuves, revue par article,
  publication, et toute promotion de statut au manifeste.

## Plan produit — CTC comme source d'entrée (proposition, à arbitrer par Marc)

**Principe inchangé** : un commit n'est jamais une opportunité mesurée, et la qualification d'un
changement n'est jamais inférée par un modèle. CTC part de *changement produit + vérité produit +
décision éditoriale humaine* ; chaque article reste adossé à un brief accepté (anti-content-factory).

| Lot | Contenu | Où |
|---|---|---|
| CTC-P1 Déclaration | Entité `commit-to-content` au manifeste (`internal_only` → `candidate`), preuves = couture CTC + pilotes clients ; décision d'impact correspondante | textos-v0 `src/manifest/` |
| CTC-P2 Stratégie éditoriale | Rôle `engineering_note` dans `editorial-strategy` : le gate `editorial-quality` évalue une note CTC contre sa propre stratégie (aujourd'hui il la mesure contre l'article d'opportunité, d'où des signaux non applicables) | textos-v0 `act/editorial-*` |
| CTC-P3 Service applicatif | `textos.prepare_ctc_article_review@1` : groupe de commits + question acheteur → preuves candidates (messages/fichiers au SHA, verbatim) → approbation humaine existante (lot C) → rédacteur → TruthCheck → ContentDraft ; reprend la logique de `scripts/textos/steps/prepare.ts`/`write.ts` côté serveur | textos-v0 `application/`, `api-v1/` |
| CTC-P4 Livraison | Sortie par la livraison headless gouvernée (#74) vers le site client ; le site garde sa vérification de reçus | textos-v0 + clients |
| CTC-P5 Source GitHub client | Connexion GitHub en lecture seule par espace de travail (GitHub App, dépôts choisis), ingestion des commits de la branche par défaut, proposition de groupes, **qualification décidée par un humain** ; extraits d'un dépôt privé jamais publics sans levée explicite (`clearEvidenceForPublicUse`) | textos-v0 |
| CTC-P6 Surface site | Page et CTA « Commit to Content » sur textos-site **uniquement** après P1 publié `public_marketable` par Marc et ré-import du manifeste ; nouvelle décision CPO remplaçant celle du 12/09 | textos-site |

## Décisions demandées à Marc

1. Revue des quatre notes TextOS Site (`textos/runs/<id>/HUMAN-REVIEW.md`) : publier, corriger
   (nouvelle rédaction TextOS, jamais de retouche à la main) ou refuser.
2. Porte 1 RepOS w2 : dossier `repos-site/textos-client/product-truth/REVUE-PREUVES-w2.md`.
3. Revue des trois notes ShortsOS (`shortsos-site/textos/runs/<id>/HUMAN-REVIEW.md`).
4. Ordre et périmètre des lots CTC-P1 à P6 ; en particulier P1 (déclarer CTC au manifeste) et P5
   (accès GitHub des clients), qui engagent la frontière produit.
