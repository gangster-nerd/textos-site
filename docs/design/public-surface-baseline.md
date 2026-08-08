# Ligne de base visuelle publique — audit d'extraction

> **STATUT — corrigé après arbitrage.** Ce document n'est **pas** un contrat de design pour
> l'application. Il rend compte d'une recherche qui n'a rien trouvé, et fixe le statut de ce qui
> existe.
>
> As of this audit, `textos-v0` contains no product UI or design-token source from which
> `textos-site` can derive a visual contract. The existing site is therefore treated only as the
> **current public visual baseline**, not as a binding design system for the future application.
>
> Conséquence pratique : le système de tokens du site (§7, puis `app/globals.css`) lui appartient en
> propre. Il ne prétend refléter aucune décision produit et **ne contraint pas** la future UI de
> l'application, qui restera libre de ses choix.

## 1. Ce qui a été examiné

Lecture seule de `~/textos-v0` au commit `3b9141d`. Aucune écriture, aucune commande d'écriture.

| Recherche | Résultat |
|---|---|
| Fichiers sous `app/` | **2** — `layout.tsx` (16 lignes), `page.tsx` (10 lignes) |
| Fichiers `.css` dans tout le dépôt | **0** |
| Composants `.tsx` hors `app/` | **0** |
| Dépendances UI (Tailwind, shadcn, CSS-in-JS, Radix, Framer…) | **aucune** — `next`, `react`, `react-dom`, `drizzle-orm`, `@anthropic-ai/sdk` et l'outillage de test |
| Termes de design dans `docs/` (`typograph`, `font-family`, `palette`, `design system`, `couleur`, `tailwind`, `shadcn`) | **0 fichier** |
| Présentation dans les rapports de démo | aucune — Markdown seul, aucun HTML, aucun style |

## 2. Ce qui existe, intégralement

`app/page.tsx` :

```tsx
// S0 — placeholder neutre, PAS un écran produit.
// Le build TextOS commence par l'observation (schéma + frontière moteur), pas par l'UI
// (ADR-001 §12 : « commencer par les observations, pas par l'éditeur, le dashboard ou la génération »).
export default function Page() {
  return (
    <main>
      <p>TextOS — foundations (S0). No product UI in this sprint.</p>
    </main>
  );
}
```

`app/layout.tsx` rend `<html lang="fr"><body>{children}</body></html>` sans feuille de style, sans
police, sans classe.

Ce n'est pas une UI en cours d'écriture : c'est une **coquille de framework délibérément vide**,
documentée comme telle et adossée à une décision d'architecture (ADR-001 §12 — commencer par les
observations, pas par l'écran).

## 3. Tokens extraits

**Aucun.**

| Token demandé | Source dans `textos-v0` |
|---|---|
| font stack | *néant* — `body` sans `font-family` |
| échelle typographique | *néant* — aucune règle de taille |
| hiérarchie fond/texte | *néant* — aucune couleur déclarée |
| neutres, accent | *néant* |
| bordures, rayons, ombres | *néant* |
| espacements | *néant* |
| largeurs de contenu | *néant* |
| hauteurs de contrôle, tailles d'icônes | *néant* — aucun contrôle, aucune icône |
| timings | *néant* — aucune transition |

## 4. Pourquoi je n'invente pas ces tokens

C'est le point central de cet audit.

Il serait facile de produire une palette « dans l'esprit du produit » et de l'inscrire ici comme
extraite. Personne ne s'en apercevrait : le tableau aurait l'air renseigné, le sprint avancerait.

Ce serait l'exact équivalent visuel d'un `sourceCommit` fabriqué. Toute la chaîne de gouvernance
construite ces derniers jours — manifeste de vérité produit, preuves adressables, provenance
résolue, refus du scan heuristique — repose sur une seule règle : **une valeur inconnue se déclare
absente, jamais par une valeur fausse**. Elle vaut pour un SHA, un `canonical`, un statut de
publication. Elle vaut aussi pour un token de design.

Un contrat visuel qui dirait « extrait de `textos-v0` » sans rien avoir extrait serait un faux
document de provenance, et il survivrait longtemps : personne ne revérifie l'origine d'une palette.

## 5. Patterns d'application examinés puis écartés

| Pattern | Raison de l'écarter |
|---|---|
| Layout de dashboard | Aucun n'existe. En transposer un reviendrait à donner une forme publique à un écran que le produit n'a pas encore conçu, et à contraindre sa conception future depuis le site. |
| Chrome applicatif (barre latérale, sélecteur de compte, fil d'ariane) | Simulerait un compte connecté et une navigation produit inexistants — interdit par la règle *app-like, pas app-fake*. |
| Composants de contrôle (boutons, champs, sélecteurs) | Aucune hauteur, aucun rayon, aucun état de focus n'existe à copier. Les inventer serait fabriquer un standard, pas le refléter. |
| Rapports de démo comme source visuelle | Markdown pur, sans présentation. Leur mise en forme est celle du lecteur, pas du produit. |

## 6. Ce que je juge instable, donc non transposable

Sans objet — rien n'est assez stable pour être jugé instable. La question se reposera quand une UI
existera.

Deux choses seront alors à surveiller : les **layouts**, qui bougeront longtemps, et tout ce qui
touche à l'**affichage d'une mesure réelle** (états de complétude, dispersion, `not_available`), qui
dépend de décisions produit non arbitrées.

## 7. La ligne de base réelle : le site lui-même

Le site possède déjà, dans `app/globals.css` (48 lignes), un système restreint et cohérent. En
l'absence d'UI produit, **c'est la seule référence visuelle existante de TextOS.**

| Token | Valeur | Ligne |
|---|---|---|
| `--bg` | `#0b0c0e` | 2 |
| `--fg` | `#e9eaec` | 3 |
| `--muted` | `#9aa0a6` | 4 |
| `--line` | `#23262b` | 5 |
| `--accent` | `#7cc4ff` | 6 |
| Police | pile système, `16px/1.6` | 16 |
| Largeur de contenu | `46rem` | 20 |
| Rythme vertical | `5rem` / `6rem` (page), `2.5rem` (h2) | 20, 30 |
| Rayon | `10px` (unique occurrence) | 35 |
| Ombres | aucune | — |
| Transitions | aucune | — |

Sombre, neutre, dense, sans ornement. Un accent unique, froid, utilisé pour les liens et le kicker.
Aucune ombre ni transition — ce n'est pas un manque, c'est cohérent avec un produit de mesure.

## 8. Conséquence sur la direction du sprint

La convergence demandée suppose une cible. Il n'y en a pas.

En l'état, **le site est la première et la seule surface visuelle de TextOS**. Trois suites possibles,
et ce n'est pas à moi de choisir :

1. **Le site pose le contrat, l'app convergera plus tard.** Ce document devient la source, et non le
   reflet. Honnête, mais inverse la direction annoncée : il faudra l'assumer explicitement, sinon le
   produit héritera de choix pris sans lui.
2. **Refonte purement éditoriale, sans prétention de convergence.** Le sprint garde tous ses
   objectifs — panneau de mesure, densité, hiérarchie — en s'appuyant sur la ligne de base §7, et
   n'invoque aucune extraction. C'est la lecture la plus proche de ce qui est réellement faisable.
3. **Ajourner S4** jusqu'à ce qu'une UI produit existe.

Ce que je ne ferai dans aucun cas : écrire des tokens et affirmer qu'ils viennent du produit.

## 9. Contraintes tenues quoi qu'il arrive

- Aucune dépendance de build vers `textos-v0` ; aucun package partagé.
- `textos-v0` n'a été qu'**lu**.
- Aucun composant écrit — la Phase 1 s'arrête ici, comme demandé.
