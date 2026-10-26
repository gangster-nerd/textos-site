# CTO — répartition des composants TextOS produit / TextOS Site (26/10/2026)

> Contexte : l'API V1 du produit est certifiée et des clients l'appellent en production, dont un agent
> qui alimente ce site. Les travaux self-serve, PLG et Performances sont convergés côté produit sur le
> tronc de certification (`textos-v0`, branche `claude/cool-curie-i0cc0u` basée sur
> `cert/textos-v1-e2e-20261023`). Ce document fixe ce qui appartient à qui avant la mise en production.
> Il ne change aucun statut de publication : ceux-ci restent des décisions de Marc.

## Principe

**Le produit observe, mesure, décide et rédige. Le site rend, convertit et ne publie que le validé.**
Les invariants de `site-runtime-architecture.spec.md` restent la loi : rendu statique sans appel
runtime au produit (INV-1), aucun chemin d'écriture public du produit vers le site (INV-4), claims
uniquement depuis le manifeste de capacités (INV-5).

## Ce qui appartient au produit (`textos-v0`)

| Composant | Où il vit dans le produit | Comment le site le consomme | Garde côté site |
|---|---|---|---|
| Cœur portable du Content Surface Engine (20 fichiers : `contract/**`, `composition/**`, `lifecycle/`, `link-graph/`, `producers/markdown/**`, `publication/**`, `receipt/`, `conformance/fidelity-pass/**`, `conformance/fixtures.ts`) | `src/content-surface-engine/**` | vendu à l'identique dans `lib/content-surface-engine/` | `OWNERSHIP.json` + `tests/cse-ownership.test.ts` (empreintes) ; `pnpm cse:ownership --product <chemin>` (écart avec le produit) |
| Contrat `content-document@1` | `packages/content-surface/schema/content-document@1.schema.json` | `contracts/content-document@1.schema.json` | même manifeste, même test |
| Manifeste de capacités (statuts, surfaces, claims interdits) | `src/manifest/capability-declaration.ts` → artefact CI de `main` | `product-manifest/` (import manuel, sha256) | `pnpm verify:product-manifest` (le site n'est jamais plus permissif) |
| Authentification, organisations, onboarding self-serve, lancement de mesure | `app/auth/**`, `app/(app)/onboarding/**`, `src/server/identity/**`, `src/server/self-serve/**` | **rien** — le site n'importe ni ne connaît aucun identifiant utilisateur (AUTH-CONVERGENCE-0 §10) | `selfServeCtaGate` + `editorial-verifier` (aucun « sign up / start free » tant que le gate est rouge) |
| Cycle de vie PLG (courriels produit) | `src/server/textos/plg/lifecycle/**` | **rien** — les courriels pointent vers l'application, jamais vers le site | — |
| Performances (onglet, contrôles, observateur de publication) | `src/server/textos/performance/**`, console `workspace/performance-*` | **rien** — capacité `internal_only`, non déclarée au manifeste | le site ne peut pas la revendiquer (absente du manifeste) |
| API V1.1 (machine, workspace-scopée) | `src/server/textos/api-v1/**`, `packages/api-foundation` | **jamais depuis le navigateur ni au rendu** ; un agent opérateur l'appelle côté serveur et ses sorties entrent par le pipeline Commit-to-Content | INV-1 / INV-4 |
| Observation du site par le produit (dogfood) | `scripts/dogfood/textos-site/**` | le site fournit l'URL de preview ; le produit observe | variante `off` exigée (aucune conversion active pendant l'observation) |

## Ce qui appartient au site (`textos-site`)

| Composant | Fichiers |
|---|---|
| Renderer, thème, routes, corpus | `lib/content-surface-engine/renderer/**`, `app/**`, `content/**`, `components/**` |
| Intégration site du CSE | `lib/content-surface-engine/{site-integration,surface-policy,conversion,instrumentation}/**`, `conformance/{render-parity,surface-pass}/**` |
| Forks d'identité du site (3 fichiers re-scellés à chaque changement) | `authority/compile-authority.ts`, `authority/editorial-identity-policy.ts`, `conformance/content-pass.ts` |
| Conversion : registre de CTA, porte de livraison, formulaire de demande de mesure, attribution | `lib/conversion/**`, `components/conversion/**`, `app/request-measurement/**` |
| Pipeline éditorial Commit-to-Content (lecture du produit via `git show` local, jamais en runtime) | `lib/commit-to-content/**`, `content-bundles/**` |
| Preuves produit illustratives (fixtures fictives, structure miroir de l'UI produit) | `components/product/**`, `lib/product-proof/**`, `lib/fixtures/**` |

## Flux entre les deux, et leur état

1. **Produit → site, contenu** : agent → API V1.1 (`get_opportunities`, `list_accepted_briefs`,
   `prepare_article_review`…) → artefacts → `content:sync` / promotion éditoriale validée → build
   statique. Inchangé, gouverné par le pipeline existant.
2. **Site → produit, demande** : CTA d'article (`buildCtaAttributionHref`) → `/request-measurement`.
   **Corrigé le 26/10** : le formulaire transmet désormais l'attribution d'arrivée (liste blanche
   stricte, tout ou rien, champs `source_*`), et les CTA des articles respectent la porte de
   livraison (`CONVERSION_MODE=off` ne rend plus aucun CTA).
3. **Site → produit, entrée self-serve** : **câblée, fermée par défaut.** `ProductEntryCta` (page
   d'accueil) mène à `https://<app>/auth/start?intent=measure` avec l'attribution de
   `buildCtaAttributionHref` (ENTRY-1, gangster-nerd/textos-v0#75). Elle vit hors du registre CTA, qui
   refuse par conception les destinations externes, et ne s'affiche que si : (a) le manifeste épinglé
   publie `self-serve-onboarding`, `authenticated-product-entry` et `ui-measurement-launch`
   (`public_marketable`, surface commerciale) — décision de Marc côté produit, puis ré-import depuis
   `main` ; (b) `PRODUCT_ENTRY_URL` est posée (`https://…/auth/start` exactement) ; (c)
   `CONVERSION_MODE≠off`. Le produit doit être en `AUTH_MODE=required` avant (b), sinon il répond 503.
   Aucune logique d'identité côté site.
4. **Site → produit, signaux** (Search Console, mentions IA) : non implémenté ; à brancher côté
   produit, jamais par un appel runtime depuis le site.

## Prérequis de mise en production du site

- `CONVERSION_MODE` : confirmer dans le tableau Vercel la valeur réelle (le tableau de
  `DEPLOYMENT.md` dit `demo`, le commit `4bc0bc9` dit « non défini → `off` »).
- Passage `live` : `MEASUREMENT_FORM_ENDPOINT` + les cinq variables juridiques ; le sous-traitant doit
  accepter les champs `source_*` (identifiants techniques, aucune donnée personnelle).
- Ré-importer le manifeste produit depuis un artefact `main` dès que le tronc de certification y est
  fusionné (le manifeste épinglé date de `d1b8b50`, 08/08).
- Après tout re-vendoring du CSE : `pnpm cse:ownership --product <textos-v0> --refresh`, puis revue du
  diff des empreintes.
