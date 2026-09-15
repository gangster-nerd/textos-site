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

export interface IssuedReferencePublicationReceipt {
  status: "ISSUED";
  contentDocumentId: string;
  contentRevision: string;
  contentSchemaVersion: string;
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
  | "indexability-not-approved";

export interface NotIssuedReferencePublicationReceipt {
  status: "NOT_ISSUED";
  contentDocumentId: string;
  contentRevision: string;
  contentSchemaVersion: string;
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
  surfacePolicyVersion: string;
  renderVersion: string;
  sourceSha?: string | null;
  sourceEvidenceDigest?: string | null;
  builtPath: string;
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

  const base = {
    contentDocumentId: input.contentDocumentId,
    contentRevision: input.contentRevision,
    contentSchemaVersion: input.contentSchemaVersion,
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
