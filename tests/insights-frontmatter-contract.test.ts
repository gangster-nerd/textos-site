import { describe, expect, it } from "vitest";

import { loadCollection } from "@/lib/content/content-loader";
import { verifyInsightDocument } from "@/lib/content/insight-verifier";
import type { ResolvedDocument } from "@/lib/content/content-loader";

describe("insights frontmatter contract", () => {
  const docs = loadCollection("insights");

  it("loads all 12 insight articles", () => {
    expect(docs.length).toBeGreaterThanOrEqual(12);
  });

  it("every article has ZERO failures from verifyInsightDocument", () => {
    // Skip sourceDigest recompute by NOT providing productRepoPath and stripping the env
    // override so the verifier degrades gracefully when no product repo is available.
    const savedEnv = process.env.TEXTOS_PRODUCT_REPO;
    process.env.TEXTOS_PRODUCT_REPO = "/nonexistent/path/does/not/exist";
    try {
      const perDocFailures = docs.map((d) => ({
        slug: d.slug,
        failures: verifyInsightDocument(d),
      }));
      const withFailures = perDocFailures.filter((r) => r.failures.length > 0);
      if (withFailures.length > 0) {
        // Improve diagnostics on regression.
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(withFailures, null, 2));
      }
      expect(withFailures).toEqual([]);
    } finally {
      if (savedEnv === undefined) delete process.env.TEXTOS_PRODUCT_REPO;
      else process.env.TEXTOS_PRODUCT_REPO = savedEnv;
    }
  });

  it("synthetic doc missing authorId returns failure mentioning authorId", () => {
    const src = docs[0];
    const fm = { ...(src.frontmatter as unknown as Record<string, unknown>) };
    delete fm.authorId;
    const bad = { ...src, frontmatter: fm as never } as ResolvedDocument;
    const failures = verifyInsightDocument(bad);
    expect(failures.some((f) => f.message.includes("authorId"))).toBe(true);
  });

  it("synthetic doc with truncated description raises 'tronquée' failure", () => {
    const src = docs[0];
    const fm = { ...(src.frontmatter as unknown as Record<string, unknown>) };
    fm.description = "This description is truncated and has no terminal punctuation";
    const bad = { ...src, frontmatter: fm as never } as ResolvedDocument;
    const failures = verifyInsightDocument(bad);
    expect(failures.some((f) => f.message.includes("tronquée"))).toBe(true);
  });
});
