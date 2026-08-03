import { getCtaVariant, type CtaVariantId } from "@/lib/conversion/cta-registry";

type ContentCtaProps = {
  /**
   * Variante RÉSOLUE (`doc.ctaResolution.resolvedVariant`), jamais la variante brute du
   * frontmatter. `null` = le gate a décidé qu'aucun CTA n'est autorisé.
   */
  variant: CtaVariantId | null;
  contentId: string;
  position: "inline" | "end";
};

// Primitive de conversion — RENDU SEUL.
//
// Le contenu choisit une intention, le gate décide si elle est autorisée, ce composant ne fait que
// rendre la décision. Il ne rappelle donc PAS le resolver, et ne contient aucune logique de
// capacité, de contentType ou de claims : il n'existe ici aucune règle à contourner en réemployant
// le composant sur une autre route ou dans un autre template.
//
// Jamais de bouton grisé, jamais de « coming soon », jamais de lien mort : `null` ne rend rien.
export function ContentCta({ variant, contentId, position }: ContentCtaProps) {
  if (variant === null) return null;

  const definition = getCtaVariant(variant);
  // Rétrécissement de type, pas un second gate : une variante résolue a nécessairement une
  // destination (garantie par `ctaViolations`). Cette branche est inatteignable en pratique.
  if (!definition || definition.destination === null) return null;

  return (
    <aside
      className="content-cta"
      data-content-id={contentId}
      data-cta-position={position}
      data-cta-variant={definition.id}
      data-cta-version={definition.version}
    >
      <p className="content-cta__title">{definition.title}</p>
      <p className="content-cta__body">{definition.body}</p>
      <a className="content-cta__action" href={definition.destination}>
        {definition.primaryLabel}
      </a>
      {definition.disclaimer ? (
        <p className="content-cta__disclaimer">{definition.disclaimer}</p>
      ) : null}
    </aside>
  );
}

export default ContentCta;
