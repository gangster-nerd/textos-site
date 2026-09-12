// Vérification effective des evidenceRefs contre le dépôt produit à un SHA donné.
//
// Correction P0 CTO CTC-6 : une chaîne non-vide n'est pas une preuve. Chaque `evidenceRef`
// doit être résolu au SHA cible. Trois formes reconnues :
//
//   - path direct : "src/server/textos/act/providers/wordpress/index.ts"
//   - glob simple : "src/server/textos/act/asset-spec/*"
//                    → existe si le répertoire parent contient ≥ 1 fichier tracké
//   - identifiant textuel ADR/test : "ADR-016" / "ADR-021 (S12 graduated publication)"
//                    → non vérifiable au SHA sans convention structurée ; classé NOMINAL.
//
// Une déclaration est "supportée" à un SHA donné si AU MOINS UN de ses evidenceRefs de type
// path/glob existe au SHA. Sinon → EVIDENCE_INSUFFICIENT_AT_REF. Les preuves ADR nominales
// ne suffisent pas à elles seules : elles peuvent PROLONGER une preuve path mais pas la
// REMPLACER.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function productRepoPath(): string {
  const fromEnv = process.env.TEXTOS_PRODUCT_REPO;
  const candidate = fromEnv && fromEnv.length > 0 ? fromEnv : "/Users/marc/Desktop/textos";
  if (!existsSync(path.join(candidate, ".git"))) {
    throw new Error(`Dépôt produit introuvable ou non-git : ${candidate}.`);
  }
  return candidate;
}

export type EvidenceKind = "path" | "glob" | "nominal";

export function classifyEvidenceRef(ref: string): EvidenceKind {
  if (ref.endsWith("/*") || ref.endsWith("/**")) return "glob";
  if (ref.startsWith("src/") || ref.startsWith("scripts/") || ref.startsWith("app/")) return "path";
  if (ref.startsWith("textos-site:")) return "nominal";
  return "nominal";
}

function pathExistsAtRef(repo: string, sha: string, filePath: string): boolean {
  try {
    execFileSync("git", ["-C", repo, "cat-file", "-e", `${sha}:${filePath}`], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function globHasMatchAtRef(repo: string, sha: string, glob: string): boolean {
  // Résolution minimaliste : lister le répertoire parent au SHA cible et exiger ≥ 1 entrée.
  const dir = glob.replace(/\/\*+$/, "");
  try {
    const listing = execFileSync("git", ["-C", repo, "ls-tree", "--name-only", `${sha}`, `${dir}/`], {
      encoding: "utf8",
    });
    return listing.trim().length > 0;
  } catch {
    return false;
  }
}

export interface EvidenceResolution {
  ref: string;
  kind: EvidenceKind;
  resolvedAtRef: boolean;
}

export function resolveEvidenceAtRef(args: {
  sha: string;
  evidenceRefs: readonly string[];
}): EvidenceResolution[] {
  const repo = productRepoPath();
  return args.evidenceRefs.map((ref) => {
    const kind = classifyEvidenceRef(ref);
    let resolved = false;
    if (kind === "path") resolved = pathExistsAtRef(repo, args.sha, ref);
    else if (kind === "glob") resolved = globHasMatchAtRef(repo, args.sha, ref);
    else resolved = false; // nominal — non vérifiable au SHA sans convention structurée
    return { ref, kind, resolvedAtRef: resolved };
  });
}

export interface EvidenceSummary {
  hasPathOrGlobEvidence: boolean;
  supportedAt: "authoritative" | "candidate" | "both" | "neither";
  resolutions: {
    authoritative: EvidenceResolution[];
    candidate: EvidenceResolution[];
  };
}

export function summarizeEvidence(args: {
  evidenceRefs: readonly string[];
  authoritativeSha: string;
  candidateSha: string;
}): EvidenceSummary {
  const authoritative = resolveEvidenceAtRef({
    sha: args.authoritativeSha,
    evidenceRefs: args.evidenceRefs,
  });
  const candidate = resolveEvidenceAtRef({
    sha: args.candidateSha,
    evidenceRefs: args.evidenceRefs,
  });
  const supportsAtAuthoritative = authoritative.some(
    (r) => (r.kind === "path" || r.kind === "glob") && r.resolvedAtRef,
  );
  const supportsAtCandidate = candidate.some(
    (r) => (r.kind === "path" || r.kind === "glob") && r.resolvedAtRef,
  );
  const hasPathOrGlobEvidence = args.evidenceRefs.some((r) => classifyEvidenceRef(r) !== "nominal");
  let supportedAt: EvidenceSummary["supportedAt"];
  if (supportsAtAuthoritative && supportsAtCandidate) supportedAt = "both";
  else if (supportsAtAuthoritative) supportedAt = "authoritative";
  else if (supportsAtCandidate) supportedAt = "candidate";
  else supportedAt = "neither";
  return {
    hasPathOrGlobEvidence,
    supportedAt,
    resolutions: { authoritative, candidate },
  };
}
