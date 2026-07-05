# page-map.spec.md

> **Phase 2.1E — Carte des pages publiques de `textos.io`.**
> Définit chaque route V1 : surface, index/noindex, capacités affichables et **mode de mention** (available / labeled / excluded), types schema.org attendus.
> Entrées : `site-runtime-architecture.spec.md`, `capability-registry.spec.md`, `entity-graph.spec.md`, `content-pipeline.spec.md`, `copy-safety-rules.spec.md`.
> Portée : spécification. Pas de scaffold, pas de composant, pas de route Next.js réelle, pas de copy finale, `textos-v0` inchangé, pas de commit avant revue.
> Convertible sans ambiguïté en `page-map.ts`.

---

## 0. Position & principe

La page-map est le pont entre la **vérité** (`capability-registry`) et le **rendu** (pages). Elle applique, par page :

- l'éligibilité de mention (`mentionMode` du registre §7) ;
- les surfaces autorisées par statut (`content-pipeline` §5) ;
- les règles copy-safety par surface (`copy-safety-rules` §6) ;
- les invariants d'indexation (`site-runtime` §1, §6).

Principe : **une page ne peut afficher comme disponible que du `public_marketable`.** Tout le reste apparaît labellisé (roadmap / under validation) ou pas du tout.

```ts
export type MentionMode = "available" | "labeled_status" | "excluded"; // registre §7
export interface PageSpec {
  route: string;
  title: string;
  surface: Surface;                 // content-pipeline §3.1
  index: boolean;                   // true = indexable
  purpose: string;
  allowedCapabilities: Array<{ id: string; mode: MentionMode }>;
  schemaTypes: string[];            // détaillé en schema-map.spec.md (2.1F)
  copySafetySurface: Surface;       // surface passée au linter
}
```

---

## 1. Inventaire des pages V1

| route | title | surface | index | capacités (mode) | schema.org |
|---|---|---|---|---|---|
| `/` | Home — Authority Intelligence System | homepage | ✅ | observe-authority-presence (available) ; métriques (available, guardrails) | Organization, WebSite, SoftwareApplication |
| `/method` | Méthodologie de mesure | methodology | ✅ | doctrine §5 draft ; observe (available) | TechArticle, BreadcrumbList |
| `/metrics` | Direct / Indirect / Total | methodology | ✅ | 3 métriques (available, guardrails union-not-sum + null≠0) | TechArticle, DefinedTerm |
| `/glossary` | Glossaire canonique | glossary | ✅ | DefinedTerms (registre) | DefinedTermSet, DefinedTerm |
| `/developers` | Index développeur | developer_docs | ✅ | observe, quality-ledger (available) | TechArticle, BreadcrumbList |
| `/developers/authority-presence` | Authority Presence (dev) | developer_docs | ✅ | observe-authority-presence (available) ; métriques | TechArticle |
| `/developers/answer-evidence` | Answer Evidence & Claims (dev) | developer_docs | ✅ | claim-evidence-layer (**labeled_status**), answer-evidence (**labeled**) | TechArticle |
| `/faq` | FAQ élite | faq | ✅ | uniquement public_marketable + définitions | FAQPage (si réellement Q/R) |
| `/changelog` | Changelog public | changelog | ✅ | faits de build réels | CreativeWork |
| `/roadmap` | Roadmap / Vision | roadmap | ✅ | understand/act/gaps/briefs/truth-check/repos (**labeled_status**, planned) | CreativeWork |
| `/login` | Redirection connexion | — (redirect) | ❌ noindex | aucune | aucune |
| `/llms.txt` | Table des matières LLM | llms_txt | ✅ (fichier) | pages public_marketable + définitions | — |
| `/sitemap.xml` | Sitemap | — | ✅ (fichier) | pages index=true uniquement | — |
| `/robots.txt` | Robots | — | ✅ (fichier) | autorise le crawl public | — |

> `/developers/answer-evidence` est la **seule** page qui mentionne S8, et uniquement en `labeled_status` (« technical foundation / under validation »). Elle est régie par `copy-safety` `s8-labeled-only`.

---

## 2. Règles d'indexation (index / noindex)

- Toutes les pages de contenu de `textos.io` : **index** (INV-1 : crawlables, sans session, sans appel runtime au produit).
- `/login` : **noindex** — c'est une redirection technique vers `app.textos.io/login?returnTo=/dashboard` (`site-runtime` §2), pas une page de contenu.
- `/sitemap.xml` ne référence que les pages `index = true`.
- `/robots.txt` autorise le crawl public et pointe le sitemap.
- Rappel de frontière : `app.textos.io` et `{tenant}.textos.io` sont `noindex` (`site-runtime` §6) — **hors de cette page-map** (autre origine, autre repo).

```ts
export const INDEXABLE = (p: PageSpec) => p.index === true;
export const SITEMAP_ROUTES = PAGES.filter(INDEXABLE).map((p) => p.route);
```

---

## 3. Éligibilité par page (capacité × mode)

Pour chaque page, chaque capacité citée reçoit un `MentionMode` dérivé de son statut :

```ts
// mentionMode vient du registre (§7). La page ne peut afficher "available"
// QUE pour des capacités public_marketable. Sinon labeled_status ou excluded.
export function pageAllows(page: PageSpec, capId: string): MentionMode {
  const status = CAPABILITY_STATUS[capId];
  if (status === "public_marketable") return "available";
  if (status === "forbidden" || status === "unsupported") return "excluded";
  // planned / candidate / wip_committed_tested / implemented / implemented_schema_only
  if (page.surface === "roadmap") return "labeled_status";     // roadmap : planned autorisé, labellisé
  if (isTechnicalSurface(page.surface)) return "labeled_status"; // dev/méthodo : labellisé
  return "excluded";                                            // surfaces de vente : exclu
}
```

Conséquences dures :

- **Home / FAQ / sales** : seulement `public_marketable`. Aucun `planned` / `wip`.
- **`/roadmap`** : le **seul** endroit où `understand`, `act`, `authority-gap`, `opportunity-brief`, `truth-check`, `repos-intersection` apparaissent — en `labeled_status` (planned), jamais au présent.
- **`/developers/answer-evidence`** : S8 en `labeled_status` uniquement.
- **`authority-score`** (`forbidden`) : `excluded` de **toutes** les pages (sauf méta-mention explicite en méthodologie, cf. `copy-safety` §5).

---

## 4. Page de login (redirection)

`/login` n'est pas une page de contenu :

```
GET textos.io/login → 302 → https://app.textos.io/login?returnTo=/dashboard
```

- Aucune auth côté site (`site-runtime` §2, §7).
- `noindex` ; absente du sitemap.
- Le bouton « Se connecter » de l'en-tête pointe directement vers `app.textos.io/login` (peut court-circuiter `/login`).

---

## 5. Fichiers spéciaux

- **`/llms.txt`** : table des matières + liens vers les pages `index = true` et les définitions du glossaire. Contenu généré depuis les pages `public_marketable` + `DefinedTerm` (`entity-graph` §5). Jamais une capacité `planned`/`wip` présentée comme disponible.
- **`/sitemap.xml`** : uniquement `SITEMAP_ROUTES` (§2). Exclut `/login`.
- **`/robots.txt`** : `Allow: /` pour le crawl public ; référence le sitemap ; aucune règle d'exclusion des pages de contenu (elles sont faites pour être lues).

---

## 6. Navigation & liens internes

- Navigation principale : Home, Method, Metrics, Glossary, Developers, Changelog, Roadmap, + bouton « Se connecter ».
- Liens internes proposés par le `content-pipeline` (§8) mais **validés PO** ; un lien vers une page ne peut pas contourner l'éligibilité (§3) : une page roadmap ne se lie pas comme si sa capacité était disponible.
- Chaque page technique renvoie au glossaire pour ses termes (`DefinedTerm`) — cohérence GEO.

---

## 7. Règle « roadmap = sas des capacités non livrées »

`/roadmap` est le sas unique. Y apparaissent, en `labeled_status` :

| capacité | statut | libellé imposé |
|---|---|---|
| understand-patterns | planned | « roadmap » |
| act-content-generation | planned | « roadmap » |
| authority-gap | planned | « roadmap » |
| opportunity-brief | planned | « roadmap » |
| truth-check | planned | « roadmap » |
| repos-intersection | planned / premium | « roadmap — premium » |
| authority-simulator | planned | « roadmap » |
| claim-evidence-layer (S8) | wip_committed_tested | « technical foundation — under validation » |

`authority-score` (forbidden) et le wedge `unsupported` (LRAS/DQAG) **n'apparaissent pas**, même en roadmap.

---

## 8. Critères d'acceptation

- ✅ Chaque route V1 a une `PageSpec` (surface, index, capacités+mode, schemaTypes).
- ✅ Aucune page de vente n'affiche autre chose que `public_marketable` (§3).
- ✅ `/roadmap` est le seul sas des `planned` ; S8 seulement en `/developers/answer-evidence` + `/roadmap`, labellisé (§7).
- ✅ `authority-score` exclu partout (§3, §7).
- ✅ `/login` = redirection noindex vers `app.textos.io` (§4).
- ✅ Sitemap = pages `index = true` ; `/login` exclu (§2).
- ✅ Invariants métriques portés là où elles s'affichent (union-not-sum, null≠0) via copy-safety (§0).
- ✅ Convertible en `page-map.ts` sans ambiguïté (`PageSpec`, `pageAllows`, `SITEMAP_ROUTES`).

---

## 9. Fin de Phase 2.1E

Livrable unique : `page-map.spec.md`. Aucun scaffold, aucune route réelle, aucune copy, `textos-v0` inchangé. **Non commité** — en attente de ta revue.

Voisin restant avant le code : `schema-map.spec.md` (2.1F — types schema.org par page, à partir de la colonne « schema.org » de §1 et de `entity-graph`). Ensuite : 2.2 (génération TypeScript des contrats), puis 3.0 (scaffold Next.js).
