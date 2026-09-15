// A2 — deterministic HTML snapshot generator for SURFACE_PASS visual evidence.
//
// Produces static HTML for the three SURFACE_PASS fixtures at two viewports:
//   - desktop (default styles)
//   - ~400px (mobile stylesheet override)
//
// These files are the mission's "visual evidence": they are the exact markup that Next.js
// would emit for the corresponding /reference-preview/[slug] route, wrapped in a minimal
// HTML shell that inlines the site's global stylesheet. A browser opens them directly.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

import { resolveContentSurface } from "@/lib/content-surface-engine/composition/resolve-content-surface";
import {
  textosArticleReferencePolicy,
  textosMinimalReferencePolicy,
} from "@/lib/content-surface-engine/surface-policy";
import { ManagedTextosSurface } from "@/lib/content-surface-engine/renderer/managed-textos-surface";
import { resolveReferenceCta } from "@/lib/content-surface-engine/conversion";
import { compileAuthority } from "@/lib/content-surface-engine/authority";
import { resolveReferenceAuthor } from "@/lib/content-surface-engine/site-integration";
import {
  surfacePassArticleFixture,
  surfacePassChangelogFixture,
  surfacePassEvidenceFixture,
} from "@/lib/content-surface-engine/conformance/surface-pass/fixtures";
import type { ContentDocument } from "@/lib/content-surface-engine/contract/content-document";

const OUT_DIR = path.resolve(__dirname, "../lib/content-surface-engine/conformance/surface-pass/snapshots");

function policyFor(contentType: string) {
  return contentType === "product_article"
    ? textosArticleReferencePolicy
    : textosMinimalReferencePolicy;
}

function renderSnapshot(
  doc: ContentDocument,
  variant: "desktop" | "mobile400",
): string {
  const policy = policyFor(doc.identity.contentType);
  const resolved = resolveContentSurface(doc, policy);
  const cta = resolveReferenceCta({
    resolved,
    intent: doc.conversion.ctaIntentId ?? "",
  });
  const compiled = compileAuthority({
    resolved,
    siteOrigin: "https://textos.example",
    siteName: "TextOS",
    resolveAuthor: (id) => {
      const p = resolveReferenceAuthor(id);
      return p ? { name: p.name } : null;
    },
    lifecycle: {
      publishedAt: doc.lifecycle.publishedAt,
      updatedAt: doc.lifecycle.updatedAt,
    },
  });
  const body = renderToStaticMarkup(
    React.createElement(ManagedTextosSurface, {
      resolved,
      cta,
      resolveAuthor: (id: string) => resolveReferenceAuthor(id),
      kicker: doc.identity.contentType,
      contentRevision: String(doc.lifecycle.revisionNumber ?? 0),
    }),
  );
  const viewportMeta =
    variant === "mobile400"
      ? '<meta name="viewport" content="width=400, initial-scale=1">'
      : '<meta name="viewport" content="width=1200, initial-scale=1">';
  const jsonLd = compiled.jsonLd
    .map((n) => `<script type="application/ld+json">${JSON.stringify(n).replace(/</g, "\\u003c")}</script>`)
    .join("");
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    viewportMeta,
    `<title>${escape(compiled.metadata.title)}</title>`,
    `<meta name="description" content="${escape(compiled.metadata.description)}">`,
    `<meta name="robots" content="${compiled.metadata.robots.index ? "index" : "noindex"},${compiled.metadata.robots.follow ? "follow" : "nofollow"}">`,
    jsonLd,
    "<style>",
    "body{background:#0b0c0e;color:#e9eaec;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:24px;}",
    ".cse-surface{max-width:720px;margin:0 auto;}",
    ".cse-surface__title{font-size:2.25rem;line-height:1.15;margin:0 0 .5rem 0;}",
    ".cse-surface__description{color:#9aa0a6;font-size:1.125rem;}",
    ".cse-surface__label{color:#9aa0a6;text-transform:uppercase;font-size:.72rem;letter-spacing:.06em;}",
    ".cse-surface__breadcrumbs ol{display:flex;gap:.5rem;list-style:none;padding:0;color:#9aa0a6;font-size:.85rem;}",
    ".cse-surface__toc{border:1px solid #23262b;padding:1rem 1.25rem;margin:1.5rem 0;border-radius:6px;}",
    ".cse-surface__toc ol{padding-left:1.25rem;}",
    ".cse-body__block{margin:1rem 0;}",
    ".cse-block--answer{background:#101216;padding:1rem 1.25rem;border-left:2px solid #7cc4ff;border-radius:4px;}",
    ".cse-block--evidence{border:1px dashed #2f333a;padding:.75rem 1rem;border-radius:4px;}",
    ".cse-block--statistic .cse-block__stat-value{font-size:1.75rem;color:#7cc4ff;}",
    ".cse-block--callout{border-left:2px solid #4d7fa6;padding:.75rem 1rem;}",
    ".cse-surface__cta{margin-top:2rem;padding:1.5rem;background:#101216;border-radius:8px;}",
    ".cse-surface__cta-action{display:inline-block;padding:.5rem 1rem;background:#7cc4ff;color:#0b0c0e;border-radius:4px;text-decoration:none;margin-top:.75rem;}",
    "@media (max-width: 420px){.cse-surface{padding:0;} .cse-surface__title{font-size:1.6rem;}}",
    "</style>",
    "</head>",
    '<body>',
    body,
    "</body></html>",
  ].join("\n");
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const cases: Array<{ name: string; doc: ContentDocument }> = [
    { name: "article", doc: surfacePassArticleFixture },
    { name: "evidence", doc: surfacePassEvidenceFixture },
    { name: "changelog", doc: surfacePassChangelogFixture },
  ];
  for (const c of cases) {
    for (const variant of ["desktop", "mobile400"] as const) {
      const filename = `${c.name}.${variant}.html`;
      const target = path.join(OUT_DIR, filename);
      writeFileSync(target, renderSnapshot(c.doc, variant), "utf8");
      process.stdout.write(`wrote ${filename}\n`);
    }
  }
  // Emit a manifest with sha256 of each snapshot for determinism assertions.
  const crypto = require("node:crypto") as typeof import("node:crypto");
  const manifest = cases.flatMap((c) =>
    (["desktop", "mobile400"] as const).map((v) => {
      const filename = `${c.name}.${v}.html`;
      const bytes = readFileSync(path.join(OUT_DIR, filename));
      const sha = crypto.createHash("sha256").update(bytes).digest("hex");
      return { file: filename, sha256: sha };
    }),
  );
  writeFileSync(
    path.join(OUT_DIR, "MANIFEST.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );
}

main();
