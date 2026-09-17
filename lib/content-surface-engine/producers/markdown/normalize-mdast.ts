// A1R Phase 2 — mdast normalizer.
//
// The normalizer's ONE job: strip parser-only artefacts so the roundtrip AST oracle
// compares apples to apples. It removes ONLY :
//   - `position` (line/column tracking added by parser)
//   - `data.hName`, `data.hProperties`, `data.hChildren` (HAST hints emitted by
//     remark-parse for downstream renderers ; not semantic)
//   - trailing empty-text-node whitespace between block nodes at parse time
//   - newline-normalized text content differences (\r\n vs \n) — Markdown line
//     endings are a syntax-level concern
//
// It PRESERVES :
//   - every node's `type` and `children` order
//   - heading `depth`
//   - list `ordered`, `start`, `spread`
//   - listItem `checked`, `spread`
//   - link `url`, `title`
//   - image `url`, `alt`, `title`
//   - inlineCode `value`
//   - text `value` (only line endings normalized)
//   - html raw value (crucial — the CTA marker rides here)
//   - table `align`
//   - blockquote structure
//
// Any change that would let a semantically-distinct input normalize equal is a bug in
// this file. See tests/a1r-normalizer-regression.test.ts for the must-differ corpus.

import type { Root, RootContent, Text } from "mdast";

type AnyNode = { type: string; children?: AnyNode[]; [key: string]: unknown };

const STRIP_KEYS = new Set(["position"]);
// data.hName / data.hProperties / data.hChildren are HAST projection hints (used by
// remark-rehype). They aren't semantic — they describe how the node WOULD render.
const STRIP_DATA_KEYS = new Set(["hName", "hProperties", "hChildren"]);

/**
 * Return a NEW normalized copy of the tree. The input is not mutated. The output
 * contains only semantic fields ; downstream equality can be a deep-equal.
 */
export function normalizeMdast<T extends Root | RootContent>(node: T): T {
  return normalizeNode(node as unknown as AnyNode) as unknown as T;
}

function normalizeNode(node: AnyNode): AnyNode {
  const out: AnyNode = { type: node.type };
  for (const key of Object.keys(node).sort()) {
    if (STRIP_KEYS.has(key)) continue;
    if (key === "type") continue;
    if (key === "children") continue;
    if (key === "data" && node.data && typeof node.data === "object") {
      const cleaned: Record<string, unknown> = {};
      for (const dk of Object.keys(node.data as Record<string, unknown>).sort()) {
        if (STRIP_DATA_KEYS.has(dk)) continue;
        cleaned[dk] = (node.data as Record<string, unknown>)[dk];
      }
      if (Object.keys(cleaned).length > 0) out.data = cleaned;
      continue;
    }
    if (key === "value" && typeof node.value === "string") {
      // Text / inlineCode / html value : only normalize line endings. Never trim,
      // never lowercase, never collapse whitespace.
      out.value = String(node.value).replace(/\r\n/g, "\n");
      continue;
    }
    out[key] = (node as Record<string, unknown>)[key];
  }
  if (Array.isArray(node.children)) {
    out.children = node.children
      .map((c) => normalizeNode(c as AnyNode))
      .filter((c) => !isEmptyText(c));
  }
  return out;
}

/**
 * Empty text nodes can appear as parser artefacts between block boundaries. We drop
 * ONLY nodes that are demonstrably empty text — never a text node with real content,
 * never an empty inlineCode (which is semantically different from an absent one).
 */
function isEmptyText(node: AnyNode): boolean {
  if (node.type !== "text") return false;
  const value = (node as unknown as Text).value;
  return value === "" || value === undefined;
}
