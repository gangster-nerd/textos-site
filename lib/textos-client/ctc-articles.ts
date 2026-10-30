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
// Since TextOS CTC-CHAIN-1 the committed document is the output of TextOS's own article review
// (`composeCtcArticleReview`): short answer, sections, information objects, governed figures, Sources
// and the editorial next step, with an `article-cmo-v2@1` verdict and a release decision recorded in
// `article-review.json`. The build also checks:
//
//   - the receipt records a passing CMO V2 verdict and an allowed release;
//   - every figure SVG under public/ hash-matches the receipt and is the one the document points at;
//   - every text a reader sees is the writer's own slot text, verbatim (answer, sections, list items,
//     figure captions, FAQ), every heading is a heading the plan fixed, and every Source title is the
//     title TextOS recorded for that evidence.
//
// The site then PROJECTS the document into its catalogue: it splits a multi-paragraph section into
// paragraph blocks and fills site-owned metadata (authors, topic, canonical path). It never changes a
// word. Its claimIds are the statements the writer declared and TextOS's TruthCheck checked,
// namespaced by article; they are not entries of the site's claims registry. Until the brief records
// a human review, the projected article is a draft: Preview only, noindex, and the page emits no
// publication date (lifecycle dates carry the editorial approval date of the draft, which
// CONTENT_PASS requires and the route ignores).

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { ContentBlock, ContentDocument } from "@/lib/content-surface-engine/contract/content-document";
import { ContentDocumentSchema } from "@/lib/content-surface-engine/contract/content-document";

import { figurePublicPath, paragraphBlockId, responseFileName, type ArticleBrief } from "./brief";
import { collectCitations, ledgerIssues, type ProductCommitLedger } from "./commit-ledger";
import { earlyDisclosureOf, type EarlyDisclosure } from "@/lib/content/early-disclosure";
import type { PublicationStatus } from "@/lib/product-manifest/status-axes";

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
  receiptVersion: number;
  articleReviewMethodVersion: string;
  cmoV2: { version: string; passed: boolean };
  releaseAllowed: boolean;
  figureHashes: Record<string, string>;
  articleReviewSha256: string;
}

interface ArticleReviewRecord {
  release: { allowed: boolean; blockers: string[] };
  cmoV2Conformance: { passed: boolean };
  /** BÊTA-3 (textos-v0) : présente quand la note parle d'une capacité en bêta ou « bientôt » ; absente d'un run antérieur. */
  earlyDisclosure?: { capabilityId: string; label: string; cta: string; availabilityPromises: unknown[] } | null;
}

/** Section headings TextOS's article review adds itself (never writer text, never a claim). */
const REVIEW_HEADINGS = new Set(["Sources", "Frequently asked questions"]);
const normalizeWs = (text: string) => text.replace(/\s+/g, " ").trim();

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
  /** ADR-034 : capacité en bêta ou « bientôt » dont parle la note (label + CTA d'accès bêta). */
  earlyDisclosure: EarlyDisclosure | null;
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
 * Pure projection: article-review document + lineage + brief → the document the site renders.
 * Throws if any text a reader sees is not the writer's own slot text, or a Source title is not the
 * one TextOS recorded for its evidence.
 */
export function projectCtcDocument(input: {
  brief: ArticleBrief;
  writerDocument: ContentDocument;
  lineage: Pick<Lineage, "slotProvenance">;
  /** Evidence titles as TextOS recorded them in the intake (`id` → `sourceTitle`). */
  sourceTitles: ReadonlyMap<string, string>;
  /** Figure hashes recorded in the receipt (`id` → sha256). */
  figureHashes: Readonly<Record<string, string>>;
}): ContentDocument {
  const { brief, writerDocument, lineage } = input;
  const slots = new Map(lineage.slotProvenance.map((s) => [s.slotId, s]));
  const fail = (blockId: string, why: string): never => {
    throw new Error(`textos-client: ${brief.articleId} block ${blockId} ${why}.`);
  };
  const answers = lineage.slotProvenance.filter((s) => s.role === "answer");
  const headings = new Set([...REVIEW_HEADINGS, ...lineage.slotProvenance.flatMap((s) => (s.heading ? [s.heading] : []))]);
  const sectionKey = (blockId: string, suffix: string) => (blockId.endsWith(suffix) ? blockId.slice(0, -suffix.length) : null);

  const body: ContentBlock[] = [];
  for (const block of writerDocument.body) {
    const data = block.data as Record<string, unknown>;
    switch (block.kind) {
      case "answer":
        if (data.text !== answers[0]?.text) fail(block.id, "is not the writer's short answer");
        body.push(block);
        break;
      case "heading":
        if (!headings.has(String(data.text))) fail(block.id, "is not a heading the plan fixed");
        body.push(block);
        break;
      case "paragraph": {
        const key = sectionKey(block.id, ":body");
        const faq = /^faq-(\d+):answer$/.exec(block.id);
        const expected = key ? slots.get(key)?.text : faq ? answers[Number(faq[1]) - 1]?.text : undefined;
        if (expected === undefined || data.text !== expected) fail(block.id, "is not the writer's slot text");
        String(data.text)
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
          .forEach((p, i) => body.push({ ...block, id: paragraphBlockId(block.id, i + 1), data: { text: p } }));
        break;
      }
      case "steps": {
        const key = sectionKey(block.id, ":decision-points");
        const text = key ? slots.get(key)?.text : undefined;
        const items = (data.items as string[] | undefined) ?? [];
        if (text === undefined || normalizeWs(items.join(" ")) !== normalizeWs(text)) fail(block.id, "is not the writer's slot text");
        body.push(block);
        break;
      }
      case "figure": {
        const id = block.id.replace(/^figure:/, "");
        const spec = brief.figures.find((f) => f.id === id);
        const hash = input.figureHashes[id];
        if (!spec || !hash) fail(block.id, "is not a figure of the brief with a recorded hash");
        if (data.src !== figurePublicPath(id, hash!)) fail(block.id, "does not point at its hashed SVG");
        if (data.caption !== slots.get(spec!.captionSlotId)?.text) fail(block.id, "caption is not the writer's caption slot");
        body.push(block);
        break;
      }
      case "source": {
        const title = input.sourceTitles.get(String(data.ref));
        if (!title || data.title !== title || data.href !== undefined) fail(block.id, "is not a Source TextOS recorded");
        body.push(block);
        break;
      }
      default:
        fail(block.id, `has an unexpected kind ${block.kind}`);
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
  /** Statut de publication au manifeste épinglé (ADR-034) ; absent = aucune capacité anticipée. */
  manifestStatuses?: ReadonlyMap<string, PublicationStatus>;
}): string[] {
  const { root, brief, tool, manifestEntityIds } = input;
  const manifestStatuses = input.manifestStatuses ?? new Map<string, PublicationStatus>();
  const runDir = path.join(textosDir(root), "runs", brief.articleId);
  const issues: string[] = [];
  const file = (name: string) => path.join(runDir, name);
  for (const name of ["receipt.json", "content-document.json", "lineage.json", "resolved-surface.json", "adapt.json", "article-review.json", "intake.json"]) {
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
  if (sha256(readText(file("article-review.json"))) !== receipt.articleReviewSha256) issues.push("article-review.json does not match the receipt");
  const articleReview = readJson<ArticleReviewRecord>(file("article-review.json"));
  if (receipt.receiptVersion !== 2) issues.push(`receipt version ${receipt.receiptVersion} predates the common article chain`);
  if (!receipt.cmoV2?.passed || !articleReview.cmoV2Conformance.passed) issues.push("the CMO V2 verdict is not pass");
  if (!receipt.releaseAllowed || !articleReview.release.allowed) issues.push("TextOS's article review did not allow release");
  for (const [id, hash] of Object.entries(receipt.figureHashes ?? {})) {
    const svg = path.join(root, "public", figurePublicPath(id, hash));
    if (!existsSync(svg)) issues.push(`missing figure ${figurePublicPath(id, hash)}`);
    else if (sha256(readText(svg)) !== hash) issues.push(`figure ${id} does not match the receipt`);
  }
  for (const figure of brief.figures ?? []) if (!receipt.figureHashes?.[figure.id]) issues.push(`figure ${figure.id} of the brief was not rendered`);
  for (const slotId of Object.keys(receipt.promptHashes)) {
    const response = path.join(runDir, "responses", responseFileName(slotId));
    if (!existsSync(response)) issues.push(`missing operator response for ${slotId}`);
    else if (sha256(readText(response)) !== receipt.responseHashes[slotId]) issues.push(`response ${slotId} does not match the receipt`);
  }

  const writerDocument = readJson<ContentDocument>(file("content-document.json"));
  if (writerDocument.identity.slug !== brief.slug) issues.push(`document slug ${writerDocument.identity.slug} is not the brief's ${brief.slug}`);
  if (writerDocument.provenance.sourceEvidenceDigest !== receipt.structuredContentHash) issues.push("document evidence digest is not the written content hash");
  for (const id of brief.entityIds) if (!manifestEntityIds.has(id)) issues.push(`entity ${id} is not in the pinned product manifest`);
  issues.push(...earlyDisclosureIssues(brief, articleReview, manifestStatuses));
  return issues;
}

/**
 * ADR-034 — une note qui parle d'une capacité en bêta ou « bientôt » (statut du manifeste ÉPINGLÉ) doit
 * avoir été revue AVEC sa divulgation : même capacité, même label, aucune date ni promesse. Une note
 * sans divulgation sur une telle capacité est refusée — le label ne peut pas être oublié en amont.
 */
export function earlyDisclosureIssues(
  brief: Pick<ArticleBrief, "entityIds">,
  articleReview: ArticleReviewRecord,
  manifestStatuses: ReadonlyMap<string, PublicationStatus>,
): string[] {
  const expected = brief.entityIds
    .map((id) => earlyDisclosureOf(id, manifestStatuses.get(id) ?? "internal_only"))
    .filter((disclosure): disclosure is EarlyDisclosure => disclosure !== null);
  const carried = articleReview.earlyDisclosure ?? null;
  if (expected.length === 0) {
    return carried ? [`the review carries an early disclosure for ${carried.capabilityId}, which the pinned manifest does not declare`] : [];
  }
  if (expected.length > 1) return [`the note speaks of several early-disclosure capabilities (${expected.map((d) => d.capabilityId).join(", ")}) — one per note`];
  const [want] = expected;
  if (!carried) return [`entity ${want!.capabilityId} is ${want!.label === "beta" ? "in beta" : "upcoming"} but the review carries no early disclosure`];
  const issues: string[] = [];
  if (carried.capabilityId !== want!.capabilityId || carried.label !== want!.label || carried.cta !== want!.cta) {
    issues.push(`the review's early disclosure (${carried.capabilityId}, ${carried.label}) does not match the pinned manifest (${want!.capabilityId}, ${want!.label})`);
  }
  if (carried.availabilityPromises.length > 0) issues.push("the review found a date or an availability promise");
  return issues;
}

let cache: readonly CtcArticle[] | null = null;

/** Verified, projected Commit-to-Content articles. Throws on the first run that does not check. */
export function loadCtcArticles(root: string = process.cwd()): readonly CtcArticle[] {
  if (cache && root === process.cwd()) return cache;
  const briefs = loadBriefs(root);
  const tool = loadToolRecord(root);
  const manifest = readJson<{ entities: { id: string; publicationStatus: PublicationStatus }[] }>(
    path.join(root, "product-manifest", "textos-v0.capability-manifest.json"),
  );
  const manifestEntityIds = new Set(manifest.entities.map((e) => e.id));
  const manifestStatuses = new Map(manifest.entities.map((e) => [e.id, e.publicationStatus]));

  const ledger = loadLedger(root);
  if (briefs.length > 0) {
    const issues = ledger ? ledgerIssues(ledger, tool.product.sha, collectCitations(briefs)) : ["no commit ledger — run `pnpm content:commits`"];
    if (issues.length > 0) throw new Error(`textos-client: commit ledger refused:\n  - ${issues.join("\n  - ")}`);
  }

  const articles = briefs.map((brief) => {
    const issues = verifyCtcRun({ root, brief, tool, manifestEntityIds, manifestStatuses });
    if (issues.length > 0) throw new Error(`textos-client: run ${brief.articleId} refused:\n  - ${issues.join("\n  - ")}`);
    const runDir = path.join(textosDir(root), "runs", brief.articleId);
    const writerDocument = ContentDocumentSchema.parse(readJson(path.join(runDir, "content-document.json"))) as ContentDocument;
    const lineage = readJson<Lineage>(path.join(runDir, "lineage.json"));
    const receipt = readJson<Receipt>(path.join(runDir, "receipt.json"));
    const intake = readJson<{ evidence: { id: string; sourceTitle: string }[] }>(path.join(runDir, "intake.json"));
    const sourceTitles = new Map(intake.evidence.map((e) => [e.id, e.sourceTitle]));
    const document = projectCtcDocument({ brief, writerDocument, lineage, sourceTitles, figureHashes: receipt.figureHashes });
    const earlyDisclosure =
      brief.entityIds
        .map((id) => earlyDisclosureOf(id, manifestStatuses.get(id) ?? "internal_only"))
        .find((disclosure): disclosure is EarlyDisclosure => disclosure !== null) ?? null;
    return { brief, receipt, earlyDisclosure, writerDocument, document };
  });
  if (root === process.cwd()) cache = articles;
  return articles;
}
