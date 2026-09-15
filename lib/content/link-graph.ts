// Link graph — outbound / inbound / orphan / broken-link / draft-target detection.
//
// Contrat CTC-ARTICLE-SYSTEM-1 §7 :
//   - build failures pour : liens vers routes manquantes ; liens de production vers drafts ;
//     articles publiés orphelins ; slug/canonical dupliqués ; ancrages invalides.
//   - un backlink update engine génère des CANDIDATS quand un nouvel article est ajouté —
//     jamais de publication automatique.

import type { ResolvedDocument } from "./content-loader";
import { HUB_TOPIC_IDS, TOPICS } from "./topic-registry";

export interface LinkGraphNode {
  contentId: string;
  slug: string;
  collection: string;
  path: string; // canonical route
  title: string;
  status: "published" | "draft" | "review" | "archived";
  indexable: boolean;
  outbound: string[]; // hrefs
  inboundCount: number;
}

export interface BrokenLink {
  from: string; // contentId of the linker
  href: string;
  reason: "unknown-route" | "target-not-published" | "self-link";
}

export interface LinkGraph {
  nodes: LinkGraphNode[];
  brokenLinks: BrokenLink[];
  orphanPublished: string[]; // contentIds
  slugDuplicates: string[]; // slugs appearing more than once
  canonicalDuplicates: string[]; // paths appearing more than once
}

const LINK_RE = /\]\(([^)]+)\)/g;

function extractInternalHrefs(body: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(body)) !== null) {
    const raw = m[1].split(" ")[0]; // strip Markdown title
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      out.push(raw.split("#")[0].replace(/\/$/, "") || "/");
    }
  }
  return out;
}

/**
 * Assemble the full link graph across a set of documents. Deterministic (no time-based
 * ordering) — the same input always produces the same output.
 */
export function buildLinkGraph(docs: readonly ResolvedDocument[]): LinkGraph {
  const nodes: LinkGraphNode[] = [];
  const bySlug = new Map<string, ResolvedDocument[]>();
  const byPath = new Map<string, ResolvedDocument[]>();

  for (const d of docs) {
    const slugs = bySlug.get(d.slug) ?? [];
    slugs.push(d);
    bySlug.set(d.slug, slugs);

    const paths = byPath.get(d.path) ?? [];
    paths.push(d);
    byPath.set(d.path, paths);
  }

  // Map canonical path → contentId (for reverse lookup).
  const pathToDoc = new Map<string, ResolvedDocument>();
  for (const d of docs) pathToDoc.set(d.path, d);

  const inboundCount = new Map<string, number>();
  const brokenLinks: BrokenLink[] = [];

  for (const d of docs) {
    const outbound = extractInternalHrefs(d.body);
    const node: LinkGraphNode = {
      contentId: d.contentId,
      slug: d.slug,
      collection: d.collection,
      path: d.path,
      title: d.frontmatter.title,
      status: d.frontmatter.editorialStatus,
      indexable:
        d.frontmatter.editorialStatus === "published" &&
        d.frontmatter.indexingPolicy === "index",
      outbound,
      inboundCount: 0,
    };
    nodes.push(node);
    for (const href of outbound) {
      if (href === d.path) {
        brokenLinks.push({ from: d.contentId, href, reason: "self-link" });
        continue;
      }
      const target = pathToDoc.get(href);
      if (!target) {
        // We can't statically prove all app routes here (Next.js routes not scanned) — this
        // covers content links only. Unknown = "not a content route". App-only routes
        // (e.g. /request-measurement, /demo) are whitelisted below.
        if (!isKnownAppRoute(href)) {
          brokenLinks.push({ from: d.contentId, href, reason: "unknown-route" });
        }
        continue;
      }
      // Production link to a draft is a defect ONLY if the LINKER is indexable.
      if (node.indexable && target.frontmatter.editorialStatus !== "published") {
        brokenLinks.push({
          from: d.contentId,
          href,
          reason: "target-not-published",
        });
      }
      inboundCount.set(target.contentId, (inboundCount.get(target.contentId) ?? 0) + 1);
    }
  }

  for (const n of nodes) {
    n.inboundCount = inboundCount.get(n.contentId) ?? 0;
  }

  const orphanPublished = nodes
    .filter((n) => n.indexable && n.inboundCount === 0)
    .map((n) => n.contentId);

  const slugDuplicates = [...bySlug.entries()]
    .filter(([, arr]) => arr.length > 1)
    .map(([s]) => s);
  const canonicalDuplicates = [...byPath.entries()]
    .filter(([, arr]) => arr.length > 1)
    .map(([p]) => p);

  return {
    nodes: nodes.sort((a, b) => a.contentId.localeCompare(b.contentId)),
    brokenLinks: brokenLinks.sort(
      (a, b) => a.from.localeCompare(b.from) || a.href.localeCompare(b.href),
    ),
    orphanPublished: orphanPublished.sort(),
    slugDuplicates: slugDuplicates.sort(),
    canonicalDuplicates: canonicalDuplicates.sort(),
  };
}

// CTO §4 : la liste ci-dessous ne contient que des routes qui EXISTENT réellement dans
// l'app router (fichiers `app/**/page.tsx` correspondants). Aucune route « prévue mais
// pas encore construite » ne figure ici — un lien vers `/settings` doit rester une
// erreur tant que `/settings` n'existe pas. Les hub-slugs de sujets ne sont plus
// couverts par une regex ouverte : ils sont dérivés du registre au chargement du
// module, donc `/insights/topic/nonexistent` échoue à la vérification.
const KNOWN_APP_ROUTES = new Set([
  "/",
  "/insights",
  "/faq",
  "/request-measurement",
  "/request-measurement/received",
]);

// Dynamic routes that resolve via [slug] segments. `/methodology/*`, `/faq/*` and
// `/insights/*` are matched by parent-prefix — link-graph resolves `/insights/<slug>`
// against the actual content corpus (loaded documents) before consulting this list, so
// only the parent prefixes for OTHER collections need to appear here.
const KNOWN_DYNAMIC_PREFIXES = ["/methodology/"];

const KNOWN_TOPIC_HUB_ROUTES = new Set(
  HUB_TOPIC_IDS.map((id) => TOPICS[id].hubSlug)
    .filter((s): s is string => Boolean(s))
    .map((slug) => `/insights/topic/${slug}`),
);

function isKnownAppRoute(href: string): boolean {
  if (KNOWN_APP_ROUTES.has(href)) return true;
  if (KNOWN_TOPIC_HUB_ROUTES.has(href)) return true;
  for (const prefix of KNOWN_DYNAMIC_PREFIXES) {
    if (href.startsWith(prefix) && href.length > prefix.length) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Backlink update engine — proposes candidates, never publishes.
// ─────────────────────────────────────────────────────────────────────────────────────────────

export interface BacklinkCandidate {
  existingArticleContentId: string;
  proposedAnchor: string;
  insertionContext: string;
  newTargetHref: string;
  newTargetContentId: string;
  reason: string;
  confidence: "low" | "medium" | "high";
  humanReviewRequired: true;
}

/**
 * Given a NEW document, propose backlink candidates from EXISTING published documents where
 * the new article would be a relevant related link. Never modifies any file — returns
 * candidates for human review.
 */
export function proposeBacklinkCandidates(args: {
  newDoc: ResolvedDocument;
  existingDocs: readonly ResolvedDocument[];
}): BacklinkCandidate[] {
  const candidates: BacklinkCandidate[] = [];
  const newFm = args.newDoc.frontmatter as ResolvedDocument["frontmatter"] &
    Record<string, unknown>;
  const newTopics = new Set((newFm.topicIds as string[] | undefined) ?? []);
  const newCaps = new Set(args.newDoc.frontmatter.capabilityIds ?? []);
  const newClaims = new Set(args.newDoc.frontmatter.claimIds ?? []);

  for (const existing of args.existingDocs) {
    if (existing.contentId === args.newDoc.contentId) continue;
    if (existing.frontmatter.editorialStatus !== "published") continue;
    // Does existing already link to the new one?
    if (existing.body.includes(args.newDoc.path)) continue;

    const eFm = existing.frontmatter as ResolvedDocument["frontmatter"] & Record<string, unknown>;
    const eTopics = new Set((eFm.topicIds as string[] | undefined) ?? []);
    const eCaps = new Set(existing.frontmatter.capabilityIds ?? []);
    const eClaims = new Set(existing.frontmatter.claimIds ?? []);

    let signals = 0;
    let reasons: string[] = [];
    for (const t of newTopics) if (eTopics.has(t)) signals += 1;
    if (signals > 0) reasons.push(`${signals} shared topic${signals > 1 ? "s" : ""}`);
    let capOv = 0;
    for (const c of newCaps) if (eCaps.has(c)) capOv += 1;
    if (capOv > 0) {
      signals += capOv;
      reasons.push(`${capOv} shared capability${capOv > 1 ? "ies" : ""}`);
    }
    let claimOv = 0;
    for (const c of newClaims) if (eClaims.has(c)) claimOv += 1;
    if (claimOv > 0) {
      signals += claimOv;
      reasons.push(`${claimOv} shared claim${claimOv > 1 ? "s" : ""}`);
    }
    if (signals === 0) continue;

    const confidence: BacklinkCandidate["confidence"] =
      signals >= 3 ? "high" : signals === 2 ? "medium" : "low";
    candidates.push({
      existingArticleContentId: existing.contentId,
      proposedAnchor: args.newDoc.frontmatter.title,
      insertionContext:
        "Suggested near a paragraph discussing the shared topic/capability/claim — human to decide exact location.",
      newTargetHref: args.newDoc.path,
      newTargetContentId: args.newDoc.contentId,
      reason: reasons.join(" ; "),
      confidence,
      humanReviewRequired: true,
    });
  }
  return candidates.sort(
    (a, b) =>
      confidenceRank(b.confidence) - confidenceRank(a.confidence) ||
      a.existingArticleContentId.localeCompare(b.existingArticleContentId),
  );
}

function confidenceRank(c: BacklinkCandidate["confidence"]): number {
  return c === "high" ? 3 : c === "medium" ? 2 : 1;
}
