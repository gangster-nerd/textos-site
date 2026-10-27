// A2R-SURFACE-SEAL-1 §2 — exact ContentDocument → HTML semantic parity.
//
// This is the AUTHORITATIVE surface gate. It requires exact semantic equality
// per source-backed block ; presentation-only wrappers are stripped by the
// projector but semantic structure is not. LOCATED diffs report the exact
// (documentId, blockId, path) on failure. If `out/` is missing, the test
// FAILS explicitly (never `describe.skipIf`).

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { loadManagedCorpus } from "@/lib/content-surface-engine/conformance/corpus-loader";
import { evaluateRenderParity } from "@/lib/content-surface-engine/conformance/render-parity";
import { findSourceRelatedSection } from "@/lib/content-surface-engine/site-integration/related-source-links";

const OUT_DIR = path.resolve("out/insights");

if (!fs.existsSync(OUT_DIR)) {
  throw new Error(
    "A2R exact-parity requires `pnpm build` output at out/insights. " +
      "Run `pnpm verify:a2r` which builds first.",
  );
}

const corpus = loadManagedCorpus();

describe("A2R — EXACT ContentDocument → HTML semantic parity", () => {
  it.each(corpus.map((d) => [d.identity.slug, d] as const))(
    "%s : exact semantic equality per source-backed block",
    (slug, doc) => {
      const html = fs.readFileSync(path.join(OUT_DIR, `${slug}.html`), "utf8");
      // PR #22 : la section source « Related … » (titre + liste) est projetée hors du corps, dans
      // le module Related. Elle est exclue de la parité de corps (option prévue par l'évaluateur),
      // mais chacun de ses liens gouvernés doit rester présent dans la page.
      const src = findSourceRelatedSection(doc);
      const consumedBlockIds = new Set<string>(
        src ? [src.headingBlockId, src.listBlockId] : [],
      );
      for (const l of src?.links ?? []) {
        expect(html, `${slug}: governed related link ${l.href} lost`).toContain(`href="${l.href}"`);
      }
      const r = evaluateRenderParity({ document: doc, html, consumedBlockIds });
      if (!r.passed) {
        const preview = r.diffs
          .slice(0, 6)
          .map(
            (d) =>
              `[${d.differenceKind}] doc=${d.documentId} block=${d.blockId} path=${d.path.join(".")} — ${d.message}`,
          )
          .join("\n");
        throw new Error(
          `${slug}: exact parity FAILED (${r.diffs.length} diff(s), ${r.blocksChecked} blocks checked)\n${preview}`,
        );
      }
      expect(r.passed).toBe(true);
      expect(r.blocksChecked).toBeGreaterThan(0);
    },
  );
});
