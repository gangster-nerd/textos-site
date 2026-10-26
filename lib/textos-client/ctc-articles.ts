// Commit-to-Content client — the articles TextOS wrote for this site, checked WITHOUT TextOS.
//
// A run under textos/runs/<articleId>/ is what `pnpm textos write` packaged at the pinned TextOS
// SHA (see textos/README.md). At build time nothing of TextOS is available, so this module refuses
// to surface an article unless every one of these holds:
//
//   - the receipt names the pinned writer SHA and the pinned product SHA (textos/tool.json);
//   - TextOS's TruthCheck verdict is `pass`, in the receipt AND in the committed lineage;
//   - the slot provider declares what it is: an operator transport never claims an API model;
//   - the committed ContentDocument, lineage, resolved surface, execution plan and every operator
//     response hash-match the receipt;
//   - every text block of the document is the writer's own slot text, verbatim;
//   - every cited commit is in the commit ledger, and the ledger holds nothing else;
//   - every product entity the brief names exists in the pinned product manifest.
//
// A failing check throws: a broken run fails the build instead of quietly rendering.
//
// The site then PROJECTS the writer's document into its own catalogue: it adds the section
// headings the brief's plan fixed (they are part of the hashed execution plan), splits a
// multi-paragraph slot into paragraph blocks, and fills site-owned metadata (authors, topic,
// canonical path). It never changes a word the writer wrote. Its claimIds are the statements the
// writer declared and TextOS's TruthCheck checked, namespaced by article; they are not entries of
// the site's claims registry. Until the brief records a human review, the projected article is a
// draft: Preview only, noindex, and the page emits no publication date (lifecycle dates carry the
// editorial approval date of the draft, which CONTENT_PASS requires and the route ignores).

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { ContentBlock, ContentDocument } from "@/lib/content-surface-engine/contract/content-document";
import { ContentDocumentSchema } from "@/lib/content-surface-engine/contract/content-document";

import { headingBlockId, paragraphBlockId, responseFileName, type ArticleBrief } from "./brief";
import { collectCitations, ledgerIssues, type ProductCommitLedger } from "./commit-ledger";

export const CTC_SOURCE_STATUS_PREFIX = "COMMIT_TO_CONTENT";
const OPERATOR_PROVIDER_PREFIX = "operator:";

interface ToolRecord {
  repository: string;
  writer: { sha: string };
  product: { sha: string };
}

interface Receipt {
  articleId: string;
  textos: { repository: string; sha: string };
  executionPlanHash: string;
  slotProviderMethodVersion: string;
  derivationIdentity: string;
  structuredContentHash: string;
  truthCheckVerdict: string;
  canonicalProductSha: string;
  promptHashes: Record<string, string>;
  responseHashes: Record<string, string>;
  contentDocumentSha256: string;
  lineageSha256: string;
  resolvedSurfaceSha256: string;
}

interface WrittenSlotRecord {
  slotId: string;
  role: string;
  headingLevel: 2 | 3 | null;
  heading: string | null;
  text: string;
  statementIds: string[];
}

interface Lineage {
  slotProvenance: WrittenSlotRecord[];
  slotProviderMethodVersion: string;
  derivationIdentity: string;
  structuredContentHash: string;
  truthCheck: { verdict: string };
  canonicalProductSha: string;
}

export interface CtcArticle {
  brief: ArticleBrief;
  receipt: Receipt;
  /** The writer's document, exactly as committed. */
  writerDocument: ContentDocument;
  /** The site projection rendered under /insights. */
  document: ContentDocument;
}

const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

function textosDir(root: string): string {
  return path.join(root, "textos");
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function readText(file: string): string {
  return readFileSync(file, "utf8");
}

export function loadBriefs(root: string = process.cwd()): ArticleBrief[] {
  const dir = path.join(textosDir(root), "briefs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const brief = readJson<ArticleBrief>(path.join(dir, f));
      if (`${brief.articleId}.json` !== f) throw new Error(`textos-client: ${f} declares articleId ${brief.articleId}.`);
      return brief;
    });
}

export function loadToolRecord(root: string = process.cwd()): ToolRecord {
  return readJson<ToolRecord>(path.join(textosDir(root), "tool.json"));
}

export function loadLedger(root: string = process.cwd()): ProductCommitLedger | null {
  const file = path.join(textosDir(root), "ledger", "product-commits.json");
  return existsSync(file) ? readJson<ProductCommitLedger>(file) : null;
}

/**
 * Pure projection: writer document + lineage + brief → the document the site renders. Throws if
 * a block of the writer's document is not the writer's own slot text.
 */
export function projectCtcDocument(input: {
  brief: ArticleBrief;
  writerDocument: ContentDocument;
  lineage: Pick<Lineage, "slotProvenance">;
}): ContentDocument {
  const { brief, writerDocument, lineage } = input;
  const slots = new Map(lineage.slotProvenance.map((s) => [s.slotId, s]));
  const body: ContentBlock[] = [];
  for (const block of writerDocument.body) {
    const slot = slots.get(block.id);
    if (!slot) throw new Error(`textos-client: ${brief.articleId} block ${block.id} has no written slot in the lineage.`);
    if (block.data.text !== slot.text) {
      throw new Error(`textos-client: ${brief.articleId} block ${block.id} is not the writer's slot text.`);
    }
    if (slot.heading && slot.headingLevel) {
      body.push({ id: headingBlockId(slot.slotId), kind: "heading", level: slot.headingLevel, data: { text: slot.heading } });
    }
    if (block.kind === "paragraph") {
      slot.text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .forEach((p, i) => body.push({ id: paragraphBlockId(slot.slotId, i + 1), kind: "paragraph", data: { text: p } }));
    } else {
      body.push({ id: block.id, kind: block.kind, data: { text: slot.text } });
    }
  }

  const review = brief.publication.humanReview;
  const published = review.status === "done" && review.reviewer !== null && review.reviewedOn !== null;
  const status = published ? "published" : "draft";
  return ContentDocumentSchema.parse({
    contentSchemaVersion: writerDocument.contentSchemaVersion,
    identity: { ...writerDocument.identity, contentType: "product_article" },
    editorial: {
      authorIds: brief.editorial.authorIds,
      reviewerIds: published ? [review.reviewer] : [],
      primaryTopicId: brief.editorial.primaryTopicId,
      topicIds: brief.editorial.topicIds,
      audience: brief.editorial.audience,
      funnelStage: brief.editorial.funnelStage,
    },
    truth: {
      ...writerDocument.truth,
      statusVocabulary: "textos-site.commit-to-content",
      statusVocabularyVersion: "v1",
      sourceStatus: `${CTC_SOURCE_STATUS_PREFIX}:${writerDocument.truth.sourceStatus}:${status}`,
      publicationStatus: status,
      claimIds: lineage.slotProvenance.flatMap((slot) => slot.statementIds.map((id) => `${brief.articleId}/${id}`)),
      evidenceRefs: writerDocument.truth.evidenceRefs.map((id) => `${brief.articleId}/${id}`),
    },
    provenance: { ...writerDocument.provenance, sourceRepository: "gangster-nerd/textos-v0" },
    body,
    relationships: { relatedContentIds: brief.editorial.relatedDocumentIds ?? [] },
    conversion: { conversionAllowed: false },
    lifecycle: published
      ? { firstPublishedAt: review.reviewedOn, publishedAt: review.reviewedOn, lastReviewedAt: review.reviewedOn, revisionNumber: 0 }
      : { firstPublishedAt: null, publishedAt: brief.approval.approvedAt, updatedAt: brief.approval.approvedAt, revisionNumber: 0 },
    seo: {
      indexingIntent: published ? "index" : "noindex",
      canonicalPath: `/insights/${brief.slug}`,
      schemaType: "TechArticle",
      targetQuery: brief.provenance.targetQuery,
      searchIntent: brief.provenance.searchIntent,
    },
  }) as ContentDocument;
}

/** Every reason (empty = none) this run may not be surfaced. Reads only committed files. */
export function verifyCtcRun(input: {
  root: string;
  brief: ArticleBrief;
  tool: ToolRecord;
  manifestEntityIds: ReadonlySet<string>;
}): string[] {
  const { root, brief, tool, manifestEntityIds } = input;
  const runDir = path.join(textosDir(root), "runs", brief.articleId);
  const issues: string[] = [];
  const file = (name: string) => path.join(runDir, name);
  for (const name of ["receipt.json", "content-document.json", "lineage.json", "resolved-surface.json", "adapt.json"]) {
    if (!existsSync(file(name))) issues.push(`missing ${name}`);
  }
  if (issues.length > 0) return issues;

  const receipt = readJson<Receipt>(file("receipt.json"));
  const lineage = readJson<Lineage>(file("lineage.json"));
  const adapt = readJson<{ executionPlanHash: string; promptHashes: Record<string, string> }>(file("adapt.json"));

  if (receipt.articleId !== brief.articleId) issues.push(`receipt names article ${receipt.articleId}`);
  if (receipt.textos.sha !== tool.writer.sha) issues.push(`receipt names TextOS ${receipt.textos.sha}, the writer pin is ${tool.writer.sha}`);
  if (receipt.canonicalProductSha !== tool.product.sha || lineage.canonicalProductSha !== tool.product.sha) {
    issues.push(`product truth ${receipt.canonicalProductSha} is not the product pin ${tool.product.sha}`);
  }
  if (receipt.truthCheckVerdict !== "pass" || lineage.truthCheck.verdict !== "pass") issues.push("TruthCheck verdict is not pass");
  if (receipt.slotProviderMethodVersion !== lineage.slotProviderMethodVersion || receipt.derivationIdentity !== lineage.derivationIdentity) {
    issues.push("receipt and lineage disagree on the writer identity");
  }
  if (!receipt.derivationIdentity.endsWith(`::${receipt.slotProviderMethodVersion}`)) issues.push("derivation identity does not name its slot provider");
  if (receipt.slotProviderMethodVersion.startsWith(OPERATOR_PROVIDER_PREFIX) && /claude-[a-z]+-\d/.test(receipt.slotProviderMethodVersion)) {
    issues.push("an operator transport claims an API model identity");
  }
  if (receipt.structuredContentHash !== lineage.structuredContentHash) issues.push("structured content hash differs between receipt and lineage");
  if (receipt.executionPlanHash !== adapt.executionPlanHash) issues.push("execution plan hash differs from adapt.json");
  if (JSON.stringify(receipt.promptHashes) !== JSON.stringify(adapt.promptHashes)) issues.push("prompt hashes differ from adapt.json");

  if (sha256(readText(file("content-document.json"))) !== receipt.contentDocumentSha256) issues.push("content-document.json does not match the receipt");
  if (sha256(readText(file("lineage.json"))) !== receipt.lineageSha256) issues.push("lineage.json does not match the receipt");
  if (sha256(readText(file("resolved-surface.json"))) !== receipt.resolvedSurfaceSha256) issues.push("resolved-surface.json does not match the receipt");
  for (const slotId of Object.keys(receipt.promptHashes)) {
    const response = path.join(runDir, "responses", responseFileName(slotId));
    if (!existsSync(response)) issues.push(`missing operator response for ${slotId}`);
    else if (sha256(readText(response)) !== receipt.responseHashes[slotId]) issues.push(`response ${slotId} does not match the receipt`);
  }

  const writerDocument = readJson<ContentDocument>(file("content-document.json"));
  if (writerDocument.identity.slug !== brief.slug) issues.push(`document slug ${writerDocument.identity.slug} is not the brief's ${brief.slug}`);
  if (writerDocument.provenance.sourceEvidenceDigest !== receipt.structuredContentHash) issues.push("document evidence digest is not the written content hash");
  for (const id of brief.entityIds) if (!manifestEntityIds.has(id)) issues.push(`entity ${id} is not in the pinned product manifest`);
  return issues;
}

let cache: readonly CtcArticle[] | null = null;

/** Verified, projected Commit-to-Content articles. Throws on the first run that does not check. */
export function loadCtcArticles(root: string = process.cwd()): readonly CtcArticle[] {
  if (cache && root === process.cwd()) return cache;
  const briefs = loadBriefs(root);
  const tool = loadToolRecord(root);
  const manifest = readJson<{ entities: { id: string }[] }>(path.join(root, "product-manifest", "textos-v0.capability-manifest.json"));
  const manifestEntityIds = new Set(manifest.entities.map((e) => e.id));

  const ledger = loadLedger(root);
  if (briefs.length > 0) {
    const issues = ledger ? ledgerIssues(ledger, tool.product.sha, collectCitations(briefs)) : ["no commit ledger — run `pnpm content:commits`"];
    if (issues.length > 0) throw new Error(`textos-client: commit ledger refused:\n  - ${issues.join("\n  - ")}`);
  }

  const articles = briefs.map((brief) => {
    const issues = verifyCtcRun({ root, brief, tool, manifestEntityIds });
    if (issues.length > 0) throw new Error(`textos-client: run ${brief.articleId} refused:\n  - ${issues.join("\n  - ")}`);
    const runDir = path.join(textosDir(root), "runs", brief.articleId);
    const writerDocument = ContentDocumentSchema.parse(readJson(path.join(runDir, "content-document.json"))) as ContentDocument;
    const lineage = readJson<Lineage>(path.join(runDir, "lineage.json"));
    const receipt = readJson<Receipt>(path.join(runDir, "receipt.json"));
    return { brief, receipt, writerDocument, document: projectCtcDocument({ brief, writerDocument, lineage }) };
  });
  if (root === process.cwd()) cache = articles;
  return articles;
}
