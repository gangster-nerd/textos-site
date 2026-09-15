#!/usr/bin/env tsx
// CTC-ARTICLE-SYSTEM-1 §8 — Deterministic social card generator.
//
// For each article under content/insights/*.md, writes a 1200×630 SVG at
// public/og/insights/<slug>.svg. Fully deterministic: no timestamps, no random.
// Same input → same file bytes. Regenerate with `pnpm generate:social-cards`.
//
// Design brief: text-first brand. Black background, white typography, a single
// accent bar in the topic colour. TextOS wordmark top-left, topic label as a
// small kicker, article title as the hero. No photography, no icon soup.
//
// Why SVG and not PNG:
//   - Deterministic by construction (no encoder subtleties).
//   - Zero build deps (no headless browser, no `sharp`, no `@vercel/og`).
//   - OpenGraph accepts SVG when served with `image/svg+xml`.
//   - Verifier can inspect dimensions from `viewBox` without rasterisation.
//
// If a future crawler proves not to accept SVG, we replace this generator with
// one that produces PNG. The verifier's asset-exists check remains valid.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { TOPICS } from "@/lib/content/topic-registry";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CONTENT_DIR = path.join(REPO_ROOT, "content", "insights");
const OUT_DIR = path.join(REPO_ROOT, "public", "og", "insights");

const WIDTH = 1200;
const HEIGHT = 630;

// Simple XML escape for the title / topic strings we inject.
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Break a title into lines, wrapping at approximately `maxCharsPerLine`. Doesn't
 * count actual pixel widths — we pick a font size that leaves headroom. Prefers
 * breaking at spaces, falls back to hard-break for pathological words.
 */
function wrapTitle(title: string, maxCharsPerLine = 26): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4); // hard cap 4 lines — anything longer is a title problem
}

interface CardInput {
  slug: string;
  title: string;
  topicLabel: string;
}

function renderSvg({ title, topicLabel }: CardInput): string {
  const lines = wrapTitle(title, 26);
  const fontSize = lines.length <= 2 ? 72 : lines.length === 3 ? 60 : 52;
  const lineHeight = Math.round(fontSize * 1.18);
  const totalTextHeight = lines.length * lineHeight;
  const startY = Math.round((HEIGHT - totalTextHeight) / 2 + fontSize * 0.85);

  const titleTspans = lines
    .map(
      (line, i) =>
        `<tspan x="72" y="${startY + i * lineHeight}">${xmlEscape(line)}</tspan>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${xmlEscape(title)} — TextOS Insight">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0a0a0a"/>
  <rect x="0" y="0" width="8" height="${HEIGHT}" fill="#e5484d"/>
  <text x="72" y="88" fill="#ffffff" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="0.02em">TextOS</text>
  <text x="72" y="128" fill="#8a8a8a" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="22" font-weight="500" letter-spacing="0.08em">${xmlEscape(topicLabel.toUpperCase())}</text>
  <text fill="#ffffff" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="-0.01em">${titleTspans}</text>
  <text x="72" y="${HEIGHT - 48}" fill="#8a8a8a" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="20" font-weight="500">Authority observatory for AI answer engines</text>
</svg>
`;
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  let written = 0;
  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
    const { data: fm } = matter(raw);
    const slug = file.replace(/\.md$/, "");
    const title = String(fm.title ?? "").trim();
    const primaryTopicId = String(fm.primaryTopicId ?? "").trim();
    const topic = primaryTopicId
      ? TOPICS[primaryTopicId as keyof typeof TOPICS]
      : undefined;
    const topicLabel = topic?.label ?? "Insight";

    if (!title) {
      throw new Error(`generate-social-cards: ${file} has no title.`);
    }
    const svg = renderSvg({ slug, title, topicLabel });
    const outPath = path.join(OUT_DIR, `${slug}.svg`);
    fs.writeFileSync(outPath, svg);
    written += 1;
    console.log(`  wrote ${path.relative(REPO_ROOT, outPath)}`);
  }
  console.log(`[generate-social-cards] ${written} card(s) written.`);
}

main();
