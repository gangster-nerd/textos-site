// PR21-FINAL-RELEASE-GATE §2 — decouple draft visibility from indexing.
//
// P0 release safety : `siteConfig.allowIndexing` MUST govern indexing ONLY.
// It must never leak into "should this reader see draft editorial content".
// Otherwise a Production deployment with `allowIndexing=false` (temporary
// depinning, robots.txt maintenance, etc.) would suddenly expose every
// unpublished draft — a data-integrity failure, not a search-visibility one.
//
// The correct visibility axis is EDITORIAL PREVIEW MODE. It is a POSITIVE
// authorisation : the caller must explicitly opt in. Nothing is inferred from
// the absence of indexing.
//
// Authorised sources (positive) :
//   1. `VERCEL_ENV === "preview"` — every Vercel PR-Preview deployment is a
//      legitimate editorial-review surface. Vercel injects this at build time
//      for every non-Production deploy.
//   2. `CONTENT_PREVIEW_MODE === "true"` — an explicit local flag for editorial
//      review outside Vercel Preview (e.g., running `pnpm dev` while doing a
//      pre-review pass).
//
// Explicitly REJECTED sources (never confer visibility) :
//   - `siteConfig.allowIndexing === false`
//   - `PUBLIC_INDEXABLE_BUILD === "false"`
//   - `PUBLIC_ORIGIN_APPROVED === "false"`
//   - provisional origin alone
//
// Configuration error : `VERCEL_ENV === "production" && CONTENT_PREVIEW_MODE ===
// "true"` — a Production deployment can NEVER be an editorial preview. This
// combination fails the build.

export type PreviewVisibilityMode =
  | "PRODUCTION"
  | "VERCEL_PREVIEW"
  | "EXPLICIT_LOCAL_PREVIEW"
  | "DEFAULT_HIDDEN";

export interface PreviewVisibilityDecision {
  mode: PreviewVisibilityMode;
  showDraftContent: boolean;
  /** Human-readable rationale for logs / debug endpoints. */
  reason: string;
}

export interface PreviewVisibilityInput {
  env: Readonly<Record<string, string | undefined>>;
}

/**
 * Compute the visibility decision from the environment map. Pure ; callers pass
 * `process.env` at boot time or a synthetic env in tests.
 */
export function computePreviewVisibility(
  input: PreviewVisibilityInput,
): PreviewVisibilityDecision {
  const env = input.env;
  const vercelEnv = env.VERCEL_ENV;
  const explicit = env.CONTENT_PREVIEW_MODE;

  // Hard configuration error : Production + explicit editorial preview.
  if (vercelEnv === "production" && explicit === "true") {
    throw new Error(
      "preview-visibility: CONTENT_PREVIEW_MODE=true is forbidden in Production " +
        "(VERCEL_ENV=production). Editorial preview may not run against the public " +
        "surface. Remove one of the two.",
    );
  }

  if (vercelEnv === "production") {
    return {
      mode: "PRODUCTION",
      showDraftContent: false,
      reason: "VERCEL_ENV=production",
    };
  }

  if (vercelEnv === "preview") {
    return {
      mode: "VERCEL_PREVIEW",
      showDraftContent: true,
      reason: "VERCEL_ENV=preview",
    };
  }

  if (explicit === "true") {
    return {
      mode: "EXPLICIT_LOCAL_PREVIEW",
      showDraftContent: true,
      reason: "CONTENT_PREVIEW_MODE=true",
    };
  }

  return {
    mode: "DEFAULT_HIDDEN",
    showDraftContent: false,
    reason: "no positive preview authorisation",
  };
}

/**
 * Build-time singleton used by the routes. Reads `process.env` once ; a bad
 * combination throws at module load so Next.js prints the configuration error
 * during build instead of silently deploying an unsafe binary.
 */
export const previewVisibility: PreviewVisibilityDecision =
  computePreviewVisibility({ env: process.env });
