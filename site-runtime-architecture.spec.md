# site-runtime-architecture.spec.md

> **Phase 2.1B — Spécification d'architecture runtime du site TextOS.**
> Portée : domaines, login, routing tenant, dogfooding, flux de données, SEO/GEO, sécurité. Ce fichier est une **spécification**, pas une implémentation : pas de scaffold, pas de code Next.js, pas de composant, pas de code d'auth, pas de config DNS, `textos-v0` inchangé, pas de commit. Les blocs de logique sont du **pseudocode de décision**, à convertir plus tard.
>
> **Domaine canonique :** `textos.io` (remplace le placeholder `textos.xyz` des specs précédentes ; les références `textos.xyz` s'entendent désormais `textos.io`).
>
> **Artefacts liés :** `capability-registry.spec.md` (gouverne les claims — voir Note de renommage), `entity-graph.spec.md` (entity graph SEO du site), `page-map.spec.md`, `schema-map.spec.md`, `copy-safety-rules.spec.md`.
>
> **Note de renommage (en attente de GO) :** le fichier actuellement nommé `entity-graph.spec.md` est en réalité le **capability-registry** (registre de capacités + statuts). Le split validé consiste à le renommer `capability-registry.spec.md` et à créer un vrai `entity-graph.spec.md` restreint au graphe SEO du site. Ce document référence donc le registre sous son nom cible **`capability-registry`**.

---

## 0. Invariants d'architecture (dur)

```ts
// INV-1  Toute page SEO/indexable de textos.io se rend SANS session utilisateur
//        et SANS appel runtime au produit authentifié. (static-first)
// INV-2  app.textos.io et {tenantSlug}.textos.io sont noindex.
// INV-3  Le sous-domaine tenant IDENTIFIE le tenant ; il n'AUTORISE jamais.
//        Autorisation = session valide + membership + permissions.
// INV-4  Aucun chemin d'écriture public du produit vers le site.
//        Seuls des exports PO-validés deviennent du contenu publiable.
// INV-5  schema.org / claims sur textos.io UNIQUEMENT depuis :
//        capability-registry (status === "public_marketable") + entity-graph public.
// INV-6  Les workspaces tenant sont noindex par défaut.
//        Un rapport public est une EXCEPTION opt-in, explicitement PO-validée.
```

Ces invariants priment sur toute commodité d'implémentation ultérieure.

---

## 1. Architecture des domaines

| Host | Rôle | Auth | Indexation | Rendu |
|---|---|---|---|---|
| `textos.io` | Site public témoin (SEO/GEO, vitrine, preuve d'autorité) | Non | **index** | Static-first, aucune dépendance runtime au produit (INV-1) |
| `www.textos.io` | Redirection 301 → `textos.io` | — | — | Redirect canonique (une seule origine indexable) |
| `app.textos.io` | Produit authentifié : login, sélecteur d'organisation, dashboard global | **Oui** | **noindex** | Dynamique, authentifié |
| `{tenantSlug}.textos.io` | Workspace tenant : runs, Authority Presence, query panels, claims, reports, settings | **Oui** | **noindex par défaut** (INV-6) | Dynamique, authentifié, résolu par slug |
| Exception rapports publics | Rapport tenant explicitement rendu public | Non | **index par exception uniquement** (INV-6) | Deux formes admises ci-dessous |

Formes admises pour un rapport public (opt-in, PO-validé) :

- `textos.io/reports/{tenantSlug}/{reportId}` (préféré : reste sur l'origine publique, cohérent SEO), **ou**
- `public-report.{tenantSlug}.textos.io` (sous-domaine dédié explicitement indexable).

Règle : un workspace tenant n'est **jamais** indexable en tant que tel ; seul un *rapport* précis, marqué public et validé, l'est.

---

## 2. Flux de login

Le bouton « Se connecter » de `textos.io` ne fait qu'un lien statique (pas d'auth côté site) :

```
textos.io  ──(lien statique « Se connecter »)──▶  https://app.textos.io/login?returnTo=/dashboard
```

Pseudocode de décision post-login (sur `app.textos.io`) :

```
onLoginSuccess(user):
  orgs = memberships(user)
  if orgs.length == 0:      → écran "aucune organisation" (pas de tenant)
  if orgs.length == 1:      → redirect 302 → https://{orgs[0].slug}.textos.io
  if orgs.length >= 2:      → sélecteur d'organisation sur app.textos.io
                              puis redirect 302 → https://{chosen.slug}.textos.io
```

Exemple :

```
Marc → app.textos.io/login → auth OK
     → sélection "Les Jardiniers Cosmopolites"
     → jardiniers-cosmopolites.textos.io
```

Invariant : le slug choisi ne donne accès qu'après vérification de membership (§3). Le login ne présuppose aucun tenant.

---

## 3. Routing tenant

Résolution d'une requête sur `{tenantSlug}.textos.io` (pseudocode, INV-3) :

```
resolveTenantRequest(request):
  host        = request.host                     # ex. accor.textos.io
  tenantSlug  = extractSubdomain(host)           # "accor"  (identification SEULE)
  tenant      = lookupTenant(tenantSlug)
  if tenant == null:                → 404 (tenant inconnu), noindex
  session     = getSession(request)
  if session == null:               → redirect app.textos.io/login?returnTo=host
  if not isMember(session.user, tenant):        → 403 (identifié ≠ autorisé)
  if not hasPermission(session.user, tenant, route):  → 403
  → render tenant workspace   (Response headers: X-Robots-Tag: noindex, nofollow)
```

Points durs :

- `extractSubdomain` **identifie** ; il ne prouve rien. Un attaquant qui devine `accor.textos.io` n'obtient rien sans session + membership.
- Réponses tenant : header `X-Robots-Tag: noindex, nofollow` par défaut (INV-6), en plus du `noindex` meta.
- Slugs réservés (non attribuables à un tenant) : `app`, `www`, `public-report`, `api`, `admin`, `assets`, `static`.

---

## 4. Modèle de dogfooding

`textos.io` est le **premier client** de TextOS, mais jamais un onglet de l'app.

Autorisé :

- TextOS **observe / analyse** `textos.io` (Authority Presence de l'entité TextOS, sujets faibles).
- TextOS **propose** des recommandations / définitions / brouillons de glossaire / méthodologie.

Interdit :

- Publication automatique de sortie produit sur `textos.io` sans validation (INV-4).
- Rendu des pages SEO principales via appel runtime au produit authentifié (INV-1).

Boucle validée (cohérente avec `committed + tested + PO-validated = public_marketable`) :

```
1. TextOS observe textos.io
2. TextOS mesure l'Authority Presence de TextOS (Direct / Indirect / Total, avec dispersion)
3. TextOS détecte les sujets faibles
4. TextOS PROPOSE pages / glossaire / méthodologie
5. capability-registry filtre les claims autorisés (public_marketable uniquement)
6. PO valide
7. Export d'artefacts approuvés → build statique → publication sur textos.io
8. Search Console / analytics / mentions IA reviennent dans TextOS
```

Règle : **le produit propose, le site ne publie que le validé.** Un « sujet faible » détecté par TextOS n'entraîne aucune page tant qu'un artefact approuvé n'existe pas.

---

## 5. Flux de données

```
[produit textos-v0]
   observations / Authority Presence / answer evidence / claims (déterministes)
        │
        │  export SÉLECTIF + validation PO   (frontière INV-4)
        ▼
[textos-site/content/approved/]   artefacts figés, versionnés, validés
        │
        │  build statique (aucune dépendance runtime au produit)
        ▼
[textos.io]   pages indexables
        │
        ▼
[analytics / Search Console / mentions IA]  ──▶ réinjection comme signaux dans textos-v0
```

Propriétés :

- L'export est **poussé** vers le site (contenu figé), jamais **tiré** en runtime par les pages SEO.
- Chaque artefact approuvé porte sa provenance (run/version) et son statut de validation.
- La boucle de feedback (étape finale) alimente le produit, pas directement le site.

---

## 6. Conséquences SEO / GEO

- `textos.io` : crawlable, static-first, rapide, riche en schema.org + `llms.txt` + miroirs markdown. Aucune page principale derrière login (INV-1).
- `app.textos.io` : `noindex` global (header + robots). Jamais dans le sitemap public.
- `{tenantSlug}.textos.io` : `noindex, nofollow` par défaut (INV-6). Exclu du sitemap public.
- Rapports publics : opt-in, PO-validés, seuls indexables par exception ; ajoutés à un sitemap dédié.
- schema.org : généré **uniquement** depuis les capacités `public_marketable` (capability-registry) + l'entity-graph public (INV-5). Aucune capacité `planned` / `wip_committed_tested` déclarée comme feature active.

Conséquence directe sur la thèse : un site d'autorité doit être lisible par les moteurs et les LLM ; le mettre derrière une session détruirait la démonstration. D'où INV-1.

---

## 7. Règles de sécurité

- Auth **centralisée** sur `app.textos.io` (login unique). Le site public ne gère aucune session.
- Sous-domaine tenant = **identification**, pas autorisation (INV-3). Accès = session + membership + permissions, vérifiés à chaque requête.
- **Aucun chemin d'écriture public** du produit vers le site (INV-4) : le site ne consomme que des exports figés, poussés après validation.
- **Aucune sortie produit non validée** ne devient de la copy publique. Le gating passe par le capability-registry + copy-safety-rules.
- Isolation tenant : une requête sur `A.textos.io` ne peut jamais lire les données de `B` — la vérification de membership porte sur le tenant résolu, pas sur le slug demandé.
- Slugs réservés protégés (§3) pour éviter le détournement de `app` / `www` / `api`.

---

## 8. Critères d'acceptation

- ✅ `textos.io` (public) et `app.textos.io` (authentifié) sont clairement séparés (§1).
- ✅ Le flux de login est explicite et redirige vers `app.textos.io/login` (§2).
- ✅ Le routing tenant est explicite ; le sous-domaine identifie mais n'autorise pas (§3, INV-3).
- ✅ Le dogfooding est explicite : le produit propose, le site ne publie que le validé (§4, INV-4).
- ✅ Le marketing public reste gouverné par le capability-registry (§6, INV-5).
- ✅ Aucune page SEO n'est derrière login (§1, INV-1).
- ✅ Aucun workspace privé n'est indexable par défaut (§1, §3, INV-6).
- ✅ Flux de données unidirectionnel produit → export validé → build → publication (§5).

---

## 9. Fin de Phase 2.1B

Livrable unique : `site-runtime-architecture.spec.md`. Aucun scaffold, aucun code applicatif, aucun code d'auth, aucune config DNS, `textos-v0` inchangé, pas de commit.

Étapes suivantes (ordre cible, à ne lancer qu'après validation) :

1. Split validé : renommer `entity-graph.spec.md` → `capability-registry.spec.md`, puis rédiger un vrai `entity-graph.spec.md` (graphe SEO du site).
2. `page-map.spec.md` — arborescence, index/noindex, éligibilité par page (consomme §1 + capability-registry).
3. `schema-map.spec.md` — types schema.org par page (consomme entity-graph + INV-5).
4. `copy-safety-rules.spec.md` — gates de publication (consomme capability-registry §10).

Objectif inchangé : d'abord la machine qui empêche TextOS de mentir et l'architecture qui garantit la séparation public/produit/tenant ; ensuite seulement le site.
