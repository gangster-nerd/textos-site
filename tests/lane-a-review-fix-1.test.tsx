import { describe, expect, it } from "vitest";

import {
  buildAttributedUrl,
  ATTRIBUTION_CALLER_ALLOWED_PARAMS,
} from "@/lib/content-surface-engine/instrumentation";
import { compileAuthority } from "@/lib/content-surface-engine/authority";
import { resolveContentSurface } from "@/lib/content-surface-engine/composition/resolve-content-surface";
import {
  textosArticleReferencePolicy,
} from "@/lib/content-surface-engine/surface-policy";
import { ContentDocumentSchema } from "@/lib/content-surface-engine/contract/content-document";
import { evaluatePublicationPass } from "@/lib/content-surface-engine/publication";
import { loadManagedCorpus } from "@/lib/content-surface-engine/conformance/corpus-loader";

function baseDoc() {
  return {
    contentSchemaVersion: "content-document@1",
    identity: {
      documentId: "generic:x",
      contentType: "product_article",
      slug: "x",
      language: "en",
      title: "T",
      description: "D",
    },
    editorial: { authorIds: [], reviewerIds: [], topicIds: [] },
    truth: {
      statusVocabulary: "v",
      statusVocabularyVersion: "1",
      sourceStatus: "s",
      publicationStatus: "published" as const,
      allowedSurfaces: ["reference" as const],
      claimIds: [],
      evidenceRefs: [],
      capabilityIds: [],
    },
    provenance: { sourceAuthority: "UNCERTIFIED" as const },
    body: [{ id: "p", kind: "paragraph" as const, data: { text: "…" } }],
    relationships: { relatedContentIds: [] },
    conversion: { conversionAllowed: false },
    lifecycle: { publishedAt: "2026-09-13", updatedAt: "2026-09-13" },
    seo: { indexingIntent: "noindex" as const },
  };
}

describe("LANE-A-REVIEW-FIX-1", () => {
  // ── Fix #1: attribution allowlist ──────────────────────────────────────
  describe("attribution allowlist (strict, unknown = dropped)", () => {
    it("exposes the exact allowlist", () => {
      expect([...ATTRIBUTION_CALLER_ALLOWED_PARAMS].sort()).toEqual(["intent", "source"]);
    });

    it.each([
      ["contentId", "leak"],
      ["content_id", "leak"],
      ["slug", "leak"],
      ["target_query", "leak"],
      ["targetQuery", "leak"],
      ["domain", "leak"],
      ["clusterId", "leak"],
      ["cluster_id", "leak"],
      ["user", "leak"],
      ["userId", "leak"],
      ["user_id", "leak"],
      ["email", "leak@example.com"],
      ["utm_campaign", "spring"],
      ["ref", "external"],
      ["hostname", "textos.example"],
      ["__proto__", "x"],
    ])("drops unknown key %s", (key, value) => {
      const url = buildAttributedUrl("/dst", "AID", { [key]: value });
      expect(url).not.toContain(`${key}=`);
      expect(url).not.toContain(value);
    });

    it("preserves only intent, source, aid", () => {
      const url = buildAttributedUrl("/dst", "AID", {
        intent: "MEASURE_BRAND",
        source: "reference",
        contentId: "leaked",
        email: "leak@example.com",
        utm_medium: "banner",
      });
      const params = new URL("http://x" + url).searchParams;
      const keys = [...params.keys()].sort();
      expect(keys).toEqual(["aid", "intent", "source"]);
      expect(params.get("aid")).toBe("AID");
      expect(params.get("intent")).toBe("MEASURE_BRAND");
      expect(params.get("source")).toBe("reference");
    });
  });

  // ── Fix #2: OpenGraph type policy ─────────────────────────────────────
  describe("openGraph.type follows the same factual/policy boundary as JSON-LD", () => {
    function compileFor(contentType: string, explicitSchemaType?: string) {
      const raw = baseDoc();
      raw.identity.contentType = contentType;
      if (explicitSchemaType) {
        (raw.seo as unknown as { schemaType?: string }).schemaType = explicitSchemaType;
      }
      const doc = ContentDocumentSchema.parse(raw);
      const resolved = resolveContentSurface(doc, textosArticleReferencePolicy);
      return compileAuthority({
        resolved,
        siteOrigin: "https://textos.example",
        siteName: "TextOS",
        lifecycle: { publishedAt: doc.lifecycle.publishedAt, updatedAt: doc.lifecycle.updatedAt },
      });
    }

    it("product_article → og:type=article and Article JSON-LD emitted", () => {
      const c = compileFor("product_article");
      expect(c.metadata.openGraph.type).toBe("article");
      expect(c.jsonLd.some((n) => n["@type"] === "Article")).toBe(true);
    });

    it("changelog_entry → og:type=website and NO Article JSON-LD", () => {
      const c = compileFor("changelog_entry");
      expect(c.metadata.openGraph.type).toBe("website");
      expect(c.jsonLd.some((n) => n["@type"] === "Article")).toBe(false);
    });

    it("generic page → og:type=website", () => {
      const c = compileFor("page");
      expect(c.metadata.openGraph.type).toBe("website");
      expect(c.jsonLd.some((n) => n["@type"] === "Article")).toBe(false);
    });

    it("arbitrary unknown contentType → og:type=website", () => {
      const c = compileFor("some_shortsos_thing");
      expect(c.metadata.openGraph.type).toBe("website");
      expect(c.jsonLd.some((n) => n["@type"] === "Article")).toBe(false);
    });

    it("explicit seo.schemaType=Article on a non-article contentType still emits article", () => {
      const c = compileFor("page", "Article");
      expect(c.metadata.openGraph.type).toBe("article");
      expect(c.jsonLd.some((n) => n["@type"] === "Article")).toBe(true);
    });
  });

  // ── Fix #3: PUBLICATION_PASS trusts T0 lineage, not declared authority ─
  describe("publication authority resolution (T0 wins, not the document self-declaration)", () => {
    const CERTIFIED_MAIN = "a0efa146a8691938b624c156d99f4663f6f92218";

    it("forged CERTIFIED_MAIN + unknown sourceSha → FAIL closed", () => {
      const raw = baseDoc();
      raw.provenance = {
        sourceAuthority: "CERTIFIED_MAIN" as unknown as "UNCERTIFIED",
        sourceSha: "b".repeat(40),
      } as unknown as (typeof raw)["provenance"];
      const doc = ContentDocumentSchema.parse(raw);
      const pass = evaluatePublicationPass({
        document: doc,
        surface: "reference",
        lifecycleState: "CURRENT",
      });
      expect(pass.passed).toBe(false);
      expect(pass.issues.some((i) => i.code === "source-authority-uncertified")).toBe(true);
    });

    it("certified SHA + declared UNCERTIFIED → mismatch recorded (declared cannot override T0)", () => {
      const raw = baseDoc();
      raw.provenance = {
        sourceAuthority: "UNCERTIFIED",
        sourceSha: CERTIFIED_MAIN,
      } as (typeof raw)["provenance"];
      const doc = ContentDocumentSchema.parse(raw);
      const pass = evaluatePublicationPass({
        document: doc,
        surface: "reference",
        lifecycleState: "CURRENT",
      });
      // T0 sees CERTIFIED_MAIN; declared UNCERTIFIED disagrees. Mismatch is recorded so a
      // declared "UNCERTIFIED" self-label cannot silently erase real T0 authority when the
      // publication policy would otherwise let it through.
      expect(pass.issues.some((i) => i.code === "source-authority-mismatch")).toBe(true);
    });

    it("non-git provenance + no explicit authorization → FAIL closed", () => {
      const raw = baseDoc();
      raw.provenance = {
        sourceAuthority: "UNCERTIFIED",
        sourceEvidenceDigest: "e".repeat(64),
      } as (typeof raw)["provenance"];
      const doc = ContentDocumentSchema.parse(raw);
      const pass = evaluatePublicationPass({
        document: doc,
        surface: "reference",
        lifecycleState: "CURRENT",
      });
      expect(pass.passed).toBe(false);
      expect(pass.issues.some((i) => i.code === "non-git-provenance-not-authorized")).toBe(true);
    });

    it("non-git provenance + explicit authorization → provenance portion PASS", () => {
      const raw = baseDoc();
      raw.provenance = {
        sourceAuthority: "UNCERTIFIED",
        sourceEvidenceDigest: "e".repeat(64),
      } as (typeof raw)["provenance"];
      const doc = ContentDocumentSchema.parse(raw);
      const pass = evaluatePublicationPass({
        document: doc,
        surface: "reference",
        lifecycleState: "CURRENT",
        authorizeNonGitProvenance: true,
      });
      expect(pass.issues.some((i) => i.code === "non-git-provenance-not-authorized")).toBe(false);
      expect(pass.issues.some((i) => i.code === "source-authority-uncertified")).toBe(false);
    });

    it("INDEXABLE cannot be obtained via self-declared sourceAuthority", () => {
      // Corpus documents declare sourceEvidenceDigest and NO sourceSha. Without explicit
      // authorization, publication is blocked even if we forced publishable status.
      const corpus = loadManagedCorpus();
      const doc = corpus[0];
      // Simulate a bad actor: flip declared sourceAuthority to CERTIFIED_MAIN and publication
      // status to published. Absence of sourceSha AND absence of authorization must still fail.
      const forged = JSON.parse(JSON.stringify(doc));
      forged.truth.publicationStatus = "published";
      forged.provenance.sourceAuthority = "CERTIFIED_MAIN";
      const parsed = ContentDocumentSchema.parse(forged);
      const pass = evaluatePublicationPass({
        document: parsed,
        surface: "reference",
        lifecycleState: "CURRENT",
      });
      expect(pass.passed).toBe(false);
      expect(pass.issues.some((i) => i.code === "non-git-provenance-not-authorized")).toBe(true);
    });
  });

  // ── Fix #4: naming hygiene — mission-cited surfaces are renamed ─────────
  describe("naming hygiene A2 (Lane A nomenclature)", () => {
    it("renamed test file exists; the CSE-2 file does not", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const repo = path.resolve(__dirname, "..");
      expect(fs.existsSync(path.join(repo, "tests/a2-reference-surface.test.tsx"))).toBe(true);
      expect(fs.existsSync(path.join(repo, "tests/cse2-reference-surface.test.tsx"))).toBe(false);
      expect(fs.existsSync(path.join(repo, "scripts/a2-render-snapshots.ts"))).toBe(true);
      expect(fs.existsSync(path.join(repo, "scripts/cse2-render-snapshots.ts"))).toBe(false);
    });
  });
});
