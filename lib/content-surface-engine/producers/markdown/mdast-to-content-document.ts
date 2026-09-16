// A1R Phase 2 — mdast → ContentDocument body compilation.
//
// The compiler carries every top-level mdast node into exactly ONE ContentBlock.
// The full mdast subtree lives under `data.mdast` — LOSSLESS. Inline formatting,
// list nesting, table cells, images, blockquote structure are ALL preserved in the
// carried subtree.
//
// Kind mapping (mdast → ContentBlock.kind) :
//   heading                 → "heading"          (level carried on ContentBlock too)
//   paragraph               → "paragraph"
//   list                    → "steps"            (ordered/unordered both ; `data.mdast.ordered`
//                                                 preserves the distinction losslessly)
//   blockquote              → "quote"
//   table                   → "table"
//   thematicBreak           → "callout"          (semantic hint — visual is A2R)
//   image (top level)       → "figure"
//   code                    → "callout"          (fenced code as callout ; A2R can style)
//   html("<!-- cta:contextual -->") → "cta_slot" with slot="primary-cta"
//   any other raw html      → INGESTION FAILURE
//   definition/references   → carried in-place ; roundtripped by the stringifier
//
// Every produced block has a stable, content-derived id so the diff of two
// ContentDocuments is meaningful. The oracle DOES NOT rely on ids to verify
// fidelity — it re-parses the round-tripped Markdown and compares mdast — so id
// churn NEVER masks a real semantic loss.

import { createHash } from "node:crypto";
import type { Root, RootContent } from "mdast";

import type { ContentBlock, BlockKind } from "../../contract/content-document";

export const CTA_MARKER_LITERAL = "<!-- cta:contextual -->" as const;

export interface IngestionFailure {
  /** Path into the mdast tree where the failure occurred. */
  path: readonly (string | number)[];
  message: string;
  node: unknown;
}

export interface CompiledBody {
  blocks: ContentBlock[];
  failures: IngestionFailure[];
}

/**
 * Compile the mdast Root children (top-level blocks) into ContentBlocks. Unknown or
 * unsupported top-level shapes are reported as failures. The caller decides whether to
 * throw — the compiler itself never fabricates.
 */
export function mdastToContentBody(root: Root): CompiledBody {
  const blocks: ContentBlock[] = [];
  const failures: IngestionFailure[] = [];

  root.children.forEach((node, i) => {
    const path = ["children", i] as const;
    const result = compileTopLevel(node, path);
    if ("failure" in result) failures.push(result.failure);
    else blocks.push(result.block);
  });

  return { blocks, failures };
}

type CompileResult =
  | { block: ContentBlock }
  | { failure: IngestionFailure };

function compileTopLevel(node: RootContent, path: readonly (string | number)[]): CompileResult {
  const stableId = deriveBlockId(node);

  switch (node.type) {
    case "heading": {
      return {
        block: {
          id: `h-${stableId}`,
          kind: "heading" satisfies BlockKind,
          level: node.depth,
          data: { mdast: stripPosition(node) },
        },
      };
    }
    case "paragraph": {
      return {
        block: {
          id: `p-${stableId}`,
          kind: "paragraph" satisfies BlockKind,
          data: { mdast: stripPosition(node) },
        },
      };
    }
    case "list": {
      return {
        block: {
          id: `l-${stableId}`,
          kind: "steps" satisfies BlockKind,
          data: { mdast: stripPosition(node) },
        },
      };
    }
    case "blockquote": {
      return {
        block: {
          id: `q-${stableId}`,
          kind: "quote" satisfies BlockKind,
          data: { mdast: stripPosition(node) },
        },
      };
    }
    case "table": {
      return {
        block: {
          id: `t-${stableId}`,
          kind: "table" satisfies BlockKind,
          data: { mdast: stripPosition(node) },
        },
      };
    }
    case "code": {
      return {
        block: {
          id: `c-${stableId}`,
          kind: "callout" satisfies BlockKind,
          data: { mdast: stripPosition(node) },
        },
      };
    }
    case "thematicBreak": {
      return {
        block: {
          id: `hr-${stableId}`,
          kind: "callout" satisfies BlockKind,
          data: { mdast: stripPosition(node) },
        },
      };
    }
    case "image": {
      return {
        block: {
          id: `img-${stableId}`,
          kind: "figure" satisfies BlockKind,
          data: { mdast: stripPosition(node) },
        },
      };
    }
    case "html": {
      const value = node.value ?? "";
      if (value.trim() === CTA_MARKER_LITERAL) {
        return {
          block: {
            id: `cta-${stableId}`,
            kind: "cta_slot" satisfies BlockKind,
            slot: "primary-cta",
            data: { mdast: stripPosition(node) },
          },
        };
      }
      return {
        failure: {
          path,
          message: `unsupported raw HTML in authoritative source: ${value.slice(0, 80)}`,
          node,
        },
      };
    }
    case "definition":
    case "footnoteDefinition": {
      // Reference definitions are structural but do not stand as visible blocks. Carry
      // them lossless in a dedicated `source` block so roundtripping the ContentDocument
      // back to Markdown emits them at the right offset.
      return {
        block: {
          id: `def-${stableId}`,
          kind: "source" satisfies BlockKind,
          data: { mdast: stripPosition(node) },
        },
      };
    }
    default: {
      return {
        failure: {
          path,
          message: `unsupported top-level mdast node type "${(node as { type: string }).type}"`,
          node,
        },
      };
    }
  }
}

/**
 * Recursively strip `position` metadata from every node while preserving semantics.
 * The subtree we carry under `data.mdast` is the same one the reverse compiler will
 * feed back to `remark-stringify`.
 */
function stripPosition<T>(node: T): T {
  if (Array.isArray(node)) return node.map(stripPosition) as unknown as T;
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "position") continue;
      out[k] = stripPosition(v);
    }
    return out as unknown as T;
  }
  return node;
}

/** Derive a stable, content-based id fragment. Used for readability only. */
function deriveBlockId(node: RootContent): string {
  const src = JSON.stringify(stripPosition(node));
  return createHash("sha1").update(src).digest("hex").slice(0, 12);
}
