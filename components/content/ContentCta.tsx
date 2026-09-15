import { getCtaVariant, type CtaVariantId } from "@/lib/conversion/cta-registry";

// CTO §6/§7 : le vocabulaire de position est limité à ce qu'un article vend réellement.
// `header` (bandeau haut de page — non utilisé aujourd'hui mais réservé), `contextual`
// (à l'intérieur du corps, positionné par un marqueur éditorial), `final` (après le
// contenu lié). Le legacy `inline`/`end` a été retiré pour empêcher l'ambiguïté.
export type CtaPosition = "header" | "contextual" | "final";

type ContentCtaProps = {
  /**
   * Variante RÉSOLUE (`doc.ctaResolution.resolvedVariant`), jamais la variante brute du
   * frontmatter. `null` = le gate a décidé qu'aucun CTA n'est autorisé.
   */
  variant: CtaVariantId | null;
  contentId: string;
  position: CtaPosition;
  clusterId?: string;
};

// Primitive de conversion — RENDU SEUL.
//
// Le contenu choisit une intention, le gate décide si elle est autorisée, ce composant ne fait que
// rendre la décision. Il ne rappelle donc PAS le resolver, et ne contient aucune logique de
// capacité, de contentType ou de claims : il n'existe ici aucune règle à contourner en réemployant
// le composant sur une autre route ou dans un autre template.
//
// Jamais de bouton grisé, jamais de « coming soon », jamais de lien mort : `null` ne rend rien.
export function ContentCta({ variant, contentId, position, clusterId }: ContentCtaProps) {
  if (variant === null) return null;

  const definition = getCtaVariant(variant);
  if (!definition) return null;

  // Dernière ligne de défense du contrat du composant : il ne rend QUE ce qui a été résolu. Tant
  // que la variante n'est pas `approved`, aucun rendu — même si un appelant lui passait par erreur
  // la variante brute du frontmatter au lieu de `resolvedVariant`.
  //
  // Ce n'est pas un gate parallèle : aucune logique de capacité, de contentType ni de claims ici.
  // C'est le statut de la variante elle-même, et il est devenu nécessaire dès lors qu'un CTA porte
  // une destination réelle — l'absence de destination ne fait plus filet de sécurité.
  if (definition.status !== "approved" || definition.destination === null) return null;

  // CTO §7 — Attribution de bout-en-bout. Les data-attributes DOM ne survivent pas au
  // click : dès que le navigateur charge la destination, on ne récupère plus le contexte
  // depuis la page source. On PROMEUT donc les 5 attributions dans l'URL cible, pour que
  // les analytics côté destination reçoivent le contexte complet sans dépendre d'un
  // fingerprint fragile de referer.
  //
  // Contrat URL : ordre stable des paramètres (URLSearchParams garantit l'insertion),
  // clusterId omis si absent (ne pas polluer avec `clusterId=undefined`).
  const params = new URLSearchParams();
  params.set("source", "textos-site");
  params.set("contentId", contentId);
  if (clusterId) params.set("clusterId", clusterId);
  params.set("ctaVariant", definition.id);
  params.set("ctaVersion", String(definition.version));
  params.set("position", position);
  const separator = definition.destination.includes("?") ? "&" : "?";
  const href = `${definition.destination}${separator}${params.toString()}`;

  return (
    <aside
      className="content-cta"
      data-content-id={contentId}
      data-cluster-id={clusterId}
      data-cta-position={position}
      data-cta-variant={definition.id}
      data-cta-version={definition.version}
      data-cta-source="textos-site"
    >
      <p className="content-cta__title">{definition.title}</p>
      <p className="content-cta__body">{definition.body}</p>
      <a className="content-cta__action" href={href}>
        {definition.primaryLabel}
      </a>
      {definition.disclaimer ? (
        <p className="content-cta__disclaimer">{definition.disclaimer}</p>
      ) : null}
    </aside>
  );
}

export default ContentCta;
