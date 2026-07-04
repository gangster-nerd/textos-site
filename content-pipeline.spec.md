# content-pipeline.spec.md

> **Phase 2.1C — Spécification du pipeline de contenu.**
> Définit comment un changement produit (`textos-v0`) alimente le contenu du site public `textos.io` — en **brouillons** et **pull requests**, jamais en publication directe.
> Entrées : `ENTITY-GRAPH-DRAFT.md`, `capability-registry.spec.md`, `entity-graph.spec.md`, `site-runtime-architecture.spec.md`.
> Portée : spécification. Pas de scaffold, pas de composant, pas de route Next.js, pas de copy marketing finale, `textos-v0` inchangé, pas de commit avant revue.
> Convertible sans ambiguïté en `content-pipeline.ts`.

---

## 0. Position dans l'architecture

Ce pipeline est la **frontière d'export validée** de `site-runtime-architecture.spec.md` (INV-4 : aucun chemin d'écriture public du produit vers le site ; seuls des exports PO-validés deviennent publiables). Il ne **décide** aucune vérité : il **lit** le produit, **propose** des brouillons, et **soumet** au gating du `capability-registry` + `copy-safety` + revue PO.

```
[textos-v0 commit] → [Release Content Agent: analyse] → [content bundle: DRAFTS]
   → [copy-safety + schema validation] → [publishability.json] → [PR dans textos-site]
   → [revue PO] → [merge] → [build] → [textos.io]
```

Règle cardinale : **le produit propose, l'humain publie.** Aucune étape n'est auto-publiante.

---

## 1. Philosophie de contenu

- Un changement produit **alimente** le contenu ; il ne le publie jamais seul.
- Tout contenu est généré comme **brouillon** (`*-draft.mdx`, `*-updates.json`), jamais comme page live.
- Aucun contenu public ne passe sans franchir : **`capability-registry` (statut) + `copy-safety` (formulation) + revue PO**.
- Le contenu visé est **élite** : sourcé, honnête, sans overclaim. Un brouillon qui ne peut citer sa base (test / schéma / ADR / capacité `public_marketable`) est bloqué, pas édulcoré.
- Le contenu est une **conséquence** de la vérité produit (doctrine draft §0), jamais un objectif de volume.

---

## 2. Sources de déclenchement (triggers)

```ts
export type Trigger =
  | "product_commit"        // commit sur textos-v0
  | "adr_change"            // ajout/modif d'un ADR
  | "tests_changed"         // tests ajoutés/modifiés (signal de capacité)
  | "capability_registry_change" // un statut change (ex. wip_committed_tested → public_marketable)
  | "glossary_change"       // définition canonique modifiée
  | "schema_change"         // db/schema modifié
  | "release_tag"           // tag de release
  | "manual_editorial";     // déclenchement éditorial humain
```

Un trigger produit un **diff analysable**. Un trigger `capability_registry_change` est le plus sensible : c'est lui qui peut faire passer une capacité en `public_marketable` — mais seulement après validation PO (le pipeline ne change pas les statuts, il les lit).

---

## 3. Structure d'un content bundle

Pour chaque changement produit significatif, l'agent génère un **bundle** figé et versionné :

```
content-bundles/{trigger}-{shortSha|tag}-{timestamp}/
├── changelog-entry.mdx          # entrée changelog (draft)
├── product-article-draft.mdx    # article produit (draft)
├── faq-draft.mdx                # FAQ élite (draft)
├── developer-note-draft.mdx     # note développeur (draft)
├── glossary-updates.json        # ajouts/màj DefinedTerm (draft)
├── schema-updates.json          # màj schema.org proposées (draft)
├── llms-updates.md              # màj llms.txt / miroirs markdown (draft)
├── claim-safety-report.md       # rapport lisible des gates copy-safety
└── publishability.json          # verdict machine par surface (voir §3.1)
```

Tous les fichiers d'un bundle sont des **brouillons**. Aucun n'est une page publiée.

### 3.1 `publishability.json` (verdict machine)

```ts
export interface Publishability {
  bundleId: string;
  trigger: Trigger;
  sourceRef: string;              // sha/tag textos-v0
  generatedAtRef: string;         // horodatage passé en entrée (jamais Date.now interne)
  capabilitiesTouched: Array<{
    id: string;
    status: Status;               // lu depuis capability-registry
    marketable: boolean;          // === isMarketable(status)
  }>;
  perSurface: Record<Surface, "allowed" | "human_review" | "blocked">;
  copySafety: { blocks: string[]; warnings: string[] }; // ids de règles copy-safety
  poReviewRequired: true;         // TOUJOURS true — jamais d'auto-merge
  verdict: "draft_ready_for_po" | "blocked";
}

export type Surface =
  | "homepage" | "sales_copy" | "product_article" | "faq"
  | "developer_docs" | "methodology" | "changelog" | "roadmap"
  | "glossary" | "llms_txt" | "schema_org";
```

`poReviewRequired` est **toujours** `true` : le verdict `draft_ready_for_po` autorise l'ouverture d'une PR, jamais une publication.

---

## 4. Types de contenu

| Type | Description | Base exigée |
|---|---|---|
| **FAQ élite** | Q/R courtes, citables (GEO), sans overclaim | capacité `public_marketable` ou définition du registre |
| **Article produit** | Explique une capacité réelle | `public_marketable` (sinon draft/roadmap) |
| **Article cas d'usage client** | Usage réel, anonymisé, validé | preuve client + PO ; jamais un claim non soutenu |
| **Page développeur** | Doc technique (Authority Presence, Answer Evidence…) | `implemented` / `wip_committed_tested` (avec label) |
| **Page méthodologie** | Doctrine de mesure (union-not-sum, null≠0, estimateur) | draft §5–§11 |
| **Entrée de glossaire** | `DefinedTerm` | définition verbatim du registre (`entity-graph` §2) |
| **Changelog** | Ce qui a changé, factuel | commit/tag réel |
| **Note de roadmap** | Ce qui est `planned` | statut `planned`, jamais au présent |
| **Màj llms.txt** | Table des matières / miroir | pages `public_marketable` + définitions |
| **Màj schema.org** | `featureList` / `DefinedTerm` | `entity-graph` §3–§4 (features = `public_marketable`) |

---

## 5. Règles de publication par statut

Chaque capacité touchée dérive ses **surfaces autorisées** de son `Status` (registre).

| Status | Surfaces autorisées |
|---|---|
| `public_marketable` | **toutes** les surfaces publiques (homepage, sales_copy, article, faq, dev, méthodo, changelog, glossaire, llms, schema) — sous conditions copy-safety |
| `implemented` | developer_docs, changelog, methodology — **pas** de sales_copy automatique |
| `wip_committed_tested` | **note « technical foundation » uniquement** ; jamais de sales_copy ; jamais « available » |
| `implemented_schema_only` | methodology / developer_note uniquement |
| `planned` | roadmap uniquement |
| `candidate` | draft uniquement (jamais publié en l'état) |
| `risky` | **revue humaine obligatoire** avant toute surface |
| `unsupported` | **bloqué** |
| `forbidden` | **bloqué** |

```ts
export function allowedSurfaces(status: Status): Surface[] { /* table ci-dessus */ }
```

Exemple appliqué (état actuel du registre) : S8 (`wip_committed_tested`) → au mieux une **note technique** sur une page développeur, avec label « under validation » ; jamais une FAQ « TextOS verifies claims ».

---

## 6. Workflow Git

```
1. commit sur textos-v0  (ou autre trigger §2)
2. Release Content Agent lit le diff + les 4 specs d'entrée
3. l'agent génère un content bundle (§3) — DRAFTS uniquement
4. copy-safety valide les claims (règles bloquantes du registre §8)
5. schema validation vérifie l'éligibilité d'entité (entity-graph §3–§4)
6. publishability.json est écrit (verdict par surface)
7. l'agent ouvre une PR dans textos-site (branche feature/content-*)
8. revue PO OBLIGATOIRE
9. merge → build → déploiement textos.io
```

Invariants :

- L'agent **n'écrit jamais** dans `textos-v0` (lecture seule du diff).
- L'agent **n'auto-merge jamais** ; il ouvre une PR. `poReviewRequired = true`.
- Un bundle dont `publishability.verdict === "blocked"` **n'ouvre pas** de PR de publication (au plus une PR d'alerte / de correction).
- Une branche par bundle (`feature/content-{trigger}-{sha}`), cohérent avec la discipline Git du repo.

---

## 7. Politique CMS

- **V1 = Git + MDX uniquement.** La source de vérité est le repo, pas un CMS.
- **Pas de WordPress comme source de vérité** (ni aucun CMS lourd) — c'est l'anti-pattern que toute cette architecture évite.
- Un futur CMS headless **optionnel** doit rester **en aval** du `capability-registry` : il édite de la présentation, jamais la vérité produit.
- **Un CMS ne peut jamais décider** de la vérité produit ni du statut `public_marketable`. Ces décisions restent dans le registre + PO.

---

## 8. Sorties SEO / GEO

Pour chaque contenu publiable, le bundle propose (en draft) :

- `metadata` (title, description) — draft
- `canonical` URL — une origine indexable (`textos.io`), cohérent site-runtime §1
- `schema.org` draft — via `entity-graph` (features = `public_marketable` uniquement)
- `DefinedTerm` updates — définitions verbatim du registre
- liens internes proposés
- `llms.txt` updates + miroirs markdown
- guardrails obligatoires portés dans le texte (dispersion, null≠0, union-not-sum)

Aucune sortie SEO/GEO ne peut déclarer une capacité non `public_marketable` comme feature active (entity-graph §3, INV-5).

---

## 9. Contrôles de sécurité (gates bloquants)

Reprend les règles `block` du `capability-registry` §8. **Bloqué** tant que le statut n'est pas explicitement `public_marketable` + PO-validé :

```ts
export const PIPELINE_BLOCKS = [
  "Authority Score",
  "guarantees Google rankings",
  "makes your brand appear in AI answers",
  "verifies claims automatically",      // S8 extrait, ne vérifie pas
  "produces Opportunity Briefs",
  "explains causality",
  "connects RepOS demand to authority gaps",
];
```

- Toute occurrence → `publishability` marque la surface `blocked` et l'entrée dans `claim-safety-report.md`.
- Les règles `warn` (ex. comparaison inter-fenêtres sans même méthode/panel) → `human_review`.
- Aucun contournement automatique : un `block` ne devient publiable que si (a) le statut de la capacité passe `public_marketable` **et** (b) le PO valide.

---

## 10. Critères d'acceptation

- ✅ La génération de contenu pilotée par commit est spécifiée (§2, §3, §6).
- ✅ La publication reste **human-gated** (`poReviewRequired = true`, §3.1, §6).
- ✅ Le rôle du CMS est clairement subordonné (§7).
- ✅ Chaque type de contenu a des règles d'éligibilité (§4, §5).
- ✅ Aucune capacité WIP ne peut devenir de la sales copy (§5, §9).
- ✅ Les gates bloquants reprennent le registre (§9), Authority Score bloqué, S8 jamais « verifies claims ».
- ✅ Convertible en `content-pipeline.ts` sans ambiguïté (types `Trigger`, `Surface`, `Publishability`, `allowedSurfaces`).

---

## 11. Fin de Phase 2.1C

Livrable unique : `content-pipeline.spec.md`. Aucun scaffold, aucune route, aucune copy finale, `textos-v0` inchangé. **Non commité** — en attente de ta revue.

Consommateurs / voisins : `copy-safety-rules.spec.md` (2.1D — détaille les gates §9), `schema-map.spec.md` (2.1F — sorties §8), `page-map.spec.md` (2.1E — surfaces §5). Ce pipeline est le **moteur** ; les specs suivantes en fixent les détails d'exécution.
