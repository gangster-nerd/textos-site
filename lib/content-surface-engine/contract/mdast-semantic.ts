// A1R-CONTRACT-SEAL-1 — strict semantic tree schemas.
//
// These Zod schemas are the JSON-Schema-exposable representation of the mdast
// subset that A1R proved the TextOS Markdown producer to compile losslessly.
// The exported `contracts/content-document@1.schema.json` derives from these
// schemas via `z.toJSONSchema` — a downstream vendorer verifies the semantic
// tree with a JSON Schema validator alone.
//
// Invariants :
//   1. Every node is `.strict()` — additional properties fail.
//   2. Every `type` field is a literal.
//   3. Recursive shapes (Phrasing, Block, ListItem) use `z.lazy` + `z.union`
//      so their JSON Schema uses `anyOf` over concrete alternatives (never
//      `additionalProperties: {}`).
//   4. The ONLY authorised html value is the CTA marker literal.

import { z } from "zod";

// Forward declarations for recursive types.
export interface TextNode { type: "text"; value: string }
export interface BreakNode { type: "break" }
export interface InlineCodeNode { type: "inlineCode"; value: string }
export interface EmphasisNode { type: "emphasis"; children: PhrasingNode[] }
export interface StrongNode { type: "strong"; children: PhrasingNode[] }
export interface LinkNode {
  type: "link";
  url: string;
  title: string | null;
  children: PhrasingNode[];
}
export interface ImageNode {
  type: "image";
  url: string;
  alt: string | null;
  title: string | null;
}
export type PhrasingNode =
  | TextNode
  | BreakNode
  | InlineCodeNode
  | EmphasisNode
  | StrongNode
  | LinkNode
  | ImageNode;

// ─────────────────────────────────────────────────────────────────────────────────
// Phrasing schemas
// ─────────────────────────────────────────────────────────────────────────────────

export const TextNodeSchema = z
  .object({ type: z.literal("text"), value: z.string() })
  .strict();

export const BreakNodeSchema = z.object({ type: z.literal("break") }).strict();

export const InlineCodeNodeSchema = z
  .object({ type: z.literal("inlineCode"), value: z.string() })
  .strict();

export const ImageNodeSchema = z
  .object({
    type: z.literal("image"),
    url: z.string(),
    alt: z.string().nullable(),
    title: z.string().nullable(),
  })
  .strict();

export const PhrasingNodeSchema: z.ZodType<PhrasingNode> = z.lazy(() =>
  z.union([
    TextNodeSchema,
    BreakNodeSchema,
    InlineCodeNodeSchema,
    EmphasisNodeSchema,
    StrongNodeSchema,
    LinkNodeSchema,
    ImageNodeSchema,
  ]),
);

export const EmphasisNodeSchema: z.ZodType<EmphasisNode> = z.lazy(() =>
  z
    .object({
      type: z.literal("emphasis"),
      children: z.array(PhrasingNodeSchema),
    })
    .strict(),
);

export const StrongNodeSchema: z.ZodType<StrongNode> = z.lazy(() =>
  z
    .object({
      type: z.literal("strong"),
      children: z.array(PhrasingNodeSchema),
    })
    .strict(),
);

export const LinkNodeSchema: z.ZodType<LinkNode> = z.lazy(() =>
  z
    .object({
      type: z.literal("link"),
      url: z.string(),
      title: z.string().nullable(),
      children: z.array(PhrasingNodeSchema),
    })
    .strict(),
);

// ─────────────────────────────────────────────────────────────────────────────────
// Block-level types
// ─────────────────────────────────────────────────────────────────────────────────

export interface ParagraphNode { type: "paragraph"; children: PhrasingNode[] }
export interface HeadingNode {
  type: "heading";
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  children: PhrasingNode[];
}
export interface ListItemNode {
  type: "listItem";
  spread?: boolean;
  checked?: boolean | null;
  children: BlockNode[];
}
export interface ListNode {
  type: "list";
  ordered: boolean;
  start?: number | null;
  spread?: boolean;
  children: ListItemNode[];
}
export interface BlockquoteNode { type: "blockquote"; children: BlockNode[] }
export interface TableCellNode { type: "tableCell"; children: PhrasingNode[] }
export interface TableRowNode { type: "tableRow"; children: TableCellNode[] }
export type TableAlign = "left" | "right" | "center" | null;
export interface TableNode {
  type: "table";
  align: TableAlign[];
  children: TableRowNode[];
}
export interface CodeNode {
  type: "code";
  lang: string | null;
  meta: string | null;
  value: string;
}
export interface ThematicBreakNode { type: "thematicBreak" }
/** The one authorised raw-HTML node — exactly `<!-- cta:contextual -->`. */
export interface HtmlCtaMarkerNode {
  type: "html";
  value: "<!-- cta:contextual -->";
}
export interface DefinitionNode {
  type: "definition";
  identifier: string;
  label?: string | null;
  url: string;
  title: string | null;
}
export interface FootnoteDefinitionNode {
  type: "footnoteDefinition";
  identifier: string;
  label?: string | null;
  children: BlockNode[];
}
export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | ListNode
  | BlockquoteNode
  | TableNode
  | CodeNode
  | ThematicBreakNode
  | HtmlCtaMarkerNode
  | ImageNode
  | DefinitionNode
  | FootnoteDefinitionNode;

// ─────────────────────────────────────────────────────────────────────────────────
// Block schemas
// ─────────────────────────────────────────────────────────────────────────────────

export const ParagraphNodeSchema: z.ZodType<ParagraphNode> = z.lazy(() =>
  z
    .object({
      type: z.literal("paragraph"),
      children: z.array(PhrasingNodeSchema),
    })
    .strict(),
);

export const HeadingNodeSchema: z.ZodType<HeadingNode> = z.lazy(() =>
  z
    .object({
      type: z.literal("heading"),
      depth: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
        z.literal(6),
      ]),
      children: z.array(PhrasingNodeSchema),
    })
    .strict(),
);

export const ListItemNodeSchema: z.ZodType<ListItemNode> = z.lazy(() =>
  z
    .object({
      type: z.literal("listItem"),
      spread: z.boolean().optional(),
      checked: z.boolean().nullable().optional(),
      children: z.array(BlockNodeSchema),
    })
    .strict(),
);

export const ListNodeSchema: z.ZodType<ListNode> = z.lazy(() =>
  z
    .object({
      type: z.literal("list"),
      ordered: z.boolean(),
      start: z.number().int().nullable().optional(),
      spread: z.boolean().optional(),
      children: z.array(ListItemNodeSchema),
    })
    .strict(),
);

export const BlockquoteNodeSchema: z.ZodType<BlockquoteNode> = z.lazy(() =>
  z
    .object({
      type: z.literal("blockquote"),
      children: z.array(BlockNodeSchema),
    })
    .strict(),
);

export const TableCellNodeSchema = z
  .object({
    type: z.literal("tableCell"),
    children: z.array(PhrasingNodeSchema),
  })
  .strict();

export const TableRowNodeSchema = z
  .object({
    type: z.literal("tableRow"),
    children: z.array(TableCellNodeSchema),
  })
  .strict();

export const TableAlignSchema = z
  .union([z.literal("left"), z.literal("right"), z.literal("center"), z.null()])
  .nullable();

export const TableNodeSchema = z
  .object({
    type: z.literal("table"),
    align: z.array(TableAlignSchema),
    children: z.array(TableRowNodeSchema),
  })
  .strict();

export const CodeNodeSchema = z
  .object({
    type: z.literal("code"),
    lang: z.string().nullable(),
    meta: z.string().nullable(),
    value: z.string(),
  })
  .strict();

export const ThematicBreakNodeSchema = z
  .object({ type: z.literal("thematicBreak") })
  .strict();

/** The literal CTA marker text. Deviation fails validation. */
export const CTA_MARKER_LITERAL = "<!-- cta:contextual -->" as const;

export const HtmlCtaMarkerNodeSchema = z
  .object({
    type: z.literal("html"),
    value: z.literal(CTA_MARKER_LITERAL),
  })
  .strict();

export const DefinitionNodeSchema = z
  .object({
    type: z.literal("definition"),
    identifier: z.string(),
    label: z.string().nullable().optional(),
    url: z.string(),
    title: z.string().nullable(),
  })
  .strict();

export const FootnoteDefinitionNodeSchema: z.ZodType<FootnoteDefinitionNode> = z.lazy(
  () =>
    z
      .object({
        type: z.literal("footnoteDefinition"),
        identifier: z.string(),
        label: z.string().nullable().optional(),
        children: z.array(BlockNodeSchema),
      })
      .strict(),
);

export const BlockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z.union([
    ParagraphNodeSchema,
    HeadingNodeSchema,
    ListNodeSchema,
    BlockquoteNodeSchema,
    TableNodeSchema,
    CodeNodeSchema,
    ThematicBreakNodeSchema,
    HtmlCtaMarkerNodeSchema,
    ImageNodeSchema,
    DefinitionNodeSchema,
    FootnoteDefinitionNodeSchema,
  ]),
);
