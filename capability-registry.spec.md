# capability-registry.spec.md

> **Phase 2.1A — Registre de capacités & vérité marketing (issu du split de l'ex-`entity-graph.spec.md`).**
> Source : `ENTITY-GRAPH-DRAFT.md` (doctrine validée en Phase 1.3). Aucune relecture de `textos-v0`.
> Ce fichier est un **contrat** convertible sans ambiguïté en `capability-registry.ts`. Pas de scaffold, pas de code applicatif, pas de composant, pas de copy, `textos-v0` inchangé, pas de commit.
>
> **Rôle :** la machine qui empêche TextOS de mentir. Elle porte la **vérité produit** (ce qui est construit / testé / validé) et le **gating marketing** (ce qui peut apparaître comme disponible). Le seuil `public_marketable` n'est franchi que par décision Product Owner.
>
> **Frontière avec `entity-graph.spec.md` :** la représentation SEO/GEO du site (schema.org, DefinedTerms, `sameAs`, éligibilité) vit dans `entity-graph.spec.md`, qui **consomme** ce registre filtré à `public_marketable`. Ce fichier ne définit pas de balisage.

---

## 0. Vocabulaire de statut & types de base

### 0.1 Enum de statut (fermé)

```ts
export type Status =
  | "implemented"            // code + tests présents et verts (vérité produit)
  | "implemented_schema_only"// table/contrainte existent, logique métier absente
  | "wip_committed_tested"   // committed + tests verts, MAIS non validé PO pour le marketing
  | "public_marketable"      // implemented + validé PO + copy conforme → affichable comme disponible
  | "planned"                // spécifié (ADR/schéma/vision), non construit
  | "candidate"              // proposition de site à valider (non issue du produit)
  | "risky"                  // formulation marketing à encadrer strictement
  | "unsupported"            // aucune preuve dans le repo
  | "forbidden";             // interdit explicite par la doctrine
```

### 0.2 Règle de marketabilité (verrou central)

```ts
// INVARIANT DUR : la marketabilité n'est jamais dérivée d'un état de build seul.
export const isMarketable = (s: Status): boolean => s === "public_marketable";

// public_marketable EXIGE les trois conditions, dans cet ordre :
//   committed  &&  tested (verts)  &&  PO_validated_for_marketing
// L'absence d'une seule → au mieux wip_committed_tested, jamais public_marketable.
```

### 0.3 Classification d'un claim public

```ts
export type ClaimClassification = "allowed" | "risky" | "forbidden";
```

### 0.4 Types d'enregistrement

```ts
export type EvidenceLevel = "L1" | "L2" | "L3" | "L4" | "L5";
export type Confidence = "high" | "medium" | "low";

export interface Capability {
  id: string;
  label: string;
  status: Status;
  marketable: boolean;      // MUST === isMarketable(status)
  definition: string;
  sources: string[];
  confidence: Confidence;
  conditions?: string[];
  note?: string;
}

export interface Metric {
  id: string;
  label: string;
  status: Status;
  definition: string;
  invariant: string;
  forbiddenWording: string[];
  sources: string[];
}

export interface PublicClaim {
  text: string;
  classification: ClaimClassification;
  conditions?: string[];
  reason: string;
  source: string;
}
```

Provenance : chaque enregistrement cite la section de `ENTITY-GRAPH-DRAFT.md` (« draft §N »).

---

## 1. Entités produit (capabilities)

Seuls les `public_marketable` peuvent être présentés comme disponibles.

| id | label | status | marketable | conditions / note | sources |
|---|---|---|---|---|---|
| `observe-authority-presence` | Observe / Authority Presence (mesure de présence) | `public_marketable` | true | Toujours avec dispersion + complétude + méthode + panel ; jamais un score nu. PO : « marketable avec prudence ». | draft §8, §14, §16 |
| `claim-evidence-layer` | S8 — Claim Evidence (answer evidence + extraction déterministe) | `wip_committed_tested` | false | Committed (`1178684`) + 20 tests verts, non validé PO. « Fondation technique » en interne, jamais « disponible ». | draft §1.2, §15 |
| `understand-patterns` | Understand (pourquoi / patterns) | `planned` | false | Couche non construite (S9+). | draft §15 |
| `act-content-generation` | Act (génération de contenu) | `planned` | false | Tables présentes, logique absente. | draft §15 |
| `authority-gap` | Authority Gap (typage des gaps) | `planned` | false | Table présente, logique absente (S9). | draft §15 |
| `opportunity-brief` | Opportunity Brief | `planned` | false | Table + enum status présents, aucune génération. | draft §15 |
| `truth-check` | TruthCheck (vérification de claims) | `planned` | false | Enum verdict figé, logique absente. S8 **extrait**, ne **vérifie pas**. | draft §1.2, §15 |
| `evidence-bundle` | EvidenceBundle | `planned` | false | Table présente (repos_evidence nullable), logique absente. | draft §15 |
| `repos-intersection` | RepOSIntersection (Customer Demand ∩ Authority Gap) | `planned` | false | Premium ; table présente, logique absente. Jamais en standalone. | draft §15 |
| `authority-simulator` | Authority Simulator | `planned` | false | Roadmap explicite. | draft §15 |
| `wedge-lras-dqag` | LRAS / DQAG / lead impact / intervention loop | `unsupported` | false | Hypothèses 🔵 (Measurement Vision, non contraignant). | draft §15 |
| `authority-score` | Authority Score (composite unique) | `forbidden` | false | Anti-objectif explicite (ADR-011 §2). | draft §4, §17, §18 |

Invariant : pour toute ligne, `marketable === isMarketable(status)`. Seul `observe-authority-presence` est `true`.

---

## 2. Entités de mesure (data-model)

Statut orienté vérité de build ; l'usage marketing passe par §1 et les métriques de §3.

| id | label | status | sources |
|---|---|---|---|
| `tracked-entity` | TrackedEntity (`canonical_entity`) | `implemented` | draft §7 |
| `market-subject` | MarketSubject (`market_subject`) | `implemented_schema_only` | draft §7 (ADR-003 §3 : pas de SoM propriétaire) |
| `measurement-setup` | `measurement_setup` (3 kinds) | `implemented` | draft §7 |
| `query-panel` | QueryPanel (versionné) | `implemented` | draft §7 |
| `engine-run` | EngineRun | `implemented` | draft §7 |
| `engine-observation-result` | EngineObservationResult (8 statuts, append-only) | `implemented` | draft §6, §7 |
| `citation` | Citation (source vs bénéficiaire) | `implemented` | draft §7 |
| `authority-presence-readmodel` | AuthorityPresence (read model, non persisté) | `implemented` | draft §7, §8 |
| `answer-evidence` | `answer_evidence` (capture S8) | `wip_committed_tested` | draft §1.2, §15 |
| `claim` | Claim (table + extraction déterministe S8) | `implemented_schema_only` (table) + `wip_committed_tested` (extraction) | draft §1.2, §15 |

Désambiguïsation (draft §7) : le modèle d'entités **produit** ci-dessus n'est PAS l'entity graph SEO du **site** (`entity-graph.spec.md`). Ne jamais écrire de `sameAs` SEO dans la base produit.

---

## 3. Métriques de présence d'autorité

Trois mesures **séparées**, jamais fusionnées ; jamais de score composite. `variance-ready` (dispersion), pas `variance-aware` (pas d'intervalle en V1).

```ts
export const METRICS: Metric[] = [ direct, indirect, total ]; // + qualityRates (non-autorité)
```

### 3.1 Direct Share of Model — `implemented`

- **Définition :** part des observations éligibles (`ok` + `no_citations`) contenant ≥1 citation `citation_kind = "direct"` ET `matched_tracked_entity_id = entité`. Comptage **par observation**.
- **Invariant :** dénominateur = éligibles, jamais le nombre de citations ; filtre par `matched_tracked_entity_id`.
- **Forbidden wording :** « Share of Model : 8 % » (nombre sec).
- **Sources :** draft §9.

### 3.2 Indirect Mention Share — `implemented`

- **Définition :** part des observations éligibles avec ≥1 citation `indirect_mention` ET entité matchée.
- **Invariant (null ≠ 0) :** `null` (« non observable ») quand la méthode ne produit pas le signal ; `0` seulement si la méthode le produit et n'en trouve aucun. **Perplexity V0 → `null`.** Capacité = propriété de la méthode, jamais inférée des données.
- **Forbidden wording :** « 0 % de mentions indirectes » (run Perplexity).
- **Sources :** draft §10.

### 3.3 Total Authority Presence — `implemented`

- **Définition :** part des observations éligibles où l'entité est présente directement OU indirectement — **union par observation**.
- **Invariant (union-not-sum) :** union, jamais somme. Une observation direct+indirect compte 1. Si indirect non observable → `total = direct` = **plancher**, jamais présenté comme total définitif ; porte `signalCoverage {direct, indirect}`.
- **Forbidden wording :** « Direct Share + Indirect Share = Total Authority Presence ».
- **Sources :** draft §11, §12.

### 3.4 Taux de qualité — `implemented`, **ne sont pas des métriques d'autorité**

- `run_completion_rate`, `share_of_model_eligible_rate`, `answer_surface_trigger_rate` (`planned = query_count × n_executions`, jamais comptage de lignes ; oracle `0.6 / 0.5 / 0.8333`).
- **Invariant :** `share_of_model_eligible_rate` n'est pas le Share of Model ; complétude faible = signal opérationnel, jamais chute d'autorité.
- **Sources :** draft §6, §8.

---

## 4. Table de statut de capacité (maîtresse)

```ts
// marketable DOIT être recalculé, jamais saisi : marketable = isMarketable(status)
export const CAPABILITY_STATUS: Record<string, Status> = {
  "observe-authority-presence": "public_marketable",
  "direct-share-of-model":      "public_marketable", // sous conditions §3.1 + copy-safety §8
  "indirect-mention-share":     "public_marketable", // sous conditions §3.2 (null ≠ 0)
  "total-authority-presence":   "public_marketable", // sous conditions §3.3 (union-not-sum)
  "quality-ledger":             "public_marketable", // « savoir dire je-ne-sais-pas-encore »
  "market-subject-mapping":     "implemented_schema_only",
  "claim-evidence-layer":       "wip_committed_tested",
  "answer-evidence-capture":    "wip_committed_tested",
  "deterministic-claim-extraction": "wip_committed_tested",
  "understand-patterns":        "planned",
  "act-content-generation":     "planned",
  "authority-gap":              "planned",
  "opportunity-brief":          "planned",
  "truth-check":                "planned",
  "evidence-bundle":            "planned",
  "repos-intersection":         "planned",
  "authority-simulator":        "planned",
  "wedge-lras-dqag":            "unsupported",
  "authority-score":            "forbidden",
};
```

Garde à encoder en `capability-registry.ts` : **assert** `marketable[id] === isMarketable(CAPABILITY_STATUS[id])` pour toute clé — échec de build sinon.

---

## 5. Statuts de claim marketing (allowed / risky / forbidden)

| Claim public | classification | conditions | source |
|---|---|---|---|
| « TextOS measures Authority Presence across model outputs. » | allowed | — | draft §17 |
| « TextOS observes how AI answer engines cite sources. » | allowed | — | draft §17 |
| « Three separate measures: direct, indirect, total presence. » | allowed | ne jamais agréger en un score | draft §17 |
| « Measurement carries its completeness and comparability. » | allowed | — | draft §17 |
| « TextOS shows your Share of Model. » | risky | seulement avec dispersion + complétude + méthode + panel | draft §17 |
| « Your authority is at X. » | risky | par mesure nommée + entité + run ; jamais agrégé | draft §17 |
| « TextOS improves your AI visibility. » | risky | « improve » = action non construite → futur | draft §17 |
| Comparaison de deux fenêtres | risky | seulement si méthode / panel / locale identiques | draft §17 |
| S8 comme « capability under validation » / « technical foundation » | risky | jamais « available » ; jamais « verifies claims » | draft §1.2 |
| « TextOS produces Opportunity Briefs » | forbidden | — | §6 |
| « TextOS verifies claims automatically » | forbidden | S8 extrait, ne vérifie pas | §6 |
| « TextOS explains causality » / « understands why » | forbidden | — | §6 |
| « TextOS connects RepOS demand to authority gaps » | forbidden | — | §6 |
| « TextOS Authority Score: N » | forbidden | anti-objectif | §6 |
| « TextOS guarantees higher rankings in Google » | forbidden | — | §6 |
| « TextOS makes your brand appear in all AI answers » | forbidden | — | §6 |
| « TextOS + RepOS unified platform, available today » | forbidden | interop = boussole privée | draft §17 |

---

## 6. Claims interdits (liste dure)

```ts
export const FORBIDDEN_CLAIMS: string[] = [
  "TextOS produces Opportunity Briefs",
  "TextOS verifies claims automatically",
  "TextOS explains causality",
  "TextOS understands why",
  "TextOS connects RepOS demand to authority gaps",
  "TextOS has an Authority Score",
  "TextOS guarantees Google rankings",
  "TextOS makes your brand appear in AI answers",
];
```

Interdits de formulation (draft §18) : « Authority Score » ; Share of Model nu ; « intervalle de confiance » en V1 ; « 0 % de mentions indirectes » (Perplexity) ; « la cause de votre invisibilité » ; « génère des leads » ; Understand / Act / RepOS au présent.

---

## 7. Prédicat de marketabilité & disponibilité de page

```ts
// Une page ne peut ASSERTER une capacité comme disponible que si elle est public_marketable.
export function canAssertAsAvailable(cap: Capability): boolean {
  return cap.marketable; // === status === "public_marketable"
}

// Une capacité non public_marketable n'apparaît qu'AVEC un label de statut explicite.
export function mentionMode(cap: Capability): "available" | "labeled_status" | "excluded" {
  if (cap.status === "public_marketable") return "available";
  if (cap.status === "forbidden" || cap.status === "unsupported") return "excluded";
  return "labeled_status"; // "coming soon" / "roadmap" / "under validation"
}
```

Ce prédicat est consommé par `page-map.spec.md` (quelles pages) et par `entity-graph.spec.md` (quelles features déclarées en schema.org). S8 (`wip_committed_tested`) → `labeled_status` uniquement.

---

## 8. Règles de sécurité de copy (lint, pour `copy-safety-rules.ts`)

Gates **bloquants** que `copy-safety-rules.spec.md` détaillera et que `copy-safety-rules.ts` implémentera.

```ts
export interface CopyRule { id: string; severity: "block" | "warn"; test: string; message: string; }

export const COPY_SAFETY_RULES: CopyRule[] = [
  { id: "no-authority-score", severity: "block",
    test: "/authority score/i (comme métrique/chiffre)",
    message: "Authority Score = forbidden (ADR-011 §2)." },
  { id: "som-needs-context", severity: "block",
    test: "nombre de Share of Model sans tokens {dispersion, complétude, méthode, panel} à proximité",
    message: "Share of Model nu interdit (ADR-008 §6)." },
  { id: "no-confidence-interval-v1", severity: "block",
    test: "/intervalle de confiance|confidence interval/i",
    message: "V1 : dispersion seulement, pas d'intervalle (ADR-011 §6)." },
  { id: "indirect-null-not-zero", severity: "block",
    test: "/0\\s?%/ proche de /mention.*indirecte|indirect mention/i (contexte Perplexity)",
    message: "Indirect non observable → 'non observable', jamais 0 % (ADR-011 §4)." },
  { id: "total-is-union", severity: "block",
    test: "'direct + indirect' présenté comme total",
    message: "Total = union par observation, jamais somme (ADR-011 §3)." },
  { id: "no-causality", severity: "block",
    test: "/cause de votre invisibilité|explains? (the )?cause|causality/i",
    message: "Pas de causalité ; 'patterns qui distinguent' (PRODUCT-VISION §7)." },
  { id: "no-claim-verification", severity: "block",
    test: "/verif(y|ies)? claims?|vérifie.* claims?|TruthCheck/i comme disponible",
    message: "S8 extrait, ne vérifie pas ; TruthCheck non construit." },
  { id: "no-briefs-present", severity: "block",
    test: "/produces? .*Opportunity Brief|génère.* brief/i au présent",
    message: "OpportunityBrief = planned ; 'coming soon' seulement." },
  { id: "no-repos-connection", severity: "block",
    test: "/connects? RepOS|intersection.*RepOS.*available/i",
    message: "RepOSIntersection = planned / premium." },
  { id: "no-unified-platform", severity: "block",
    test: "/unified platform|plateforme unifiée.*(today|available)/i",
    message: "Interop = boussole privée (PRODUCT-VISION §10/§15)." },
  { id: "no-google-guarantee", severity: "block",
    test: "/guarantee.*(ranking|Google)/i",
    message: "Interdit : garantie de ranking Google." },
  { id: "no-all-ai-answers", severity: "block",
    test: "/appear in all AI answers|toutes les réponses IA/i",
    message: "Interdit : overclaim d'omniprésence." },
  { id: "s8-labeled-only", severity: "block",
    test: "capacité wip_committed_tested sans label de statut",
    message: "S8 : 'technical foundation' / 'under validation' uniquement." },
  { id: "no-trend-across-version-break", severity: "warn",
    test: "comparaison de taux entre fenêtres sans même méthode/panel/locale",
    message: "Faux signal possible (ADR-008 §5)." },
];
```

Toute règle `block` non satisfaite **empêche la publication**.

---

## 9. Transitions de statut

```
planned ──(code + tests commités)──▶ wip_committed_tested ──(validation PO marketing)──▶ public_marketable
implemented_schema_only ──(logique + tests)──▶ wip_committed_tested ──(PO)──▶ public_marketable
candidate ──▶ retiré | intégré
risky ──▶ allowed | forbidden
unsupported ──(preuve)──▶ planned | wip_committed_tested
forbidden = terminal (ex. authority-score)
```

```ts
export const TRANSITIONS = {
  toWipCommittedTested: ["planned", "implemented_schema_only"], // via commit + tests verts
  toPublicMarketable:   ["wip_committed_tested", "implemented"], // via validation PO UNIQUEMENT
  terminalForbidden:    ["authority-score"],
} as const;
```

Règles : aucune capacité ne devient `public_marketable` sans passage explicite par le PO ; `forbidden` est terminal ; la marketabilité est **révocable** (incident / tests cassés / retrait PO → redescente).

---

## 10. Critères d'acceptation

- ✅ Chaque entité (§1, §2) porte un `Status`.
- ✅ Chaque métrique (§3) porte définition + invariant + forbidden wording.
- ✅ Chaque claim public (§5) est classé allowed / risky / forbidden.
- ✅ Authority Score = `forbidden` (terminal), partout.
- ✅ Total = union, jamais somme (§3.3, §8 `total-is-union`).
- ✅ Indirect préserve `null ≠ 0` (§3.2, §8 `indirect-null-not-zero`).
- ✅ S8 = `wip_committed_tested`, jamais `public_marketable` (§1, §2, §4, §8 `s8-labeled-only`).
- ✅ Seules les capacités `public_marketable` sont affichables comme disponibles (§0.2, §7).
- ✅ Convertible en `capability-registry.ts` sans ambiguïté (enum fermé, `marketable` dérivé et assertable).

---

## 11. Fin de Phase 2.1A (registre)

Livrable de ce fichier : `capability-registry.spec.md`. Aucun scaffold, aucun code applicatif, aucune copy, `textos-v0` inchangé, pas de commit.

Consommateurs en aval : `entity-graph.spec.md` (features schema.org = ce registre filtré à `public_marketable`), `page-map.spec.md` (disponibilité de page via §7), `copy-safety-rules.spec.md` (détaille §8). Le registre est la **source de vérité** ; les autres specs n'ajoutent aucune capacité, elles le consomment.
