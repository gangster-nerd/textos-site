# TextOS — Annexe « Offres et tarifs »

**Version 1.0 — en vigueur le 21 novembre 2026**
Adresse permanente de cette version : https://textos-site.vercel.app/legal/offres-et-tarifs

Cette annexe est le document visé à l'article 2.1 (iv) des [conditions générales de vente et
d'utilisation](/legal/cgv). Elle fait partie du contrat. L'article 3.2 lui donne sa portée : le
contenu exact de chaque offre y est décrit, et **seul ce qui y figure est dû**.

Tous les montants sont en euros, hors taxes. TextOS n'est pas assujetti à la taxe sur la valeur
ajoutée (article 293 B du Code général des impôts) : les montants facturés sont donc ceux indiqués.

---

## 1. Les offres principales

| | **Découverte** | **Essentiel** | **Pro** | **Agence** |
|---|---|---|---|---|
| Prix mensuel | gratuit | **89 €** | **249 €** | **690 €** |
| Suivi, par mois | 150 unités | 2 000 unités | 5 000 unités | 15 000 unités |
| Contenus livrés | 1, une seule fois | 5 par mois | 20 par mois | 50 par mois |
| Espaces de mesure | 1 | 1 | 3 | 10 |
| Clés API actives | 2 | 10 | 10 | 25 |
| Réobservation planifiée | une photo tous les 15 jours | hebdomadaire | hebdomadaire | hebdomadaire |

L'offre Découverte est attachée automatiquement à chaque client et n'a pas de durée déterminée.
L'article 11.1 des conditions générales prévoit sa fermeture possible après plus de douze mois
d'inactivité, avec un préavis de trente jours.

### Périodicité annuelle

Essentiel, Pro et Agence existent en version annuelle : **dix mois facturés pour douze mois de
service**. Les quotas mensuels sont remis à leur valeur chaque mois ; ils ne s'additionnent pas sur
l'année et les unités non consommées d'un mois ne se reportent pas sur le suivant.

---

## 2. Ce que mesurent les unités

**Le Suivi** est l'unité qui porte le coût fournisseur. Une unité correspond à une observation
réellement enregistrée, pondérée par le moteur qui l'a produite. Les contrôles de performance sont
débités dans cette même unité.

L'équivalent parfois affiché en « questions suivies » est **un calcul dérivé**, obtenu du nombre de
répétitions et de la fréquence de réobservation. Il n'est pas un quota : il peut évoluer si ces
paramètres sont affinés, sans qu'aucune unité change. Il est donné à titre indicatif.

**Les Contenus livrés** comptent un article, une mise à jour de page ou un bloc de questions
fréquentes déposé à destination après vérification, à raison d'une unité chacun.

**Les Espaces de mesure** et les **Clés API actives** sont des allocations : elles ne se consomment
pas, elles bornent ce qui peut exister simultanément.

Une limite technique d'invocations de l'API et du serveur MCP s'applique à chaque offre. Elle n'est
pas un compteur commercial et ne figure pas à cette grille : elle est consultable dans la console
développeur. Les lectures ne sont pas comptées.

---

## 3. Moteurs observés — état au 21 novembre 2026

L'article 3.1 des conditions générales renvoie à cette annexe pour désigner les moteurs de réponse
par intelligence artificielle effectivement observés. **Cette désignation est la suivante, et elle
est volontairement restrictive.**

| Moteur | Observé aujourd'hui | Pondération d'une observation |
|---|---|---|
| **Perplexity** | **oui** | 1 |
| ChatGPT | **non** — fournisseur présent, non raccordé au service en libre-service | 2 lorsqu'il le sera |
| Aperçus IA de Google | **non** — collecte à raccorder | 1 lorsqu'il le sera |

**Ce qui est dû aujourd'hui porte donc sur Perplexity.** Les deux autres moteurs sont déclarés dans
cette annexe pour que leur pondération soit connue d'avance, non pour être tenus pour acquis.
Conformément à l'article 3.2, une feuille de route, une documentation de fonction à venir ou une
réponse d'un assistant d'IA ne constitue pas un engagement : l'entrée d'un moteur dans le service
sera constatée par une nouvelle version de cette annexe.

La pondération de chaque moteur repose aujourd'hui sur une hypothèse de coût, révisable, et toute
révision fera l'objet d'une nouvelle version de cette annexe selon l'article 12.

---

## 4. Options

| Option | Prix | Disponible pour |
|---|---|---|
| Client supplémentaire | **49 €** par mois, ou **490 €** par an | Agence uniquement |

La périodicité de l'option suit celle de l'offre Agence en vigueur.

---

## 5. Recharges prépayées

| Recharge | Contenu | Prix | Validité |
|---|---|---|---|
| Suivi | 1 000 unités de suivi | **39 €** | 12 mois |
| Contenus | 5 contenus livrés | **39 €** | 12 mois |
| Pack Conquête | 25 contenus livrés | **149 €** | 12 mois |

Les recharges sont réservées aux offres payantes. Elles ne sont pas proposées à l'offre Découverte.

Conformément à l'article 9.4, une recharge est valable douze mois à compter de son achat et **les
unités non consommées à cette date sont perdues**.

---

## 6. Dépassement d'un quota

Conformément à l'article 9.2, **aucun dépassement n'est facturé**. Lorsqu'un compteur commercial
atteint sa limite, la fonction concernée s'arrête jusqu'au renouvellement du quota ou jusqu'à
l'achat volontaire d'une recharge. Le prix de la recharge est indiqué avant tout achat.

Le service ne devient jamais payant sans souscription expresse du Client (article 9.3).

---

## 7. Plafonds de sécurité

Indépendamment des quotas de l'offre, un plafond de sécurité borne la consommation par période
glissante de trente jours. Il protège le Client d'une consommation involontaire, et il n'est pas un
quota commercial.

| Régime | Plafond |
|---|---|
| Découverte, essai gratuit, offre non lisible | 90 appels de mesure par organisation |
| Offre payante | 160 appels de mesure par espace de mesure |

Lorsque le contrôle des quotas de l'offre est pleinement appliqué, ce sont les quotas de l'offre qui
gouvernent, et ce plafond cesse d'être la limite effective.

---

## 8. Essai gratuit

Un essai gratuit peut être proposé. Il est limité dans le temps et dans ses quotas, et son terme
ramène l'organisation à l'offre Découverte, sans passage payant automatique (article 9.3). Sa durée
et ses quantités sont annoncées au moment où il est proposé.

---

## 9. Ce que cette annexe ne promet pas

Ces limites figurent déjà aux conditions générales. Elles sont rappelées ici parce que c'est ce
document qui définit ce qui est dû.

- **TextOS livre des brouillons et ne publie rien** (article 4.1). Aucun quota de cette grille
  n'inclut une publication.
- **Aucun résultat de présence, de citation, de trafic ou de chiffre d'affaires n'est garanti**
  (article 5.1). Les unités mesurent un travail exécuté, pas un effet obtenu.
- Une fonction désignée comme bêta peut être modifiée ou retirée (article 3.3). Aucune ligne de cette
  grille ne porte sur une fonction bêta.
- Les prix, quotas et options applicables sont ceux de la version de cette annexe **en vigueur à la
  date de souscription** (article 9.1). Toute modification suit l'article 12 : notification par
  courriel au moins trente jours avant son entrée en vigueur, et faculté de résilier sans frais avant
  cette date.

---

## 10. Historique des versions

| Version | Date d'effet | Changement |
|---|---|---|
| 1.0 | 21 novembre 2026 | Première publication. Établit les quatre offres, leurs quotas, les options, les recharges, les plafonds de sécurité et la désignation des moteurs observés. |
