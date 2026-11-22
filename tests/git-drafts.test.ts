// Git delivery client — drafts TextOS deposits in this repository through its governed Git delivery.
//
// Proves, without any TextOS checkout: a valid deposited file renders as a noindex draft with the
// writer's words unchanged; every guard fires when the thing it guards is tampered with (and the
// build then fails, because the catalogue throws); only a human review of the exact bytes, recorded
// outside the delivery prefix, publishes; and nothing in this repository deploys the delivery
// branches.

import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { resolveContentSurface } from "@/lib/content-surface-engine/composition/resolve-content-surface";
import { evaluateContentPass } from "@/lib/content-surface-engine/conformance/content-pass";
import { textosArticleReferencePolicy } from "@/lib/content-surface-engine/surface-policy";
import { listInsightSlugs } from "@/lib/content-surface-engine/site-integration";
import { loadCtcArticles } from "@/lib/textos-client/ctc-articles";
import { loadManagedCorpus } from "@/lib/content-surface-engine/conformance/corpus-loader";
import { GIT_DRAFT_REVIEW_SCHEMA, loadGitDrafts } from "@/lib/textos-client/git-drafts";

const ROOT = process.cwd();
/** A run of TextOS's common article chain, already committed here: its document and resolved surface. */
const RUN = "textos/runs/ctc-credentials-expire-and-stop";
const SLUG = "git-delivery-fixture";

type Json = Record<string, any>;

/** The exact file `textos.write_git_delivery@1` commits: `{schemaVersion, article, publication}` + "\n". */
function deposit(mutate: (article: Json) => void = () => {}): string {
  const doc = JSON.parse(readFileSync(path.join(ROOT, RUN, "content-document.json"), "utf8")) as Json;
  const surface = JSON.parse(readFileSync(path.join(ROOT, RUN, "resolved-surface.json"), "utf8")) as Json;
  doc.identity.slug = SLUG;
  doc.identity.documentId = "11111111-1111-4111-8111-111111111111";
  surface.slug = SLUG;
  surface.documentId = doc.identity.documentId;
  const article: Json = {
    schemaVersion: "textos-headless-delivery@1",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    locale: doc.identity.language,
    source: { contentDraftId: doc.identity.documentId, briefId: "33333333-3333-4333-8333-333333333333",
      writerMethodVersion: "geo-writer@0.2", structuredContentHash: doc.provenance.sourceEvidenceDigest },
    truthCheck: { verdict: "pass", truthCheckId: "44444444-4444-4444-8444-444444444444" },
    contentContract: { version: "content-document@1", fingerprint: "f".repeat(64) },
    contentDocument: doc,
    resolvedSurface: surface,
    publication: { status: "not_requested" },
  };
  mutate(article);
  return `${JSON.stringify({ schemaVersion: "textos-git-draft@1", article, publication: "not_requested" })}\n`;
}

function sandbox(files: Record<string, string> = { [`textos/deliveries/${SLUG}.json`]: deposit() }): string {
  const dir = mkdtempSync(path.join(tmpdir(), "textos-git-drafts-"));
  cpSync(path.join(ROOT, "product-manifest"), path.join(dir, "product-manifest"), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), content);
  }
  return dir;
}
const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const review = (bytes: string, over: Json = {}) =>
  JSON.stringify({ schemaVersion: GIT_DRAFT_REVIEW_SCHEMA, slug: SLUG, draftSha256: sha256(bytes), reviewer: "marc-prempain", reviewedOn: "2026-11-23", ...over });

describe("Git delivery client — a valid deposit", () => {
  it("renders as a noindex draft, never published, with TextOS's words unchanged", () => {
    const bytes = deposit();
    const [draft] = loadGitDrafts(sandbox());
    expect(draft).toBeDefined();
    expect(draft!.sha256).toBe(sha256(bytes));
    expect(draft!.review).toBeNull();
    const doc = draft!.document;
    expect(doc.truth.publicationStatus).toBe("draft");
    expect(doc.seo.indexingIntent).toBe("noindex");
    expect(doc.editorial.reviewerIds).toEqual([]);
    expect(doc.lifecycle.firstPublishedAt).toBeNull();
    expect(doc.lifecycle.publishedAt).toBeUndefined();
    expect(doc.conversion.conversionAllowed).toBe(false);
    expect(doc.truth.sourceStatus).toMatch(/^GIT_DELIVERY:.*:draft$/);
    expect(doc.seo.canonicalPath).toBe(`/insights/${SLUG}`);
    // The site frames; it never rewrites.
    expect(doc.body).toEqual(draft!.writerDocument.body);
    expect(doc.identity.title).toBe(draft!.writerDocument.identity.title);
  });

  it("resolves through the same surface policy as the Commit-to-Content notes, and carries no invented date", () => {
    const [draft] = loadGitDrafts(sandbox());
    expect(() => resolveContentSurface(draft!.document, textosArticleReferencePolicy)).not.toThrow();
    // A draft has no date: CONTENT_PASS reports exactly that, and nothing else.
    const pass = evaluateContentPass({ document: draft!.document, profile: "textos.article@1" });
    expect(pass.issues.map((i) => i.code)).toEqual(["textos.article.publish-and-updated-dates"]);
  });

  it("an empty delivery directory adds nothing", () => {
    expect(loadGitDrafts(sandbox({}))).toEqual([]);
  });
});

describe("Git delivery client — an altered file fails the build", () => {
  const refused = (files: Record<string, string>, why: RegExp) => expect(() => loadGitDrafts(sandbox(files))).toThrow(why);
  const at = `textos/deliveries/${SLUG}.json`;

  it("a writer word changed after delivery (document and reviewed surface diverge)", () => {
    refused({ [at]: deposit((a) => {
      const block = (a.contentDocument.body as Json[]).find((b) => b.kind === "paragraph")!;
      block.data.text = `${block.data.text} Altered.`;
    }) }, /resolved surface blocks are not exactly/);
  });
  it("hand-formatted bytes", () => {
    refused({ [at]: `${JSON.stringify(JSON.parse(deposit()), null, 2)}\n` }, /not the exact bytes TextOS writes/);
  });
  it("publication requested", () => {
    refused({ [at]: deposit().replace('"publication":"not_requested"}\n', '"publication":"requested"}\n') }, /publication is not "not_requested"/);
  });
  it("an extra top-level key", () => {
    const value = JSON.parse(deposit());
    refused({ [at]: `${JSON.stringify({ ...value, deploy: true })}\n` }, /top-level keys/);
  });
  it("TruthCheck not pass", () => refused({ [at]: deposit((a) => { a.truthCheck.verdict = "fail"; }) }, /TruthCheck verdict is not pass/));
  it("a document that claims to be published or indexable", () => {
    refused({ [at]: deposit((a) => { a.contentDocument.truth.publicationStatus = "published"; }) }, /a deposit is always a draft/);
  });
  it("a reviewed surface that allows a CTA", () => refused({ [at]: deposit((a) => { a.resolvedSurface.conversion.effectiveCtaAllowed = true; }) }, /allows a CTA/));
  it("a file name that is not the slug", () => refused({ "textos/deliveries/other.json": deposit() }, /file name is not the document slug/));
  it("a capability outside the pinned manifest", () => {
    refused({ [at]: deposit((a) => { a.contentDocument.truth.capabilityIds = ["not-a-capability"]; }) }, /not in the pinned product manifest/);
  });
  it("a capability in beta, whose early disclosure a deposit does not carry (ADR-034)", () => {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, "product-manifest/textos-v0.capability-manifest.json"), "utf8")) as {
      entities: { id: string; publicationStatus: string }[];
    };
    const beta = manifest.entities.find((e) => e.publicationStatus === "public_beta")!.id;
    refused({ [at]: deposit((a) => { a.contentDocument.truth.capabilityIds = [beta]; }) }, /needs an early disclosure/);
  });
  it("a sub-directory or a non-JSON entry under the delivery prefix", () => {
    refused({ [at]: deposit(), "textos/deliveries/nested/x.json": deposit() }, /only <slug>\.json files belong here/);
  });
  it("is wired into the catalogue: the insight list throws on a refused deposit", () => {
    // The catalogue reads process.cwd(); its integration is asserted on the real tree below.
    const catalog = readFileSync(path.join(ROOT, "lib/content-surface-engine/site-integration/insights-catalog.ts"), "utf8");
    expect(catalog).toMatch(/\.\.\.loadGitDrafts\(\)\.map\(/);
  });
});

describe("Git delivery client — only a human review of the exact bytes publishes", () => {
  const at = `textos/deliveries/${SLUG}.json`;
  const reviewAt = `textos/delivery-reviews/${SLUG}.json`;

  it("a review naming a Person and the exact sha256 publishes it", () => {
    const bytes = deposit();
    const [draft] = loadGitDrafts(sandbox({ [at]: bytes, [reviewAt]: review(bytes) }));
    expect(draft!.document.truth.publicationStatus).toBe("published");
    expect(draft!.document.seo.indexingIntent).toBe("index");
    expect(draft!.document.editorial.reviewerIds).toEqual(["marc-prempain"]);
    expect(draft!.document.lifecycle.publishedAt).toBe("2026-11-23");
    const pass = evaluateContentPass({ document: draft!.document, profile: "textos.article@1" });
    expect(pass.passed, pass.issues.map((i) => i.code).join(", ")).toBe(true);
  });
  it("a review of other bytes fails the build (the draft changed after review)", () => {
    const bytes = deposit();
    expect(() => loadGitDrafts(sandbox({ [at]: bytes, [reviewAt]: review(bytes, { draftSha256: "0".repeat(64) }) }))).toThrow(/other bytes/);
  });
  it("an organisation is not a human reviewer", () => {
    const bytes = deposit();
    expect(() => loadGitDrafts(sandbox({ [at]: bytes, [reviewAt]: review(bytes, { reviewer: "textos-editorial-team" }) }))).toThrow(/not a Person/);
  });
  it("a review without a deposited draft fails the build", () => {
    expect(() => loadGitDrafts(sandbox({ [reviewAt]: review(deposit()) }))).toThrow(/review without a deposited draft/);
  });
  it("a review TextOS could write is ignored: inside the delivery prefix it is a refused deposit", () => {
    const bytes = deposit();
    expect(() => loadGitDrafts(sandbox({ [at]: bytes, [`textos/deliveries/reviews/${SLUG}.json`]: review(bytes) }))).toThrow(/only <slug>\.json files belong here/);
  });
});

describe("Git delivery client — this repository", () => {
  it("every committed deposit checks, and the catalogue holds exactly corpus + CTC + deposits", () => {
    const drafts = loadGitDrafts();
    const expected = new Set(
      [...loadManagedCorpus(), ...loadCtcArticles().map((a) => a.document), ...drafts.map((d) => d.document)].map((d) => d.identity.slug),
    );
    expect(new Set(listInsightSlugs())).toEqual(expected);
  });

  it("no workflow deploys, publishes or merges anything, and no workflow targets the delivery branches", () => {
    const dir = path.join(ROOT, ".github", "workflows");
    for (const name of readdirSync(dir)) {
      const workflow = readFileSync(path.join(dir, name), "utf8");
      expect(workflow, name).not.toMatch(/vercel|deploy|gh-pages|pages-artifact|git push|gh pr merge|auto-merge|automerge/i);
      expect(workflow, name).not.toMatch(/textos\//);
    }
  });

  it("the Vercel Git integration does not deploy the delivery branches", () => {
    const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf8")) as { git?: { deploymentEnabled?: Record<string, boolean> } };
    expect(vercel.git?.deploymentEnabled?.["textos/**"]).toBe(false);
  });
});
