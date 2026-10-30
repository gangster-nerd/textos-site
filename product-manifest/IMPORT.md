# Provenance d'import du manifeste de vérité produit

> The checksum detects byte-level divergence between the pinned manifest and its pinned checksum.
> The source workflow run and artifact are recorded separately as import provenance.

Ce fichier **est** cette trace séparée. C'est un enregistrement de revue, pas une preuve
cryptographique : le manifeste, son `.sha256` et ce document sont commités ensemble et peuvent donc
être modifiés ensemble. Ce qu'il apporte est la **traçabilité** — savoir quel run a produit la copie
épinglée, et pouvoir la retélécharger pour la comparer à la main.

## Import courant

| | |
|---|---|
| Dépôt source | `gangster-nerd/textos-v0` |
| Branche | `cert/textos-v1-e2e-20261023` (tronc de certification, tête après la fusion de #84) |
| Construction | **locale**, par `pnpm manifest:build` dans un worktree détaché au `snapshotCommit`, dépendances installées par `pnpm install --frozen-lockfile` ; `pnpm manifest:verify` vert au même commit |
| Pourquoi pas un artefact de run | les runners GitHub Actions n'étaient pas disponibles (le workflow `capability-manifest-cert.yml` échoue sans runner attribué) ; exception autorisée par le Release Owner le 2026-10-30 (« tu es autorisé à importer une fiche construite en local ») |
| Reproductibilité | deux constructions successives au même commit produisent les mêmes octets ; quiconque peut la refaire (voir *Règles*) |
| `snapshotCommit` | `2faf90e681c1b0ccf345a80ea6e637fd89be88ab` |
| SHA-256 | `61b1a83df6a0f84fc19e2ce705ca6e91131424355e6c79f75fdd61c68b44ca7a` |
| Vocabulaire de statut | v4 (`public_beta`, `public_upcoming`) |
| Importé le | 2026-10-30 |
| Entités | 34 (33 capacités, 1 concept prohibé) |

### Import précédent

| | |
|---|---|
| Événement | `push` sur `main`, run [`31245044134`](https://github.com/gangster-nerd/textos-v0/actions/runs/31245044134) |
| `snapshotCommit` | `d1b8b50552e1b42768a6bd0c0515675e139780d3` (SHA-256 `4e0544e5…`, 16 entités, importé le 2026-08-08) |

## Procédure de réimport

```
gh run download <runId> -R gangster-nerd/textos-v0 \
  -n textos-v0-capability-manifest-<sha>
```

Copier **les deux fichiers ensemble** vers `product-manifest/` :
`capability-manifest.json` → `textos-v0.capability-manifest.json`, et son `.sha256`. Les importer
séparément produirait un couple incohérent que le chargement refuse.

Puis mettre ce document à jour dans la même PR, et exécuter `pnpm verify:product-manifest`.

## Règles

- **Seul** un artefact d'un run `push` est importable : sur `main`, ou sur la branche de
  certification `cert/textos-v1-e2e-20261023` (décision du Release Owner du 2026-10-29 : le site lit
  la vérité produit du tronc de certification, d'où ses articles Commit-to-Content tirent déjà leur
  vérité ; workflow `capability-manifest-cert.yml` de textos-v0). Le tableau d'import consigne la
  branche source. Un artefact de pull request (`validation-*`) porte un `snapshotCommit` de fusion
  synthétique — un commit éphémère qu'aucun consommateur ne peut retrouver.
- Le manifeste peut être régénéré à l'identique depuis son `snapshotCommit` : `pnpm manifest:build`
  dans `textos-v0` à ce commit produit le même octet. Une construction **locale** n'est importable
  que sur autorisation explicite du Release Owner, consignée dans le tableau d'import, et seulement
  à un commit du tronc de certification ou de `main`. C'est la vérification indépendante disponible
  aujourd'hui, et elle ne dépend d'aucune confiance envers ce dépôt.

## Renforcement possible, non revendiqué

Faire télécharger l'artefact par la CI du site et vérifier son digest GitHub ou une attestation
donnerait une preuve d'origine que ce dispositif n'a pas. Ce n'était pas dans le périmètre de
C0A-SITE et ne doit pas être présenté comme acquis.
