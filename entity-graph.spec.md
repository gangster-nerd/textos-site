# entity-graph.spec.md

> **Phase 2.1A — Graphe d'entités SEO/GEO du site `textos.io` (issu du split de l'ex-`entity-graph.spec.md`).**
> Ce fichier définit la **représentation machine-readable de l'entité TextOS** pour les moteurs de recherche et les LLM : quels nœuds schema.org le site déclare, quels `DefinedTerm` il expose, quelles règles de `sameAs`, et quelles features sont déclarables.
> Il **consomme** `capability-registry.spec.md` (filtré à `public_marketable`). Il ne définit aucune capacité produit ; il en projette la vérité en balisage.
> Pas de scaffold, pas de code applicatif, pas de générateur schema.org, `textos-v0` inchangé, pas de commit.
>
> **Trois « entity graphs » à ne jamais confondre** (rappel draft §7) :
> 1. Modèle de domaine du **produit** (`TrackedEntity` / `MarketSubject`) — ce que TextOS mesure. Vit dans le produit. **Absent d'ici.**
> 2. **Ce fichier** : graphe SEO de l'**entité TextOS** (l'entreprise/produit) pour Google et les LLM.
> 3. Registre de capacités (`capability-registry.spec.md`) — vérité + gating. Consommé ici.

---

## 0. Portée & principe

- Le graphe décrit **l'entité TextOS elle-même** (organisation, application, site, vocabulaire), pas les entités mesurées par le produit.
- Règle d'or (INV-5 de `site-runtime-architecture.spec.md`) : **aucun nœud/feature déclaré ici ne peut représenter une capacité non `public_marketable`.** Le graphe projette uniquement du vrai.
- `sameAs` : uniquement des liens **réels et vérifiables aujourd'hui**. Zéro placeholder (draft §20).

```ts
// Garde transverse à encoder en entity-graph.ts :
// tout nœud "feature" doit provenir de CAPABILITY_STATUS filtré à "public_marketable".
export function declarableFeature(id: string): boolean {
  return CAPABILITY_STATUS[id] === "public_marketable";
}
```

---

## 1. Nœuds d'entité du site

```ts
export interface SiteEntityNode {
  id: string;
  schemaType: string;         // type schema.org
  status: "candidate";        // le graphe SITE est une proposition de conception (non issue du produit)
  fields: string[];           // propriétés déclarées
  rule?: string;
}
```

| id | schemaType | champs | règle |
|---|---|---|---|
| `org-textos` | `Organization` | name, description, url, logo, sameAs[] | `sameAs` réels uniquement ; zéro placeholder |
| `website-textos` | `WebSite` | name, url, inLanguage | une seule origine indexable (`textos.io`) ; `www` redirige |
| `app-textos` | `SoftwareApplication` | name, applicationCategory, description, featureList[] | `featureList` = registre filtré à `public_marketable` (§3) |
| `person-author` | `Person` | name, jobTitle, credentials | credentials **réels** uniquement (E-E-A-T) |

Statut : le graphe SEO du site est `candidate` (proposition de conception), distinct de la vérité produit. Les **valeurs** qu'il projette (features, définitions) héritent, elles, du statut du registre.

---

## 2. Vocabulaire canonique — `DefinedTermSet` / `DefinedTerm`

Le glossaire est le meilleur pont GEO. Ses termes sont tirés **verbatim** des définitions du registre (`capability-registry.spec.md` §3 + §5–§6). Aucune définition inventée ici.

```ts
export interface DefinedTermNode {
  term: string;
  schemaType: "DefinedTerm";
  definitionSource: string;   // pointe vers capability-registry
  guardrails: string[];       // garde-fous obligatoires dans la définition publiée
}
```

| term | source (registre) | guardrails obligatoires |
|---|---|---|
| Authority Presence | reg §1 `observe-authority-presence` | trois mesures séparées ; jamais un score composite |
| Direct Share of Model | reg §3.1 | estimateur avec dispersion ; jamais un nombre nu |
| Indirect Mention Share | reg §3.2 | `null` (« non observable ») ≠ `0` ; Perplexity V0 → non observable |
| Total Authority Presence | reg §3.3 | union par observation, jamais somme ; plancher si indirect non observable |
| Observations éligibles | reg §3 / draft §6 | `ok` + `no_citations` ; échec de transport ≠ absence de marque |
| Query panel versionné | draft §6 | instrument figé (`id`, `version`) |
| Dispersion (variance-ready) | reg §3 | pas d'intervalle de confiance en V1 |

`DefinedTermSet` = l'ensemble ci-dessus. Toute évolution d'une définition côté registre se répercute ici (source unique).

---

## 3. Règle de déclaration des features (`SoftwareApplication.featureList`)

```ts
// featureList NE PEUT contenir QUE des ids public_marketable du registre.
export const DECLARABLE_FEATURES = Object.keys(CAPABILITY_STATUS)
  .filter((id) => CAPABILITY_STATUS[id] === "public_marketable");
// → ["observe-authority-presence","direct-share-of-model","indirect-mention-share",
//    "total-authority-presence","quality-ledger"]  (à la date de cette spec)
```

Interdits de `featureList` (héritent du registre) — **jamais** déclarés comme feature active tant que non `public_marketable` :

- `opportunity-brief`, `truth-check`, `authority-gap`, `evidence-bundle`, `repos-intersection` (`planned`)
- `claim-evidence-layer`, `answer-evidence-capture`, `deterministic-claim-extraction` (`wip_committed_tested` — mentionnables en prose « technical foundation », **pas** en `featureList`)
- `authority-score` (`forbidden`)

---

## 4. Règles d'éligibilité schema.org

```ts
export const SCHEMA_ELIGIBILITY = {
  Organization:        { allowed: true,  rule: "sameAs vers nœuds RÉELS et vérifiables ; zéro placeholder" },
  WebSite:             { allowed: true,  rule: "une origine indexable (textos.io) ; www redirige" },
  SoftwareApplication: { allowed: true,  rule: "featureList = registre filtré à public_marketable (§3)" },
  DefinedTermSet:      { allowed: true,  rule: "glossaire = définitions du registre, verbatim (§2)" },
  DefinedTerm:         { allowed: true },
  TechArticle:         { allowed: true,  rule: "méthodologie ; estimateur, pas score" },
  Article:             { allowed: true },
  BlogPosting:         { allowed: true,  rule: "dateModified réel" },
  CreativeWork:        { allowed: true,  rule: "changelog = build réel" },
  BreadcrumbList:      { allowed: true },
  Person:              { allowed: true,  rule: "credentials réels uniquement" },
  FAQPage:             { allowed: true,  rule: "seulement si le contenu est réellement une FAQ" },
  Dataset:             { allowed: false, rule: "risky : interdit sans méthodologie complète (panel/N/fenêtres/variance) — ADR-008" },
} as const;
```

Règle dure : **aucun markup ne peut encoder une capacité non `public_marketable` comme feature offerte** (§3, INV-5).

---

## 5. Règles d'éligibilité GEO / lisible par LLM

```ts
export const GEO_ELIGIBILITY = {
  llmsTxt:            { allowed: true,  rule: "table des matières ; convention émergente, pas un standard Google" },
  markdownMirrors:    { allowed: true,  rule: "miroirs des pages public_marketable + définitions du registre" },
  shortAnswerBlocks:  { allowed: true,  rule: "définitions §2 citables ; DOIVENT porter les guardrails (dispersion, null≠0, union-not-sum)" },
  methodologyPage:    { allowed: true,  rule: "union-not-sum, null ≠ 0, estimateur-pas-score" },
  realMeasurementDogfooding: { allowed: false, rule: "candidate : seulement si un run réel post-S7 existe (PO), en respectant §2 + registre" },
};
```

Un bloc citable n'expose qu'une capacité `public_marketable` ou une définition du registre ; jamais une capacité `planned` / `wip_committed_tested` présentée comme disponible.

---

## 6. Ce qui ne doit JAMAIS apparaître dans le graphe SEO du site

- Le modèle d'entités **produit** (`TrackedEntity`, `MarketSubject`, `Citation`) comme s'il s'agissait de l'entité du site.
- Un `sameAs` placeholder / non vérifié.
- Un `SoftwareApplication.featureList` contenant une capacité `planned` / `wip_committed_tested` / `forbidden`.
- Un `Dataset` de métriques d'autorité sans sa méthodologie.
- Toute métrique d'autorité chiffrée sans ses guardrails (§2).

---

## 7. Critères d'acceptation

- ✅ Chaque nœud (§1) a un `schemaType` et une règle.
- ✅ Chaque `DefinedTerm` (§2) pointe vers sa définition dans le registre, avec guardrails.
- ✅ `featureList` = uniquement `public_marketable` (§3, `declarableFeature`).
- ✅ Éligibilité schema.org (§4) et GEO (§5) explicites.
- ✅ Aucune confusion produit/site : le modèle produit est exclu (§6).
- ✅ Convertible en `entity-graph.ts` sans ambiguïté (nœuds typés, `declarableFeature` dérivé du registre).

---

## 8. Fin de Phase 2.1A (graphe SEO)

Livrable de ce fichier : `entity-graph.spec.md` (graphe SEO/GEO du site, distinct du registre). Aucun scaffold, aucun code, `textos-v0` inchangé, pas de commit.

Dépendances : consomme `capability-registry.spec.md` (features + définitions). Consommé par `schema-map.spec.md` (types par page) et `page-map.spec.md`. Le split Phase 2.1A est complet : registre (vérité) ↔ graphe (représentation) désormais séparés et nommés fidèlement.
