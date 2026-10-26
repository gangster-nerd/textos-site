import { PRODUCT_ENTRY_COPY, PRODUCT_ENTRY_COPY_VERSION, PRODUCT_ENTRY_VARIANT, type ProductEntryDecision } from "@/lib/conversion/product-entry";

// Entrée self-serve vers le produit — RENDU SEUL. Reçoit une décision déjà prise
// (`productEntryForHomepage`) : `none` ne rend rien, jamais un bouton grisé ni un « bientôt ».
export function ProductEntryCta({ decision }: { decision: ProductEntryDecision }) {
  if (decision.kind !== "render") return null;
  return (
    <aside
      className="content-cta"
      data-product-entry
      data-cta-variant={PRODUCT_ENTRY_VARIANT}
      data-cta-version={PRODUCT_ENTRY_COPY_VERSION}
    >
      <p className="content-cta__title">{PRODUCT_ENTRY_COPY.title}</p>
      <p className="content-cta__body">{PRODUCT_ENTRY_COPY.body}</p>
      <a className="content-cta__action" href={decision.href} rel="noopener">
        {PRODUCT_ENTRY_COPY.primaryLabel}
      </a>
      <p className="content-cta__disclaimer">{PRODUCT_ENTRY_COPY.disclaimer}</p>
    </aside>
  );
}

export default ProductEntryCta;
