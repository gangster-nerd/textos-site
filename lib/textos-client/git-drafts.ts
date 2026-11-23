// Git delivery client — the drafts TextOS deposited in this repository, checked WITHOUT TextOS.
//
// TextOS's governed Git delivery (`textos.write_git_delivery@1`) commits ONE JSON file per draft to
// a `textos/...` branch, under the path prefix the destination was qualified with. For this site
// that prefix is `textos/deliveries/`. TextOS never merges, never deploys and never publishes: a
// human reviews the branch and merges it. Once merged, this module is what makes the site render
// the draft — and only if every one of these holds:
//
//   - the file is `textos-git-draft@1`, with `publication: "not_requested"` and nothing else;
//   - the article is TextOS's PUBLIC projection (`textos-git-public-article@1`), with no internal
//     identifier at all (no UUID, no workspace/draft/brief/TruthCheck field): TruthCheck `pass`,
//     content contract `content-document@1`, `publication.status: "not_requested"`;
//   - the ContentDocument parses, is a draft, is `noindex`, and its evidence digest is the written
//     content hash TextOS recorded;
//   - the resolved surface TextOS reviewed is the same document: same id, slug, title, description
//     and language, `noindex`, no effective CTA, and exactly the document's blocks, in order;
//   - every capability the document names exists in the pinned product manifest, and none is in
//     beta or « bientôt » (ADR-034): `textos-git-draft@1` does not carry the early disclosure a CTC
//     note carries, so such a draft is refused rather than rendered without its label;
//   - the file name is the document's slug, and the bytes are exactly what TextOS writes
//     (`JSON.stringify(value) + "\n"`): a hand-edited file is refused, not silently re-read.
//
// A failing check throws: an invalid file fails the build instead of quietly rendering.
//
// Human review is a SEPARATE record, outside the delivery prefix: `textos/delivery-reviews/<slug>.json`.
// TextOS's Git destination can only write under `textos/deliveries/`, so it can never record its
// own review. Until a review naming a Person of the site's registry and the exact sha256 of the
// draft bytes is committed, the projected article is a draft: Preview only, noindex, no
// publication date. A review of other bytes fails the build (the draft changed after review).
//
// The site PROJECTS the document into its catalogue like a Commit-to-Content note: it fills
// site-owned metadata (authorship, topic, canonical path, vocabulary). It never changes a word.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import type { ContentDocument } from "@/lib/content-surface-engine/contract/content-document";
import { ContentDocumentSchema } from "@/lib/content-surface-engine/contract/content-document";
import { resolveReferenceEntity } from "@/lib/content-surface-engine/site-integration/authors";
import { earlyDisclosureOf } from "@/lib/content/early-disclosure";
import type { PublicationStatus } from "@/lib/product-manifest/status-axes";

export const GIT_DRAFT_SCHEMA = "textos-git-draft@1";
export const GIT_DRAFT_REVIEW_SCHEMA = "textos-site-git-draft-review@1";
export const GIT_DELIVERY_SOURCE_STATUS_PREFIX = "GIT_DELIVERY";
/** The qualified path prefix of this site's Git destination (relative to the repository root). */
export const GIT_DELIVERY_DIR = path.join("textos", "deliveries");
/** Human reviews live OUTSIDE the delivery prefix: TextOS cannot write them. */
export const GIT_DELIVERY_REVIEW_DIR = path.join("textos", "delivery-reviews");

/**
 * Site-owned metadata for deposited drafts (TextOS writes the text; the site owns the frame), the
 * same convention as the Commit-to-Content briefs. A draft carries NO date: the deposited file has
 * none, and the site does not invent one. The human review's date is the first date it gets.
 */
const SITE_AUTHOR_IDS = ["marc-prempain"] as const;
const SITE_TOPIC_ID = "how-we-build";

/**
 * The PUBLIC article TextOS deposits (`textos-git-public-article@1`, textos-v0 `git-public-article.ts`): the
 * governed projection WITHOUT any internal identifier (Release Owner decision of 23/11/2026). No workspace,
 * draft, brief or TruthCheck id; the document id is `textos-<slug>` and each cited source is `source-<n>`.
 */
interface HeadlessArticle {
  schemaVersion: "textos-git-public-article@1";
  locale: string;
  source: { writerMethodVersion: string; structuredContentHash: string };
  truthCheck: { verdict: string };
  contentContract: { version: string; fingerprint: string };
  contentDocument: unknown;
  resolvedSurface: ResolvedSurfaceRecord;
  publication: { status: string };
}

interface ResolvedSurfaceRecord {
  resolvedSchemaVersion: string;
  documentId: string;
  language: string;
  slug: string;
  title: string;
  description: string;
  metadata: { effectiveIndexing: string };
  conversion: { effectiveCtaAllowed: boolean };
  blocks: { block: unknown }[];
}

export interface GitDraftReview {
  schemaVersion: typeof GIT_DRAFT_REVIEW_SCHEMA;
  slug: string;
  /** sha256 of the exact draft file bytes the reviewer read. */
  draftSha256: string;
  /** A Person of the site's entity registry. */
  reviewer: string;
  reviewedOn: string;
}

export interface GitDraft {
  file: string;
  sha256: string;
  article: HeadlessArticle;
  /** TextOS's document, exactly as deposited. */
  writerDocument: ContentDocument;
  review: GitDraftReview | null;
  /** The site projection rendered under /insights. */
  document: ContentDocument;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** Key-order-independent JSON, the way TextOS hashes its own projections. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
const keysAre = (v: Record<string, unknown>, keys: readonly string[]) =>
  canonical(Object.keys(v).sort()) === canonical([...keys].sort());

/** Every reason (empty = none) this deposited file may not be surfaced. Pure: reads only `bytes`. */
export function verifyGitDraft(input: {
  file: string;
  bytes: string;
  manifestEntityIds: ReadonlySet<string>;
  /** Publication status at the pinned manifest (ADR-034); absent = no early-disclosure capability. */
  manifestStatuses?: ReadonlyMap<string, PublicationStatus>;
}): string[] {
  const { file, bytes } = input;
  let value: unknown;
  try {
    value = JSON.parse(bytes);
  } catch {
    return ["is not JSON"];
  }
  if (!isRecord(value)) return ["is not a JSON object"];
  const issues: string[] = [];
  if (bytes !== `${JSON.stringify(value)}\n`) issues.push("bytes are not the exact bytes TextOS writes (hand-edited or re-formatted)");
  if (!keysAre(value, ["schemaVersion", "article", "publication"])) issues.push("top-level keys are not exactly schemaVersion, article, publication");
  if (value.schemaVersion !== GIT_DRAFT_SCHEMA) issues.push(`schemaVersion is ${String(value.schemaVersion)}, expected ${GIT_DRAFT_SCHEMA}`);
  if (value.publication !== "not_requested") issues.push("publication is not \"not_requested\"");
  const a = value.article;
  if (!isRecord(a)) return [...issues, "article is not an object"];
  const article = a as unknown as HeadlessArticle;
  if (article.schemaVersion !== "textos-git-public-article@1") issues.push(`article schema is ${String(article.schemaVersion)}`);
  // Decision of 23/11/2026: no internal identifier may reach this public repository or the site.
  if (UUID.test(bytes)) issues.push("carries an internal identifier (UUID)");
  for (const key of ["workspaceId", "contentDraftId", "briefId", "truthCheckId"]) {
    if (bytes.includes(`"${key}"`)) issues.push(`carries the internal identifier field ${key}`);
  }
  if (!isRecord(article.publication) || article.publication.status !== "not_requested") issues.push("article publication status is not not_requested");
  if (!isRecord(article.truthCheck) || article.truthCheck.verdict !== "pass") issues.push("TruthCheck verdict is not pass");
  if (!isRecord(article.contentContract) || article.contentContract.version !== "content-document@1") issues.push("content contract is not content-document@1");
  if (!isRecord(article.source) || !/^[0-9a-f]{64}$/.test(String(article.source.structuredContentHash))) issues.push("source has no written content hash");

  const parsed = ContentDocumentSchema.safeParse(article.contentDocument);
  if (!parsed.success) return [...issues, `ContentDocument is invalid: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`];
  const doc = parsed.data as ContentDocument;
  if (`${doc.identity.slug}.json` !== path.basename(file)) issues.push(`file name is not the document slug ${doc.identity.slug}`);
  if (doc.truth.publicationStatus !== "draft") issues.push(`document publication status is ${doc.truth.publicationStatus}, a deposit is always a draft`);
  if (doc.seo.indexingIntent !== "noindex") issues.push("document is not noindex");
  if (isRecord(article.source) && doc.provenance.sourceEvidenceDigest !== article.source.structuredContentHash) {
    issues.push("document evidence digest is not the written content hash");
  }
  if (doc.identity.language !== article.locale) issues.push("document language is not the delivery locale");

  const s = article.resolvedSurface;
  if (!isRecord(s)) return [...issues, "resolved surface is missing"];
  if (s.resolvedSchemaVersion !== "resolved-content-surface@1") issues.push("resolved surface schema is not resolved-content-surface@1");
  if (s.documentId !== doc.identity.documentId || s.slug !== doc.identity.slug || s.title !== doc.identity.title ||
      s.description !== doc.identity.description || s.language !== doc.identity.language) {
    issues.push("resolved surface does not describe this document");
  }
  if (!isRecord(s.metadata) || s.metadata.effectiveIndexing !== "noindex") issues.push("resolved surface is not noindex");
  if (!isRecord(s.conversion) || s.conversion.effectiveCtaAllowed !== false) issues.push("resolved surface allows a CTA");
  if (!Array.isArray(s.blocks) || canonical(s.blocks.map((b) => (isRecord(b) ? b.block : null))) !== canonical(doc.body)) {
    issues.push("resolved surface blocks are not exactly the document's blocks");
  }
  for (const id of doc.truth.capabilityIds) {
    if (!input.manifestEntityIds.has(id)) issues.push(`capability ${id} is not in the pinned product manifest`);
    else if (earlyDisclosureOf(id, input.manifestStatuses?.get(id) ?? "internal_only")) {
      issues.push(`capability ${id} needs an early disclosure (ADR-034), which a deposited draft does not carry`);
    }
  }
  return issues;
}

/** Every reason (empty = none) a committed review may not publish the draft. */
export function verifyGitDraftReview(review: unknown, draft: { slug: string; sha256: string }): string[] {
  if (!isRecord(review)) return ["review is not an object"];
  const issues: string[] = [];
  if (!keysAre(review, ["schemaVersion", "slug", "draftSha256", "reviewer", "reviewedOn"])) issues.push("review keys are not exactly schemaVersion, slug, draftSha256, reviewer, reviewedOn");
  if (review.schemaVersion !== GIT_DRAFT_REVIEW_SCHEMA) issues.push(`review schema is ${String(review.schemaVersion)}`);
  if (review.slug !== draft.slug) issues.push(`review names slug ${String(review.slug)}`);
  if (review.draftSha256 !== draft.sha256) issues.push("review was given on other bytes: the draft changed after review");
  const reviewer = typeof review.reviewer === "string" ? resolveReferenceEntity(review.reviewer) : null;
  if (!reviewer || reviewer.entityType !== "Person") issues.push("reviewer is not a Person of the site's registry");
  if (typeof review.reviewedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedOn)) issues.push("reviewedOn is not YYYY-MM-DD");
  return issues;
}

/** Pure projection: deposited document (+ optional human review) → the document the site renders. */
export function projectGitDraft(writerDocument: ContentDocument, review: GitDraftReview | null): ContentDocument {
  const published = review !== null;
  const status = published ? "published" : "draft";
  const slug = writerDocument.identity.slug;
  return ContentDocumentSchema.parse({
    contentSchemaVersion: writerDocument.contentSchemaVersion,
    identity: { ...writerDocument.identity, contentType: "product_article" },
    editorial: {
      authorIds: [...SITE_AUTHOR_IDS],
      reviewerIds: published ? [review.reviewer] : [],
      primaryTopicId: SITE_TOPIC_ID,
      topicIds: [SITE_TOPIC_ID],
      ...(writerDocument.editorial.audience ? { audience: writerDocument.editorial.audience } : {}),
      ...(writerDocument.editorial.funnelStage ? { funnelStage: writerDocument.editorial.funnelStage } : {}),
    },
    truth: {
      ...writerDocument.truth,
      statusVocabulary: "textos-site.git-delivery",
      statusVocabularyVersion: "v1",
      sourceStatus: `${GIT_DELIVERY_SOURCE_STATUS_PREFIX}:${writerDocument.truth.sourceStatus}:${status}`,
      publicationStatus: status,
      claimIds: writerDocument.truth.claimIds.map((id) => `${slug}/${id}`),
      evidenceRefs: writerDocument.truth.evidenceRefs.map((id) => `${slug}/${id}`),
    },
    provenance: writerDocument.provenance,
    body: writerDocument.body,
    relationships: { relatedContentIds: [] },
    conversion: { conversionAllowed: false },
    lifecycle: published
      ? { firstPublishedAt: review.reviewedOn, publishedAt: review.reviewedOn, updatedAt: review.reviewedOn, lastReviewedAt: review.reviewedOn, revisionNumber: 0 }
      : { firstPublishedAt: null, revisionNumber: 0 },
    seo: {
      indexingIntent: published ? "index" : "noindex",
      canonicalPath: `/insights/${slug}`,
      schemaType: "TechArticle",
      ...(writerDocument.seo.targetQuery ? { targetQuery: writerDocument.seo.targetQuery } : {}),
      ...(writerDocument.seo.searchIntent ? { searchIntent: writerDocument.seo.searchIntent } : {}),
    },
  }) as ContentDocument;
}

function listJson(dir: string, label: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).sort().map((name) => {
    const full = path.join(dir, name);
    if (!statSync(full).isFile() || !name.endsWith(".json")) {
      throw new Error(`textos-client: ${label}/${name} is not a JSON file — only <slug>.json files belong here.`);
    }
    return full;
  });
}

let cache: readonly GitDraft[] | null = null;

/** Verified, projected Git drafts. Throws on the first file that does not check. */
export function loadGitDrafts(root: string = process.cwd()): readonly GitDraft[] {
  if (cache && root === process.cwd()) return cache;
  const manifest = JSON.parse(readFileSync(path.join(root, "product-manifest", "textos-v0.capability-manifest.json"), "utf8")) as {
    entities: { id: string; publicationStatus: PublicationStatus }[];
  };
  const manifestEntityIds = new Set(manifest.entities.map((e) => e.id));
  const manifestStatuses = new Map(manifest.entities.map((e) => [e.id, e.publicationStatus]));
  const reviewFiles = new Map(listJson(path.join(root, GIT_DELIVERY_REVIEW_DIR), "textos/delivery-reviews").map((f) => [path.basename(f), f]));

  const drafts = listJson(path.join(root, GIT_DELIVERY_DIR), "textos/deliveries").map((file) => {
    const bytes = readFileSync(file, "utf8");
    const issues = verifyGitDraft({ file, bytes, manifestEntityIds, manifestStatuses });
    if (issues.length > 0) throw new Error(`textos-client: deposited draft ${path.basename(file)} refused:\n  - ${issues.join("\n  - ")}`);
    const article = (JSON.parse(bytes) as { article: HeadlessArticle }).article;
    const writerDocument = ContentDocumentSchema.parse(article.contentDocument) as ContentDocument;
    const digest = sha256(bytes);
    const reviewFile = reviewFiles.get(path.basename(file));
    reviewFiles.delete(path.basename(file));
    let review: GitDraftReview | null = null;
    if (reviewFile) {
      const raw = JSON.parse(readFileSync(reviewFile, "utf8")) as unknown;
      const reviewIssues = verifyGitDraftReview(raw, { slug: writerDocument.identity.slug, sha256: digest });
      if (reviewIssues.length > 0) throw new Error(`textos-client: review ${path.basename(reviewFile)} refused:\n  - ${reviewIssues.join("\n  - ")}`);
      review = raw as GitDraftReview;
    }
    return { file, sha256: digest, article, writerDocument, review, document: projectGitDraft(writerDocument, review) };
  });
  if (reviewFiles.size > 0) throw new Error(`textos-client: review without a deposited draft: ${[...reviewFiles.keys()].join(", ")}.`);
  if (root === process.cwd()) cache = drafts;
  return drafts;
}
