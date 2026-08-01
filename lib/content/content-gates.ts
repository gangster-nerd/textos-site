import { CAPABILITY_STATUS, type Status } from "@/lib/capability-registry";
import { findClaim, type Surface } from "@/lib/claims-registry";
import type { ContentFrontmatter } from "./content-schema";

const SURFACE_BY_CONTENT_TYPE: Record<ContentFrontmatter["contentType"], Surface> = {
  developer_note: "developer_note",
  changelog_entry: "changelog",
  faq_entry: "faq",
  product_article: "product_article",
};

// Record<Status, …> complet : les 9 statuts du registre (capability-registry.ts).
// Verrou : seul public_marketable atteint homepage / product_article.
const ALLOWED_SURFACES: Record<Status, readonly Surface[]> = {
  public_marketable: ["developer_note", "changelog", "faq", "product_article", "homepage"],
  implemented: ["developer_note", "changelog", "faq"],
  wip_committed_tested: ["developer_note", "changelog", "faq"],
  implemented_schema_only: ["developer_note"],
  planned: [],
  candidate: [],
  risky: [],
  unsupported: [],
  forbidden: [],
};

const MATURITY_LABEL: Partial<Record<Status, string>> = {
  implemented: "Implemented — available in the product, not yet a marketed capability.",
  wip_committed_tested:
    "Technical foundation — committed and tested, not yet a public capability.",
  implemented_schema_only: "Schema only — no runtime behaviour yet.",
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function runGates(fm: ContentFrontmatter, slug: string) {
  if (!SLUG.test(slug)) {
    throw new Error(`Slug invalide (kebab-case strict attendu) : ${slug}`);
  }

  const capabilities = fm.capabilityIds.map((id) => {
    const status = CAPABILITY_STATUS[id as keyof typeof CAPABILITY_STATUS];
    if (!status) throw new Error(`Capacité inconnue du registre : ${id}`);
    return { id, status: status as Status };
  });

  const surface = SURFACE_BY_CONTENT_TYPE[fm.contentType];

  for (const cap of capabilities) {
    if (!ALLOWED_SURFACES[cap.status].includes(surface)) {
      throw new Error(
        `Surface "${surface}" interdite pour ${cap.id} (statut ${cap.status}).`
      );
    }
  }

  const declared = new Set(fm.capabilityIds);
  for (const claimId of fm.claimIds) {
    const claim = findClaim(claimId);
    if (!claim) throw new Error(`Claim inconnu du registre : ${claimId}`);
    if (!claim.allowedSurfaces.includes(surface)) {
      throw new Error(`Claim ${claimId} non autorisé sur la surface ${surface}.`);
    }
    // capabilityId null = claim doctrinal, non rattaché à une capacité précise
    if (claim.capabilityId !== null && !declared.has(claim.capabilityId)) {
      throw new Error(
        `Claim ${claimId} rattaché à ${claim.capabilityId}, absent de capabilityIds.`
      );
    }
  }

  // Tous les labels, pas seulement le premier : une restriction ne doit
  // jamais disparaître quand plusieurs capacités sont référencées.
  const maturityLabels = [
    ...new Set(
      capabilities
        .map((cap) => MATURITY_LABEL[cap.status])
        .filter((label): label is string => Boolean(label))
    ),
  ];

  return { capabilities, surface, maturityLabels };
}
