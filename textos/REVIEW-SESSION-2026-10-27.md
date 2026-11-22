# Session de revue groupée — Commit-to-Content (27/10/2026)

Préparée par l'agent CTO/CPO/CMO. **Aucune décision n'est prise ici** : ce document regroupe ce qui
attend Marc, avec une recommandation pour chaque point, pour que la session tienne en une heure.

## Comment publier un article de textos-site

Dans `textos/briefs/<articleId>.json`, après lecture de `textos/runs/<articleId>/HUMAN-REVIEW.md` :

```json
"publication": { "humanReview": { "status": "done", "reviewer": "marc-prempain", "reviewedOn": "2026-10-27" } }
```

L'article devient `published` (reviewer, dates, `index`) au build suivant. Corriger un article = un
nouveau brief ou de nouvelles réponses, puis `pnpm textos write` : jamais de retouche du texte à la
main (le build le refuse). Refuser = supprimer le brief et son run.

## 1. textos-site — 7 notes Commit-to-Content (toutes TruthCheck = pass)

| # | Article | Mots | Recommandation |
|---|---|---|---|
| 1 | `ctc-evidence-approved-per-article` — *a source becomes evidence only once a person approves it* | ~600 | **Publier en premier** : c'est le sujet le plus proche de l'acheteur (des faits approuvés, pas inventés) |
| 2 | `ctc-produced-is-not-validated` — *a produced article is not a validated one* | ~590 | **Publier** : répond à « puis-je croire le libellé « prêt » ? » |
| 3 | `ctc-reading-cited-sources` — *reading cited sources, robots.txt first* | ~570 | **Publier** : crédibilité éthique et sécurité, utile en évaluation fournisseur |
| 4 | `ctc-every-change-a-content-decision` — *every product change carries a content decision* | ~330 | **Publier** : c'est le récit de Commit-to-Content lui-même ; court mais complet |
| 5 | `ctc-human-decision-exact-bytes` — *the API keeps WordPress draft creation behind a human decision* | ~490 | **Publier** : soutient le récit « agent-ready, gouverné » |
| 6 | `ctc-credentials-expire-and-stop` — *credentials expire after 30 days by default* | ~325 | Garder en brouillon : audience technique étroite |
| 7 | `ctc-writer-fabric-one-identity` — *a writing-model outage no longer kills an article* | ~305 | Garder en brouillon : cite une porte de release du 23/10 (« no route certified live yet ») dépassée depuis la certification du 26/10 ; à réécrire après ré-épinglage |

Points à vérifier en lecture (également dans chaque `HUMAN-REVIEW.md`) :

- la vérité produit est le **candidat de certification** `308aa32`, pas `main` : publier revient à
  assumer que ces comportements sont ceux du produit certifié ;
- les citations des commits rédigés en français sont reformulées en anglais par le rédacteur :
  vérifier que chaque phrase ne dit pas plus que la citation ;
- `truth-check` : ne jamais laisser entendre « automatically verifies claims » ni « guarantees
  factual accuracy » (interdits du manifeste) — à relire sur l'article 2.

Les 12 insights historiques (`content/insights/`, 12/09) restent des brouillons ; ils ne relèvent pas
de ce pipeline et appellent une revue séparée.

## 2. shortsos-site — gangster-nerd/shortsos-site#3

Trois nouvelles notes (TruthCheck = pass), publiées sous le mandat du 26/10, **revue humaine en
attente** comme les cinq précédentes. Point signalé : la note sur le modèle d'IA réellement utilisé
mentionne des erreurs « high demand » sur quatre appels réels du 11/09 — appels échoués, aucun
résultat d'analyse revendiqué. Décision séparée : activer ou non l'indexation du site (aujourd'hui,
aucun des huit articles n'est trouvable par un moteur).

## 3. repos-site — gangster-nerd/repOS-site#1

Porte n°1 de la vague w2 : `textos-client/product-truth/REVUE-PREUVES-w2.md`, empreinte
`59703b7497b3785840f0ae385df77f75b06fe2c0d8b735d7f4a9121068208061`. Approuver, corriger ou refuser
par sujet ou par preuve ; rien n'est rédigé avant.

## 4. Mesure (préparée, non lancée)

- Demande : `textos/client/demand-queries.json` (13 expressions). Requiert la PR
  gangster-nerd/textos-v0#74 (marché en-US), un espace de travail textos-site et la clé du
  fournisseur de demande ; chaque appel est facturé.
- Présence dans les réponses IA : `textos/client/operator-question-proposals.json` (6 questions) à
  approuver comme panel ; mesure avant/après publication.

## 5. Clés et environnement

Sans clé d'API pour le rédacteur, chaque article dépend d'un opérateur (transport déclaré
`operator:claude-code`). Fournir une clé (Writer Fabric, route de production) rend la chaîne
autonome sans rien changer d'autre.
