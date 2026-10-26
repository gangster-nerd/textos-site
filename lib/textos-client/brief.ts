// textos-site editorial brief — the site-owned input a TextOS Commit-to-Content run is prepared
// from (`textos/briefs/<articleId>.json`). A brief is the CMO decision, written down: which buyer
// question, why now (the source commits), what evidence may be used, who approved that evidence and
// under what authority, and the slot plan the TextOS writer must fill. It is data, reviewed in the
// diff; nothing in it is generated.
//
// Same contract as the ShortsOS client brief (shortsos-site src/lib/textos/brief.ts), restricted to
// the one flow this site runs today: commit_to_content.

export const ARTICLE_FLOWS = ["commit_to_content"] as const;
export type ArticleFlow = (typeof ARTICLE_FLOWS)[number];

/** Which client surface policy (textos/client/surface-policy.json) each flow resolves against. */
export const FLOW_SURFACE_POLICY: Record<ArticleFlow, string> = {
  commit_to_content: "how_we_build",
};

export type BriefEvidenceSource =
  /** A quote from a product commit message; the commit must be in the history of the product pin. */
  | { kind: "product_commit"; sha: string; quote: string }
  /** A quote from a file of textos-v0, read at exactly the product pin. */
  | { kind: "product_file"; path: string; quote: string }
  /** A quote from a field of the pinned product manifest (product-manifest/). */
  | { kind: "manifest_field"; entityId: string; field: "prohibitedClaims" | "knownLimits"; quote: string };

export interface BriefEvidence {
  id: string;
  source: BriefEvidenceSource;
  claimTypes: string[];
  maxSupportStrength: "descriptive" | "comparative" | "causal" | "quantified";
  limitations: string[];
}

export interface BriefSlot {
  id: string;
  role: "title" | "meta_description" | "lead" | "section" | "answer" | "caption" | "call_to_action";
  blockKind: "single_line" | "paragraph" | "multi_paragraph";
  headingLevel: 2 | 3 | null;
  heading: string | null;
  writingObjective: string;
  buyerIntent: string | null;
  allowedEvidenceIds: string[];
  requiredClaimTypes: string[];
  unsupportedClaimTypes: string[];
  minChars: number;
  maxChars: number;
  evidenceRequired: boolean;
}

/** Site-owned editorial metadata — never text: who signs, where the page files, when. */
export interface BriefSiteEditorial {
  authorIds: string[];
  primaryTopicId: string;
  topicIds: string[];
  audience: string;
  funnelStage: string;
}

/** Publication record kept by the site, not by TextOS: per-article human review. Until it is
 *  `done`, the article is a draft: Preview only, noindex, never in Production. */
export interface BriefPublication {
  humanReview: { status: "pending" | "done"; reviewer: string | null; reviewedOn: string | null };
}

export interface ArticleBrief {
  briefVersion: 1;
  articleId: string;
  flow: ArticleFlow;
  slug: string;
  locale: string;
  publicationChannel: "controlled_preview" | "public_web";
  /** Product-manifest entities this article mentions — each must exist in the pinned manifest. */
  entityIds: string[];
  /** Provenance for the TextOS CTC seam; `canonicalProductSha` is filled from the product pin. */
  provenance: {
    ctcSourceGroups: { groupId: string; sourceCommits: string[] }[];
    buyerQuestion: string;
    targetQuery: string;
    targetQueryProvenance: "HUMAN_CMO";
    demandEvidenceStatus: "NOT_MEASURED";
    demandEvidenceRefs: string[];
    keywordVolumeStatus: "UNKNOWN";
    searchIntent: string;
    topicCluster: string;
  };
  approval: { approvedBy: string; approvedAt: string };
  editorial: BriefSiteEditorial;
  publication: BriefPublication;
  evidence: BriefEvidence[];
  slots: BriefSlot[];
}

/** File name a slot's prompt/response is stored under (slot ids are plain identifiers). */
export function promptFileName(slotId: string): string {
  return `${slotId}.md`;
}

export function responseFileName(slotId: string): string {
  return `${slotId}.json`;
}

/** Block id of the section heading the site places above a slot's text. */
export function headingBlockId(slotId: string): string {
  return `${slotId}--heading`;
}

/** Block id of the n-th (1-based, n ≥ 2) paragraph of a multi-paragraph slot. */
export function paragraphBlockId(slotId: string, n: number): string {
  return n === 1 ? slotId : `${slotId}--p${n}`;
}
