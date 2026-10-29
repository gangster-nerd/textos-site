import { BETA_ACCESS_COPY, BETA_ACCESS_COPY_VERSION, BETA_ACCESS_VARIANT, type BetaAccessDecision } from "@/lib/conversion/beta-access-entry";

// Demande d'accès à une bêta (ADR-032) — RENDU SEUL. Reçoit une décision déjà prise
// (`betaAccessForDocument`) : `none` ne rend rien, jamais un bouton grisé.
export function BetaAccessCta({ decision }: { decision: BetaAccessDecision }) {
  if (decision.kind !== "render") return null;
  return (
    <aside
      className="content-cta"
      data-beta-access
      data-cta-variant={BETA_ACCESS_VARIANT}
      data-cta-version={BETA_ACCESS_COPY_VERSION}
    >
      <p className="content-cta__title">{BETA_ACCESS_COPY.title}</p>
      <p className="content-cta__body">{BETA_ACCESS_COPY.body}</p>
      <a className="content-cta__action" href={decision.href} rel="noopener">
        {BETA_ACCESS_COPY.primaryLabel}
      </a>
      <p className="content-cta__disclaimer">{BETA_ACCESS_COPY.disclaimer}</p>
    </aside>
  );
}

export default BetaAccessCta;
