// A2R-SURFACE-SEAL-1 — exact ContentDocument → rendered HTML parity gate.
//
//   ContentDocument
//         ↓
//   REFERENCE render
//         ↓
//   HTML semantic projection  ==  mdast semantic projection
//
// Presentation-only wrappers/classes are IGNORED. Semantic structure is NOT.
// Return LOCATED DIFFS : documentId, blockId, semantic path, expected, actual,
// difference kind.

import type { ContentDocument } from "../../contract/content-document";
import type { BlockNode } from "../../contract/mdast-semantic";

import {
  loadArticleFragment,
  findBlockNode,
  projectBlock,
  type ProjectedBlock,
  type ProjectedPhrasing,
} from "./html-projection";
import { projectMdastBlock } from "./mdast-projection";

export interface RenderParityLocatedDiff {
  documentId: string;
  blockId: string;
  path: readonly (string | number)[];
  expected: unknown;
  actual: unknown;
  differenceKind:
    | "block-missing-in-html"
    | "block-extra-in-html"
    | "type-mismatch"
    | "value-mismatch"
    | "children-length-mismatch"
    | "leaf-mismatch";

  message: string;
}

export interface RenderParityResult {
  documentId: string;
  passed: boolean;
  blocksChecked: number;
  diffs: RenderParityLocatedDiff[];
}

export function evaluateRenderParity(input: {
  document: ContentDocument;
  html: string;
  /**
   * CMO-SURFACE-VERTICAL-SLICE-1 REVIEW FIX : block ids that the managed
   * surface intentionally consumes (re-projects outside of the body — the
   * "Related …" heading + following list). Parity treats these as neither
   * "missing in HTML" nor "extra in HTML". Preservation of their substantive
   * content (governed links) is the responsibility of the projection tests,
   * not this exact-parity check.
   */
  consumedBlockIds?: ReadonlySet<string>;
}): RenderParityResult {
  const $ = loadArticleFragment(input.html);
  const diffs: RenderParityLocatedDiff[] = [];
  let blocksChecked = 0;
  const consumed = input.consumedBlockIds ?? new Set<string>();

  // Detect EXTRA blocks in HTML that source no longer knows about (e.g. the
  // caller deleted a paragraph from the ContentDocument but the HTML still
  // renders it). Also detect MISSING blocks (source expects them but HTML
  // dropped them).
  const documentBlockIds = new Set(
    input.document.body
      .filter((b) => (b.data as { mdast?: unknown } | undefined)?.mdast)
      .map((b) => b.id),
  );
  const htmlBodyBlockIds = new Set<string>();
  $("[data-cse-block-id]").each((_: number, el: unknown) => {
    const id = ($(el as never).attr("data-cse-block-id") ?? "") as string;
    if (!id) return;
    // Only count blocks emitted by the reference-renderer's body wrapper (skip
    // slot/related placeholders, which the ManagedTextosSurface renders WITHIN
    // the body flow with their own data-cse-block-id but no mdast payload).
    if (id.startsWith("cta-") || id === "related" || id === "answer") return;
    if (consumed.has(id)) return;
    htmlBodyBlockIds.add(id);
  });
  for (const htmlId of htmlBodyBlockIds) {
    if (!documentBlockIds.has(htmlId)) {
      diffs.push({
        documentId: input.document.identity.documentId,
        blockId: htmlId,
        path: [],
        expected: null,
        actual: htmlId,
        differenceKind: "block-extra-in-html",
        message: `block "${htmlId}" rendered in HTML but absent from ContentDocument`,
      });
    }
  }

  for (const block of input.document.body) {
    const mdast = (block.data as { mdast?: unknown } | undefined)?.mdast;
    if (!mdast || typeof mdast !== "object") continue; // synthetic block; skip
    if (consumed.has(block.id)) continue; // projected outside body flow
    blocksChecked += 1;
    const expected = projectMdastBlock(mdast as BlockNode);
    if (expected === null) continue; // e.g. html marker → nothing rendered

    const el = findBlockNode($, block.id);
    if (!el) {
      diffs.push({
        documentId: input.document.identity.documentId,
        blockId: block.id,
        path: [],
        expected,
        actual: null,
        differenceKind: "block-missing-in-html",
        message: `block "${block.id}" not present in rendered HTML`,
      });
      continue;
    }
    const actual = projectBlock($, el);
    if (actual === null) {
      diffs.push({
        documentId: input.document.identity.documentId,
        blockId: block.id,
        path: [],
        expected,
        actual: null,
        differenceKind: "block-missing-in-html",
        message: `block "${block.id}" DOM subtree was empty or unrecognized`,
      });
      continue;
    }
    compareBlock(expected, actual, block.id, input.document.identity.documentId, [], diffs);
  }
  return {
    documentId: input.document.identity.documentId,
    passed: diffs.length === 0,
    blocksChecked,
    diffs,
  };
}

function compareBlock(
  expected: ProjectedBlock,
  actual: ProjectedBlock,
  blockId: string,
  documentId: string,
  path: readonly (string | number)[],
  diffs: RenderParityLocatedDiff[],
): void {
  if (expected.type !== actual.type) {
    diffs.push({
      documentId,
      blockId,
      path: [...path, "type"],
      expected: expected.type,
      actual: actual.type,
      differenceKind: "type-mismatch",
      message: `block type mismatch (expected ${expected.type}, got ${actual.type})`,
    });
    return;
  }
  switch (expected.type) {
    case "paragraph":
    case "heading": {
      if (expected.type === "heading") {
        const a = actual as { depth: number };
        if ((expected as { depth: number }).depth !== a.depth) {
          diffs.push({
            documentId,
            blockId,
            path: [...path, "depth"],
            expected: (expected as { depth: number }).depth,
            actual: a.depth,
            differenceKind: "value-mismatch",
            message: `heading depth mismatch`,
          });
        }
      }
      comparePhrasing(
        (expected as { children: ProjectedPhrasing[] }).children,
        (actual as { children: ProjectedPhrasing[] }).children,
        blockId,
        documentId,
        [...path, "children"],
        diffs,
      );
      return;
    }
    case "list": {
      const e = expected as { ordered: boolean; start: number | null; children: unknown[] };
      const a = actual as { ordered: boolean; start: number | null; children: unknown[] };
      if (e.ordered !== a.ordered) {
        diffs.push({
          documentId,
          blockId,
          path: [...path, "ordered"],
          expected: e.ordered,
          actual: a.ordered,
          differenceKind: "value-mismatch",
          message: `list ordered mismatch`,
        });
      }
      if ((e.start ?? null) !== (a.start ?? null)) {
        diffs.push({
          documentId,
          blockId,
          path: [...path, "start"],
          expected: e.start,
          actual: a.start,
          differenceKind: "value-mismatch",
          message: `list start mismatch`,
        });
      }
      compareArray(
        e.children as ProjectedBlock[],
        a.children as ProjectedBlock[],
        blockId,
        documentId,
        [...path, "children"],
        diffs,
        "list-item",
      );
      return;
    }
    case "blockquote": {
      compareArray(
        (expected as { children: ProjectedBlock[] }).children,
        (actual as { children: ProjectedBlock[] }).children,
        blockId,
        documentId,
        [...path, "children"],
        diffs,
        "block",
      );
      return;
    }
    case "table": {
      const eRows = (expected as { children: unknown[] }).children as Array<{
        children: Array<{ children: ProjectedPhrasing[] }>;
      }>;
      const aRows = (actual as { children: unknown[] }).children as Array<{
        children: Array<{ children: ProjectedPhrasing[] }>;
      }>;
      if (eRows.length !== aRows.length) {
        diffs.push({
          documentId,
          blockId,
          path: [...path, "rows.length"],
          expected: eRows.length,
          actual: aRows.length,
          differenceKind: "children-length-mismatch",
          message: `table row count mismatch`,
        });
      }
      const rows = Math.min(eRows.length, aRows.length);
      for (let i = 0; i < rows; i++) {
        const eCells = eRows[i].children;
        const aCells = aRows[i].children;
        if (eCells.length !== aCells.length) {
          diffs.push({
            documentId,
            blockId,
            path: [...path, "rows", i, "cells.length"],
            expected: eCells.length,
            actual: aCells.length,
            differenceKind: "children-length-mismatch",
            message: `table row ${i} cell count mismatch`,
          });
          continue;
        }
        for (let c = 0; c < eCells.length; c++) {
          comparePhrasing(
            eCells[c].children,
            aCells[c].children,
            blockId,
            documentId,
            [...path, "rows", i, "cells", c, "children"],
            diffs,
          );
        }
      }
      return;
    }
    case "code": {
      const e = (expected as { value: string }).value;
      const a = (actual as { value: string }).value;
      if (e.trim() !== a.trim()) {
        diffs.push({
          documentId,
          blockId,
          path: [...path, "value"],
          expected: e,
          actual: a,
          differenceKind: "value-mismatch",
          message: `code value mismatch`,
        });
      }
      return;
    }
    case "thematicBreak":
      return;
    case "image": {
      const e = expected as { url: string; alt: string | null; title: string | null };
      const a = actual as { url: string; alt: string | null; title: string | null };
      if (e.url !== a.url) {
        diffs.push({
          documentId,
          blockId,
          path: [...path, "url"],
          expected: e.url,
          actual: a.url,
          differenceKind: "value-mismatch",
          message: `image url mismatch`,
        });
      }
      if ((e.alt ?? "") !== (a.alt ?? "")) {
        diffs.push({
          documentId,
          blockId,
          path: [...path, "alt"],
          expected: e.alt,
          actual: a.alt,
          differenceKind: "value-mismatch",
          message: `image alt mismatch`,
        });
      }
      if ((e.title ?? "") !== (a.title ?? "")) {
        diffs.push({
          documentId,
          blockId,
          path: [...path, "title"],
          expected: e.title,
          actual: a.title,
          differenceKind: "value-mismatch",
          message: `image title mismatch`,
        });
      }
      return;
    }
  }
}

function compareArray(
  expected: ProjectedBlock[] | Array<{ type: "listItem"; children: ProjectedBlock[] }>,
  actual: ProjectedBlock[] | Array<{ type: "listItem"; children: ProjectedBlock[] }>,
  blockId: string,
  documentId: string,
  path: readonly (string | number)[],
  diffs: RenderParityLocatedDiff[],
  role: "block" | "list-item",
): void {
  if (expected.length !== actual.length) {
    diffs.push({
      documentId,
      blockId,
      path: [...path, "length"],
      expected: expected.length,
      actual: actual.length,
      differenceKind: "children-length-mismatch",
      message: `${role} count mismatch (expected ${expected.length}, got ${actual.length})`,
    });
  }
  const n = Math.min(expected.length, actual.length);
  for (let i = 0; i < n; i++) {
    if (role === "list-item") {
      const e = (expected as Array<{ type: "listItem"; children: ProjectedBlock[] }>)[i];
      const a = (actual as Array<{ type: "listItem"; children: ProjectedBlock[] }>)[i];
      compareArray(e.children, a.children, blockId, documentId, [...path, i, "children"], diffs, "block");
    } else {
      compareBlock(
        (expected as ProjectedBlock[])[i],
        (actual as ProjectedBlock[])[i],
        blockId,
        documentId,
        [...path, i],
        diffs,
      );
    }
  }
}

function comparePhrasing(
  expected: ProjectedPhrasing[],
  actual: ProjectedPhrasing[],
  blockId: string,
  documentId: string,
  path: readonly (string | number)[],
  diffs: RenderParityLocatedDiff[],
): void {
  if (expected.length !== actual.length) {
    diffs.push({
      documentId,
      blockId,
      path: [...path, "length"],
      expected: expected.length,
      actual: actual.length,
      differenceKind: "children-length-mismatch",
      message: `phrasing count mismatch (expected ${expected.length}, got ${actual.length})`,
    });
  }
  const n = Math.min(expected.length, actual.length);
  for (let i = 0; i < n; i++) {
    comparePhrasingNode(expected[i], actual[i], blockId, documentId, [...path, i], diffs);
  }
}

function comparePhrasingNode(
  expected: ProjectedPhrasing,
  actual: ProjectedPhrasing,
  blockId: string,
  documentId: string,
  path: readonly (string | number)[],
  diffs: RenderParityLocatedDiff[],
): void {
  if (expected.type !== actual.type) {
    diffs.push({
      documentId,
      blockId,
      path: [...path, "type"],
      expected: expected.type,
      actual: actual.type,
      differenceKind: "type-mismatch",
      message: `phrasing type mismatch (expected ${expected.type}, got ${actual.type})`,
    });
    return;
  }
  switch (expected.type) {
    case "text":
    case "inlineCode": {
      // Compare normalized text content ; the html-projection collapsed
      // whitespace, so both sides are already single-spaced.
      const e = (expected as { value: string }).value.trim();
      const a = (actual as { value: string }).value.trim();
      if (e !== a) {
        diffs.push({
          documentId,
          blockId,
          path: [...path, "value"],
          expected: e,
          actual: a,
          differenceKind: "leaf-mismatch",
          message: `text/inlineCode value mismatch`,
        });
      }
      return;
    }
    case "break":
      return;
    case "strong":
    case "emphasis":
      comparePhrasing(
        (expected as { children: ProjectedPhrasing[] }).children,
        (actual as { children: ProjectedPhrasing[] }).children,
        blockId,
        documentId,
        [...path, "children"],
        diffs,
      );
      return;
    case "link": {
      const e = expected as { url: string; title: string | null; children: ProjectedPhrasing[] };
      const a = actual as { url: string; title: string | null; children: ProjectedPhrasing[] };
      if (e.url !== a.url) {
        diffs.push({
          documentId,
          blockId,
          path: [...path, "url"],
          expected: e.url,
          actual: a.url,
          differenceKind: "value-mismatch",
          message: `link href mismatch`,
        });
      }
      if ((e.title ?? "") !== (a.title ?? "")) {
        diffs.push({
          documentId,
          blockId,
          path: [...path, "title"],
          expected: e.title,
          actual: a.title,
          differenceKind: "value-mismatch",
          message: `link title mismatch`,
        });
      }
      comparePhrasing(e.children, a.children, blockId, documentId, [...path, "children"], diffs);
      return;
    }
    case "image": {
      const e = expected as { url: string; alt: string | null; title: string | null };
      const a = actual as { url: string; alt: string | null; title: string | null };
      if (e.url !== a.url || (e.alt ?? "") !== (a.alt ?? "") || (e.title ?? "") !== (a.title ?? "")) {
        diffs.push({
          documentId,
          blockId,
          path,
          expected: e,
          actual: a,
          differenceKind: "value-mismatch",
          message: `image mismatch`,
        });
      }
      return;
    }
  }
}
