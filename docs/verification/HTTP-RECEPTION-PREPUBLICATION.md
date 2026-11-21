# Réception HTTP avant promotion — incident sentinelle du 21/11/2026

Un PASS de `pnpm ci:local` certifie les exports locaux, jamais le statut HTTP du CDN. Le `.meta` Next à 404 et le marqueur `NEXT_HTTP_ERROR_FALLBACK;404` ne prouvent pas une réponse HTTP 404. Les quatre profils locaux éditorial/Production × off/demo restent obligatoires et ne sont pas remplacés par la réception.

## Correctif candidat

`output: "export"` et la sentinelle de `generateStaticParams()` sont conservés : Next 15.5.20 refuse le tableau vide sur `/insights/[slug]` en export statique. La règle versionnée `vercel.json` exige une réponse 404, sans redirection, uniquement sur le chemin réservé et ses variantes `.html`, `.txt`, `.rsc`, avec ou sans slash terminal. Elle ne dispense aucune vraie page des contrôles JSON-LD. Le noindex du HTML ne suffit pas : le statut HTTP réel doit passer la réception.

Cette règle n'est pas déclarée validée en distribution avant le test sur Vercel. Aucun test local ne remplace cette étape.

## Séquence obligatoire, sous GO distincts

1. Revoir le diff ; commiter uniquement sous GO. Exécuter `pnpm ci:local` sur ce SHA/arbre propres et archiver les quatre reçus frais et le cumulatif. Ne réutiliser aucun reçu de `535e84c` pour un nouveau SHA.
2. Avant toute écriture distante, vérifier le mécanisme de staging et la protection des aperçus éditoriaux. **Ne pas avancer main pour obtenir le staging** : son intégration Git affecte automatiquement l'alias public. Ne pas pousser une branche qui publierait un aperçu contenant des brouillons sans contrôle d'accès. Aucune variable ou configuration distante ne change implicitement.
3. Sur GO distinct et dans le seul projet `textos-site` / équipe `marcprp-5751s-projects`, créer un déploiement **target Production, non promu, sans aucun alias**, construit depuis le SHA Git exact via la connexion Git existante. Le mécanisme choisi doit désactiver l'affectation automatique des domaines pour **cette opération**, sans modifier les variables d'environnement. Le CLI documente `--prod --skip-domain`, mais un upload local ne remplace pas la provenance Git exigée ici. Si la voie Git disponible ne permet pas ce staging ou si le connecteur n'expose pas ce contrôle : ARRÊT, pas de substitution par un Preview ni par une publication sur main. Le choix/exécution du mécanisme nécessitent le GO opérationnel suivant.
4. Archiver les lectures brutes authentifiées, sans secrets : `vercel inspect <URL-IMMUTABLE> --scope marcprp-5751s-projects --json` ; enregistrements GitHub Deployment et ses statuts du **seul dépôt** `gangster-nerd/textos-site`. Vérifier le SHA exact, le nom/équipe, `target=production`, `READY`, `aliases=[]`, l'URL immuable, l'environnement GitHub `Production` et son statut réussi. Ne fabriquer aucun fichier de provenance pour satisfaire le script.
5. Sur le même checkout propre et le même reçu local, lancer la réception anonyme :

```bash
pnpm verify:http --local-receipt <cumulatif-local.json> --deployment <vercel-inspect.json> --git-deployment <github-deployment.json> --git-status <github-statuses.json> --output <nouveau-dossier-preuves>
```

Le script refuse un aperçu, un déploiement déjà attaché à un alias, une provenance différente, un gate uniquement éditorial et toute absence de profil local. Il effectue des GET sans cookie, identifiant ni contournement de protection, sans suivre les redirections. Il vérifie `/insights`, la sentinelle, un slug inexistant et les douze slugs privés, y compris leurs variantes de fichier : 57 GET pour le corpus actuel. Les pages introuvables exigent un **vrai HTTP 404**, noindex et aucun article/JSON-LD ; un HTTP 200 avec un corps 404 ou une redirection reste refusé. Une identité, un titre ou un passage de brouillon déclenche `DRAFT_EXPOSURE_CONFIRMED` et un arrêt immédiat après conservation de la réponse. Une protection 401/403 est un échec de réception anonyme, jamais contournée.

6. Exiger `HTTP_RECEPTION_PASS`, code 0, et le reçu de ce déploiement exact. Contrôler en complément les CGV R2 intégrales, version 2.0 et date d'effet, sans modifier le contrat. **Sans ces preuves : NO-GO de promotion.** Aucun script fourni ne promeut, déploie ou fusionne automatiquement. Une règle de déploiement automatique distante n'est pas neutralisée par ce document ; tant que le staging sûr n'est pas établi, la livraison reste bloquée.
7. Après revue des preuves, un GO explicite distinct peut autoriser la promotion du **même** déploiement Production, sans rebuild ni changement de source/configuration. Refaire la réception sur l'alias public et vérifier qu'il pointe sur ce déploiement. L'intégration Git ultérieure doit éviter de remplacer silencieusement ce déploiement par un nouveau build non réceptionné ; son mécanisme et son autorisation sont à préciser avant l'action, sans inventer de délégation.

## Rollback et CGV

La sentinelle de l'ancien déploiement `dpl_6t7NyucjbuJAynoKaRWQaj1aY66P` répond également HTTP 200 en lecture anonyme le 21/11/2026. Le retour arrière n'améliore donc pas le défaut démontré et remettrait en ligne la rédaction fiscale antérieure : il n'est pas recommandé comme solution de cet incident.

Les CGV R2 sont publiques sous le libellé version 2.0 depuis la publication du SHA `535e84cca40a68cdc66d5c12d33f9478e14cbe90`. Le présent chantier technique ne modifie ni le texte, ni le numéro, ni la date, ni l'annexe Offres et tarifs. Les trois états historiques de texte et leurs corrections doivent conserver leur traçabilité ; un diff vide après intégration ne prouve pas l'identité avec l'ancienne base `a9075da`.

## Sources et limites

- [Vercel : routes et statut explicite](https://vercel.com/docs/project-configuration/vercel-json#routes).
- [Vercel : staging et promotion](https://vercel.com/docs/deployments/promoting-a-deployment).
- [Next : export statique](https://nextjs.org/docs/app/guides/static-exports) ; la preuve de compatibilité reste le test sur la version installée 15.5.20, pas la documentation de la dernière version.
- Preuves initiales de publication : `/private/tmp/textos-site-publication-20261121-9pz95010/`.
- Enquête et essais locaux P0 : `/private/tmp/textos-site-p0-20261121-ao4j8qw1/`.

Aucun déploiement correctif, promotion, rollback, push ou commit n'est autorisé par ce document. L'absence de réception du candidat correctif maintient `SITE_PUBLICATION_ANOMALY`.
