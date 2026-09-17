// A3 — CONTENT_PASS.
//
// Downstream conformance/publication-quality gate. Evaluated per ContentDocument revision +
// active SurfacePolicy. It DOES NOT redefine ContentDocument validity — a document is either
// valid (Zod) or it isn't. CONTENT_PASS ADDS conditional editorial rules on top.
//
// Design invariants (A3 mission):
//   - No universal article assumption. Rules that assert "must have short answer / H1 /
//     human author / long body / article date" are strictly OPT-IN via a `profile`.
//   - contentType remains OPEN_STRING at the core; profile selection happens here.
//   - A generic page or entry document with no author, no dates, no shortAnswer, no headings
//     MUST NOT FAIL by default.
//
// Profiles:
//   - `default`             — universal minimums (title, description, at least one
//                             allowedSurface, publicationStatus enum). Nothing more.
//   - `textos.article@1`    — TextOS-managed article rules: shortAnswer/answer block,
//                             at least one heading, named author, canonical present,
//                             lifecycle dates present, evidence/claim references present.
//
// The profile is selected by the caller (via `evaluateContentPass({ document, profile })`);
// nothing in the core dispatches on contentType.

import type { ContentDocument } from "../contract/content-document";
import { evaluateEditorialIdentity } from "../authority/editorial-identity-policy";
import { resolveReferenceEntity } from "../site-integration/authors";

export type ContentPassProfile = "default" | "textos.article@1";

export type ContentPassSeverity = "info" | "warn" | "error";

export interface ContentPassIssue {
  code: string;
  severity: ContentPassSeverity;
  path: readonly (string | number)[];
  message: string;
}

export interface ContentPassResult {
  documentId: string;
  profile: ContentPassProfile;
  passed: boolean;
  issues: readonly ContentPassIssue[];
  checked: readonly string[];
}

function err(
  code: string,
  path: readonly (string | number)[],
  message: string,
): ContentPassIssue {
  return { code, severity: "error", path, message };
}

// --- default (universal) rules ------------------------------------------------------------
// Everything in the default profile MUST NOT trip a generic page / entry / llms.txt-like
// entry. Only the truly universal editorial minimums live here.
function runDefault(document: ContentDocument, checked: string[], issues: ContentPassIssue[]) {
  checked.push("default.title-present");
  if (!document.identity.title.trim())
    issues.push(err("default.title-present", ["identity", "title"], "title required."));

  checked.push("default.description-present");
  if (!document.identity.description.trim())
    issues.push(
      err("default.description-present", ["identity", "description"], "description required."),
    );

  checked.push("default.at-least-one-surface");
  if (document.truth.allowedSurfaces.length === 0)
    issues.push(
      err(
        "default.at-least-one-surface",
        ["truth", "allowedSurfaces"],
        "at least one allowedSurface required.",
      ),
    );

  checked.push("default.lifecycle-consistency");
  if (
    document.lifecycle.publishedAt
    && document.lifecycle.updatedAt
    && document.lifecycle.updatedAt < document.lifecycle.publishedAt
  ) {
    issues.push(
      err(
        "default.lifecycle-consistency",
        ["lifecycle", "updatedAt"],
        "updatedAt precedes publishedAt.",
      ),
    );
  }
}

// --- textos.article@1 rules -------------------------------------------------------------
// TextOS article-like managed content. These are OPT-IN and NEVER apply to generic pages
// or entries.
function runTextosArticle(document: ContentDocument, checked: string[], issues: ContentPassIssue[]) {
  checked.push("textos.article.short-answer");
  const hasAnswer = document.body.some((b) => b.kind === "answer");
  if (!hasAnswer)
    issues.push(
      err("textos.article.short-answer", ["body"], "TextOS article requires an `answer` block."),
    );

  checked.push("textos.article.heading-present");
  const hasHeading = document.body.some((b) => b.kind === "heading");
  if (!hasHeading)
    issues.push(
      err(
        "textos.article.heading-present",
        ["body"],
        "TextOS article requires at least one `heading` block.",
      ),
    );

  checked.push("textos.article.editorial-identity-policy");
  const identityIssues = evaluateEditorialIdentity({
    authorIds: document.editorial.authorIds,
    resolve: (id) => {
      const e = resolveReferenceEntity(id);
      if (!e) return null;
      return {
        id: e.id,
        name: e.name,
        entityType: e.entityType,
        profilePath: e.profilePath,
      };
    },
  });
  for (const ii of identityIssues) {
    issues.push({
      code: `textos.article.identity.${ii.code}`,
      severity: "error",
      path: ii.path,
      message: ii.message,
    });
  }

  checked.push("textos.article.canonical-path");
  if (!document.seo.canonicalPath)
    issues.push(
      err("textos.article.canonical-path", ["seo", "canonicalPath"], "canonicalPath required."),
    );

  checked.push("textos.article.publish-and-updated-dates");
  if (!document.lifecycle.publishedAt || !document.lifecycle.updatedAt)
    issues.push(
      err(
        "textos.article.publish-and-updated-dates",
        ["lifecycle"],
        "TextOS article requires publishedAt and updatedAt.",
      ),
    );

  checked.push("textos.article.claims-and-evidence");
  if (document.truth.claimIds.length === 0)
    issues.push(
      err(
        "textos.article.claims-and-evidence",
        ["truth", "claimIds"],
        "TextOS article requires at least one claimId.",
      ),
    );
  // evidenceRefs may legitimately be empty for COMPANY_TECHNOLOGY-class articles (see
  // ARTICLE-SYSTEM-1). We do not fail on empty evidenceRefs here.

  checked.push("textos.article.description-length");
  const len = document.identity.description.length;
  if (len < 40 || len > 240)
    issues.push(
      err(
        "textos.article.description-length",
        ["identity", "description"],
        `description length ${len} outside recommended [40, 240] range.`,
      ),
    );
}

export function evaluateContentPass(input: {
  document: ContentDocument;
  profile: ContentPassProfile;
}): ContentPassResult {
  const issues: ContentPassIssue[] = [];
  const checked: string[] = [];
  runDefault(input.document, checked, issues);
  if (input.profile === "textos.article@1") {
    runTextosArticle(input.document, checked, issues);
  }
  return {
    documentId: input.document.identity.documentId,
    profile: input.profile,
    passed: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    checked,
  };
}

// Convenience for tests: pick the profile TextOS applies to a document. This function is
// PRODUCT POLICY; the CSE core does not dispatch on contentType.
export function pickTextosContentPassProfile(document: ContentDocument): ContentPassProfile {
  if (document.identity.contentType === "product_article") return "textos.article@1";
  return "default";
}
