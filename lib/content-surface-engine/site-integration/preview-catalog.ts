// CSE-2 — site preview catalog.
//
// The three SURFACE_PASS fixtures made available at /reference-preview/[slug]. This route is
// the smallest textos-site seam required to prove REFERENCE end-to-end. The public 12
// articles are NOT migrated by CSE-2.

import type { ContentDocument } from "../contract/content-document";
import { surfacePassFixtures } from "../conformance/surface-pass/fixtures";

export interface PreviewEntry {
  slug: string;
  document: ContentDocument;
  kicker: string;
}

const ENTRIES: PreviewEntry[] = [
  { slug: surfacePassFixtures.article.identity.slug, document: surfacePassFixtures.article, kicker: "Product article" },
  { slug: surfacePassFixtures.evidence.identity.slug, document: surfacePassFixtures.evidence, kicker: "Evidence" },
  { slug: surfacePassFixtures.changelog.identity.slug, document: surfacePassFixtures.changelog, kicker: "Changelog" },
];

export function listPreviewSlugs(): readonly string[] {
  return ENTRIES.map((e) => e.slug);
}

export function findPreviewEntry(slug: string): PreviewEntry | undefined {
  return ENTRIES.find((e) => e.slug === slug);
}

export function listPreviewEntries(): readonly PreviewEntry[] {
  return ENTRIES;
}
