// Commit-to-Content client — textos-site as a production client of TextOS's CTC input source.
//
// Proves, without any TextOS checkout: the committed runs check (receipt ↔ files ↔ pins ↔
// ledger), the site projection never changes a word the writer wrote, an unreviewed article stays
// a draft, and each guard actually fires when the thing it guards is tampered with.

import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveContentSurface } from "@/lib/content-surface-engine/composition/resolve-content-surface";
import { evaluateContentPass } from "@/lib/content-surface-engine/conformance/content-pass";
import { evaluateLifecycle } from "@/lib/content-surface-engine/lifecycle";
import { evaluatePublicationPass } from "@/lib/content-surface-engine/publication";
import { textosArticleReferencePolicy } from "@/lib/content-surface-engine/surface-policy";
import { findInsightEntry } from "@/lib/content-surface-engine/site-integration";
import { collectCitations, ledgerIssues } from "@/lib/textos-client/commit-ledger";
import {
  loadBriefs,
  loadCtcArticles,
  loadLedger,
  loadToolRecord,
  projectCtcDocument,
  verifyCtcRun,
} from "@/lib/textos-client/ctc-articles";

const ROOT = process.cwd();
const articles = loadCtcArticles();
const tool = loadToolRecord();
const manifestIds = new Set(
  (JSON.parse(readFileSync("product-manifest/textos-v0.capability-manifest.json", "utf8")) as { entities: { id: string }[] }).entities.map(
    (e) => e.id,
  ),
);

function sandbox(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "textos-client-"));
  cpSync(path.join(ROOT, "textos"), path.join(dir, "textos"), { recursive: true });
  cpSync(path.join(ROOT, "product-manifest"), path.join(dir, "product-manifest"), { recursive: true });
  return dir;
}

describe("Commit-to-Content client — committed runs", () => {
  it("has a first wave of verified articles", () => {
    expect(articles.length).toBeGreaterThanOrEqual(4);
    expect(articles.map((a) => a.brief.articleId).sort()).toEqual(loadBriefs().map((b) => b.articleId).sort());
  });

  it("writer and product pins are the same certified-candidate SHA", () => {
    expect(tool.writer.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(tool.product.sha).toBe(tool.writer.sha);
    for (const a of articles) {
      expect(a.receipt.textos.sha).toBe(tool.writer.sha);
      expect(a.receipt.canonicalProductSha).toBe(tool.product.sha);
    }
  });

  it("every run passed TextOS's TruthCheck and names an operator transport, never an API model", () => {
    for (const a of articles) {
      expect(a.receipt.truthCheckVerdict).toBe("pass");
      expect(a.receipt.slotProviderMethodVersion).toMatch(/^operator:claude-code\|geo-writer-slot@/);
    }
  });

  it("every run is a HUMAN_CMO commit_to_content note with unmeasured demand", () => {
    for (const a of articles) {
      expect(a.brief.flow).toBe("commit_to_content");
      expect(a.brief.provenance.targetQueryProvenance).toBe("HUMAN_CMO");
      expect(a.brief.provenance.demandEvidenceStatus).toBe("NOT_MEASURED");
      expect(a.brief.publicationChannel).toBe("controlled_preview");
    }
  });

  it("the ledger holds exactly the cited commits and the product pin", () => {
    const ledger = loadLedger();
    expect(ledger).not.toBeNull();
    expect(ledgerIssues(ledger!, tool.product.sha, collectCitations(loadBriefs()))).toEqual([]);
  });
});

describe("Commit-to-Content client — site projection", () => {
  it("never changes a word the writer wrote", () => {
    for (const a of articles) {
      for (const block of a.writerDocument.body) {
        const projected = a.document.body
          .filter((b) => b.id === block.id || b.id.startsWith(`${block.id}--p`))
          .map((b) => String(b.data.text));
        expect(projected.join("\n\n").replace(/\s+/g, " ")).toBe(String(block.data.text).replace(/\s+/g, " "));
      }
      expect(a.document.identity.title).toBe(a.writerDocument.identity.title);
      expect(a.document.identity.description).toBe(a.writerDocument.identity.description);
    }
  });

  it("adds only the section headings fixed by the brief's plan", () => {
    for (const a of articles) {
      const headings = a.document.body.filter((b) => b.kind === "heading").map((b) => String(b.data.text));
      const planned = a.brief.slots.flatMap((s) => (s.heading && s.headingLevel ? [s.heading] : []));
      expect(headings).toEqual(planned);
    }
  });

  it("an unreviewed article is a draft: noindex, no reviewer, no CTA, fails PUBLICATION_PASS", () => {
    for (const a of articles) {
      expect(a.brief.publication.humanReview.status).toBe("pending");
      const doc = a.document;
      expect(doc.truth.publicationStatus).toBe("draft");
      expect(doc.seo.indexingIntent).toBe("noindex");
      expect(doc.editorial.reviewerIds).toEqual([]);
      expect(doc.lifecycle.firstPublishedAt).toBeNull();
      expect(doc.conversion.conversionAllowed).toBe(false);
      const lifecycle = evaluateLifecycle({ document: doc });
      const r = evaluatePublicationPass({ document: doc, surface: "reference", lifecycleState: lifecycle.state });
      expect(r.issues.map((i) => i.code)).toContain("publication-status-not-publishable");
    }
  });

  it("passes CONTENT_PASS(textos.article@1) and resolves on the article reference policy", () => {
    for (const a of articles) {
      const r = evaluateContentPass({ document: a.document, profile: "textos.article@1" });
      expect(r.passed, `${a.brief.articleId}: ${r.issues.map((i) => i.code).join(", ")}`).toBe(true);
      expect(() => resolveContentSurface(a.document, textosArticleReferencePolicy)).not.toThrow();
    }
  });

  it("joins the insight catalogue under its own slug, with the commit-to-content kicker", () => {
    for (const a of articles) {
      const entry = findInsightEntry(a.brief.slug);
      expect(entry?.document.identity.documentId).toBe(`textos-site:ctc:${a.brief.articleId}`);
      expect(entry?.kicker).toBe("commit to content");
    }
  });

  it("a recorded human review publishes the projection, never before", () => {
    const a = articles[0]!;
    const lineage = JSON.parse(readFileSync(`textos/runs/${a.brief.articleId}/lineage.json`, "utf8"));
    const reviewed = {
      ...a.brief,
      publication: { humanReview: { status: "done" as const, reviewer: "marc-prempain", reviewedOn: "2026-10-27" } },
    };
    const doc = projectCtcDocument({ brief: reviewed, writerDocument: a.writerDocument, lineage });
    expect(doc.truth.publicationStatus).toBe("published");
    expect(doc.editorial.reviewerIds).toEqual(["marc-prempain"]);
    expect(doc.lifecycle.firstPublishedAt).toBe("2026-10-27");
  });
});

describe("Commit-to-Content client — guards fire on tampering", () => {
  const first = articles[0]!.brief;
  const verify = (root: string) =>
    verifyCtcRun({ root, brief: loadBriefs(root).find((b) => b.articleId === first.articleId)!, tool: loadToolRecord(root), manifestEntityIds: manifestIds });

  it("the untouched sandbox verifies", () => {
    expect(verify(sandbox())).toEqual([]);
  });

  it("an edited operator response is refused", () => {
    const root = sandbox();
    const file = path.join(root, "textos/runs", first.articleId, "responses/lead.json");
    writeFileSync(file, readFileSync(file, "utf8").replace(/\.(\s*")/, ", for real.$1"));
    expect(verify(root).join("\n")).toMatch(/response lead does not match the receipt/);
  });

  it("a hand-edited article text is refused", () => {
    const root = sandbox();
    const file = path.join(root, "textos/runs", first.articleId, "content-document.json");
    writeFileSync(file, readFileSync(file, "utf8").replace("TextOS", "TextOS (edited)"));
    expect(verify(root).join("\n")).toMatch(/content-document.json does not match the receipt/);
  });

  it("a moved writer pin is refused", () => {
    const root = sandbox();
    const file = path.join(root, "textos/tool.json");
    const t = JSON.parse(readFileSync(file, "utf8"));
    t.writer.sha = "0".repeat(40);
    writeFileSync(file, JSON.stringify(t));
    expect(verify(root).join("\n")).toMatch(/the writer pin is 0{40}/);
  });

  it("a projection that alters the writer's text throws", () => {
    const a = articles[0]!;
    const lineage = JSON.parse(readFileSync(`textos/runs/${a.brief.articleId}/lineage.json`, "utf8"));
    const altered = { ...a.writerDocument, body: a.writerDocument.body.map((b, i) => (i === 0 ? { ...b, data: { text: "Rewritten." } } : b)) };
    expect(() => projectCtcDocument({ brief: a.brief, writerDocument: altered, lineage })).toThrow(/not the writer's slot text/);
  });

  it("a cited commit missing from the ledger, or an uncited one in it, is refused", () => {
    const ledger = loadLedger()!;
    const citations = collectCitations(loadBriefs());
    const missing = { ...ledger, commits: ledger.commits.slice(1), commitCount: ledger.commitCount - 1 };
    expect(ledgerIssues(missing, tool.product.sha, citations).join("\n")).toMatch(/is not in the ledger/);
    const extra = {
      ...ledger,
      commits: [...ledger.commits, { sha: "f".repeat(40), date: "2026-01-01", subject: "x", citedBy: ["nobody"] }],
      commitCount: ledger.commitCount + 1,
    };
    expect(ledgerIssues(extra, tool.product.sha, citations).join("\n")).toMatch(/which nothing cites/);
  });
});

describe("Commit-to-Content client — public repository hygiene", () => {
  // textos-site is public, textos-v0 is private: nothing committed here may carry a product
  // environment variable name, and TextOS prompt text is never committed (only its hashes).
  it("no product environment variable name in committed briefs or runs", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== "prompts") walk(p);
        } else files.push(p);
      }
    };
    walk("textos");
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/\bTEXTOS_[A-Z0-9_]{3,}/);
  });
});
