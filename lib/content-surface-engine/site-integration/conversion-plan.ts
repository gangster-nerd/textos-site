// CMO-CONVERSION-SURFACE-2 — derived ResolvedConversionPlan.
//
// Turns a ResolvedContentSurface + optional commercial CTA + governed source
// links + computed related entries into an explicit plan the managed reference
// surface consumes. Purely derivational — no fetch, no slug switch, no side
// effect. Independent of the article's slug: policy + document data only.

import type { ResolvedContentSurface } from "../contract/resolved-content-surface";
import type { ResolvedReferenceCta } from "../conversion/resolve-reference-cta";
import type { ResolvedRelatedEntry } from "./related-resolution";
import type { SourceRelatedSection } from "./related-source-links";

export interface CommercialCtaSlot {
  slot: "header" | "contextual" | "final";
  variantId: string;
  version: number;
  destination: string;
  headline: string;
  copy: string;
  primaryLabel: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  eyebrow?: string;
}

export interface EditorialNextStep {
  label: string;
  href: string;
  description: string;
  source: "governed-body-link" | "computed-related";
}

export interface ResolvedConversionPlan {
  commercial: {
    enabled: boolean;
    header: CommercialCtaSlot | null;
    contextual: CommercialCtaSlot | null;
    final: CommercialCtaSlot | null;
  };
  editorialNextStep: EditorialNextStep | null;
  retention: {
    /** Newsletter is always independently governed. */
    enabled: boolean;
  };
}

interface DeriveInput {
  resolved: ResolvedContentSurface;
  cta: ResolvedReferenceCta | null;
  sourceRelated: SourceRelatedSection | null;
  computedRelated: readonly ResolvedRelatedEntry[];
  newsletterEnabled: boolean;
}

const HEADER_SECONDARY_LABEL = "See how measurement works";
const HEADER_SECONDARY_HREF = "/methodology/authority-presence";

const CONTEXTUAL_HEADLINE =
  "See where your brand is cited—and where it disappears.";
const CONTEXTUAL_PRIMARY = "Establish your authority baseline";

const HEADER_PRIMARY = "Request your first measurement";
const FINAL_EYEBROW = "TURN OBSERVATION INTO ACTION";
const FINAL_HEADLINE = "Establish your first authority baseline";
const FINAL_COPY =
  "Measure where answer engines cite, mention or omit your brand across a versioned query panel.";
const FINAL_PRIMARY = "Request your first measurement";

function looksInternalMethodologyOrFaq(href: string): boolean {
  return /^\/(methodology|faq)\//.test(href);
}

function pickEditorialNextStep(input: DeriveInput): EditorialNextStep | null {
  // 1. Explicit governed next step (not currently modeled at ContentDocument
  //    level — reserved for future). Skip.
  // 2. Explicit publishable methodology/FAQ source relation.
  if (input.sourceRelated) {
    const explicit = input.sourceRelated.links.find((l) =>
      looksInternalMethodologyOrFaq(l.href),
    );
    if (explicit) {
      return {
        label: explicit.title || explicit.href,
        href: explicit.href,
        description: input.sourceRelated.headingLabel,
        source: "governed-body-link",
      };
    }
    // If sourceRelated has links but none are methodology/faq, take the first
    // as a governed body link (still explicit and governed).
    const first = input.sourceRelated.links[0];
    if (first) {
      return {
        label: first.title || first.href,
        href: first.href,
        description: input.sourceRelated.headingLabel,
        source: "governed-body-link",
      };
    }
  }
  // 3. Highest-confidence publishable Related entry.
  const top = input.computedRelated[0];
  if (top) {
    return {
      label: top.title,
      href: top.href,
      description: top.description,
      source: "computed-related",
    };
  }
  return null;
}

export function deriveResolvedConversionPlan(input: DeriveInput): ResolvedConversionPlan {
  const commercialEnabled =
    input.resolved.conversion.effectiveCtaAllowed && input.cta !== null;

  const cta = input.cta;
  const commercial = commercialEnabled && cta
    ? {
        enabled: true,
        header: {
          slot: "header" as const,
          variantId: cta.variantId,
          version: cta.version,
          destination: cta.destination,
          headline: HEADER_PRIMARY,
          copy: "",
          primaryLabel: HEADER_PRIMARY,
          secondaryLabel: HEADER_SECONDARY_LABEL,
          secondaryHref: HEADER_SECONDARY_HREF,
        } as CommercialCtaSlot,
        contextual: {
          slot: "contextual" as const,
          variantId: cta.variantId,
          version: cta.version,
          destination: cta.destination,
          headline: CONTEXTUAL_HEADLINE,
          copy: cta.body,
          primaryLabel: CONTEXTUAL_PRIMARY,
        } as CommercialCtaSlot,
        final: {
          slot: "final" as const,
          variantId: cta.variantId,
          version: cta.version,
          destination: cta.destination,
          headline: FINAL_HEADLINE,
          copy: FINAL_COPY,
          primaryLabel: FINAL_PRIMARY,
          eyebrow: FINAL_EYEBROW,
        } as CommercialCtaSlot,
      }
    : { enabled: false, header: null, contextual: null, final: null };

  const editorialNextStep = pickEditorialNextStep(input);

  return {
    commercial,
    editorialNextStep,
    retention: { enabled: input.newsletterEnabled },
  };
}
