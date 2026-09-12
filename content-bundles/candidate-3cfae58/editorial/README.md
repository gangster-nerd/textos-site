---
truthLevel: CANDIDATE
sourceProductRef: 3cfae5830fed3f10fd35ed77e699a183162b6cbe
proposedPublishability: WAITING_FOR_PRODUCT_MAIN
mentionsCommitToContent: false
---

# R2 candidate — editorial holding zone

Ce dossier reste **délibérément vide** de candidates rédigés.

## Pourquoi

La ref R2 `3cfae583` est CANDIDATE : elle apporte de nouveaux read-models internes
(MeasurementsViewModel S-B, AuthorityPresenceDisplay S-C, ContentDraftsReader / PublicationsReader
S-F, NativeCompositionAdaptor + GutenbergSerializer S-G, QI-ACTIVATION-PA) mais **aucun** ne
franchit la porte de publication du manifeste produit épinglé. Rédiger de la copy publique à
partir de cette ref serait une violation du contrat CTC — la vérité produit ne peut pas encore
la soutenir.

## Ce que le bundle contient malgré tout

- `bundle.json` — décision agrégée = `WAITING_FOR_PRODUCT_MAIN`.
- `promotion-requests.json` — les promotions restent identiques à celles du bundle
  autoritatif (les déclarations éditoriales ne dépendent pas de la ref cible), mais leur
  route reste `PRODUCT_MANIFEST_ENTRY_REQUIRED` ou `CPO_DISCLOSURE_APPROVAL_REQUIRED` ;
  aucune ne devient `NO_PROMOTION_REQUIRED` sur base R2 seule.
- `candidates/*.md` — squelettes émis pour trace, tous marqués `WAITING_FOR_PRODUCT_MAIN`.

## Ce qui débloquerait de la copy R2

Une intégration T0 de R2 dans product main, suivie d'un ré-import du manifeste via
`gh run download` (procédure `product-manifest/IMPORT.md`), et d'ADR promotions élevant
les capacités concernées de `internal_only` vers `candidate` ou `public_marketable`. Aucun de
ces événements n'est présent à `3cfae583` seul.
