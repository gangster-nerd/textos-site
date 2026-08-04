# Déploiement — statut

## Origine technique (D0A)

**Technical preview origin — non-indexable — not an approved public origin — to be replaced during D0B/S4.**

Le site est déployé sur une origine fournie par la plateforme (Vercel). Elle est **fonctionnelle** :
elle sert le CSS, le JavaScript, les SVG et permet de vérifier le rendu navigateur réel, de tester
les CTA et un formulaire, et de valider S2/S3 de bout en bout.

Elle n'est **pas autoritative**. Elle ne doit jamais servir à :

- lancer publiquement la marque ;
- produire une `canonical`, un `og:url`, un `@id` ou une entrée de sitemap ;
- établir des `sameAs` ou des identifiants d'entité durables ;
- recevoir des backlinks ;
- être indexée.

Le nom de domaine public, la topologie apex / www / app et la bascule d'indexation relèvent de
**D0B / S4**, quand le naming aura convergé.

## Accès public

> **The technical preview is publicly accessible. `noindex` and `robots.txt` govern crawler
> behaviour; they are not access controls. Only content safe for public disclosure may be
> deployed.**

La protection SSO de Vercel a été levée pour rendre l'origine vérifiable au navigateur. En
conséquence : aucun contenu confidentiel, aucune clé, aucune information client, aucune donnée
produit non publiable ne doit entrer sur cette origine. `noindex` décourage l'indexation ; il
n'interdit l'accès à personne.

## Variables de build

| Variable | Valeur (origine technique) | Effet |
|---|---|---|
| `SITE_ORIGIN` | l'origine gouvernée, si posée | Sert `metadataBase` ; **jamais** émise en absolu tant que l'indexation est fermée |
| `PUBLIC_ORIGIN_APPROVED` | `false` (défaut) | Autorisation POSITIVE de l'origine publique |
| `PUBLIC_INDEXABLE_BUILD` | `false` | Bascule d'indexation, décision distincte de l'approbation |

### Le contrat : une origine n'est jamais publique par déduction

`allowIndexing` exige **trois conditions simultanées**, dans `lib/config/site.ts` :

```
allowIndexing = PUBLIC_INDEXABLE_BUILD=true
              ∧ PUBLIC_ORIGIN_APPROVED=true
              ∧ origine non provisoire
```

Deux échecs de build explicites gardent ce contrat :

- `PUBLIC_INDEXABLE_BUILD=true` sans `PUBLIC_ORIGIN_APPROVED=true` → **échec**. Sans cette règle,
  une origine simplement *inconnue* de la liste des plateformes suffirait à publier.
- `PUBLIC_ORIGIN_APPROVED=true` sur une origine reconnue provisoire → **échec**. On n'approuve pas
  une adresse qui ne nous appartient pas et qui changera.

La liste des domaines de plateforme (`localhost`, `github.io`, `vercel.app`, `netlify.app`,
`pages.dev`, `onrender.com`, `fly.dev`) reste une **défense secondaire** : elle attrape les erreurs
probables, mais elle n'est pas l'autorité. Une plateforme nouvelle ou un sous-domaine temporaire
n'y figurerait pas — c'est l'approbation positive qui décide.

**`PUBLIC_ORIGIN_APPROVED=true` ne sera posée que pendant D0B/S4**, après validation humaine du
domaine détenu. Le futur domaine ne deviendra autoritatif qu'après deux décisions distinctes :
origine approuvée, *puis* build indexable.

La matrice complète est couverte par `tests/site-origin.test.ts`.

### Résolution de l'origine

Par ordre de priorité :

1. `SITE_ORIGIN` — valeur gouvernée (production, développement) ;
2. `https://${VERCEL_URL}` — origine **réelle** du déploiement courant ; sert les Preview
   Deployments, qui croiraient sinon tourner sur localhost alors qu'ils sont servis sur
   `*.vercel.app`. Le défaut était sûr, mais il mentait ;
3. `http://localhost:3000` — dernier recours, développement local hors plateforme.

Requiert que **l'exposition automatique des variables système** soit active dans les réglages du
projet Vercel (`autoExposeSystemEnvs`), sans quoi `VERCEL_URL` est absente et l'on retombe sur
localhost — dégradé, jamais dangereux, puisque localhost est provisoire.

## Mode de conversion par environnement

| Environnement | Aujourd'hui | Après S2B / D0B |
|---|---|---|
| Development | `demo` | `demo` |
| Preview | `demo` | `demo` |
| Production | `demo` | `live` |

**Seule la Production pourra devenir `live`.** Les previews restent sans collecte réelle, même après
le lancement public : une branche en cours de revue n'a aucune raison de recevoir de vraies demandes.

Le passage à `live` est une **configuration**, pas une modification de copy. Il exige
`CONVERSION_MODE=live` plus les six variables juridiques et l'endpoint du sous-traitant — leur
absence fait échouer le build. Aucun Markdown, aucune phrase publique, aucun composant ne change :
seules les deux mentions de démonstration disparaissent.

Le mode vient TOUJOURS du build. `?mode=demo` sur la page de confirmation est une trace de
navigation, jamais une autorité : si un paramètre d'URL décidait de la copy, une production réelle
pourrait afficher « aucune information n'a été transmise » sur simple modification de l'adresse.

La CI exécute les **deux** contrats (`off` et `demo`) par matrice — ils ne promettent pas la même
chose, et un seul ne prouverait que la moitié.

## Provenance des déploiements

L'intégration Git Vercel est active : un push sur une branche produit un **Preview Deployment**, un
merge sur `main` un **Production Deployment**, chacun rattaché à son SHA.

Les uploads CLI (`vercel deploy`) restent utiles pour explorer, **jamais pour fermer un chantier** :
l'artefact qu'ils publient ne correspond à aucun commit. Une preuve de déploiement doit venir de
Git.

## Nom de travail

```
Repository name    → textos-site
Internal product   → TextOS
Public brand       → pending
Public domain      → pending
```

Aucun rebranding en cours. Les contenus continuent d'employer TextOS comme nom de travail ; la
bascule de marque sera un chantier gouverné (D0B/S4), pas une réécriture au fil des pages.

## Origine technique de référence

**Vercel est l'origine technique de référence du site.** L'intégration Git en est la seule source :
push sur une branche → Preview Deployment, merge sur `main` → Production Deployment, chacun
rattaché à son SHA.

Elle demeure **non autoritative et non indexable** : ce n'est ni la marque, ni l'origine publique
définitive. Le domaine public sera traité en **D0B / S4**.

## GitHub Pages — retiré

L'ancienne publication `gangster-nerd.github.io/textos-site/` est **retirée**. Le workflow
`deploy-pages` est supprimé et la publication Pages est désactivée dans les réglages du dépôt.

Motif : servie sous un chemin de projet sans `basePath`, elle renvoyait 404 sur tout chemin absolu
— CSS, chunks JS, et les images depuis S1. Le HTML était lisible, rien d'autre ne se chargeait.
Laisser tourner une seconde origine, cassée de surcroît, entretenait une ambiguïté permanente sur
laquelle fait référence.

Le dépôt, les runs CI et les SHA de merge constituent l'historique ; une publication cassée n'y
ajoutait rien.

<details>
<summary>Historique de la décision</summary>

## Devenir du déploiement GitHub Pages (décision, avant application)

Le site a été publié sur `gangster-nerd.github.io/textos-site/` jusqu'au 2026-08-03 (SHA `133e5d1`).
Cette publication est **cassée par construction** : servie sous un chemin de projet sans `basePath`,
tous les chemins absolus renvoient 404 — CSS, chunks JS, et les images depuis S1. Le HTML est
lisible, rien d'autre ne se charge.

**Décision proposée : désactiver le workflow `deploy-pages` une fois la nouvelle origine prouvée.**

Motif : deux origines publiées simultanément, dont une cassée, c'est une ambiguïté permanente sur
laquelle fait référence — pour un humain comme pour un crawler qui aurait ignoré `robots.txt`. Le
dépôt, les runs CI et les SHA de merge constituent déjà l'historique ; une publication cassée n'y
ajoute rien.

Alternative retenue si l'on préfère ne rien casser : **conserver le workflow mais comme historique
non référent**, à condition que `robots.txt` y reste en `Disallow: /` — ce qui est le cas, la même
configuration produisant les deux artefacts.

Cette décision n'est pas encore appliquée : `deploy-pages` tourne toujours sur `main`. La séquence
arrêtée est stricte — **ne rien désactiver avant la preuve Production Vercel issue de Git** :

```
commit → push → Preview Vercel depuis le SHA → PR → merge
       → Production Vercel depuis le SHA de merge → vérification complète
       → désactivation ET dépublication de GitHub Pages
```

Désactiver le seul workflow ne suffira pas : l'ancien artefact peut rester servi. Il faudra
également couper la publication Pages dans les réglages du dépôt, ou vérifier que l'ancienne URL ne
sert plus le site.

</details>
