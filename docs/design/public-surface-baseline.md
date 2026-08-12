# Surface publique — ligne de base et convergence visuelle produit

> **STATUT — ce document en remplace un précédent, il ne le renie pas.**
>
> Sa version antérieure (S4, commit `230beaa`) constatait que `textos-v0` ne contenait *aucune UI
> produit ni source de tokens*, et en tirait que le système visuel du site lui appartenait en propre
> sans rien refléter du produit. **Ce constat était exact à son SHA** — `textos-v0 @ 3b9141d`,
> 2026-08-08 — et il le reste : à cette date, le dépôt produit n'avait ni CSS, ni composant, ni
> document de design.
>
> Il est devenu **obsolète le 2026-08-11**. Entre le 9 et le 11 août, DESIGN-0 puis DESIGN-1 ont
> introduit dans `textos-v0` un document de principes, une source de tokens et des écrans réels. Le
> site ne peut plus invoquer l'absence d'une source produit : elle existe et elle est lisible.
>
> Ce document remplace donc le constat « aucune UI produit disponible » — il ne réécrit pas
> l'histoire, il la date. C'est la même règle append-only qui gouverne la provenance ailleurs dans
> ce dépôt : on n'efface pas une observation vraie, on enregistre ce qui l'a périmée.

## 1. Les deux provenances, à ne jamais confondre

Ce dépôt épingle maintenant **deux SHA distincts** du dépôt produit. Ils gouvernent des choses
différentes et ne se rafraîchissent pas ensemble.

| | `snapshotCommit` (vérité produit) | `designSnapshotSha` (contrat visuel) |
|---|---|---|
| Valeur | `d1b8b50552e1b42768a6bd0c0515675e139780d3` | `2f86435e9c7d77bded39021a542937ad6b3382fc` |
| Daté du | 2026-08-08 | 2026-08-11 |
| Emplacement | `product-manifest/textos-v0.capability-manifest.json` | `app/globals.css` (en-tête), ce document |
| Gouverne | quelles CAPACITÉS existent et lesquelles ont le droit d'être affirmées publiquement | quel CONTRAT VISUEL le site reprend |
| Vérifiable par | checksum + `pnpm verify:product-manifest` + run CI d'origine (`product-manifest/IMPORT.md`) | lecture directe de `design/tokens.css` et `design/principles.md` à ce SHA |

**Conséquence tenue dans ce sprint, et elle est structurante :** le manifeste de capacités épinglé
est ANTÉRIEUR à DESIGN-1. Les écrans Answers et Evidence existent donc dans le produit sans figurer
comme capacités déclarées dans le manifeste que le site consomme.

```
existence d'une UI
  ≠ déclaration de capacité
  ≠ autorisation de publication
```

Le site peut reprendre la **grammaire visuelle et documentaire** de ces écrans. Il ne peut pas, du
seul fait qu'ils existent, ajouter Answers ou Evidence à ses claims publics. Rafraîchir le manifeste
est un autre workflow de gouvernance, hors périmètre S4.1.

## 2. Ce qui existe désormais côté produit (constat factuel, `2f86435`)

| Élément | Chemin | Nature |
|---|---|---|
| Doctrine de design | `design/principles.md` | DESIGN-0 — hiérarchie typographique, densité, règle de couleur, interdits |
| Source de tokens | `design/tokens.css` | palette primitive → alias sémantiques ; typographie, espacement, rayon, bordure, ombre, motion |
| Miroir TS | `design/tokens.ts` | non repris ici |
| Pont Tailwind/shadcn | `app/globals.css` | reset des namespaces par défaut + allowlist vers les alias |
| Écrans | `src/components/answers/`, `src/components/evidence/`, `src/components/workspace/` | Answers, Evidence, Provenance, états d'absence |

La ligne directrice du produit, citée telle quelle : *« La référence mentale est un instrument
analytique dense (terminal financier, outil scientifique) — pas un chatbot »*, et
*« TextOS should make evidence feel one click away »*.

## 3. La divergence gouvernée : produit clair, site sombre

C'est l'arbitrage central de cette convergence, et il doit rester lisible longtemps.

```
PRODUIT      thème visuel actuel = CLAIR
SITE PUBLIC  thème visuel actuel = SOMBRE

CONVERGÉ                  noms sémantiques + sens sémantique
DIVERGENT VOLONTAIREMENT  valeurs de couleur résolues
```

Deux fausses routes ont été écartées explicitement :

1. **Copier les valeurs claires du produit.** Le site deviendrait clair — une refonte visuelle
   complète présentée comme un import de tokens.
2. **Inventer une palette sombre « du produit ».** `design/tokens.css` diffère explicitement le mode
   sombre : *« Mode sombre différé — aucune palette sombre n'est définie ici »*. Fabriquer ces
   valeurs côté site prendrait à la place du produit une décision DESIGN-0 qu'il a sciemment
   ajournée, et elle reviendrait ensuite comme un fait accompli.

Les valeurs sombres déjà ratifiées du site restent donc **la source de résolution publique**. Ce
n'est pas une dette silencieuse : c'est une divergence enregistrée, avec sa raison.

## 4. Ledger de reprise

### REUSE — repris intégralement

| Objet | Source produit | Résolution publique |
|---|---|---|
| Famille de police | Geist Sans / Geist Mono, paquet npm `geist` (pas `next/font/google`) | identique, auto-hébergée |
| Graisses | `400 / 500 / 600` | identiques |
| Interlignes d'instrument | `tight 1.25`, `normal 1.5` | identiques |
| Rayons | `2px / 4px / 6px` | identiques (le site tenait 4/8, il resserre) |
| Filet | `1px`, hairline | identique |
| Doctrine mono | mono = donnée mécanique uniquement, jamais la prose | identique |
| **Contrat sémantique de couleur** | noms + sens des alias | noms identiques, **valeurs sombres du site** |

Alias repris : `text-primary`, `text-secondary`, `text-muted`, `bg-surface`, `bg-subtle`,
`border-default`, `border-emphasis`, `interactive-selected`, `action-primary`, `focus-ring`,
et les noms `status-pending` / `status-failure` (cf. §6 — noms ratifiés, valeurs non résolues).

Doctrine de tonalité, reprise telle quelle :

```
neutre → structure, information, ABSENCE OBSERVÉE, réconcilié, vérifié
ambre  → réconciliation EN ATTENTE (état de notre connaissance, jamais une erreur)
rouge  → ÉCHEC RÉEL uniquement
bleu   → sélection / interaction
```

Une règle de résolution demande une note, car elle ne se copie pas mécaniquement : le produit résout
`bg-surface` en blanc (fond de base) et `bg-subtle` en gris très clair (fond distingué). En sombre,
la relation se conserve mais **s'inverse en luminance** — `subtle` s'éloigne du fond en
s'éclaircissant. C'est le sens qui converge, pas la direction de la valeur.

### SCOPED REUSE — repris sous condition de périmètre

| Objet | Périmètre autorisé | Hors périmètre |
|---|---|---|
| Échelle de tailles produit (`--font-size-micro/sm/base/lg/xl` = 11/13/14/18/24 px) | surfaces **instrument** : panneau de mesure, table de mesure, étiquettes et valeurs de donnée, état non observable | prose publique, titres de page, cartes, notes, tables des pages de documentation |
| Interlignes | couplés à l'échelle appliquée | — |

Raison : le produit fixe son corps à 14px **explicitement** parce qu'il est un *« instrument dense,
pas une vitrine marketing »* (`principles.md`, cran `base`). Appliquer cette décision à un texte de
lecture publique lui ferait porter un arbitrage pris pour un tableau de mesure.

```
récit marketing  → lisibilité publique   → échelle éditoriale du site
preuve produit   → densité d'instrument  → échelle produit
```

**Règle de couplage, à tenir :** une surface adopte l'échelle de tailles **et** les interlignes de la
même origine. Jamais une taille d'instrument avec un interligne éditorial.

### EXCLUDE — non repris, et pourquoi

| Objet | Raison |
|---|---|
| **Espacement** | collision de noms — voir §5. Exclusion la plus stricte du ledger. |
| Ombres | le produit n'en a qu'une, pour des overlays (drawer, popover) qui n'existent pas sur une surface publique statique |
| Motion | aucune transition sur le site ; en importer les durées serait importer une intention d'animation |
| Primitives de palette inutilisées (`*-50` … `*-950`, amber/red/blue) | une primitive non consommée par un alias n'est pas un contrat, c'est un stock |
| Hauteurs de contrôle, composants shadcn/Radix | le site n'a aucun contrôle applicatif, et n'en simulera pas |
| `design/tokens.ts` | dupliquerait la source sans consommateur |

## 5. La collision `--space-*` — raison d'exclusion, documentée

Les deux dépôts déclarent les **mêmes noms** avec des **valeurs différentes** :

| Token | `textos-v0` | `textos-site` |
|---|---|---|
| `--space-1` | 2px | 4px |
| `--space-2` | 4px | 8px |
| `--space-3` | 8px | 12px |
| `--space-4` | 12px | 16px |

Un import — ou même un simple renommage — reflowerait **silencieusement toute la mise en page
publique** sous l'étiquette « convergence de tokens ». Le diff aurait l'air d'un alignement ; l'effet
serait une refonte. L'échelle du site reste donc intacte et hors contrat. Le jour où les deux
devront converger, ce sera une décision d'espacement explicite, argumentée, pas un import.

## 6. Localisation produit → surface publique

Le produit rend ses statuts et ses genres de citation **en français** ; la surface publique est
anglaise. Traduire au fil du JSX produirait autant de traductions que de composants, et la première
divergence serait invisible. Le tableau est donc enregistré **ici**, et implémenté en un seul
endroit : `lib/product-proof/public-vocabulary.ts`.

### Consommés par la surface publique actuelle

| Produit (`textos-v0 @ 2f86435`) | Public | Objet |
|---|---|---|
| `ok` → « OK » | **OK** | statut d'observation |
| `no_citations` → « Sans citation » | **No citation** | statut d'observation |
| `no_answer_surface` → « Surface non déclenchée » | **Answer surface not triggered** | statut d'observation |
| `direct` → « Source directe » | **Direct source** | genre de citation |
| `indirect_mention` → « Mention indirecte » | **Indirect mention** | genre de citation |
| « Réponse non capturée » | **Answer not captured** | état de réponse |

### Enregistrés, non consommés

| Produit | Public (proposé) | Pourquoi il dort |
|---|---|---|
| `skipped` → « Ignorée » | Skipped | neutre et rendable, mais absent de la fixture actuelle |
| `unknown` → « Indéterminé » | Undetermined | arbitrage ouvert : **Undetermined** vs **Unknown**, à trancher quand une citation de ce genre sera rendue |
| `rate_limited` → « Limité » | Rate limited | **non rendable** — exige la tonalité ambre, valeur sombre non ratifiée (§7) |
| `timeout` → « Délai dépassé » | Timeout | idem ambre |
| `provider_empty_response` → « Réponse provider vide » | Empty provider response | **non rendable** — exige le rouge, valeur sombre non ratifiée |
| `provider_error` → « Échec provider » | Provider error | idem rouge |

Deux précautions de vocabulaire, à ne pas laisser se dissoudre :

- **`no_citations` ≠ non observable.** Le premier dit qu'une réponse *a été capturée* et ne cite
  rien ; le second dit qu'une dimension n'était pas mesurable. Aucun libellé public ne doit
  rapprocher les deux. Un test verrouille cette séparation.
- **« Direct source » ≠ « Direct Share of Model ».** Le premier qualifie une *citation*, le second
  nomme une *mesure*. L'adjacence des mots est un piège : les fusionner ferait croire qu'une
  citation directe est une part de marché.

## 7. Ce qui reste ouvert

- **`status-pending` / `status-failure` : noms ratifiés, valeurs non résolues.** Le produit les
  définit en ambre et rouge clairs. Aucune valeur sombre n'existe — ni côté produit (mode sombre
  différé), ni côté site (qui n'a jamais eu ni ambre ni rouge). Elles sont donc **déclarées
  absentes, pas fausses**, conformément à la règle qui gouverne déjà les SHA, les `canonical` et les
  statuts de publication. Toute surface publique ayant besoin d'un état `pending` ou `failure` devra
  d'abord faire ratifier ces deux valeurs sombres.
- **Interligne de prose (1.6).** Retenu comme valeur éditoriale du site, sous la même règle de
  couplage que l'échelle de tailles. Reprendre `normal 1.5` sur une prose à 16px appliquerait un
  interligne calibré pour 14px.
- **Rôles non couverts par le contrat produit** — lien de prose, kicker, filet d'appel. Le produit
  n'a ni prose éditoriale ni ces objets. Ils restent des alias de surface publique, nommés comme
  tels (`--color-editorial-*`), jamais présentés comme repris.
- **Rafraîchissement du manifeste de capacités.** Hors périmètre S4.1 (§1).

## 8. Contraintes tenues

- Aucune dépendance de build vers `textos-v0` ; aucun package partagé. `geist` est un paquet npm
  public, installé indépendamment par les deux dépôts.
- `textos-v0` n'a été que **lu**.
- Aucune valeur de token n'est présentée comme extraite sans l'avoir été : ce qui est repris est
  repris à l'identique, ce qui diverge est nommé comme divergent, ce qui manque est déclaré absent.
