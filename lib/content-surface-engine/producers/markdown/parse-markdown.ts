// A1R Phase 2 — deterministic Markdown parse + stringify pipeline.
//
// Direct declared dependencies (unified, remark-parse, remark-stringify, remark-gfm)
// — no reliance on transitive resolution from `react-markdown`. If any of these
// change API, the failure is loud, immediate, and confined to this module.

import { unified, type Processor } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";

// Stringify options that keep the emitter deterministic across environments AND
// close to the source style the authoritative Markdown uses. If the source style
// evolves (e.g. `_emphasis_` → `*emphasis*`), tweak here — never in the normalizer.
const STRINGIFY_OPTIONS = {
  bullet: "-" as const,
  emphasis: "*" as const,
  strong: "*" as const,
  fence: "`" as const,
  fences: true,
  incrementListMarker: true,
  listItemIndent: "one" as const,
  rule: "-" as const,
  ruleSpaces: false,
  setext: false,
  tightDefinitions: false,
  handlers: {},
} as const;

function processor(): Processor<Root, Root, Root, Root, string> {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify, STRINGIFY_OPTIONS) as unknown as Processor<
    Root,
    Root,
    Root,
    Root,
    string
  >;
}

export function parseMarkdown(source: string): Root {
  const proc = processor();
  return proc.parse(source) as Root;
}

export function stringifyMarkdown(tree: Root): string {
  const proc = processor();
  // `.stringify` respects the STRINGIFY_OPTIONS injected above.
  return proc.stringify(tree) as string;
}

/** Convenience: round-trip source through parse → stringify → parse for oracle use. */
export function roundtripToAst(source: string): Root {
  const first = parseMarkdown(source);
  const emitted = stringifyMarkdown(first);
  return parseMarkdown(emitted);
}
