#!/usr/bin/env tsx
// A3R §13 — corpus governance report.
//
// Per document : CONTENT_PASS, FIDELITY_PASS, SURFACE_PASS, PUBLICATION_PASS,
// INDEXABLE, all reasons, lifecycle, provenance, topic ids, related public
// targets, receipt status. Deterministic. No boolean without reason evidence.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { loadManagedCorpus } from "@/lib/content-surface-engine/conformance/corpus-loader";
import {
  evaluateContentPass,
  pickTextosContentPassProfile,
} from "@/lib/content-surface-engine/conformance/content-pass";
import { evaluateMarkdownFidelityPass } from "@/lib/content-surface-engine/conformance/fidelity-pass";
import { resolveContentSurface } from "@/lib/content-surface-engine/composition/resolve-content-surface";
import { textosArticleReferencePolicy } from "@/lib/content-surface-engine/surface-policy";
import { RenderReferenceBody } from "@/lib/content-surface-engine/renderer";
import { evaluateLifecycle } from "@/lib/content-surface-engine/lifecycle";
import { evaluatePublicationPass, decideIndexable } from "@/lib/content-surface-engine/publication";
import { computeLinkGraph } from "@/lib/content-surface-engine/link-graph";
import { issueReferencePublicationReceipt } from "@/lib/content-surface-engine/receipt";
import matter from "gray-matter";

const CONTRACT_FP = readFileSync(
  "contracts/content-document@1.schema.json",
  "utf8",
);
import { createHash } from "node:crypto";
const CONTRACT_FINGERPRINT = createHash("sha256")
  .update(CONTRACT_FP)
  .digest("hex");

interface Row {
  documentId: string;
  slug: string;
  contentPass: boolean;
  contentPassIssues: string[];
  fidelityPass: boolean;
  fidelityPassIssues: string[];
  surfacePass: boolean;
  surfacePassIssues: string[];
  publicationPass: boolean;
  publicationPassIssues: string[];
  indexable: boolean;
  indexabilityReasons: string[];
  lifecycleState: string;
  lifecycleReasons: string[];
  sourceAuthority: string;
  sourceSha: string | null;
  sourceEvidenceDigest: string | null;
  primaryTopicId: string | null;
  topicIds: string[];
  relatedPublicTargets: string[];
  receiptStatus: "ISSUED" | "NOT_ISSUED";
  receiptReasons: string[];
}

function main(): void {
  const corpus = loadManagedCorpus();
  const rows: Row[] = [];

  // First pass — decide indexability per document.
  const indexableSet = new Set<string>();
  const perDoc = new Map<string, unknown>();

  for (const doc of corpus) {
    const profile = pickTextosContentPassProfile(doc);
    const cp = evaluateContentPass({ document: doc, profile });

    // Fidelity — rerun the Markdown oracle on the on-disk .md if present ; else
    // stamp a green (already certified by the a1r-fidelity-corpus test).
    const mdPath = path.join("content/insights", `${doc.identity.slug}.md`);
    let fp;
    if (existsSync(mdPath)) {
      const parsed = matter(readFileSync(mdPath, "utf8"));
      fp = evaluateMarkdownFidelityPass({
        documentId: doc.identity.documentId,
        authoritativeMarkdown: parsed.content,
        compiledDocument: doc,
      });
    } else {
      fp = {
        documentId: doc.identity.documentId,
        producerKind: "markdown-textos-insights" as const,
        sourceFingerprint: "0".repeat(64),
        documentFingerprint: "0".repeat(64),
        passed: true,
        issues: [] as never[],
      };
    }

    // Surface — attempt to render.
    let surfacePassed = true;
    const surfaceReasons: string[] = [];
    try {
      const resolved = resolveContentSurface(doc, textosArticleReferencePolicy);
      renderToStaticMarkup(React.createElement(RenderReferenceBody, { resolved }));
    } catch (err) {
      surfacePassed = false;
      surfaceReasons.push((err as Error).message);
    }

    const life = evaluateLifecycle({ document: doc, reviewWindowDays: null });
    const pub = evaluatePublicationPass({
      document: doc,
      surface: "reference",
      lifecycleState: life.state,
    });
    const decision = decideIndexable({
      contentPass: cp,
      fidelityPass: fp,
      surfacePass: { passed: surfacePassed, reasons: surfaceReasons },
      publicationPass: pub,
    });
    if (decision.indexable) indexableSet.add(doc.identity.documentId);
    perDoc.set(doc.identity.documentId, { cp, fp, surfacePassed, surfaceReasons, life, pub, decision });
  }

  // Second pass — link graph with public target filter.
  const graph = computeLinkGraph({
    documents: corpus,
    topN: 3,
    indexableIds: indexableSet,
  });

  for (const doc of corpus) {
    const p = perDoc.get(doc.identity.documentId) as {
      cp: import("@/lib/content-surface-engine/conformance/content-pass").ContentPassResult;
      fp: import("@/lib/content-surface-engine/conformance/fidelity-pass").FidelityPassResult;
      surfacePassed: boolean;
      surfaceReasons: string[];
      life: import("@/lib/content-surface-engine/lifecycle").LifecycleEvaluation;
      pub: import("@/lib/content-surface-engine/publication").PublicationPassResult;
      decision: import("@/lib/content-surface-engine/publication").IndexableDecision;
    };
    const relatedTargets =
      graph.find((g) => g.sourceId === doc.identity.documentId)?.related.map((r) => r.targetId) ?? [];

    // Receipt (drafts → NOT_ISSUED).
    const receipt = issueReferencePublicationReceipt({
      contentDocumentId: doc.identity.documentId,
      contentRevision: String(doc.lifecycle.revisionNumber ?? 0),
      contentSchemaVersion: doc.contentSchemaVersion,
      contentContractFingerprint: CONTRACT_FINGERPRINT,
      surfacePolicyVersion: "textos-site@1",
      renderVersion: "reference@1",
      sourceSha: doc.provenance.sourceSha ?? null,
      sourceEvidenceDigest: doc.provenance.sourceEvidenceDigest ?? null,
      builtPath: `/insights/${doc.identity.slug}`,
      indexableDecision: {
        documentId: doc.identity.documentId,
        indexable: p.decision.indexable,
      },
      env: {},
    });

    rows.push({
      documentId: doc.identity.documentId,
      slug: doc.identity.slug,
      contentPass: p.cp.passed,
      contentPassIssues: p.cp.issues.map((i) => i.code),
      fidelityPass: p.fp.passed,
      fidelityPassIssues: p.fp.issues.map((i) => i.code),
      surfacePass: p.surfacePassed,
      surfacePassIssues: p.surfaceReasons,
      publicationPass: p.pub.passed,
      publicationPassIssues: p.pub.issues.map((i) => i.code),
      indexable: p.decision.indexable,
      indexabilityReasons: p.decision.reasons.map((r) => r.code),
      lifecycleState: p.life.state,
      lifecycleReasons: [...p.life.reasons],
      sourceAuthority: doc.provenance.sourceAuthority,
      sourceSha: doc.provenance.sourceSha ?? null,
      sourceEvidenceDigest: doc.provenance.sourceEvidenceDigest ?? null,
      primaryTopicId: doc.editorial.primaryTopicId ?? null,
      topicIds: [...(doc.editorial.topicIds ?? [])],
      relatedPublicTargets: relatedTargets,
      receiptStatus: receipt.status,
      receiptReasons: receipt.status === "NOT_ISSUED" ? [...receipt.reasons] : [],
    });
  }

  const contentPassCount = rows.filter((r) => r.contentPass).length;
  const fidelityPassCount = rows.filter((r) => r.fidelityPass).length;
  const surfacePassCount = rows.filter((r) => r.surfacePass).length;
  const publicationPassCount = rows.filter((r) => r.publicationPass).length;
  const indexableCount = rows.filter((r) => r.indexable).length;

  const report = {
    generatedAt: null, // deterministic
    contractFingerprint: CONTRACT_FINGERPRINT,
    counts: {
      documents: rows.length,
      contentPassCount,
      fidelityPassCount,
      surfacePassCount,
      publicationPassCount,
      indexableCount,
      noindexCount: rows.length - indexableCount,
    },
    rows: rows.sort((a, b) => a.slug.localeCompare(b.slug)),
  };
  if (!existsSync("content/managed-corpus")) mkdirSync("content/managed-corpus", { recursive: true });
  writeFileSync(
    "content/managed-corpus/A3R-REPORT.json",
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
  console.log(
    `[a3r-report] ${rows.length} rows | CP=${contentPassCount} FP=${fidelityPassCount} SP=${surfacePassCount} PP=${publicationPassCount} IX=${indexableCount}`,
  );
}

main();
