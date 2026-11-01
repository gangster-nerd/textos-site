import Link from "next/link";

import { PRODUCT_ENTRY_COPY_VERSION, PRODUCT_ENTRY_HERO_LABEL, PRODUCT_ENTRY_VARIANT, type ProductEntryDecision } from "@/lib/conversion/product-entry";

/**
 * Actions du haut de page d'accueil — RENDU SEUL, à partir de décisions déjà prises :
 *   - « Run a measurement » : l'entrée self-serve, même porte que `ProductEntryCta` ;
 *   - « Request an assisted measurement » : la variante interne déjà RÉSOLUE par le registre CTA.
 * Aucune des deux n'est rendue sans sa décision ; sans aucune, rien n'est rendu (ni bouton grisé, ni
 * « bientôt »). Les attributs `data-cta-*` portent variante, version et position pour la mesure
 * d'audience, sans donnée personnelle.
 */
export function HeroActions({
  productEntry,
  assisted,
}: {
  productEntry: ProductEntryDecision;
  assisted: { readonly variant: string; readonly version: number; readonly href: string; readonly label: string } | null;
}) {
  const showEntry = productEntry.kind === "render";
  if (!showEntry && assisted === null) return null;
  return (
    <p className="hero__actions" data-hero-actions>
      {showEntry && (
        <a
          className="content-cta__action"
          href={productEntry.href}
          rel="noopener"
          data-cta-variant={PRODUCT_ENTRY_VARIANT}
          data-cta-version={PRODUCT_ENTRY_COPY_VERSION}
          data-cta-position="hero"
        >
          {PRODUCT_ENTRY_HERO_LABEL}
        </a>
      )}
      {assisted !== null && (
        <Link
          className={showEntry ? "hero__secondary" : "content-cta__action"}
          href={assisted.href}
          data-cta-variant={assisted.variant}
          data-cta-version={assisted.version}
          data-cta-position="hero"
        >
          {assisted.label}
        </Link>
      )}
    </p>
  );
}

export default HeroActions;
