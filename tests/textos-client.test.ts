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
import { findInsightEntry, listInsightEntries } from "@/lib/content-surface-engine/site-integration";
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
  cpSync(path.join(ROOT, "public", "diagrams", "ctc"), path.join(dir, "public", "diagrams", "ctc"), { recursive: true });
  return dir;
}

/** What `loadCtcArticles` passes to the projection: intake titles and receipt figure hashes. */
function projectionInputs(articleId: string) {
  const run = `textos/runs/${articleId}`;
  const lineage = JSON.parse(readFileSync(`${run}/lineage.json`, "utf8"));
  const intake = JSON.parse(readFileSync(`${run}/intake.json`, "utf8")) as { evidence: { id: string; sourceTitle: string }[] };
  const receipt = JSON.parse(readFileSync(`${run}/receipt.json`, "utf8")) as { figureHashes: Record<string, string> };
  return { lineage, sourceTitles: new Map(intake.evidence.map((e) => [e.id, e.sourceTitle])), figureHashes: receipt.figureHashes };
}

describe("Commit-to-Content client — committed runs", () => {
  it("has a first wave of verified articles", () => {
    expect(articles.length).toBeGreaterThanOrEqual(4);
    expect(articles.map((a) => a.brief.articleId).sort()).toEqual(loadBriefs().map((b) => b.articleId).sort());
  });

  it("the writer runs at its pin, and product truth is read at the certified-candidate pin", () => {
    expect(tool.writer.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(tool.product.sha).toMatch(/^[0-9a-f]{40}$/);
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
  it("went through TextOS's common article review: CMO V2 pass, release allowed, a figure, a list and Sources", () => {
    for (const a of articles) {
      const review = JSON.parse(readFileSync(`textos/runs/${a.brief.articleId}/article-review.json`, "utf8"));
      expect(a.receipt.cmoV2).toEqual({ version: "article-cmo-v2@1", passed: true });
      expect(review.release).toEqual({ allowed: true, blockers: [], cmoV2Issues: [] });
      const kinds = new Set(a.document.body.map((b) => b.kind));
      for (const kind of ["answer", "heading", "figure", "steps", "source"]) expect(kinds.has(kind as never), `${a.brief.articleId}: ${kind}`).toBe(true);
      expect(a.document.body.some((b) => b.slot === "editorial-next-step")).toBe(true);
    }
  });

  it("cites each document once, by reference and date, without a link", () => {
    for (const a of articles) {
      const titles = a.document.body.filter((b) => b.kind === "source").map((b) => String(b.data.title));
      expect(new Set(titles).size).toBe(titles.length);
      for (const b of a.document.body.filter((x) => x.kind === "source")) expect(b.data.href).toBeUndefined();
      for (const t of titles.filter((x) => x.startsWith("TextOS product commit"))) expect(t).toMatch(/^TextOS product commit [0-9a-f]{7}, \d{1,2} [A-Z][a-z]{2} \d{4}$/);
    }
  });

  it("never changes a word the writer wrote", () => {
    for (const a of articles) {
      for (const block of a.writerDocument.body.filter((b) => typeof b.data.text === "string")) {
        const projected = a.document.body
          .filter((b) => b.id === block.id || b.id.startsWith(`${block.id}--p`))
          .map((b) => String(b.data.text));
        expect(projected.join("\n\n").replace(/\s+/g, " ")).toBe(String(block.data.text).replace(/\s+/g, " "));
      }
      expect(a.document.identity.title).toBe(a.writerDocument.identity.title);
      expect(a.document.identity.description).toBe(a.writerDocument.identity.description);
    }
  });

  it("shows only the section headings fixed by the brief's plan, plus TextOS's own Sources heading", () => {
    for (const a of articles) {
      const headings = a.document.body.filter((b) => b.kind === "heading").map((b) => String(b.data.text));
      const planned = a.brief.slots.flatMap((s) => (s.role === "section" && s.heading && s.headingLevel ? [s.heading] : []));
      expect(headings).toEqual([...planned, "Sources"]);
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
      // PR #22 (editorial eyebrow) : le kicker passe par editorialEyebrowLabel, qui met en casse de
      // phrase le jeton de gouvernance (COMMIT_TO_CONTENT → « Commit to content »).
      expect(entry?.kicker).toBe("Commit to content");
    }
  });

  it("explicit related articles exist in the catalogue", () => {
    const ids = new Set(listInsightEntries().map((e) => e.document.identity.documentId));
    for (const a of articles) {
      for (const id of a.brief.editorial.relatedDocumentIds ?? []) expect(ids.has(id), `${a.brief.articleId} → ${id}`).toBe(true);
      expect(a.document.relationships.relatedContentIds).toEqual(a.brief.editorial.relatedDocumentIds ?? []);
    }
  });

  it("a recorded human review publishes the projection, never before", () => {
    const a = articles[0]!;
    const inputs = projectionInputs(a.brief.articleId);
    const reviewed = {
      ...a.brief,
      publication: { humanReview: { status: "done" as const, reviewer: "marc-prempain", reviewedOn: "2026-10-27" } },
    };
    const doc = projectCtcDocument({ brief: reviewed, writerDocument: a.writerDocument, ...inputs });
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

  it("a projection that alters the writer's text, a caption or a Source title throws", () => {
    const a = articles[0]!;
    const inputs = projectionInputs(a.brief.articleId);
    const alter = (kind: string, data: Record<string, unknown>) => ({
      ...a.writerDocument,
      body: a.writerDocument.body.map((b) => (b.kind === kind ? { ...b, data: { ...b.data, ...data } } : b)),
    });
    expect(() => projectCtcDocument({ brief: a.brief, writerDocument: alter("paragraph", { text: "Rewritten." }), ...inputs })).toThrow(/not the writer's slot text/);
    expect(() => projectCtcDocument({ brief: a.brief, writerDocument: alter("figure", { caption: "Rewritten." }), ...inputs })).toThrow(/caption is not the writer's caption slot/);
    expect(() => projectCtcDocument({ brief: a.brief, writerDocument: alter("source", { title: "Another title" }), ...inputs })).toThrow(/is not a Source TextOS recorded/);
  });

  it("a tampered figure SVG is refused", () => {
    const root = sandbox();
    const receipt = JSON.parse(readFileSync(path.join(root, "textos/runs", first.articleId, "receipt.json"), "utf8"));
    const [id, hash] = Object.entries(receipt.figureHashes as Record<string, string>)[0]!;
    const file = path.join(root, "public/diagrams/ctc", `${id}-${hash.slice(0, 12)}.svg`);
    writeFileSync(file, readFileSync(file, "utf8").replace("</svg>", "<!-- edited --></svg>"));
    expect(verify(root).join("\n")).toMatch(new RegExp(`figure ${id} does not match the receipt`));
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

describe("Commit-to-Content client — measurement prepared, not run", () => {
  // Closed vocabularies of TextOS's panel composition (query-intelligence/demand/panel-composition.ts
  // and approval.ts at the writer pin), mirrored as a client would.
  const INTENTS = ["brand_presence", "local_purchase", "comparison", "alternative", "proof_seeking", "customer_pain", "market_mapping"];
  const STAGES = ["problem_aware", "solution_aware", "supplier_shortlist", "vendor_validation"];
  const COMMERCIAL = ["high", "medium", "low"];
  const TRANSITIONS = ["absent_to_cited", "cited_to_recommended", "hold_recommended"];

  it("operator question proposals use TextOS's closed vocabularies", () => {
    const p = JSON.parse(readFileSync("textos/client/operator-question-proposals.json", "utf8"));
    expect(p.scopeAliases.length).toBeGreaterThan(0);
    expect(p.questions.length).toBeGreaterThan(0);
    for (const q of p.questions) {
      expect(q.question.length && q.rationale.length && q.demandExpression.length).toBeTruthy();
      expect(INTENTS).toContain(q.intent);
      expect(STAGES).toContain(q.buyerStage);
      expect(COMMERCIAL).toContain(q.commercialIntent);
      expect(TRANSITIONS).toContain(q.targetTransition);
    }
  });

  it("demand expressions cover every brief's target query and every proposal, and nothing is claimed measured", () => {
    const d = JSON.parse(readFileSync("textos/client/demand-queries.json", "utf8"));
    const p = JSON.parse(readFileSync("textos/client/operator-question-proposals.json", "utf8"));
    expect(d.status).toBe("not_run");
    const all = new Set<string>(d.groups.flatMap((g: { expressions: string[] }) => g.expressions));
    for (const b of loadBriefs()) {
      expect(all.has(b.provenance.targetQuery), b.articleId).toBe(true);
      expect(b.provenance.demandEvidenceStatus).toBe("NOT_MEASURED");
    }
    for (const q of p.questions) expect(all.has(q.demandExpression), q.question).toBe(true);
  });
});
