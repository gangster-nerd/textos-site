#!/usr/bin/env tsx
// `pnpm textos:og` — writes public/og/insights/<slug>.svg for every Commit-to-Content article,
// in the same template as the twelve hand-sealed insight cards (A2R). Deterministic: the card is
// a pure function of the article title, so re-running it on an unchanged corpus changes nothing.
// The A2R tests require one card per exported insight page.

import { writeFileSync } from "node:fs";
import path from "node:path";

import { loadCtcArticles } from "../lib/textos-client/ctc-articles";

const FONT = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MAX_LINE = 30;

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wrap(title: string): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of title.split(/\s+/)) {
    if (line && `${line} ${word}`.length > MAX_LINE) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

export function renderCard(title: string): string {
  const lines = wrap(title);
  const size = lines.length > 3 ? 54 : 62;
  const step = Math.round(size * 1.18);
  const top = 330 - Math.round(((lines.length - 1) * step) / 2);
  const tspans = lines.map((l, i) => `<tspan x="72" y="${top + i * step}">${escapeXml(l)}</tspan>`).join("");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(title)} — TextOS Insight">`,
    `  <rect width="1200" height="630" fill="#0a0a0a"/>`,
    `  <rect x="0" y="0" width="8" height="630" fill="#e5484d"/>`,
    `  <text x="72" y="88" fill="#ffffff" font-family="${FONT}" font-size="28" font-weight="700" letter-spacing="0.02em">TextOS</text>`,
    `  <text x="72" y="128" fill="#8a8a8a" font-family="${FONT}" font-size="22" font-weight="500" letter-spacing="0.08em">HOW WE BUILD · COMMIT TO CONTENT</text>`,
    `  <text fill="#ffffff" font-family="${FONT}" font-size="${size}" font-weight="700" letter-spacing="-0.01em">${tspans}</text>`,
    `  <text x="72" y="582" fill="#8a8a8a" font-family="${FONT}" font-size="20" font-weight="500">Written by the TextOS writer from TextOS's own commits</text>`,
    `</svg>`,
    ``,
  ].join("\n");
}

function main(): void {
  const dir = path.resolve(__dirname, "..", "public", "og", "insights");
  for (const a of loadCtcArticles()) {
    writeFileSync(path.join(dir, `${a.brief.slug}.svg`), renderCard(a.document.identity.title), "utf8");
    console.log(`textos:og: ${a.brief.slug}.svg`);
  }
}

if (require.main === module) main();
