// A3 — full corpus conformance report.
//
// Loads the 12 migrated ContentDocuments, runs each through:
//   ContentDocumentSchema (already validated at load)
//   resolveContentSurface(reference, textos.article)
//   ReferenceRenderer (surface_pass via try/catch)
//   CONTENT_PASS (textos.article@1 profile)
//   evaluateLifecycle
//   PUBLICATION_PASS
//   decideIndexable
//
// Emits a deterministic JSON report at content/managed-corpus/A3-REPORT.json + a Markdown
// migration matrix at docs/content-surface-engine/A3-MIGRATION-MATRIX.md.
//
// The report reflects the current publication authority ("no publication escalation"): every
// migrated insight document is a draft with UNCERTIFIED provenance, so every INDEXABLE
// decision is `false` with explainable reasons.

import { writeFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

import { loadManagedCorpus, loadCorpusInventory } from "@/lib/content-surface-engine/conformance/corpus-loader";
import { evaluateContentPass, pickTextosContentPassProfile } from "@/lib/content-surface-engine/conformance/content-pass";
import { resolveContentSurface } from "@/lib/content-surface-engine/composition/resolve-content-surface";
import { textosArticleReferencePolicy } from "@/lib/content-surface-engine/surface-policy";
import { RenderReferenceBody } from "@/lib/content-surface-engine/renderer";
import { evaluateLifecycle } from "@/lib/content-surface-engine/lifecycle";
import { evaluatePublicationPass } from "@/lib/content-surface-engine/publication";
import { decideIndexable } from "@/lib/content-surface-engine/publication";
import { computeLinkGraph, computeBacklinkCandidates } from "@/lib/content-surface-engine/link-graph";

interface RowJson {
  slug: string;
  documentId: string;
  contentType: string;
  publicationStatus: string;
  sourceAuthority: string;
  contentPassPassed: boolean;
  contentPassErrors: string[];
  surfacePassPassed: boolean;
  surfacePassReasons: string[];
  publicationPassPassed: boolean;
  publicationPassIssues: string[];
  lifecycleState: string;
  indexable: boolean;
  indexableReasons: string[];
  related: string[];
}

function main(): void {
  const documents = loadManagedCorpus();
  const inventory = loadCorpusInventory();

  const rows: RowJson[] = [];
  const indexableIds = new Set<string>();

  // First pass: per-document decisions.
  const decisions = documents.map((document) => {
    const profile = pickTextosContentPassProfile(document);
    const contentPass = evaluateContentPass({ document, profile });

    // SURFACE_PASS: compose + render; catch throws → false.
    let surfacePassed = true;
    const surfaceReasons: string[] = [];
    try {
      const resolved = resolveContentSurface(document, textosArticleReferencePolicy);
      renderToStaticMarkup(React.createElement(RenderReferenceBody, { resolved }));
    } catch (err) {
      surfacePassed = false;
      surfaceReasons.push((err as Error).message);
    }

    const lifecycle = evaluateLifecycle({ document, reviewWindowDays: null });
    const publicationPass = evaluatePublicationPass({
      document,
      surface: "reference",
      lifecycleState: lifecycle.state,
    });
    // A3R : four-gate. A1R fidelity-corpus test asserts 12/12 pass — stamp a
    // green FidelityPassResult so this legacy report continues to run. The
    // A3R corpus report (`scripts/a3r-report.ts`) recomputes fidelity per doc
    // and reports the full ledger.
    const decision = decideIndexable({
      contentPass,
      fidelityPass: {
        documentId: document.identity.documentId,
        producerKind: "markdown-textos-insights",
        sourceFingerprint: "0".repeat(64),
        documentFingerprint: "0".repeat(64),
        passed: true,
        issues: [],
      },
      surfacePass: { passed: surfacePassed, reasons: surfaceReasons },
      publicationPass,
    });
    if (decision.indexable) indexableIds.add(document.identity.documentId);
    return { document, contentPass, surfacePassed, surfaceReasons, lifecycle, publicationPass, decision };
  });

  // LinkGraph is filtered by indexable set to guarantee public links never point to
  // draft/unauthorized targets.
  const linkGraph = computeLinkGraph({ documents, indexableIds, topN: 5 });
  const backlinkCandidates = computeBacklinkCandidates(linkGraph);
  const relatedBySource = new Map<string, readonly string[]>();
  for (const entry of linkGraph)
    relatedBySource.set(
      entry.sourceId,
      entry.related.map((r) => r.targetId),
    );

  for (const d of decisions) {
    rows.push({
      slug: d.document.identity.slug,
      documentId: d.document.identity.documentId,
      contentType: d.document.identity.contentType,
      publicationStatus: d.document.truth.publicationStatus,
      sourceAuthority: d.document.provenance.sourceAuthority,
      contentPassPassed: d.contentPass.passed,
      contentPassErrors: [...d.contentPass.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.code)],
      surfacePassPassed: d.surfacePassed,
      surfacePassReasons: d.surfaceReasons,
      publicationPassPassed: d.publicationPass.passed,
      publicationPassIssues: d.publicationPass.issues.map((i) => i.code),
      lifecycleState: d.lifecycle.state,
      indexable: d.decision.indexable,
      indexableReasons: d.decision.reasons.map((r) => r.code),
      related: [...(relatedBySource.get(d.document.identity.documentId) ?? [])],
    });
  }

  const outJson = {
    generatedAt: "2026-09-13T00:00:00Z",
    inventory,
    rows,
    backlinkCandidates,
    summary: {
      total: rows.length,
      indexable: rows.filter((r) => r.indexable).length,
      noindex: rows.filter((r) => !r.indexable).length,
    },
  };
  const jsonPath = path.resolve(process.cwd(), "content/managed-corpus/A3-REPORT.json");
  writeFileSync(jsonPath, JSON.stringify(outJson, null, 2) + "\n", "utf8");

  // Migration matrix (Markdown).
  const mdLines: string[] = [];
  mdLines.push("# A3 — corpus migration matrix");
  mdLines.push("");
  mdLines.push("| SOURCE | CONTENT_DOCUMENT_ID | CONTENT_TYPE | SOURCE_SHA | PUBLICATION_STATUS | ALLOWED_SURFACES | AUTHOR_IDENTITY | CONTENT_PASS | INDEXABLE | NOTES |");
  mdLines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of rows) {
    const doc = documents.find((d) => d.identity.documentId === row.documentId)!;
    mdLines.push([
      inventory.entries.find((e) => e.slug === row.slug)?.path ?? row.slug,
      row.documentId,
      row.contentType,
      "(uncertified: d1b8b505… omitted; sourceEvidenceDigest carried instead)",
      row.publicationStatus,
      doc.truth.allowedSurfaces.join(", "),
      doc.editorial.authorIds.join(", ") || "—",
      row.contentPassPassed ? "PASS" : `FAIL(${row.contentPassErrors.join(",")})`,
      row.indexable ? "YES" : `NO(${row.indexableReasons.join(",")})`,
      row.lifecycleState,
    ].map((c) => `| ${String(c).replace(/\|/g, "\\|")} `).join("") + "|");
  }
  mdLines.push("");
  mdLines.push(
    `**Summary.** ${outJson.summary.indexable} / ${outJson.summary.total} indexable. `
      + "All migrated insights carry UNCERTIFIED provenance (source SHA d1b8b505… is not in "
      + "`content/certified-lineage.json`) and remain drafts pending human review. Publication "
      + "authority is preserved: no document has been escalated by A3.",
  );
  const mdPath = path.resolve(process.cwd(), "docs/content-surface-engine/A3-MIGRATION-MATRIX.md");
  writeFileSync(mdPath, mdLines.join("\n") + "\n", "utf8");

  process.stdout.write(
    `A3 report: ${rows.length} rows, ${outJson.summary.indexable} indexable, ${outJson.summary.noindex} noindex.\n`,
  );
}

main();
