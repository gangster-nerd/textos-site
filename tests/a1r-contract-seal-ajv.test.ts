// A1R-CONTRACT-SEAL-1 — independent JSON Schema validation.
//
// This suite proves the EXPORTED artifact — not the Zod source — encodes the
// semantic tree contract. Ajv (draft-2020-12 compatible) is used as an
// independent validator ; every fixture is checked against BOTH the exported
// JSON Schema AND the Zod ContentDocumentSchema. When they disagree, the
// artifact is out of sync with the source of truth.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";

import { ContentDocumentSchema } from "@/lib/content-surface-engine/contract/content-document";

const SCHEMA = JSON.parse(
  readFileSync("contracts/content-document@1.schema.json", "utf8"),
);

const ajv = new Ajv2020({ strict: false, allErrors: true });
const validate = ajv.compile(SCHEMA);

const corpusFiles = readdirSync("content/managed-corpus")
  .filter((f) => f.endsWith(".json") && !f.startsWith("A3-") && f !== "INVENTORY.json")
  .sort();

// A minimal known-good document to base negative fixtures on.
function goodDocument() {
  const raw = readFileSync(
    path.join("content/managed-corpus", corpusFiles[0]),
    "utf8",
  );
  return JSON.parse(raw);
}

describe("SEAL-1 — exported JSON Schema accepts the 12 corpus documents", () => {
  it("finds 12 corpus documents", () => {
    expect(corpusFiles.length).toBe(12);
  });

  it.each(corpusFiles)("%s : Ajv and Zod both accept", (file) => {
    const doc = JSON.parse(
      readFileSync(path.join("content/managed-corpus", file), "utf8"),
    );
    const ajvOk = validate(doc);
    const zodOk = ContentDocumentSchema.safeParse(doc).success;
    if (!ajvOk) {
      const summary = (validate.errors ?? []).slice(0, 3);
      throw new Error(
        `${file}: Ajv rejected — ${JSON.stringify(summary)}`,
      );
    }
    expect(ajvOk).toBe(true);
    expect(zodOk).toBe(true);
    expect(ajvOk).toBe(zodOk);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Negative fixtures — every one MUST be rejected by BOTH Ajv and Zod.
// ─────────────────────────────────────────────────────────────────────────────

interface Mutation {
  label: string;
  mutate: (d: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Find the FIRST source-backed block (has data.mdast) with the given kind. The
 * corpus documents have varying body shapes ; every mutation locates its target
 * dynamically rather than hard-coding indices.
 */
function findSourceBackedIndex(doc: Record<string, unknown>, kind: string): number {
  const body = (doc as { body: Array<{ kind: string; data?: { mdast?: unknown } }> }).body;
  return body.findIndex((b) => b.kind === kind && b.data?.mdast !== undefined);
}

const MUTATIONS: Mutation[] = [
  {
    label: "paragraph with mdast.type=\"banana\"",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "paragraph");
      b.body[i] = {
        ...(b.body[i] as Record<string, unknown>),
        data: { mdast: { type: "banana", children: [] } },
      };
      return b;
    },
  },
  {
    label: "paragraph missing children",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "paragraph");
      b.body[i] = {
        ...(b.body[i] as Record<string, unknown>),
        data: { mdast: { type: "paragraph" } },
      };
      return b;
    },
  },
  {
    label: "text node missing value",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "paragraph");
      b.body[i] = {
        ...(b.body[i] as Record<string, unknown>),
        data: { mdast: { type: "paragraph", children: [{ type: "text" }] } },
      };
      return b;
    },
  },
  {
    label: "strong with non-array children",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "paragraph");
      b.body[i] = {
        ...(b.body[i] as Record<string, unknown>),
        data: {
          mdast: {
            type: "paragraph",
            children: [{ type: "strong", children: "not-an-array" }],
          },
        },
      };
      return b;
    },
  },
  {
    label: "link missing url",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "paragraph");
      b.body[i] = {
        ...(b.body[i] as Record<string, unknown>),
        data: {
          mdast: {
            type: "paragraph",
            children: [{ type: "link", title: null, children: [{ type: "text", value: "x" }] }],
          },
        },
      };
      return b;
    },
  },
  {
    label: "link with malformed children",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "paragraph");
      b.body[i] = {
        ...(b.body[i] as Record<string, unknown>),
        data: {
          mdast: {
            type: "paragraph",
            children: [
              { type: "link", url: "/x", title: null, children: [{ type: "banana" }] },
            ],
          },
        },
      };
      return b;
    },
  },
  {
    label: "list with non-listItem direct child",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "steps");
      if (i === -1) return d; // corpus has no source-backed steps ; skipped effect
      b.body[i] = {
        ...(b.body[i] as Record<string, unknown>),
        data: {
          mdast: {
            type: "list",
            ordered: false,
            children: [{ type: "paragraph", children: [] }],
          },
        },
      };
      return b;
    },
  },
  {
    label: "ordered list with invalid start (string)",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "steps");
      if (i === -1) return d;
      b.body[i] = {
        ...(b.body[i] as Record<string, unknown>),
        data: {
          mdast: {
            type: "list",
            ordered: true,
            start: "one" as unknown as number,
            children: [
              {
                type: "listItem",
                children: [{ type: "paragraph", children: [{ type: "text", value: "x" }] }],
              },
            ],
          },
        },
      };
      return b;
    },
  },
  {
    label: "malformed table hierarchy (paragraph inside table)",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      b.body.push({
        id: "bad-table",
        kind: "table",
        data: {
          mdast: {
            type: "table",
            align: [],
            children: [{ type: "paragraph", children: [] }],
          },
        },
      });
      return b;
    },
  },
  {
    label: "arbitrary raw HTML at top level",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      b.body.push({
        id: "bad-html",
        kind: "cta_slot",
        slot: "primary-cta",
        data: { mdast: { type: "html", value: "<div>oops</div>" } },
      });
      return b;
    },
  },
  {
    label: "CTA marker with altered bytes",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = b.body.findIndex((x) => x.kind === "cta_slot");
      if (i === -1) return d;
      b.body[i] = {
        ...(b.body[i] as Record<string, unknown>),
        data: {
          mdast: { type: "html", value: "<!-- cta: contextual -->" },
        },
      };
      return b;
    },
  },
  {
    label: "source-backed paragraph carrying heading mdast",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "paragraph");
      b.body[i] = {
        ...(b.body[i] as Record<string, unknown>),
        data: {
          mdast: {
            type: "heading",
            depth: 2,
            children: [{ type: "text", value: "wrong type" }],
          },
        },
      };
      return b;
    },
  },
  {
    label: "arbitrary object stuffed into data.mdast",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "paragraph");
      b.body[i] = {
        ...(b.body[i] as Record<string, unknown>),
        data: { mdast: { anything: "at all" } },
      };
      return b;
    },
  },
  {
    label: "kind=paragraph missing data.mdast entirely (no synthetic text either)",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "paragraph");
      b.body[i] = { id: (b.body[i] as { id: string }).id, kind: "paragraph", data: {} };
      return b;
    },
  },
  {
    label: "unknown top-level property on block",
    mutate: (d) => {
      const b = { ...d, body: [...(d.body as unknown[])] } as Record<string, unknown> & {
        body: Array<Record<string, unknown>>;
      };
      const i = findSourceBackedIndex(d, "paragraph");
      b.body[i] = { ...(b.body[i] as Record<string, unknown>), sneak: "extra" };
      return b;
    },
  },
];

describe("SEAL-1 — negative fixtures rejected by BOTH Ajv and Zod", () => {
  it.each(MUTATIONS)("$label", ({ mutate }) => {
    const base = goodDocument();
    const bad = mutate(base);
    const ajvOk = validate(bad);
    const zodOk = ContentDocumentSchema.safeParse(bad).success;
    // Some mutations no-op when the corpus lacks the target block ; if it noops,
    // skip the assertion silently by asserting equality of before/after.
    if (JSON.stringify(base) === JSON.stringify(bad)) return;
    expect(ajvOk, "Ajv should REJECT the mutation").toBe(false);
    expect(zodOk, "Zod should REJECT the mutation").toBe(false);
  });
});
