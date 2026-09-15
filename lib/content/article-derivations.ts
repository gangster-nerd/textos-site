// Dérivations mécaniquement calculées à partir du body Markdown. Aucune valeur maintenue à
// la main pour des choses que le corps du document définit déjà : temps de lecture, table des
// matières, breadcrumbs, canonical, word count.
//
// Contrat CTC-ARTICLE-SYSTEM-1 : ces valeurs sont DÉRIVÉES, pas déclarées.

import type { ResolvedDocument } from "./content-loader";

export interface Heading {
  level: 2 | 3;
  text: string;
  id: string; // stable, kebab-case
}

/**
 * Slugifie un titre de section pour produire un ID d'ancrage stable. Idempotent : passer une
 * seconde fois retourne la même valeur.
 */
export function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extrait les H2 (et optionnellement H3) du body Markdown. Ignore les blocs de code, les
 * lignes commençant par un marqueur qui n'est pas un titre stricto sensu.
 */
export function extractHeadings(body: string, options: { includeH3?: boolean } = {}): Heading[] {
  const headings: Heading[] = [];
  const includeH3 = options.includeH3 ?? false;
  let insideCode = false;
  const seen = new Map<string, number>();

  for (const line of body.split("\n")) {
    if (/^```/.test(line)) {
      insideCode = !insideCode;
      continue;
    }
    if (insideCode) continue;
    const h2 = /^##\s+(.+)$/.exec(line);
    const h3 = /^###\s+(.+)$/.exec(line);
    let level: 2 | 3 | null = null;
    let text = "";
    if (h2) {
      level = 2;
      text = h2[1].trim();
    } else if (h3 && includeH3) {
      level = 3;
      text = h3[1].trim();
    } else {
      continue;
    }
    const base = slugifyHeading(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    headings.push({ level, text, id });
  }
  return headings;
}

/** Word count on the article body (Markdown source, unicode-aware). */
export function countWords(body: string): number {
  const words = body.match(/[\p{L}\p{N}]+/gu);
  return words ? words.length : 0;
}

/**
 * Reading time in minutes (rounded up, minimum 1). 220 words/min is a common technical-content
 * baseline (Nielsen Norman Group). We round UP to avoid over-promising short reads.
 */
export function readingTimeMinutes(body: string): number {
  const wpm = 220;
  const wc = countWords(body);
  return Math.max(1, Math.ceil(wc / wpm));
}

/** Canonical breadcrumb for /insights/[slug]. */
export function insightBreadcrumb(slug: string, title: string): Array<{ label: string; href: string }> {
  return [
    { label: "TextOS", href: "/" },
    { label: "Insights", href: "/insights" },
    { label: title, href: `/insights/${slug}` },
  ];
}

/**
 * TOC eligibility : we render a Table of Contents when the article has ≥4 H2 headings.
 * Shorter articles use the natural document flow.
 */
export function shouldRenderToc(headings: Heading[]): boolean {
  return headings.filter((h) => h.level === 2).length >= 4;
}

/**
 * Determinist relevance scoring for related articles.
 * Replaces `.slice(0, 6)`. Higher score = more relevant. Ties broken by (higher score, older
 * publishedAt, slug asc).
 */
export interface RelatedCandidate {
  slug: string;
  title: string;
  href: string;
  score: number;
  reasons: string[];
}

export interface RelatedInput {
  target: ResolvedDocument;
  candidates: readonly ResolvedDocument[];
}

export function scoreRelated(input: RelatedInput): RelatedCandidate[] {
  const t = input.target;
  const tFm = t.frontmatter as ResolvedDocument["frontmatter"] & Record<string, unknown>;
  const tCluster = tFm.clusterId;
  const tCaps = new Set(t.frontmatter.capabilityIds ?? []);
  const tClaims = new Set(t.frontmatter.claimIds ?? []);
  const tTopics = new Set((tFm.topicIds as string[] | undefined) ?? []);
  const tPrimaryTopic = tFm.primaryTopicId as string | undefined;
  const tFunnel = tFm.funnelStage as string | undefined;
  const tRelated = new Set((tFm.relatedContentIds as string[] | undefined) ?? []);

  // CTO §10 : le filtre précédent laissait passer des drafts dans un contexte public.
  // Vrai contrat : si la cible est publiquement indexable, aucun candidat draft/noindex
  // ne peut être proposé — même si la cible et le candidat partagent des signaux. Un
  // article draft "invité" dans le graphe d'un article publié le rendrait indirectement
  // découvrable via un maillage interne indexé.
  const publicTarget =
    t.frontmatter.editorialStatus === "published" &&
    t.frontmatter.indexingPolicy === "index";

  const scored: RelatedCandidate[] = [];
  for (const c of input.candidates) {
    if (c.slug === t.slug && c.collection === t.collection) continue;
    if (
      publicTarget &&
      (c.frontmatter.editorialStatus !== "published" ||
        c.frontmatter.indexingPolicy !== "index")
    ) {
      continue;
    }
    const cFm = c.frontmatter as ResolvedDocument["frontmatter"] & Record<string, unknown>;
    let score = 0;
    const reasons: string[] = [];

    // 1. Explicit relation (highest priority).
    if (tRelated.has(c.contentId)) {
      score += 50;
      reasons.push("explicit relation");
    }
    // 2. Same cluster.
    if (cFm.clusterId === tCluster) {
      score += 20;
      reasons.push("shared cluster");
    }
    // 3. Shared capability (each match adds 10).
    let capOverlap = 0;
    for (const cap of c.frontmatter.capabilityIds ?? []) {
      if (tCaps.has(cap)) capOverlap += 1;
    }
    if (capOverlap > 0) {
      score += 10 * capOverlap;
      reasons.push(`${capOverlap} shared capability${capOverlap > 1 ? "ies" : ""}`);
    }
    // 4. Shared claim (each match adds 6).
    let claimOverlap = 0;
    for (const cid of c.frontmatter.claimIds ?? []) {
      if (tClaims.has(cid)) claimOverlap += 1;
    }
    if (claimOverlap > 0) {
      score += 6 * claimOverlap;
      reasons.push(`${claimOverlap} shared claim${claimOverlap > 1 ? "s" : ""}`);
    }
    // 5. Topic overlap. Same primary topic > shared secondary.
    const cPrimary = cFm.primaryTopicId as string | undefined;
    const cTopics = new Set((cFm.topicIds as string[] | undefined) ?? []);
    if (tPrimaryTopic && cPrimary === tPrimaryTopic) {
      score += 15;
      reasons.push("shared primary topic");
    } else {
      let topicOverlap = 0;
      for (const tp of cTopics) if (tTopics.has(tp)) topicOverlap += 1;
      if (topicOverlap > 0) {
        score += 5 * topicOverlap;
        reasons.push(`${topicOverlap} shared topic${topicOverlap > 1 ? "s" : ""}`);
      }
    }
    // 6. Complementary funnel stage : same or one adjacent stage.
    const cFunnel = cFm.funnelStage as string | undefined;
    if (tFunnel && cFunnel && cFunnel === tFunnel) {
      score += 3;
      reasons.push("same funnel stage");
    }
    if (score === 0) continue;
    scored.push({
      slug: c.slug,
      title: c.frontmatter.title,
      href: c.path,
      score,
      reasons,
    });
  }
  // Deterministic tie-break : score desc, oldest publishedAt (stable), slug asc.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.slug.localeCompare(b.slug);
  });
  return scored;
}
