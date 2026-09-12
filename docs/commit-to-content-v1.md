# commit-to-content V1 — playbook opérateur

## Objet

Traduire un **état produit** (à un SHA donné) en un **bundle de candidats éditoriaux** vérifiables, avec quatre niveaux de publishability :

- `PUBLIC_SAFE` — gates déterministes verts, PO peut merger. Le pipeline V1 **ne produit jamais** ce statut automatiquement : toute publication publique passe par une revue humaine.
- `REQUIRES_HUMAN_REVIEW` — gates verts, changement rédactionnel non trivial ; revue PO indispensable.
- `WAITING_FOR_PRODUCT_MAIN` — source `CANDIDATE` (R2 non intégré). Bundle préparé, jamais publiable en l'état.
- `BLOCKED` — gate déterministe rouge (drift manifeste, intégrité déclaration, safety).

## Couches

| Couche | Responsabilité | Exécution |
|---|---|---|
| `content:sync` | Lit une ref produit locale, calcule le delta, écrit le bundle. | LOCAL, jamais CI. |
| Agent opérateur (Claude Code local) | Rédige la copy dans les squelettes. | LOCAL. |
| `content:verify` | Gates déterministes sur les bundles présents. | LOCAL **et** CI. |
| `content:status` | Vue lisible des bundles. | Anywhere. |
| Revue PR | Diff éditorial classique. | GitHub. |
| Merge → main → Vercel | Le déploiement suit exactement le SHA mergé. | Vercel Git integration. |

**Aucune clé LLM en CI. Aucun secret cross-repo introduit.**

## Commandes

```bash
pnpm content:sync --product-ref <sha>   # ingère une ref produit
pnpm content:verify                     # gates sur tous les bundles
pnpm content:status                     # état lisible
```

Variables d'environnement :

- `TEXTOS_PRODUCT_REPO` (optionnel) : chemin vers un clone read-only de `textos-v0`. Défaut : `/Users/marc/Desktop/textos`.

## Cheminement type

1. **Nouveau SHA produit main** → `pnpm content:sync --product-ref <sha>`.
2. Si `overallStatus=BLOCKED` avec `manifestDrift=red` : réaliser le **ré-import** documenté dans `product-manifest/IMPORT.md` (`gh run download` sur le run push/main correspondant), puis relancer.
3. Si `overallStatus=REQUIRES_HUMAN_REVIEW` : l'opérateur local complète les squelettes sous `content-bundles/authoritative-<sha7>/candidates/`.
4. `pnpm content:verify` doit rester vert.
5. Commits par surface (homepage / product_proof / faq / methodology). Un PR par groupe éditorial cohérent.
6. Merge après revue PO. Vercel déploie exactement le SHA mergé.

## Ce que le pipeline ne fera JAMAIS

- Écrire de la copy éditoriale par lui-même. La rédaction est une action d'opérateur, jamais une action de CI.
- Marquer un bundle CANDIDATE comme PUBLIC_SAFE.
- Contourner un gate rouge en le relâchant.
- Activer un CTA self-serve tant que les capacités sous-jacentes restent `internal_only`.

## Ré-import du manifeste produit

Voir `product-manifest/IMPORT.md`. Le pipeline ne recalcule PAS le manifeste : c'est une responsabilité du dépôt produit (`push` sur `main` → artefact GitHub Actions), consommée ici via un checksum et une trace de revue.

## Extensions futures (hors V1)

- Trigger cross-repo (GitHub App / repository_dispatch) déclenchant `content:sync` à chaque nouveau SHA produit main.
- Élargissement des surfaces couvertes (`changelog`, `glossary`, `geo`, `schema_org`, `cta_registry`).
- Copy-safety-linter (`copy-safety-rules.spec.md` → `lib/content/copy-safety.ts`) branché sur les squelettes.
- Génération d'articles complets à partir de `content-impact` produit (quand le produit émet des `ChangeImpactRecord`).
