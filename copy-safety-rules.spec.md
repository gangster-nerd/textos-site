# copy-safety-rules.spec.md

> **Phase 2.1D — Spécification des règles de sécurité de copy.**
> Détaille le **linter bloquant** qui empêche toute copy publiée sur `textos.io` de trahir la vérité produit. C'est l'exécution fine des gates listés dans `capability-registry.spec.md` §8 et invoqués par `content-pipeline.spec.md` §9.
> Entrées : `capability-registry.spec.md`, `entity-graph.spec.md`, `content-pipeline.spec.md`, `ENTITY-GRAPH-DRAFT.md`.
> Portée : spécification. Pas de scaffold, pas de composant, pas de copy finale, `textos-v0` inchangé, pas de commit avant revue.
> Convertible sans ambiguïté en `copy-safety-rules.ts`.

---

## 0. Position & principe

Le linter est le **dernier verrou** avant qu'un texte devienne publiable. Il ne juge pas la qualité éditoriale ; il juge la **conformité à la doctrine** : aucun overclaim, aucune capacité non `public_marketable` présentée comme disponible, aucun invariant de mesure trahi.

Principe directeur (hérité de la doctrine) : **un texte qui ne peut pas prouver ce qu'il affirme est bloqué, pas édulcoré.** Le linter préfère un faux positif (bloquer un texte sûr) à un faux négatif (laisser passer un overclaim).

---

## 1. Modèle de règle

```ts
export type Severity = "block" | "warn";

// Deux natures de blocage — distinction CRITIQUE (voir §3) :
export type BlockKind =
  | "forbidden_claim"    // interdit par doctrine : NE se lève QUE si le statut devient public_marketable + PO
  | "missing_guardrail"; // formulation incomplète : se lève en AJOUTANT le contexte requis

export interface CopyRule {
  id: string;
  severity: Severity;
  blockKind?: BlockKind;        // requis si severity === "block"
  detect: string;              // spécification du prédicat (regex + contexte) à implémenter
  requires?: string[];         // tokens/contexte requis à proximité (pour missing_guardrail)
  message: string;             // message d'échec lisible
  source: string;              // ancrage doctrine
  passExample: string;
  failExample: string;
}

export interface Violation {
  ruleId: string;
  severity: Severity;
  blockKind?: BlockKind;
  span: string;                // extrait fautif
  surface: string;             // page/surface concernée
  message: string;
}
```

---

## 2. Entrées / sorties du linter

```ts
export interface LintInput {
  text: string;                 // le texte candidat (MDX/markdown rendu en texte)
  surface: Surface;             // homepage | sales_copy | faq | developer_docs | ... (content-pipeline §3.1)
  referencedCapabilities: string[]; // ids de capacités que le texte mentionne
}

export interface LintResult {
  violations: Violation[];
  blocks: Violation[];          // severity === "block"
  warnings: Violation[];        // severity === "warn"
  publishable: boolean;         // === blocks.length === 0
}

export function lintCopy(input: LintInput, registry: CapabilityRegistry): LintResult;
```

Contrat : `publishable === (blocks.length === 0)`. Un `warn` ne bloque pas mais force `human_review` côté `content-pipeline` (§3.1 `perSurface`).

---

## 3. Taxonomie des violations (comment un blocage se lève)

| Nature | Se lève comment | Exemple |
|---|---|---|
| `block` + `forbidden_claim` | **Uniquement** si le statut de la capacité passe `public_marketable` **et** PO valide. Aucune réécriture de copy ne suffit. | « Authority Score », « verifies claims », « guarantees Google rankings » |
| `block` + `missing_guardrail` | En **ajoutant le contexte requis** (`requires`). La capacité est réelle, la formulation est incomplète. | « Share of Model : 8 % » → ajouter dispersion + complétude + méthode + panel |
| `warn` | Revue humaine (PO) ; peut être approuvé tel quel avec justification. | comparaison de deux fenêtres |

Règle dure : un `forbidden_claim` **n'est jamais** contournable par édition de texte. C'est un verrou de *vérité*, pas de *style*.

---

## 4. Jeu de règles (bloquantes)

Reprend et précise `capability-registry.spec.md` §8.

```ts
export const RULES: CopyRule[] = [ /* ci-dessous */ ];
```

| id | severity / kind | detect (spec) | message | source |
|---|---|---|---|---|
| `no-authority-score` | block / forbidden_claim | `/authority\s*score/i` comme métrique ou chiffre | Authority Score = anti-objectif | ADR-011 §2 |
| `som-needs-context` | block / missing_guardrail | un `%` ou nombre lié à « Share of Model » **sans** les 4 tokens requis dans le même bloc | Share of Model nu interdit | ADR-008 §6 |
| `no-confidence-interval-v1` | block / forbidden_claim | `/intervalle de confiance\|confidence interval/i` | V1 : dispersion, pas d'intervalle | ADR-011 §6 |
| `indirect-null-not-zero` | block / forbidden_claim | `/0\s?%/` proche de `/mention.*indirecte\|indirect mention/i` (contexte Perplexity) | « non observable », jamais 0 % | ADR-011 §4 |
| `total-is-union` | block / forbidden_claim | motif « direct + indirect » présenté comme total | Total = union, jamais somme | ADR-011 §3 |
| `no-causality` | block / forbidden_claim | `/cause de votre invisibilité\|explains? (the )?cause\|causality/i` | patterns qui distinguent, pas de cause | PRODUCT-VISION §7 |
| `no-claim-verification` | block / forbidden_claim | `/verif(y\|ies)? claims?\|vérifie.* claims?\|TruthCheck/i` comme disponible | S8 extrait, ne vérifie pas | draft §1.2 |
| `no-briefs-present` | block / forbidden_claim | `/produces? .*Opportunity Brief\|génère.* brief/i` au présent | OpportunityBrief = planned | reg §1 |
| `no-repos-connection` | block / forbidden_claim | `/connects? RepOS\|intersection.*RepOS.*available/i` | RepOSIntersection = planned/premium | reg §1 |
| `no-unified-platform` | block / forbidden_claim | `/unified platform\|plateforme unifiée.*(today\|available)/i` | interop = boussole privée | PRODUCT-VISION §10/§15 |
| `no-google-guarantee` | block / forbidden_claim | `/guarantee.*(ranking\|Google)/i` | pas de garantie de ranking | reg §6 |
| `no-all-ai-answers` | block / forbidden_claim | `/appear in all AI answers\|toutes les réponses IA/i` | pas d'omniprésence | reg §6 |
| `s8-labeled-only` | block / missing_guardrail | capacité `wip_committed_tested` mentionnée sans label de statut | « technical foundation » / « under validation » requis | reg §1 |
| `no-trend-across-version-break` | warn | comparaison de deux taux entre fenêtres sans même méthode/panel/locale | faux signal possible | ADR-008 §5 |

`requires` pour les `missing_guardrail` :

```ts
"som-needs-context".requires = ["dispersion", "complétude", "méthode|method", "panel"];
"s8-labeled-only".requires   = ["technical foundation|under validation|fondation technique"];
```

---

## 5. Règles contextuelles (proximité)

Un simple match de mot ne suffit pas ; le contexte décide.

- **Proximité (`som-needs-context`)** : un nombre de Share of Model est conforme uniquement si les 4 tokens requis apparaissent dans le **même bloc sémantique** (paragraphe ou composant), pas ailleurs sur la page.
- **Fenêtre de voisinage (`indirect-null-not-zero`)** : le `0 %` n'est fautif que s'il est associé à « mention indirecte » dans un voisinage court (même phrase/bloc) **et** dans un contexte Perplexity/V0. Un `0 %` sans rapport n'est pas visé.
- **Négation / citation** : un texte qui **cite un interdit pour l'expliquer** (ex. page méthodologie : « nous n'affichons pas d'Authority Score parce que… ») ne doit pas déclencher un `forbidden_claim`. Le linter distingue **affirmation** (bloque) de **méta-mention** (autorise), via un marqueur explicite `data-copy-safety="meta-mention"` autour du passage — sinon, en cas de doute, il bloque.

> Le marqueur méta-mention est le **seul** moyen d'écrire un terme interdit ; il exige une intention explicite de l'auteur et reste soumis à revue.

---

## 6. Règles sensibles au statut

Toute capacité référencée (`referencedCapabilities`) est confrontée à son `Status` (registre).

```ts
for (const id of input.referencedCapabilities) {
  const status = CAPABILITY_STATUS[id];
  if (status !== "public_marketable" && surfaceIsSalesFacing(input.surface)) {
    // une surface de vente ne peut présenter que du public_marketable
    → block("capability-not-marketable", forbidden_claim si forbidden/unsupported,
                                          missing_guardrail (label) sinon)
  }
}
```

Table de cohérence (dérivée `content-pipeline` §5) :

| Status de la capacité citée | Sur surface de vente (homepage/sales) | Sur surface technique (dev/méthodo) |
|---|---|---|
| `public_marketable` | autorisé | autorisé |
| `implemented` | bloqué (pas de sales auto) | autorisé |
| `wip_committed_tested` | bloqué | autorisé **avec label** |
| `implemented_schema_only` | bloqué | méthodo/dev uniquement |
| `planned` | bloqué (roadmap seulement) | roadmap uniquement |
| `candidate` | bloqué | draft uniquement |
| `unsupported` / `forbidden` | bloqué (forbidden_claim) | bloqué |

---

## 7. Exceptions & override

- Un **`warn`** peut être approuvé par le PO avec justification tracée (`overrides.json` : ruleId, span, justification, validateur).
- Un **`block` / `missing_guardrail`** ne se lève qu'en **corrigeant le texte** (ajout du contexte `requires`), jamais par override.
- Un **`block` / `forbidden_claim`** ne se lève qu'en **changeant la vérité produit** : la capacité passe `public_marketable` (commit + tests + validation PO) — puis le terme cesse d'être interdit pour cette capacité. Aucun override de copy ne le débloque.
- Aucune exception n'est **globale** : elle est portée par (ruleId × span × surface × validateur), jamais « désactiver la règle ».

---

## 8. Oracles de test (fixtures pass/fail)

Discipline oracle-first (comme le produit) : chaque règle porte au moins un exemple qui **passe** et un qui **échoue**, figés et validés.

```ts
export const ORACLES: Array<{ ruleId: string; text: string; surface: Surface; expect: "pass" | "block" | "warn" }> = [
  { ruleId: "no-authority-score", text: "Notre Authority Score atteint 72.", surface: "homepage", expect: "block" },
  { ruleId: "no-authority-score", text: "Nous n'affichons pas d'Authority Score, par choix méthodologique.", surface: "methodology", expect: "pass" }, // méta-mention marquée
  { ruleId: "som-needs-context", text: "Votre Share of Model est de 8 %.", surface: "sales_copy", expect: "block" },
  { ruleId: "som-needs-context", text: "Share of Model estimé à 8 % (dispersion 3–14 %, complétude 92 %, méthode vX, panel vY).", surface: "developer_docs", expect: "pass" },
  { ruleId: "indirect-null-not-zero", text: "Mentions indirectes : 0 % sur Perplexity.", surface: "faq", expect: "block" },
  { ruleId: "indirect-null-not-zero", text: "Mentions indirectes : non observables avec cette méthode.", surface: "faq", expect: "pass" },
  { ruleId: "total-is-union", text: "Total = Direct Share + Indirect Share.", surface: "methodology", expect: "block" },
  { ruleId: "no-claim-verification", text: "TextOS vérifie automatiquement vos claims.", surface: "sales_copy", expect: "block" },
  { ruleId: "s8-labeled-only", text: "TextOS capture l'answer evidence (fondation technique, under validation).", surface: "developer_docs", expect: "pass" },
  { ruleId: "s8-labeled-only", text: "TextOS capture l'answer evidence et la propose comme fonctionnalité.", surface: "developer_docs", expect: "block" },
  { ruleId: "no-trend-across-version-break", text: "Visibilité 24 % → 31 % ce mois-ci.", surface: "product_article", expect: "warn" },
];
```

Le test de conformité rejoue chaque oracle et exige le verdict attendu (au sens strict). Ajouter/modifier une règle exige d'ajouter/valider ses oracles d'abord.

---

## 9. Intégration

- **`content-pipeline` (§9)** : `lintCopy` est appelé sur chaque fichier draft d'un bundle ; ses `blocks` alimentent `publishability.perSurface = "blocked"` et `claim-safety-report.md`.
- **CI gate** : sur toute PR de contenu dans `textos-site`, `copy-safety-rules.ts` s'exécute ; un `block` non résolu **fait échouer la CI** (publication impossible).
- **Build gate** : le build statique refuse de générer une page dont un bloc reste ouvert.
- La règle sensible au statut (§6) relit `capability-registry` **à chaque exécution** : un statut qui régresse (`public_marketable` → `wip_committed_tested`) réactive les blocages correspondants.

---

## 10. Critères d'acceptation

- ✅ Chaque règle a `severity`, un `detect` spécifié, un message, une source, un exemple pass et un exemple fail.
- ✅ Distinction `forbidden_claim` (levée par statut+PO uniquement) vs `missing_guardrail` (levée par ajout de contexte) explicite (§3, §7).
- ✅ Authority Score = `forbidden_claim` (jamais contournable par copy).
- ✅ Total = union préservé (`total-is-union`), Indirect `null ≠ 0` préservé (`indirect-null-not-zero`).
- ✅ S8 ne peut apparaître que labellisé (`s8-labeled-only`), jamais en sales copy (§6).
- ✅ `publishable === (blocks.length === 0)` ; un `warn` force la revue humaine.
- ✅ Oracles pass/fail figés (§8) — convertible en tests de conformité.
- ✅ Convertible en `copy-safety-rules.ts` sans ambiguïté (types `CopyRule`, `Violation`, `LintResult`, `lintCopy`).

---

## 11. Fin de Phase 2.1D

Livrable unique : `copy-safety-rules.spec.md`. Aucun scaffold, aucune copy finale, `textos-v0` inchangé. **Non commité** — en attente de ta revue.

Voisins : consomme `capability-registry` (§4, §6) ; invoqué par `content-pipeline` (§9). Restent à spécifier : `page-map.spec.md` (2.1E — quelles pages, index/noindex, surfaces) et `schema-map.spec.md` (2.1F — types schema.org par page). Ensuite seulement : 2.2 (génération TypeScript des contrats), puis 3.0 (scaffold Next.js).
