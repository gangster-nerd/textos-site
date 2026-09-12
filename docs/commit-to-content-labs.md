# TextOS Labs — recommandation et état honnête

## Décision CPO (2026-09-12)

Le modèle binaire `public_marketable` vs `internal_only` est insuffisant. Commit to Content
supporte désormais une taxonomie à 7 états :

- `PUBLIC_GA` — capacité standard disponible.
- `PUBLIC_BETA` — livrable réel, UX/couverture/automation encore mouvantes.
- `PUBLIC_EARLY_ACCESS` — prototype substantiel, activation manuelle avec support ingénierie.
- `PUBLIC_ROADMAP` — planifié crédiblement, pas livrable.
- `INTERNAL_LABS` — technologie interne / dogfoodée, potentiellement future capacité publique.
- `PRIVATE` — pas de communication publique.
- `FORBIDDEN` — jamais communicable (doctrine).

## Réconciliation obligatoire manifeste × déclaration éditoriale

La maturité EFFECTIVE = MIN(déclaration éditoriale, plafond manifeste).

Plafonds :
- manifeste `forbidden` → **FORBIDDEN**
- manifeste `internal_only` → **INTERNAL_LABS** au plus
- manifeste `candidate` → **PUBLIC_EARLY_ACCESS** au plus
- manifeste `public_marketable` → **PUBLIC_GA** au plus
- manifeste absent → **PRIVATE**

## État courant honnête (contre manifest épinglé d1b8b50)

| Capacité | Proposé | Plafond | Effectif | Clamped ? |
|---|---|---|---|---|
| wordpress-publication | PUBLIC_BETA | PRIVATE (absent manifeste) | PRIVATE | **oui** |
| native-composition-gutenberg | PUBLIC_EARLY_ACCESS | PRIVATE (absent) | PRIVATE | **oui** |
| asset-spec | INTERNAL_LABS | PRIVATE (absent) | PRIVATE | **oui** |
| geo-writer | INTERNAL_LABS | PRIVATE (absent) | PRIVATE | **oui** |
| owned-surface-design | INTERNAL_LABS | PRIVATE (absent) | PRIVATE | **oui** |
| query-intelligence | PUBLIC_ROADMAP | PRIVATE (absent) | PRIVATE | **oui** |
| opportunity-brief | INTERNAL_LABS | INTERNAL_LABS | INTERNAL_LABS | non |
| repos-intersection | INTERNAL_LABS | INTERNAL_LABS | INTERNAL_LABS | non |
| commit-to-content | INTERNAL_LABS | PRIVATE (absent) | PRIVATE | **oui** |

## Conséquence

Le pipeline `content:sync` produit ces opportunités dans chaque bundle (voir la section
`opportunities` de `bundle.json` / `STATUS.md`). Un lecteur voit immédiatement quelles
communications Labs sont bloquées côté vérité produit et pourquoi.

## Ce qui déblocage la surface `/labs`

Pour qu'une page publique `/labs` puisse rendre du contenu non-`PRIVATE`, le manifeste
produit doit :

1. Déclarer explicitement `wordpress-publication` avec un `publicationStatus` compatible BETA
   (le vocabulaire actuel n'a pas d'état `beta` ; T0 doit décider : ajouter `beta` /
   `early_access` au vocabulaire, ou utiliser `candidate` comme approximation).
2. Déclarer `native-composition-gutenberg`, `asset-spec`, `geo-writer`, `owned-surface-design`,
   `query-intelligence` avec les états correspondants.
3. Déclarer `commit-to-content` (concept externe au dépôt produit) en tant que capacité méta,
   ou accepter qu'elle vive uniquement dans la doctrine site.

Alternative : étendre le manifeste avec un champ `intendedPublicState` distinct de
`publicationStatus`, ce qui préserverait la sémantique "état effectivement communicable" du
champ actuel.

## Ce que la V1 n'a PAS fait

- Pas de page `/labs` publique. La rendre aujourd'hui reviendrait à re-annoncer des capacités
  clampées à PRIVATE via un chemin détourné.
- Pas de modification du manifeste ni du vocabulaire. Ces décisions sont T0.
- Pas de communication publique sur Commit to Content ni sur WordPress / Gutenberg. Les
  déclarations sont prêtes, en attente de plafond manifeste compatible.

## Wording de référence (à activer une fois le manifeste étendu)

Voir `lib/commit-to-content/maturity-declarations.ts` pour chaque entrée :
- `publicWording` — copy autorisée
- `prohibitedWording` — termes bannis
- `cta` — le seul CTA autorisé pour la maturité proposée

Rappels de contrat de copy :
- **PUBLIC_BETA** peut dire : "Beta", "Available for selected customers", "Available on
  request", "Design partners welcome", "Contact us to activate".
- **PUBLIC_BETA** ne doit PAS impliquer : self-service activation, GA-level reliability,
  one-click integration, universal compatibility, production-scale SLA.
- **INTERNAL_LABS** peut dire : "Labs", "How we build", "Internal system".
- **INTERNAL_LABS** ne doit PAS impliquer : "Customer feature", "Available", "Buy", "Sign up".

## Zendesk / Yext / autres intégrations externes

Audit produit (2026-09-12) : **aucune preuve** d'implémentation Zendesk, Yext, Salesforce,
HubSpot, Contentful, Shopify, LinkedIn, Meta. Aucune déclaration éditoriale n'a été créée
pour ces intégrations — ne pas les inventer.
