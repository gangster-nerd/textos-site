// A1R Phase 2 — ContentDocument body → mdast reconstruction.
//
// The reverse direction is trivial by construction : every ContentBlock produced by
// `mdastToContentBody` carries the exact original mdast subtree under `data.mdast`.
// The reverse compiler simply reads that subtree back and packages it into a Root.
//
// Blocks that did NOT come from the Markdown compiler (e.g. `related_content_slot`
// injected by the A3 migration script for surface-policy binding) are IGNORED here —
// they are not part of the authoritative Markdown corpus and would not roundtrip.
// The mission's fidelity oracle compares mdast obtained from parsing the *round-
// tripped Markdown*, so anything the reverse compiler emits back to Markdown must
// come from the authoritative Markdown in the first place.

import type { Root, RootContent } from "mdast";

import type { ContentDocument } from "../../contract/content-document";

export function contentDocumentToMdast(document: ContentDocument): Root {
  const children: RootContent[] = [];
  for (const block of document.body) {
    const carried = (block.data as Record<string, unknown> | undefined)?.mdast;
    if (!carried) {
      // Non-authoritative synthetic block (e.g. related_content_slot). Skip cleanly.
      continue;
    }
    children.push(carried as RootContent);
  }
  return { type: "root", children } as Root;
}
