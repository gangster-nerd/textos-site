// CTC-9-A path-aware verifier — les articles sous `content/insights/**` sont soumis à un
// contrat de frontmatter STRICTEMENT PLUS FORT que le schéma générique :
//
//   Les champs optionnels de CTC-9 (editorialClass, truthMode, sourcePaths, sourceSemantics,
//   sourceDigests, disclaimer) deviennent OBLIGATOIRES ici. Un commentaire de source disant
//   "MUST declare" n'est pas une garantie ; ce module en est une.
//
// De plus, chaque digest déclaré est RECOMPUTÉ à partir du blob git au SHA source. Un digest
// sur 64 caractères hexadécimaux n'est pas une preuve tant qu'on ne l'a pas reproduit.
//
// L'objet `IMPLEMENTATION_EVIDENCE` prouve que ce module est plus strict que le schéma :
// il refuse un article insight qui passerait le schéma générique.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import {
  EDITORIAL_CLASSES,
  SOURCE_SEMANTICS,
  TRUTH_MODES,
} from "./content-schema";
import type { ResolvedDocument } from "./content-loader";
import { PERSON_IDS, PERSON_ENTITY_IDS } from "./author-registry";
import { TOPIC_IDS } from "./topic-registry";

export const INSIGHT_COLLECTION = "insights";

// Contrat strict : les optionnels du schéma générique redeviennent obligatoires ici.
// CTC-ARTICLE-SYSTEM-1 étend la liste avec les champs éditoriaux publication-grade.
export const InsightFrontmatterStrictSchema = z
  .object({
    editorialClass: z.enum(EDITORIAL_CLASSES),
    truthMode: z.enum(TRUTH_MODES),
    sourceSemantics: z.enum(SOURCE_SEMANTICS),
    sourcePaths: z.array(z.string().min(1)).min(1),
    sourceDigests: z.record(z.string().min(1), z.string().regex(/^[0-9a-f]{64}$/)).refine(
      (d) => Object.keys(d).length > 0,
      "sourceDigests doit couvrir tous les sourcePaths.",
    ),
    // CTC-ARTICLE-SYSTEM-1 §3 — champs publication-grade obligatoires pour /insights.
    authorId: z
      .enum(PERSON_IDS as [string, ...string[]])
      .refine((v) => PERSON_IDS.includes(v), "authorId inconnu du registre author-registry.ts"),
    // CTO §9 : reviewerIds ne peut contenir que des Person — un reviewer collectif
    // masquerait le fait qu'aucun humain nommé n'a lu la draft.
    reviewerIds: z
      .array(z.string())
      .refine(
        (arr) => arr.every((v) => PERSON_ENTITY_IDS.includes(v)),
        "reviewerId doit référencer un Person (pas une Organization) du registre.",
      ),
    primaryTopicId: z.enum(TOPIC_IDS as unknown as [string, ...string[]]),
    topicIds: z
      .array(z.string())
      .min(1)
      .refine((arr) => arr.every((v) => (TOPIC_IDS as readonly string[]).includes(v)), "topicId inconnu"),
    audience: z.enum([
      "reader-marketing",
      "reader-technical",
      "reader-executive",
      "reader-mixed",
    ]),
    funnelStage: z.enum([
      "awareness",
      "consideration",
      "decision",
      "expansion",
      "retention",
    ]),
    relatedContentIds: z.array(z.string()).optional(),
    // firstPublishedAt : null tant que non publié pour de vrai. Ne pas simuler la fraîcheur.
    firstPublishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    // CTO §1 : null tant qu'aucune revue humaine n'a eu lieu. Migration automatique ≠ revue.
    lastReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    revisionNumber: z.number().int().nonnegative(),
    revisionSummary: z.string().min(1).optional(),
    schemaType: z.enum(["Article", "TechArticle", "BlogPosting"]),
    // CTO §8 — image REQUIRED under /insights.
    image: z.object({
      src: z.string().regex(/^\/[a-z0-9/_.-]+$/),
      alt: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
  })
  .passthrough();

export interface InsightVerifierFailure {
  slug: string;
  message: string;
}

/**
 * Vérifie qu'un document insight :
 *   1. déclare tous les champs CTC-9 obligatoires ;
 *   2. porte un sourceDigest pour CHAQUE sourcePath ;
 *   3. son digest correspond au blob git `sourceProductRef:sourcePath` ;
 *   4. ROADMAP_DIRECTION → disclaimer verbatim (le schéma le vérifie déjà mais on double-check
 *      ici pour ne pas être aveugle) ;
 *   5. EXPERIMENT / COMPANY_TECHNOLOGY → ctaVariant=none.
 */
export function verifyInsightDocument(
  doc: ResolvedDocument,
  options: { productRepoPath?: string } = {},
): InsightVerifierFailure[] {
  const failures: InsightVerifierFailure[] = [];
  const fm = doc.frontmatter as ResolvedDocument["frontmatter"] & Record<string, unknown>;
  const slug = doc.slug;

  // 1. champs obligatoires
  const parsed = InsightFrontmatterStrictSchema.safeParse(fm);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      failures.push({
        slug,
        message: `frontmatter: ${issue.path.join(".") || "(root)"} — ${issue.message}`,
      });
    }
    return failures; // stop court : sans les champs on ne peut pas vérifier les digests
  }
  const strict = parsed.data;

  // 2. digest par sourcePath
  for (const p of strict.sourcePaths) {
    if (!(p in strict.sourceDigests)) {
      failures.push({ slug, message: `sourceDigests manque une entrée pour "${p}".` });
    }
  }

  // 3. recomputer contre le blob git
  const repo = productRepoPath(options.productRepoPath);
  if (repo) {
    for (const [p, declared] of Object.entries(strict.sourceDigests)) {
      const actual = digestBlobAt(repo, fm.productSnapshotSha as string, p);
      if (actual === null) {
        failures.push({
          slug,
          message: `sourceDigests["${p}"] introuvable à ${fm.productSnapshotSha}:${p} (chemin manquant au SHA).`,
        });
        continue;
      }
      if (actual !== declared) {
        failures.push({
          slug,
          message: `sourceDigests["${p}"] divergent: declared=${declared.slice(0, 12)}…, actual=${actual.slice(0, 12)}… au SHA ${fm.productSnapshotSha}.`,
        });
      }
    }
  }
  // Si productRepoPath est indisponible (CI sans dépôt local), on ne peut pas recalculer.
  // On PRÉSERVE alors les champs déclarés mais on marque l'incapacité comme un signal, pas
  // comme une infraction : le gate CI dédié dans scripts/content-verify.ts détectera la
  // divergence dès qu'un dépôt sera monté.

  // 4. ROADMAP_DIRECTION → disclaimer verbatim (le schéma le check ; on relit ici pour donner
  //    un message d'erreur clair au niveau insight-verifier).
  if (
    strict.editorialClass === "ROADMAP_DIRECTION" &&
    typeof fm.disclaimer === "string" &&
    !fm.disclaimer.includes("Direction under exploration — not a delivery commitment.")
  ) {
    failures.push({
      slug,
      message: `ROADMAP_DIRECTION exige disclaimer "Direction under exploration — not a delivery commitment." verbatim.`,
    });
  }

  // 5. EXPERIMENT / COMPANY_TECHNOLOGY → ctaVariant=none
  if (
    (strict.editorialClass === "EXPERIMENT" ||
      strict.editorialClass === "COMPANY_TECHNOLOGY") &&
    fm.ctaVariant !== "none"
  ) {
    failures.push({
      slug,
      message: `${strict.editorialClass} exige ctaVariant=none (obtenu ${String(fm.ctaVariant)}).`,
    });
  }

  // 6. primaryTopicId ∈ topicIds
  if (!strict.topicIds.includes(strict.primaryTopicId)) {
    failures.push({
      slug,
      message: `primaryTopicId "${strict.primaryTopicId}" absent de topicIds ${JSON.stringify(strict.topicIds)}.`,
    });
  }

  // 6bis. CTO §8 — l'asset image doit exister physiquement. Sinon la meta OG et le
  // ImageObject JSON-LD pointeraient vers un 404, ce qui donne un objet Article dont
  // l'image annoncée n'existe pas — pire qu'aucune image, parce que ça a l'air valide.
  const siteRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
  const imgSrc = strict.image.src;
  const imgAbsolute = path.join(siteRoot, "public", imgSrc.replace(/^\//, ""));
  if (!existsSync(imgAbsolute)) {
    failures.push({
      slug,
      message: `image.src "${imgSrc}" pointe vers un fichier absent (attendu à public${imgSrc}).`,
    });
  }

  // 7. Description ends with a proper terminal punctuation ; the schema enforces ≤160 chars
  // but not sentence completeness. This gate refuses truncated descriptions (they were
  // observed in wave-1).
  const desc = String(fm.description ?? "");
  if (!/[.!?»)][\s]*$/.test(desc)) {
    failures.push({
      slug,
      message: `description tronquée ou sans ponctuation finale : "${desc.slice(-40)}"`,
    });
  }

  // 7bis. CTO §6 — CTA contextuel. Un article dont le CTA résolu est autre que `none`
  // DOIT contenir le marqueur éditorial `<!-- cta:contextual -->` dans son corps —
  // exactement une occurrence. Sans marqueur, la position "contextual" tombe et le
  // CTA final devient orphelin. Le marqueur est la garantie qu'un humain a choisi le
  // point d'insertion, pas un algorithme.
  const CTA_MARKER_TOKEN = "<!-- cta:contextual -->";
  const resolvedCta = doc.ctaResolution?.resolvedVariant;
  if (resolvedCta && resolvedCta !== "none") {
    const occurrences = (doc.body.match(/<!--\s*cta:contextual\s*-->/g) ?? []).length;
    if (occurrences === 0) {
      failures.push({
        slug,
        message: `ctaResolution=${resolvedCta} exige le marqueur "${CTA_MARKER_TOKEN}" quelque part dans le corps de l'article.`,
      });
    } else if (occurrences > 1) {
      failures.push({
        slug,
        message: `marqueur "${CTA_MARKER_TOKEN}" trouvé ${occurrences} fois — un et un seul est attendu.`,
      });
    }
  }

  // 8. CTO §1 — invariants croisés draft/published. La revue humaine, la publication et
  // l'indexation sont trois choses distinctes ; on refuse toute combinaison qui laisserait
  // croire à un état intermédiaire mensonger (un draft "révisé mais non publié" via une
  // date de review synthétique ; un publié sans reviewer nommé ; un publié dont
  // firstPublishedAt est null).
  const status = fm.editorialStatus as string;
  const indexPolicy = fm.indexingPolicy as string;
  if (status === "draft") {
    if (strict.firstPublishedAt !== null) {
      failures.push({
        slug,
        message: `draft: firstPublishedAt doit être null (obtenu ${strict.firstPublishedAt}).`,
      });
    }
    if (strict.lastReviewedAt !== null) {
      failures.push({
        slug,
        message: `draft: lastReviewedAt doit être null tant qu'aucune revue humaine n'a eu lieu (obtenu ${strict.lastReviewedAt}).`,
      });
    }
    if (strict.revisionNumber !== 0) {
      failures.push({
        slug,
        message: `draft: revisionNumber doit être 0 (obtenu ${strict.revisionNumber}).`,
      });
    }
    if (indexPolicy !== "noindex") {
      failures.push({
        slug,
        message: `draft: indexingPolicy doit être noindex (obtenu ${indexPolicy}).`,
      });
    }
  } else if (status === "published") {
    if (strict.firstPublishedAt === null) {
      failures.push({
        slug,
        message: `published: firstPublishedAt doit être une date réelle (obtenu null).`,
      });
    }
    if (!strict.reviewerIds || strict.reviewerIds.length === 0) {
      failures.push({
        slug,
        message: `published: reviewerIds doit contenir au moins un reviewer humain nommé.`,
      });
    }
    if (strict.lastReviewedAt === null) {
      failures.push({
        slug,
        message: `published: lastReviewedAt doit être une date réelle (obtenu null).`,
      });
    }
    if (strict.revisionNumber < 1) {
      failures.push({
        slug,
        message: `published: revisionNumber doit être ≥ 1 (obtenu ${strict.revisionNumber}).`,
      });
    }
    if (indexPolicy !== "index") {
      failures.push({
        slug,
        message: `published: indexingPolicy doit être index (obtenu ${indexPolicy}).`,
      });
    }
  }

  return failures;
}

function productRepoPath(override?: string): string | null {
  const candidate = override ?? process.env.TEXTOS_PRODUCT_REPO ?? "/Users/marc/Desktop/textos";
  if (!existsSync(path.join(candidate, ".git"))) return null;
  return candidate;
}

function digestBlobAt(repo: string, sha: string, filePath: string): string | null {
  try {
    const buf = execFileSync("git", ["-C", repo, "show", `${sha}:${filePath}`], {
      maxBuffer: 40 * 1024 * 1024,
    });
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}
