// A2R-PORT — CTA attribution URL builder.
//
// A2R contract for the destination URL that a rendered CTA action MUST carry :
//
//   source           = textos-site   (constant — surface tag)
//   contentId        = the ContentDocument documentId the CTA lives in
//   clusterId        = editorial cluster if the document declares one (omitted otherwise)
//   ctaVariant       = the resolved variant id (e.g. measurement_request)
//   ctaVersion       = the resolved variant version (string form)
//   position         = "contextual" | "final" | "header"
//   contentRevision  = ContentDocument.lifecycle.revisionNumber (or 0)
//
// STRICT ALLOWLIST. No other query parameter is appended. The order is fixed so
// the URL is deterministic across renders (URLSearchParams preserves insertion).
//
// The renderer builds the URL ONCE per resolved CTA position ; callers never
// concatenate params by hand.

export type CtaAttributionPosition = "contextual" | "final" | "header";

export interface CtaAttributionInput {
  destination: string;
  contentId: string;
  clusterId?: string | null;
  ctaVariant: string;
  ctaVersion: number | string;
  position: CtaAttributionPosition;
  contentRevision: number | string;
}

/** Returns the destination with the strict-allowlist attribution appended. */
export function buildCtaAttributionHref(input: CtaAttributionInput): string {
  const params = new URLSearchParams();
  params.set("source", "textos-site");
  params.set("contentId", input.contentId);
  if (input.clusterId) params.set("clusterId", input.clusterId);
  params.set("ctaVariant", input.ctaVariant);
  params.set("ctaVersion", String(input.ctaVersion));
  params.set("position", input.position);
  params.set("contentRevision", String(input.contentRevision));
  const sep = input.destination.includes("?") ? "&" : "?";
  return `${input.destination}${sep}${params.toString()}`;
}

/** Fixed allowlist used by mutation tests. */
export const CTA_ATTRIBUTION_ALLOWED_KEYS = [
  "source",
  "contentId",
  "clusterId",
  "ctaVariant",
  "ctaVersion",
  "position",
  "contentRevision",
] as const;
