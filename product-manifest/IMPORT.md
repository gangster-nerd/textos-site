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
| Événement | `push` sur `main` |
| Run | [`31245044134`](https://github.com/gangster-nerd/textos-v0/actions/runs/31245044134) |
| Artefact | `textos-v0-capability-manifest-d1b8b50552e1b42768a6bd0c0515675e139780d3` |
| `snapshotCommit` | `d1b8b50552e1b42768a6bd0c0515675e139780d3` |
| SHA-256 | `4e0544e5db9826832f9069ac2903b74a586a135ce0604664d17254c45f400251` |
| Importé le | 2026-08-08 |
| Entités | 16 |

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

- **Seul** un artefact du run `push` sur `main` est importable. Un artefact de pull request
  (`validation-*`) porte un `snapshotCommit` de fusion synthétique — un commit éphémère qu'aucun
  consommateur ne peut retrouver.
- Le manifeste peut être régénéré à l'identique depuis son `snapshotCommit` : `pnpm manifest:build`
  dans `textos-v0` à ce commit produit le même octet. C'est la vérification indépendante disponible
  aujourd'hui, et elle ne dépend d'aucune confiance envers ce dépôt.

## Renforcement possible, non revendiqué

Faire télécharger l'artefact par la CI du site et vérifier son digest GitHub ou une attestation
donnerait une preuve d'origine que ce dispositif n'a pas. Ce n'était pas dans le périmètre de
C0A-SITE et ne doit pas être présenté comme acquis.
