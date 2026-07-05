# schema-map.spec.md

> **Phase 2.1F — Carte schema.org (JSON-LD) par page.**
> Définit quels nœuds schema.org chaque page émet, à partir de l'entity graph du site et de la page-map. C'est la dernière spec de gouvernance avant la génération TypeScript.
> Entrées : `entity-graph.spec.md`, `page-map.spec.md`, `capability-registry.spec.md`, `copy-safety-rules.spec.md`.
> Portée : spécification. Pas de scaffold, pas de générateur réel, pas de copy, `textos-v0` inchangé, pas de commit avant revue.
> Convertible sans ambiguïté en `schema-map.ts`.

---

## 0. Position & principe

La schema-map projette la **vérité** (registre) et la **représentation** (entity-graph) en **JSON-LD** par page (routes de `page-map`). Elle n'invente aucun nœud ; elle assemble.

Deux invariants durs hérités :

- **INV-5** (`site-runtime`) : aucun nœud/feature ne représente une capacité non `public_marketable`.
- `sameAs` : réels et vérifiables uniquement, zéro placeholder (`entity-graph` §0).

```ts
export interface JsonLdNode { "@type": string; [k: string]: unknown; }
export interface PageSchema {
  route: string;
  nodes: string[];              // ids de nœuds émis (voir §1/§2)
  emits: () => JsonLdNode[];    // assemblage final (spécifié, non implémenté ici)
}
```

---

## 1. Nœuds globaux (site-wide, injectés une fois)

Dérivés de `entity-graph` §1. Présents sur toutes les pages pertinentes (typiquement via le layout), pas dupliqués.

| id nœud | @type | champs | règle |
|---|---|---|---|
| `org-textos` | `Organization` | name, description, url, logo, sameAs[] | `sameAs` réels uniquement |
| `website-textos` | `WebSite` | name, url, inLanguage | une origine indexable (`textos.io`) |
| `app-textos` | `SoftwareApplication` | name, applicationCategory, description, featureList[] | `featureList` = registre filtré `public_marketable` (§4) |

---

## 2. Mapping schema.org par page

Reprend la colonne « schema.org » de `page-map` §1.

| route | @types émis | nœuds source |
|---|---|---|
| `/` | Organization, WebSite, SoftwareApplication | org-textos, website-textos, app-textos |
| `/method` | TechArticle, BreadcrumbList | method-article, breadcrumb |
| `/metrics` | TechArticle, DefinedTerm[] | metrics-article, DefinedTerm (Direct/Indirect/Total) |
| `/glossary` | DefinedTermSet, DefinedTerm[] | glossary-set (§3) |
| `/developers` | TechArticle, BreadcrumbList | dev-index, breadcrumb |
| `/developers/authority-presence` | TechArticle, BreadcrumbList | dev-ap-article, breadcrumb |
| `/developers/answer-evidence` | TechArticle, BreadcrumbList | dev-ae-article (S8 **hors featureList**), breadcrumb |
| `/faq` | FAQPage | faq-node (uniquement si vraies Q/R) |
| `/changelog` | CreativeWork | changelog-node |
| `/roadmap` | CreativeWork | roadmap-node (**aucune capacité planned en featureList**) |
| `/login` | — | (redirection, aucun JSON-LD) |
| `/llms.txt`, `/sitemap.xml`, `/robots.txt` | — | (fichiers, pas de JSON-LD) |

`BreadcrumbList` sur toute page imbriquée (`/developers/*`).

---

## 3. `DefinedTermSet` / `DefinedTerm`

Générés depuis `entity-graph` §2 (eux-mêmes tirés verbatim du registre §3/§6). Aucune définition inventée ici.

```ts
export const DEFINED_TERMS = [
  "Authority Presence", "Direct Share of Model", "Indirect Mention Share",
  "Total Authority Presence", "Observations éligibles", "Query panel versionné",
  "Dispersion (variance-ready)",
];
```

Chaque `DefinedTerm` porte ses guardrails dans sa `description` (union-not-sum, null≠0, estimateur-pas-score). `/glossary` émet le `DefinedTermSet` complet ; `/metrics` émet les 3 `DefinedTerm` de mesure.

---

## 4. Règle `SoftwareApplication.featureList` (verrou)

```ts
// featureList NE PEUT contenir QUE des ids public_marketable (entity-graph §3).
export const FEATURE_LIST = Object.keys(CAPABILITY_STATUS)
  .filter((id) => CAPABILITY_STATUS[id] === "public_marketable");
// → observe-authority-presence, direct-share-of-model, indirect-mention-share,
//   total-authority-presence, quality-ledger
```

Jamais en `featureList` (héritent du registre) : `opportunity-brief`, `truth-check`, `authority-gap`, `evidence-bundle`, `repos-intersection`, `authority-simulator` (planned) ; `claim-evidence-layer`, `answer-evidence-capture` (wip — au plus une prose « technical foundation » sur `/developers/answer-evidence`, jamais un nœud feature) ; `authority-score` (forbidden).

---

## 5. Règles `sameAs`

- `Organization.sameAs` : uniquement des profils **réels et vérifiables** aujourd'hui (LinkedIn / Crunchbase / GitHub / Wikidata s'ils existent).
- **Zéro placeholder** : un `sameAs` non vérifié n'est pas émis. Une liste `sameAs` vide est préférable à une liste inventée.

---

## 6. Gate d'éligibilité (build-time)

Avant émission, chaque page passe un contrôle :

```ts
export function assertSchemaEligible(page: PageSchema): void {
  // 1. Aucun @type interdit (entity-graph §4 : Dataset de métriques sans méthodologie → refus).
  // 2. featureList ⊆ FEATURE_LIST (public_marketable uniquement).
  // 3. Aucun DefinedTerm hors registre.
  // 4. FAQPage seulement si la page contient de vraies Q/R.
  // 5. sameAs : tous vérifiés (§5).
  // Échec → build FAIL (aucune page émise avec un JSON-LD non conforme).
}
```

Cohérent avec `copy-safety` (§9 CI/build gate) : un JSON-LD non conforme **fait échouer le build**, au même titre qu'une copy bloquée.

---

## 7. Critères d'acceptation

- ✅ Chaque route de `page-map` a un mapping schema.org (ou explicitement aucun).
- ✅ `SoftwareApplication.featureList` = `public_marketable` uniquement (§4).
- ✅ S8 jamais en `featureList` ; au plus prose labellisée sur `/developers/answer-evidence`.
- ✅ `authority-score` absent de tout JSON-LD.
- ✅ `DefinedTerm` uniquement depuis le registre, avec guardrails (§3).
- ✅ `sameAs` réels uniquement (§5).
- ✅ Gate build-time refuse tout JSON-LD non conforme (§6).
- ✅ Convertible en `schema-map.ts` sans ambiguïté (`PageSchema`, `FEATURE_LIST`, `assertSchemaEligible`).

---

## 8. Fin de Phase 2.1F

Livrable unique : `schema-map.spec.md`. Aucun scaffold, aucun générateur réel, `textos-v0` inchangé. **Non commité** — en attente de ta revue.

Les specs de gouvernance sont désormais complètes : `capability-registry`, `entity-graph`, `site-runtime-architecture`, `content-pipeline`, `copy-safety-rules`, `page-map`, `schema-map`. Prochaine étape logique : **2.2 — génération TypeScript des contrats** (`capability-registry.ts` → `entity-graph.ts` → `page-map.ts` → `schema-map.ts` → `copy-safety-rules.ts`, avec les assertions de garde), puis seulement **3.0 — scaffold Next.js**.
