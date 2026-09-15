// COMPOSER — provenance authority resolver.
//
// Git-backed source authority resolves against content/certified-lineage.json. Unknown SHAs
// fail closed: the composition MUST refuse to elevate a document above UNCERTIFIED without
// an explicit lineage entry. Git reachability, branch membership, recency, HEAD, or
// merge-base do not confer authority. Only the certified list does.

import certifiedLineageJson from "@/content/certified-lineage.json";

export type CertifiedAuthority = "CERTIFIED_MAIN" | "CERTIFIED_CANDIDATE";

export interface CertifiedLineageEntry {
  sha: string;
  authority: CertifiedAuthority;
  recordedBy: string;
  recordedAt: string;
}

const CERTIFIED: readonly CertifiedLineageEntry[] = (
  certifiedLineageJson as readonly CertifiedLineageEntry[]
).slice();

export function getCertifiedLineage(): readonly CertifiedLineageEntry[] {
  return CERTIFIED;
}

export type ResolveAuthorityInput =
  | { sourceSha?: undefined }
  | { sourceSha: string };

export type ResolveAuthorityResult =
  | { authority: "UNCERTIFIED"; reason: "no-source-sha" }
  | { authority: CertifiedAuthority; reason: "certified" }
  | { authority: "UNCERTIFIED"; reason: "unknown-source-sha"; failClosed: true };

/**
 * Resolve the authority of a document's Git provenance. When sourceSha is absent, provenance
 * is UNCERTIFIED and the resolver reports no-source-sha (this is the legitimate non-Git
 * producer path). When sourceSha is present but unknown to certified-lineage.json, the
 * resolver returns UNCERTIFIED with failClosed=true — the composition MUST reject any
 * request to treat that document as certified.
 */
export function resolveSourceAuthority(input: ResolveAuthorityInput): ResolveAuthorityResult {
  if (!input.sourceSha) {
    return { authority: "UNCERTIFIED", reason: "no-source-sha" };
  }
  const match = CERTIFIED.find((entry) => entry.sha === input.sourceSha);
  if (!match) {
    return { authority: "UNCERTIFIED", reason: "unknown-source-sha", failClosed: true };
  }
  return { authority: match.authority, reason: "certified" };
}
