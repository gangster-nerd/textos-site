// CMO-SURFACE-VERTICAL-SLICE-1 — editorial eyebrow label derivation.
//
// Translates the SNAKE_CASE governance vocabulary (doc.truth.sourceStatus and
// doc.identity.contentType) into a reader label. Explicit map for known
// classes; safe title-case fallback for unknown ones. Never emits SNAKE_CASE
// or a raw value into the DOM.

import type { ContentDocument } from "../contract/content-document";

const KNOWN_LABELS: Readonly<Record<string, string>> = {
  PRODUCT_PRINCIPLE: "Product principle",
  METHODOLOGY: "Methodology",
  MEASUREMENT_NOTE: "Measurement note",
  DATA_STUDY: "Data & studies",
  CHANGELOG: "What changed",
};

function titleCaseFromToken(token: string): string {
  const cleaned = token.replace(/_/g, " ").trim().toLowerCase();
  if (cleaned.length === 0) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function editorialEyebrowLabel(document: ContentDocument): string {
  const stampToken = document.truth.sourceStatus.split(":")[0] ?? "";
  if (stampToken && KNOWN_LABELS[stampToken]) return KNOWN_LABELS[stampToken];
  if (stampToken) return titleCaseFromToken(stampToken);
  const contentToken = (document.identity.contentType ?? "").toUpperCase();
  if (KNOWN_LABELS[contentToken]) return KNOWN_LABELS[contentToken];
  return titleCaseFromToken(document.identity.contentType ?? "");
}
