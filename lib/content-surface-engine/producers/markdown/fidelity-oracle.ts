// A1R Phase 2 — Markdown fidelity oracle.
//
//   SOURCE_AST   = normalize(parse(authoritativeMarkdown))
//   ROUNDTRIP_AST = normalize(parse(stringify(reverse(compile(parse(authoritativeMarkdown))))))
//
// FIDELITY iff SOURCE_AST === ROUNDTRIP_AST (deep, semantic).
//
// On failure, a LOCATED diff : mdast paths + nearest ContentDocument block id.

import type { Root } from "mdast";

import type { ContentBlock } from "../../contract/content-document";
import { mdastToContentBody, type IngestionFailure } from "./mdast-to-content-document";
import { contentDocumentToMdast } from "./content-document-to-mdast";
import { normalizeMdast } from "./normalize-mdast";
import { parseMarkdown, stringifyMarkdown } from "./parse-markdown";

export interface FidelityLocatedDiff {
  sourcePath: readonly (string | number)[];
  roundtripPath: readonly (string | number)[];
  nearestBlockId?: string;
  expected: unknown;
  actual: unknown;
  differenceKind:
    | "missing-in-roundtrip"
    | "extra-in-roundtrip"
    | "type-mismatch"
    | "value-mismatch"
    | "children-length-mismatch"
    | "leaf-mismatch";
  path: readonly (string | number)[];
}

export interface MarkdownFidelityResult {
  passed: boolean;
  ingestionFailures: readonly IngestionFailure[];
  diffs: readonly FidelityLocatedDiff[];
  sourceCounts: SemanticCounts;
  roundtripCounts: SemanticCounts;
  blocks: readonly ContentBlock[];
}

export interface SemanticCounts {
  words: number;
  headings: number;
  paragraphs: number;
  lists: number;
  listItems: number;
  links: number;
  strong: number;
  emphasis: number;
  inlineCode: number;
  breaks: number;
  images: number;
  blockquotes: number;
  tables: number;
  tableCells: number;
  ctaMarkers: number;
}

/**
 * Run the fidelity oracle on an authoritative Markdown source. Returns the compiled
 * blocks alongside the pass/fail verdict and, on failure, structural diffs anchored
 * back to source paths and ContentDocument block ids.
 */
export function evaluateMarkdownFidelity(source: string): MarkdownFidelityResult {
  const sourceAst = parseMarkdown(source);
  const compiled = mdastToContentBody(sourceAst);

  if (compiled.failures.length > 0) {
    return {
      passed: false,
      ingestionFailures: compiled.failures,
      diffs: [],
      sourceCounts: countSemantics(sourceAst),
      roundtripCounts: emptyCounts(),
      blocks: compiled.blocks,
    };
  }

  // Reverse : blocks → mdast → markdown → parse.
  const reverseTree = contentDocumentToMdast({
    contentSchemaVersion: "content-document@1",
    identity: {
      documentId: "oracle:internal",
      contentType: "product_article",
      slug: "oracle-internal",
      language: "en",
      title: "oracle",
      description: "oracle internal, not surfaced",
    },
    editorial: { authorIds: [], reviewerIds: [], topicIds: [] },
    truth: {
      statusVocabulary: "oracle",
      statusVocabularyVersion: "v1",
      sourceStatus: "oracle",
      publicationStatus: "draft",
      allowedSurfaces: ["reference"],
      claimIds: [],
      evidenceRefs: [],
      capabilityIds: [],
    },
    provenance: { sourceAuthority: "UNCERTIFIED" },
    body: compiled.blocks,
    relationships: { relatedContentIds: [] },
    conversion: { conversionAllowed: false },
    lifecycle: {},
    seo: { indexingIntent: "noindex" },
  });

  const roundtripSource = stringifyMarkdown(reverseTree);
  const roundtripAst = parseMarkdown(roundtripSource);

  const normalizedSource = normalizeMdast(sourceAst);
  const normalizedRoundtrip = normalizeMdast(roundtripAst);

  const diffs: FidelityLocatedDiff[] = [];
  compareNode(normalizedSource, normalizedRoundtrip, [], compiled.blocks, diffs);

  return {
    passed: diffs.length === 0,
    ingestionFailures: [],
    diffs,
    sourceCounts: countSemantics(sourceAst),
    roundtripCounts: countSemantics(roundtripAst),
    blocks: compiled.blocks,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Semantic node comparison producing located diffs.
// ─────────────────────────────────────────────────────────────────────────────────

type AnyNode = { type: string; children?: AnyNode[]; [key: string]: unknown };

function compareNode(
  expected: unknown,
  actual: unknown,
  path: readonly (string | number)[],
  blocks: readonly ContentBlock[],
  out: FidelityLocatedDiff[],
): void {
  if (expected === actual) return;
  if (
    expected === undefined ||
    actual === undefined ||
    typeof expected !== typeof actual
  ) {
    out.push(diff(path, expected, actual, "type-mismatch", blocks));
    return;
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      out.push(diff(path, expected, actual, "type-mismatch", blocks));
      return;
    }
    const len = Math.max(expected.length, actual.length);
    for (let i = 0; i < len; i++) {
      if (i >= expected.length)
        out.push(diff([...path, i], undefined, actual[i], "extra-in-roundtrip", blocks));
      else if (i >= actual.length)
        out.push(diff([...path, i], expected[i], undefined, "missing-in-roundtrip", blocks));
      else compareNode(expected[i], actual[i], [...path, i], blocks, out);
    }
    return;
  }
  if (typeof expected === "object" && typeof actual === "object" && expected && actual) {
    const eNode = expected as AnyNode;
    const aNode = actual as AnyNode;
    if (eNode.type !== aNode.type) {
      out.push(diff(path, eNode, aNode, "type-mismatch", blocks));
      return;
    }
    // Compare keys except children (children handled by recursion).
    const keys = new Set([
      ...Object.keys(eNode).filter((k) => k !== "children"),
      ...Object.keys(aNode).filter((k) => k !== "children"),
    ]);
    for (const k of keys) {
      const ev = eNode[k];
      const av = aNode[k];
      if (JSON.stringify(ev) === JSON.stringify(av)) continue;
      compareNode(ev, av, [...path, k], blocks, out);
    }
    // Compare children.
    if (eNode.children || aNode.children) {
      const ec = eNode.children ?? [];
      const ac = aNode.children ?? [];
      if (ec.length !== ac.length) {
        out.push(
          diff(
            [...path, "children.length"],
            ec.length,
            ac.length,
            "children-length-mismatch",
            blocks,
          ),
        );
      }
      const len = Math.max(ec.length, ac.length);
      for (let i = 0; i < len; i++) {
        if (i >= ec.length)
          out.push(
            diff(
              [...path, "children", i],
              undefined,
              ac[i],
              "extra-in-roundtrip",
              blocks,
            ),
          );
        else if (i >= ac.length)
          out.push(
            diff(
              [...path, "children", i],
              ec[i],
              undefined,
              "missing-in-roundtrip",
              blocks,
            ),
          );
        else compareNode(ec[i], ac[i], [...path, "children", i], blocks, out);
      }
    }
    return;
  }
  out.push(diff(path, expected, actual, "leaf-mismatch", blocks));
}

function diff(
  path: readonly (string | number)[],
  expected: unknown,
  actual: unknown,
  kind: FidelityLocatedDiff["differenceKind"],
  blocks: readonly ContentBlock[],
): FidelityLocatedDiff {
  return {
    sourcePath: path,
    roundtripPath: path,
    path,
    nearestBlockId: nearestBlockId(path, blocks),
    expected,
    actual,
    differenceKind: kind,
  };
}

function nearestBlockId(
  path: readonly (string | number)[],
  blocks: readonly ContentBlock[],
): string | undefined {
  // path is at the mdast root, so children[N] identifies the top-level block.
  const idx = path.findIndex((p) => p === "children");
  if (idx === -1 || idx + 1 >= path.length) return undefined;
  const blockIndex = path[idx + 1];
  if (typeof blockIndex !== "number") return undefined;
  return blocks[blockIndex]?.id;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Semantic counters — diagnostic only.
// ─────────────────────────────────────────────────────────────────────────────────

function emptyCounts(): SemanticCounts {
  return {
    words: 0,
    headings: 0,
    paragraphs: 0,
    lists: 0,
    listItems: 0,
    links: 0,
    strong: 0,
    emphasis: 0,
    inlineCode: 0,
    breaks: 0,
    images: 0,
    blockquotes: 0,
    tables: 0,
    tableCells: 0,
    ctaMarkers: 0,
  };
}

export function countSemantics(tree: Root): SemanticCounts {
  const c = emptyCounts();
  walk(tree as unknown as AnyNode, (n) => {
    switch (n.type) {
      case "heading":
        c.headings += 1;
        break;
      case "paragraph":
        c.paragraphs += 1;
        break;
      case "list":
        c.lists += 1;
        break;
      case "listItem":
        c.listItems += 1;
        break;
      case "link":
        c.links += 1;
        break;
      case "strong":
        c.strong += 1;
        break;
      case "emphasis":
        c.emphasis += 1;
        break;
      case "inlineCode":
        c.inlineCode += 1;
        break;
      case "break":
        c.breaks += 1;
        break;
      case "image":
        c.images += 1;
        break;
      case "blockquote":
        c.blockquotes += 1;
        break;
      case "table":
        c.tables += 1;
        break;
      case "tableCell":
        c.tableCells += 1;
        break;
      case "html":
        if ((n.value as string | undefined)?.trim() === "<!-- cta:contextual -->") {
          c.ctaMarkers += 1;
        }
        break;
      case "text": {
        const v = (n.value as string | undefined) ?? "";
        const w = v.match(/[\p{L}\p{N}]+/gu);
        c.words += w ? w.length : 0;
        break;
      }
    }
  });
  return c;
}

function walk(n: AnyNode, fn: (n: AnyNode) => void): void {
  fn(n);
  if (Array.isArray(n.children)) for (const c of n.children) walk(c, fn);
}
