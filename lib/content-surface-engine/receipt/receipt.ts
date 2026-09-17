// A3 — ReferencePublicationReceipt.
//
// Records the facts of a REAL publication event. When authoritative build/deployment context
// is not available (local A3 execution, dry runs, tests) the factory returns a NOT_ISSUED
// receipt with a machine-readable reason. It NEVER fabricates deploymentId, mergeSha,
// canonicalUrl, or publishedAt.
//
// The runtime-context adapter examined the site's existing conventions:
//   - `SITE_ORIGIN` / `VERCEL_URL` — origin selection (lib/config/site.ts).
//   - `PUBLIC_ORIGIN_APPROVED` / `PUBLIC_INDEXABLE_BUILD` — the double-lock indexability
//     gate.
//   - `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_DEPLOYMENT_ID` — the
//     Vercel-provided runtime identifiers (only present at deploy time).
//   - Static export (`output: "export"`) means built HTML lives under `out/…` — the
//     canonicalUrl of an issued receipt is derived from `SITE_ORIGIN` when the double lock
//     is satisfied. When it isn't, no canonicalUrl is issued.
//
// The factory is pure w.r.t. its `env` argument; tests pass a fake env, callers pass
// process.env.

export const REFERENCE_RENDER_MODE = "REFERENCE" as const;

/**
 * A3R §§9–10 — every receipt now carries the SEALED contract fingerprint
 * (content-document@1 was recut without a version-label change during A1R ;
 * the fingerprint is the only unambiguous binding), and every ISSUED receipt
 * requires a matching `IndexableDecision` for the specific document.
 */
export interface IndexableDecisionRef {
  documentId: string;
  indexable: boolean;
}

export interface IssuedReferencePublicationReceipt {
  status: "ISSUED";
  contentDocumentId: string;
  contentRevision: string;
  contentSchemaVersion: string;
  contentContractFingerprint: string;
  surfacePolicyVersion: string;
  renderVersion: string;
  sourceSha: string | null;
  sourceEvidenceDigest: string | null;
  renderMode: typeof REFERENCE_RENDER_MODE;
  mergeSha: string;
  deploymentId: string;
  builtPath: string;
  canonicalUrl: string;
  publishedAt: string;
}

export type NotIssuedReason =
  | "no-merge-sha"
  | "no-deployment-id"
  | "no-canonical-origin"
  | "not-indexable-build"
  | "indexability-not-approved"
  | "indexability-gate-failed"
  | "indexability-decision-missing"
  | "indexability-decision-document-mismatch";

export interface NotIssuedReferencePublicationReceipt {
  status: "NOT_ISSUED";
  contentDocumentId: string;
  contentRevision: string;
  contentSchemaVersion: string;
  contentContractFingerprint: string;
  surfacePolicyVersion: string;
  renderVersion: string;
  sourceSha: string | null;
  sourceEvidenceDigest: string | null;
  renderMode: typeof REFERENCE_RENDER_MODE;
  builtPath: string;
  reasons: readonly NotIssuedReason[];
}

export type ReferencePublicationReceipt =
  | IssuedReferencePublicationReceipt
  | NotIssuedReferencePublicationReceipt;

export interface ReceiptInput {
  contentDocumentId: string;
  contentRevision: string;
  contentSchemaVersion: string;
  /** A3R §9 — sha256 of the exported contracts/content-document@1.schema.json. */
  contentContractFingerprint: string;
  surfacePolicyVersion: string;
  renderVersion: string;
  sourceSha?: string | null;
  sourceEvidenceDigest?: string | null;
  builtPath: string;
  /**
   * A3R §10 — the concrete four-gate INDEXABLE decision for THIS document.
   * A receipt cannot be ISSUED unless the decision reports `indexable: true`
   * and its `documentId` matches `contentDocumentId`. When absent, receipt
   * fails closed with `indexability-decision-missing`.
   */
  indexableDecision?: IndexableDecisionRef;
  // Runtime environment (typically process.env). All keys optional.
  env: Readonly<Record<string, string | undefined>>;
  // Deterministic `now` for tests; real callers omit.
  now?: () => Date;
}

export function issueReferencePublicationReceipt(
  input: ReceiptInput,
): ReferencePublicationReceipt {
  const env = input.env;
  const mergeSha = env.VERCEL_GIT_COMMIT_SHA;
  const deploymentId = env.VERCEL_DEPLOYMENT_ID;
  const originApproved = env.PUBLIC_ORIGIN_APPROVED === "true";
  const indexableBuild = env.PUBLIC_INDEXABLE_BUILD === "true";
  const origin = env.SITE_ORIGIN
    ?? (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined);

  const reasons: NotIssuedReason[] = [];
  if (!mergeSha) reasons.push("no-merge-sha");
  if (!deploymentId) reasons.push("no-deployment-id");
  if (!origin) reasons.push("no-canonical-origin");
  if (!indexableBuild) reasons.push("not-indexable-build");
  if (!originApproved) reasons.push("indexability-not-approved");

  // A3R §10 — indexability binding.
  if (!input.indexableDecision) {
    reasons.push("indexability-decision-missing");
  } else if (input.indexableDecision.documentId !== input.contentDocumentId) {
    reasons.push("indexability-decision-document-mismatch");
  } else if (!input.indexableDecision.indexable) {
    reasons.push("indexability-gate-failed");
  }

  const base = {
    contentDocumentId: input.contentDocumentId,
    contentRevision: input.contentRevision,
    contentSchemaVersion: input.contentSchemaVersion,
    contentContractFingerprint: input.contentContractFingerprint,
    surfacePolicyVersion: input.surfacePolicyVersion,
    renderVersion: input.renderVersion,
    sourceSha: input.sourceSha ?? null,
    sourceEvidenceDigest: input.sourceEvidenceDigest ?? null,
    renderMode: REFERENCE_RENDER_MODE,
    builtPath: input.builtPath,
  };

  if (reasons.length > 0) {
    return { status: "NOT_ISSUED", ...base, reasons };
  }

  const nowFn = input.now ?? (() => new Date());
  const canonicalUrl = origin!.replace(/\/$/, "") + input.builtPath;
  return {
    status: "ISSUED",
    ...base,
    mergeSha: mergeSha!,
    deploymentId: deploymentId!,
    canonicalUrl,
    publishedAt: nowFn().toISOString(),
  };
}
