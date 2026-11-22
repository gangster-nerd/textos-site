# AGENTS.md — textos-site (lane REFERENCE, CMO incubation)

Ce fichier est la règle d'agent racine de `textos-site`. Il verrouille l'identité
du dépôt, sa lane, ses limites et ses interdictions. Toute mission agentique
opérant dans ce worktree hérite de ces règles avant toute autre instruction.

## Identité du dépôt

- **Dépôt** : `textos-site`.
- **Rôle** : lane **REFERENCE** — incubation du Content Surface Engine (CSE)
  et consommateur exclusif du contrat REFERENCE.
- **Statut** : dépôt de **certification** du corpus (12 articles) et de
  vérification `ResolvedContentSurface → HTML` sur le thème TextOS.
- **Contrat de contenu** : `content-document@1`.
- **Contrat de policy** : `surface-policy@1`.
- **Read-model** : `resolved-content-surface@1`.
- **Renderer** : `reference@1`.

## Séparation avec `textos-v0`

- `textos-site` = incubation, consommateur REFERENCE, thème TextOS,
  routes Next.js, corpus `content/managed-corpus/**`, snapshots visuels.
- `textos-v0` = **propriétaire cible** du `ContentDocument`, du CSE Core
  (`contract/**`, `composition/**`, `authority/**`, `lifecycle/**`,
  `receipt/**`, `publication/**`, `link-graph/**`, `producers/markdown/**`,
  `conformance/content-pass.ts`, `conformance/fidelity-pass/**`,
  `conformance/fixtures.ts`), du schéma `SurfacePolicy` **générique**,
  et de la projection de surface `ResolvedContentSurface`.
- La liste exacte des fichiers PRODUCT_CORE incubés ici est figée dans
  `lib/content-surface-engine/CSE_CORE_MANIFEST.json` (voir *Digest CSE*).
- Le renderer React/Next, le corpus, le thème et les routes restent
  définitivement dans `textos-site` (catégories SITE_ONLY et
  REFERENCE_ADAPTER de l'audit).

## Une seule chaîne de composition

- Il existe **une seule** chaîne : `ContentDocument → CSE → ResolvedContentSurface → renderer`.
- **Interdit** : tout moteur, renderer ou document CMO parallèle.
- **Interdit** : toute logique de composition codée par slug ou par
  article. Toute variation par pièce passe par `SurfacePolicy` ou par
  le contrat `ContentDocument`, jamais par du code conditionnel dédié.
- La composition (`resolveContentSurface`) et l'autorité (`compileAuthority`)
  restent des fonctions pures. Aucun accès filesystem, réseau ou horloge
  n'est autorisé dans le PRODUCT_CORE.

## Gel Native

- **Interdit** avant `PA_RECEIPT_VERIFIED=true` : toute modification
  Native, tout `NativeAdapter`, toute émission de `NativeCompositionPlan`,
  toute évolution de `AssetSpec`, tout changement Gutenberg / Elementor /
  publisher WordPress. Ces contrats vivent hors de ce dépôt et restent
  hors périmètre.
- `pa-publish-1` est **intouchable** depuis cette lane, en toutes
  circonstances.

## Preuves et provenance

- `certified lineage` et les `receipts` de publication sont des signaux
  internes : ils demeurent **opaques au rendu lecteur**. Aucun de leurs
  champs, digests ou identifiants ne doit apparaître dans le DOM public
  ni dans le JSON-LD lecteur.
- Les 33 briefs (`content/managed-corpus/**` élargi) restent **gelés**
  jusqu'à certification complète des 12 articles courants. Aucun
  élargissement du corpus n'est autorisé tant que 12/12 INDEXABLE n'a
  pas été observé et scellé.

## Digest CSE (`CSE_CORE_MANIFEST.json`)

Le manifeste `lib/content-surface-engine/CSE_CORE_MANIFEST.json` scelle
le périmètre PRODUCT_CORE incubé ici :

- liste **explicite** des chemins relatifs suivis (source unique du
  périmètre, dupliquée à l'identique dans le script ; `--check` refuse
  toute divergence — manquant, extra, doublon, réordonné non canonique),
- SHA-256 par fichier,
- **agrégat déterministe** (indépendant des mtimes et de l'ordre du
  filesystem),
- `contentDocumentContractFingerprint` = empreinte canonique du contrat
  `ContentDocument` = `sha256(contracts/content-document@1.schema.json)`
  (mêmes octets, même valeur que `CONTRACT_FINGERPRINT` de
  `scripts/a3r-report.ts`),
- `surfaceContractSetDigest` = digest **du triplet de version literals**
  `content-document@1`, `surface-policy@1`, `resolved-content-surface@1`
  (identifiant de set — distinct du fingerprint ContentDocument, ne doit
  jamais être présenté comme tel),
- `contractVersions` = les trois identifiants ci-dessus, conservés
  séparément,
- `source.repository` et `source.baseSha` (le SHA `origin/main` parent
  depuis lequel l'incubation CMO a commencé ; **jamais** le SHA du commit
  qui contient le manifest — le futur `candidateCommitSha` appartiendra
  au promotion receipt post `CSE-PROMOTION-1`, pas au manifest de base),
- commande de vérification reproductible.

**Vérification** :

```
node scripts/cse-core-digest.mjs --check
```

Toute évolution du périmètre ou du contenu PRODUCT_CORE modifie le
digest et **exige** un ADR côté `textos-v0`. Aucune modification
silencieuse tolérée. Après `CSE-PROMOTION-1`, `textos-v0` devient
la seule source du core : aucune **copie divergente** du PRODUCT_CORE
ne sera tolérée dans `textos-site`.

## Autorisations distinctes

Les jetons suivants sont **strictement séparés** ; une mission qui reçoit
l'un ne reçoit pas les autres :

- `GO CODE` — autorise l'écriture locale, pas de commit.
- `GO COMMIT` — autorise la création d'un commit local, pas de push.
- `GO PUSH` — autorise le push vers `origin`, pas de merge.
- `GO MERGE` — autorise le merge d'une PR.

L'agent doit s'arrêter avant toute action non couverte par le jeton
reçu et le signaler explicitement.

## Interdits transverses

- Toucher `pa-publish-1` (lane entière).
- Toucher `AssetSpec`, `NativeCompositionPlan`, Gutenberg, Elementor,
  publisher WordPress.
- Modifier une version de schéma (`content-document@N → N+1`,
  `surface-policy@N → N+1`, `resolved-content-surface@N → N+1`) sans ADR
  `textos-v0` acté.
- Introduire un second CSE dans `textos-site` ou dans `textos-v0`.
- Copier le PRODUCT_CORE vers `textos-v0` en dehors d'une exécution
  `CSE-PROMOTION-1` explicitement autorisée.
- Rendre visible dans le lecteur un champ marqué opaque (lineage,
  receipts, provenance interne, `data-cse-*` internes non nettoyés).

## Conditions de STOP

- Worktree dirty au démarrage d'une mission.
- `HEAD` local diverge d'`origin/main` sans autorisation explicite.
- Digest CSE non reproductible après recalcul.
- Toute écriture hors du write-set autorisé par la mission.
- Toute tentative de modifier `pa-publish-1`, Native, AssetSpec ou
  `certified-lineage.json` hors de la fenêtre prévue.
- `PublicationReceipt.outcome === "ambiguous"` sur toute tentative de
  certification.

Fin.
