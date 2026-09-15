#!/usr/bin/env tsx
// backlink-candidates — proposes candidate backlinks for a new /insights article.
//
// Contrat CTC-ARTICLE-SYSTEM-1 §7 : NE PUBLIE JAMAIS. Sortie destinée à revue humaine.
//
// Usage : pnpm backlink-candidates <collection> <slug>

import { loadCollection, loadDocument } from "@/lib/content/content-loader";
import { proposeBacklinkCandidates } from "@/lib/content/link-graph";

function usage(msg: string): never {
  process.stderr.write(`[backlink-candidates] ${msg}\n`);
  process.stderr.write(`usage: pnpm backlink-candidates <collection> <slug>\n`);
  process.exit(2);
}

function main() {
  const [, , collection, slug] = process.argv;
  if (!collection || !slug) usage("arguments manquants : collection et slug requis.");

  let newDoc;
  try {
    newDoc = loadDocument(collection, slug);
  } catch (err) {
    usage(`impossible de charger ${collection}/${slug} — ${(err as Error).message}`);
  }

  // Load every document from every content collection except self.
  const collections = ["faq", "methodology", "insights"];
  const allDocs = collections.flatMap((c) => loadCollection(c));
  const existingDocs = allDocs.filter((d) => d.contentId !== newDoc.contentId);

  process.stderr.write(
    `[backlink-candidates] proposing for ${collection}/${slug} against ${existingDocs.length} existing docs — human review required, no auto-publish\n`,
  );

  const candidates = proposeBacklinkCandidates({ newDoc, existingDocs });
  process.stdout.write(JSON.stringify(candidates, null, 2) + "\n");
  process.exit(0);
}

main();
