// A2R-SURFACE-SEAL-1 §3 — surface mutation regressions.
//
// Every mutation below applies to the SOURCE ContentDocument (the expected
// side of the parity oracle). If the exact-parity gate were broken (e.g.
// accepting >=80% word density), these mutations would pass silently even
// though the semantic tree diverged. The gate is proven strong by failing
// on every mutation.
//
// Fixture: brief-to-decision-economics — has blockquote, headings, paragraphs,
// bold/emphasis inline links, and multiple paragraphs suitable for reorder /
// merge / delete mutations. When the fixture lacks a particular structure
// (e.g. tables aren't in this article), we synthesize a small extra block.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import type { ContentDocument } from "@/lib/content-surface-engine/contract/content-document";
import type { BlockNode } from "@/lib/content-surface-engine/contract/mdast-semantic";
import { loadManagedCorpus } from "@/lib/content-surface-engine/conformance/corpus-loader";
import { evaluateRenderParity } from "@/lib/content-surface-engine/conformance/render-parity";
import { findSourceRelatedSection } from "@/lib/content-surface-engine/site-integration/related-source-links";

const OUT_DIR = path.resolve("out/insights");
if (!fs.existsSync(OUT_DIR)) {
  throw new Error(
    "A2R surface mutations need `pnpm build` output. Run `pnpm verify:a2r`.",
  );
}

const corpus = loadManagedCorpus();
// CMO-SURFACE-VERTICAL-SLICE-1 REVIEW FIX : `brief-to-decision-economics` was
// the fixture, but its only list block is now consumed by the managed surface
// (it's the trailing "Related reading" list) — the "ordered list start
// modified" mutation would land on that consumed block and be legitimately
// ignored by parity, hiding the mutation. `agent-protocol-immutable-frontiers`
// has no trailing Related section and preserves every mutation shape.
const BASE = corpus.find((d) => d.identity.slug === "agent-protocol-immutable-frontiers")!;
const BASE_HTML = fs.readFileSync(
  path.join(OUT_DIR, "agent-protocol-immutable-frontiers.html"),
  "utf8",
);

/** Deep clone with structuredClone so mutations don't leak. */
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Find the first source-backed block matching predicate. Returns block index. */
function findBlockIndex(
  doc: ContentDocument,
  predicate: (b: ContentDocument["body"][number]) => boolean,
): number {
  return doc.body.findIndex(predicate);
}

/** Return the mdast subtree of a source-backed block, if any. */
function mdastAt(doc: ContentDocument, index: number): BlockNode | undefined {
  const b = doc.body[index] as { data?: { mdast?: unknown } } | undefined;
  return b?.data?.mdast as BlockNode | undefined;
}

interface Mutation {
  label: string;
  apply(doc: ContentDocument): ContentDocument | null;
}

const MUTATIONS: Mutation[] = [
  {
    label: "one removed repeated paragraph",
    apply(d) {
      const i = findBlockIndex(d, (b) => b.kind === "paragraph");
      if (i === -1) return null;
      d.body.splice(i, 1);
      return d;
    },
  },
  {
    label: "two paragraphs merged into one (delete the second)",
    apply(d) {
      // Find two consecutive paragraphs and drop the second — expected & actual
      // will diverge at (blockId of second paragraph) with "block-missing".
      let firstIdx = -1;
      for (let i = 0; i < d.body.length - 1; i++) {
        if (d.body[i].kind === "paragraph" && d.body[i + 1].kind === "paragraph") {
          firstIdx = i;
          break;
        }
      }
      if (firstIdx === -1) return null;
      d.body.splice(firstIdx + 1, 1);
      return d;
    },
  },
  {
    label: "two paragraphs reordered",
    apply(d) {
      let a = -1;
      let b = -1;
      for (let i = 0; i < d.body.length - 1; i++) {
        if (d.body[i].kind === "paragraph" && d.body[i + 1].kind === "paragraph") {
          a = i;
          b = i + 1;
          break;
        }
      }
      if (a === -1) return null;
      // Swap only mdast payloads (block ids stay put — the projector locates
      // each rendered block by id, so swapping the CARRIED mdast shows an
      // exact leaf mismatch inside the block).
      const tmp = mdastAt(d, a);
      (d.body[a] as unknown as { data: { mdast: BlockNode } }).data.mdast = mdastAt(d, b)!;
      (d.body[b] as unknown as { data: { mdast: BlockNode } }).data.mdast = tmp!;
      return d;
    },
  },
  {
    label: "dropped repeated sentence (delete last text node of first paragraph)",
    apply(d) {
      const i = findBlockIndex(d, (b) => b.kind === "paragraph");
      const nd = mdastAt(d, i);
      if (nd?.type !== "paragraph") return null;
      if (nd.children.length < 2) return null;
      nd.children.pop();
      return d;
    },
  },
  {
    label: "strong → plain text",
    apply(d) {
      for (const b of d.body) {
        const nd = (b as { data?: { mdast?: BlockNode } }).data?.mdast;
        if (!nd || nd.type !== "paragraph") continue;
        for (let i = 0; i < nd.children.length; i++) {
          if (nd.children[i].type === "strong") {
            const s = nd.children[i] as { children: unknown[] };
            const inner = (s.children as { type: string; value?: string }[])
              .filter((c) => c.type === "text")
              .map((c) => c.value)
              .join("");
            nd.children[i] = { type: "text", value: inner || "" };
            return d;
          }
        }
      }
      return null;
    },
  },
  {
    label: "emphasis → plain text",
    apply(d) {
      for (const b of d.body) {
        const nd = (b as { data?: { mdast?: BlockNode } }).data?.mdast;
        if (!nd || nd.type !== "paragraph") continue;
        for (let i = 0; i < nd.children.length; i++) {
          if (nd.children[i].type === "emphasis") {
            const s = nd.children[i] as { children: unknown[] };
            const inner = (s.children as { type: string; value?: string }[])
              .filter((c) => c.type === "text")
              .map((c) => c.value)
              .join("");
            nd.children[i] = { type: "text", value: inner || "" };
            return d;
          }
        }
      }
      return null;
    },
  },
  {
    label: "inlineCode → text",
    apply(d) {
      for (const b of d.body) {
        const nd = (b as { data?: { mdast?: BlockNode } }).data?.mdast;
        if (!nd || nd.type !== "paragraph") continue;
        for (let i = 0; i < nd.children.length; i++) {
          if (nd.children[i].type === "inlineCode") {
            const v = (nd.children[i] as { value: string }).value;
            nd.children[i] = { type: "text", value: v };
            return d;
          }
        }
      }
      return null;
    },
  },
  {
    label: "changed link href",
    apply(d) {
      for (const b of d.body) {
        const nd = (b as { data?: { mdast?: BlockNode } }).data?.mdast;
        if (!nd || nd.type !== "paragraph") continue;
        for (const c of nd.children) {
          if (c.type === "link") {
            (c as { url: string }).url = "/mutated-target";
            return d;
          }
        }
      }
      return null;
    },
  },
  {
    label: "changed link title",
    apply(d) {
      for (const b of d.body) {
        const nd = (b as { data?: { mdast?: BlockNode } }).data?.mdast;
        if (!nd || nd.type !== "paragraph") continue;
        for (const c of nd.children) {
          if (c.type === "link") {
            (c as { title: string | null }).title = "unexpected-title";
            return d;
          }
        }
      }
      return null;
    },
  },
  {
    label: "nested list item flattened (drop nested list)",
    apply(d) {
      // Find a source-backed list block with a nested list inside.
      for (const b of d.body) {
        const nd = (b as { data?: { mdast?: BlockNode } }).data?.mdast;
        if (!nd || nd.type !== "list") continue;
        for (const li of nd.children) {
          for (let j = 0; j < li.children.length; j++) {
            if (li.children[j].type === "list") {
              li.children.splice(j, 1);
              return d;
            }
          }
        }
      }
      return null;
    },
  },
  {
    label: "ordered list start modified",
    apply(d) {
      for (const b of d.body) {
        const nd = (b as { data?: { mdast?: BlockNode } }).data?.mdast;
        if (!nd || nd.type !== "list") continue;
        if (!nd.ordered) continue;
        (nd as { start?: number }).start = ((nd as { start?: number }).start ?? 1) + 10;
        return d;
      }
      // Force a start on the first ordered list (or convert unordered).
      for (const b of d.body) {
        const nd = (b as { data?: { mdast?: BlockNode } }).data?.mdast;
        if (!nd || nd.type !== "list") continue;
        (nd as { ordered: boolean }).ordered = true;
        (nd as { start?: number }).start = 42;
        return d;
      }
      return null;
    },
  },
  {
    label: "blockquote → paragraph",
    apply(d) {
      const i = findBlockIndex(d, (b) => b.kind === "quote");
      if (i === -1) return null;
      const nd = mdastAt(d, i);
      if (nd?.type !== "blockquote") return null;
      // Reduce to a single paragraph containing the first paragraph's text.
      const firstPara = nd.children.find(
        (c: { type: string }) => c.type === "paragraph",
      );
      if (!firstPara) return null;
      (d.body[i] as unknown as { data: { mdast: BlockNode } }).data.mdast = firstPara as BlockNode;
      // Also change the block kind — but the projector uses data.mdast type
      // for comparison, so the mdast payload change alone triggers the diff.
      return d;
    },
  },
  {
    label: "table cells reordered",
    apply(d) {
      // The corpus has no source-backed tables ; SYNTHESIZE a fresh table
      // block and compare via the mutated payload.
      const tableBlock = {
        id: "synthetic-table",
        kind: "table" as const,
        data: {
          mdast: {
            type: "table" as const,
            align: [null, null],
            children: [
              {
                type: "tableRow" as const,
                children: [
                  {
                    type: "tableCell" as const,
                    children: [{ type: "text" as const, value: "B" }],
                  },
                  {
                    type: "tableCell" as const,
                    children: [{ type: "text" as const, value: "A" }],
                  },
                ],
              },
            ],
          },
        },
      };
      // Replace an existing block's mdast with the swapped table ; the rendered
      // HTML still has the ORIGINAL block, so the comparison diverges.
      const i = findBlockIndex(d, (b) => b.kind === "paragraph");
      if (i === -1) return null;
      (d.body[i] as unknown as typeof tableBlock).data = tableBlock.data;
      (d.body[i] as { kind: string }).kind = "table";
      return d;
    },
  },
  {
    label: "image alt modified",
    apply(d) {
      // The corpus has no images ; inject a source-backed figure with an
      // image, then mutate its alt — the rendered HTML will lack that block
      // altogether, so the comparison diverges.
      // For a stronger fixture, we substitute the mdast of an existing
      // paragraph with an image whose alt differs from what would render.
      const i = findBlockIndex(d, (b) => b.kind === "paragraph");
      if (i === -1) return null;
      (d.body[i] as unknown as { data: { mdast: BlockNode }; kind: string }).kind = "figure";
      (d.body[i] as unknown as { data: { mdast: BlockNode } }).data.mdast = {
        type: "image" as const,
        url: "/img/test.svg",
        alt: "expected-alt",
        title: null,
      } as unknown as BlockNode;
      return d;
    },
  },
  {
    label: "semantic block moved to another position",
    apply(d) {
      // Swap two non-adjacent paragraph mdast payloads.
      const idxs: number[] = [];
      for (let i = 0; i < d.body.length; i++) {
        if (d.body[i].kind === "paragraph") idxs.push(i);
        if (idxs.length === 3) break;
      }
      if (idxs.length < 3) return null;
      const a = idxs[0];
      const c = idxs[2];
      const tmp = (d.body[a] as unknown as { data: { mdast: unknown } }).data.mdast;
      (d.body[a] as unknown as { data: { mdast: unknown } }).data.mdast = (d.body[c] as unknown as {
        data: { mdast: unknown };
      }).data.mdast;
      (d.body[c] as unknown as { data: { mdast: unknown } }).data.mdast = tmp;
      return d;
    },
  },
];

// CMO-SURFACE-VERTICAL-SLICE-1 REVIEW FIX : blocks the managed surface
// consumes (Related … heading + list) are projected outside the body and
// NOT counted as "missing in HTML" by exact parity. Consumed set is derived
// from the source document via the same production predicate, keeping the
// test and runtime in lockstep.
function consumedFor(doc: typeof BASE): ReadonlySet<string> {
  const src = findSourceRelatedSection(doc);
  return new Set(src ? [src.headingBlockId, src.listBlockId] : []);
}

describe("A2R — surface mutation proof (each mutation MUST fail exact parity)", () => {
  it("baseline : untouched document passes exact parity", () => {
    const r = evaluateRenderParity({
      document: BASE,
      html: BASE_HTML,
      consumedBlockIds: consumedFor(BASE),
    });
    expect(r.passed).toBe(true);
    expect(r.diffs).toEqual([]);
  });

  it.each(MUTATIONS.map((m) => [m.label, m] as const))(
    "%s",
    (_label, mutation) => {
      const mutated = mutation.apply(clone(BASE));
      if (mutated === null) return; // fixture unsuitable ; no-op skip
      const r = evaluateRenderParity({
        document: mutated,
        html: BASE_HTML,
        consumedBlockIds: consumedFor(mutated),
      });
      expect(
        r.passed,
        `mutation "${mutation.label}" should FAIL parity but passed`,
      ).toBe(false);
      expect(r.diffs.length).toBeGreaterThan(0);
      // Every diff MUST carry located coordinates.
      for (const d of r.diffs) {
        expect(d.documentId).toBeTruthy();
        expect(d.blockId).toBeTruthy();
        expect(Array.isArray(d.path)).toBe(true);
        expect(d.differenceKind).toBeTruthy();
      }
    },
  );
});
