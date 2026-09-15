// A3 — deterministic LinkGraph v1.
//
// For each eligible document, compute a top-N set of related documents from existing signals:
//   - primaryTopicId / topicIds overlap
//   - capabilityIds overlap
//   - claimIds overlap
//   - evidenceRefs overlap
//   - audience / funnelStage compatibility (cannibalization penalty when identical)
//   - existing relationships.relatedContentIds (score boost)
//
// Constraints (mission phase 4):
//   * stable deterministic scoring — inputs → same tie-breakers → same order
//   * explainable score components
//   * NO LLM, NO network, NO invented similarity data
//   * a candidate that is not indexable (draft/review, wrong surface, uncertified authority)
//     MUST NOT appear as a public link target — the caller uses `indexableIds` for that.
//
// The output is a REPORT ONLY. Backlink updates are never automatically written.

import type { ContentDocument } from "../contract/content-document";

export interface LinkGraphScoreComponents {
  topic: number;
  capability: number;
  claim: number;
  evidence: number;
  audienceBonus: number;
  funnelBonus: number;
  explicitRelation: number;
  cannibalizationPenalty: number;
}

export interface RelatedItem {
  targetId: string;
  score: number;
  components: LinkGraphScoreComponents;
  reasons: readonly string[];
}

export interface LinkGraphEntry {
  sourceId: string;
  related: readonly RelatedItem[];
}

export interface ComputeLinkGraphInput {
  documents: readonly ContentDocument[];
  // ids of documents currently allowed to be public link targets. When absent, all
  // documents are considered indexable (used only for tests).
  indexableIds?: ReadonlySet<string>;
  topN?: number;
}

function jaccard(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const v of A) if (B.has(v)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function computeLinkGraph(input: ComputeLinkGraphInput): readonly LinkGraphEntry[] {
  const topN = input.topN ?? 5;
  const docs = input.documents;
  const indexable = input.indexableIds ?? null;

  const byId = new Map<string, ContentDocument>();
  for (const d of docs) byId.set(d.identity.documentId, d);

  const entries: LinkGraphEntry[] = [];
  for (const source of docs) {
    const sourceId = source.identity.documentId;
    const candidates: RelatedItem[] = [];
    for (const target of docs) {
      const targetId = target.identity.documentId;
      if (targetId === sourceId) continue;
      // Skip candidates that are not eligible to be public link targets.
      if (indexable && !indexable.has(targetId)) continue;
      // Never link across languages — a link is a public promise, and an English page must
      // not promise a French page.
      if (source.identity.language !== target.identity.language) continue;

      const topics = jaccard(source.editorial.topicIds, target.editorial.topicIds);
      const primaryMatch =
        source.editorial.primaryTopicId
        && source.editorial.primaryTopicId === target.editorial.primaryTopicId
          ? 0.25
          : 0;
      const capability = jaccard(source.truth.capabilityIds, target.truth.capabilityIds);
      const claim = jaccard(source.truth.claimIds, target.truth.claimIds);
      const evidence = jaccard(source.truth.evidenceRefs, target.truth.evidenceRefs);
      const audienceBonus =
        source.editorial.audience
        && source.editorial.audience === target.editorial.audience
          ? 0.05
          : 0;
      const funnelBonus =
        source.editorial.funnelStage
        && source.editorial.funnelStage === target.editorial.funnelStage
          ? 0.05
          : 0;
      const explicitRelation = source.relationships.relatedContentIds.includes(targetId)
        ? 0.5
        : 0;
      // Cannibalization penalty: identical target query is a hint the two pages fight for the
      // same intent; downweight, do not eliminate.
      const cannibalization =
        source.seo.targetQuery
        && source.seo.targetQuery === target.seo.targetQuery
          ? -0.2
          : 0;

      const components: LinkGraphScoreComponents = {
        topic: topics + primaryMatch,
        capability,
        claim,
        evidence,
        audienceBonus,
        funnelBonus,
        explicitRelation,
        cannibalizationPenalty: cannibalization,
      };
      const score =
        components.topic * 0.35
        + components.capability * 0.25
        + components.claim * 0.15
        + components.evidence * 0.15
        + components.audienceBonus
        + components.funnelBonus
        + components.explicitRelation
        + components.cannibalizationPenalty;

      const reasons: string[] = [];
      if (topics > 0) reasons.push(`topic overlap ${topics.toFixed(2)}`);
      if (primaryMatch > 0) reasons.push("shared primaryTopicId");
      if (capability > 0) reasons.push(`capability overlap ${capability.toFixed(2)}`);
      if (claim > 0) reasons.push(`claim overlap ${claim.toFixed(2)}`);
      if (evidence > 0) reasons.push(`evidence overlap ${evidence.toFixed(2)}`);
      if (explicitRelation > 0) reasons.push("explicit relationship");
      if (cannibalization !== 0) reasons.push("cannibalization penalty (same targetQuery)");

      if (score <= 0) continue;
      candidates.push({ targetId, score, components, reasons });
    }
    // Deterministic ordering: score desc, then targetId asc for stability.
    candidates.sort((a, b) => (b.score - a.score) || a.targetId.localeCompare(b.targetId));
    entries.push({ sourceId, related: candidates.slice(0, topN) });
  }
  return entries;
}

// -- BACKLINK_UPDATE_CANDIDATES -----------------------------------------------------------
//
// For each pairing (source → target) in the LinkGraph, the reciprocal update on `target` is
// a REPORT. It is never persisted; the caller reviews it manually.

export interface BacklinkCandidate {
  fromId: string;
  toId: string;
  reason: string;
}

export function computeBacklinkCandidates(
  graph: readonly LinkGraphEntry[],
): readonly BacklinkCandidate[] {
  const out: BacklinkCandidate[] = [];
  for (const entry of graph) {
    for (const rel of entry.related) {
      out.push({
        fromId: rel.targetId,
        toId: entry.sourceId,
        reason: `source ${entry.sourceId} lists ${rel.targetId} at score ${rel.score.toFixed(3)}`,
      });
    }
  }
  // Deterministic order.
  out.sort((a, b) => a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId));
  return out;
}
