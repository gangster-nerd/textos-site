import { allowsSurface, findCapability, type CapabilityDeclaration } from "@/lib/capability-registry";
import { findClaim, type Surface } from "@/lib/claims-registry";
import { getCluster } from "@/lib/content/content-cluster-registry";

import {
  assertConfiguredCtaPublishable,
  resolveCtaForDocument,
  type CtaResolution,
} from "@/lib/conversion/cta-resolver";
import { deliveryContext } from "@/lib/conversion/delivery-context";
import { getVisual } from "@/lib/visuals/visual-registry";
import { SURFACE_BY_CONTENT_TYPE } from "./content-types";
import type { ContentFrontmatter } from "./content-schema";

// Plus de table `Record<Status, Surface[]>` : l'autorisation ne se déduit plus d'un statut, elle
// se lit sur la capacité elle-même (`claimedSurfaces`). Un statut ne peut pas savoir qu'une capacité
// donnée n'a le droit d'apparaître qu'en FAQ — seule la capacité le sait.
//
// Le vérificateur de dérive garantit par ailleurs `claimedSurfaces ⊆ allowedSurfaces` du produit :
// ce gate est donc l'intersection effective des deux déclarations.

const MATURITY_LABEL: Partial<Record<NonNullable<CapabilityDeclaration["implementationStatus"]>, string>> = {
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
    const declaration = findCapability(id);
    if (!declaration) throw new Error(`Capacité inconnue du registre : ${id}`);
    return { id, declaration };
  });

  const surface = SURFACE_BY_CONTENT_TYPE[fm.contentType];

  for (const cap of capabilities) {
    if (!allowsSurface(cap.declaration, surface)) {
      throw new Error(
        `Surface "${surface}" non revendiquée pour ${cap.id} (publication ${cap.declaration.publicationStatus}, surfaces : ${
          cap.declaration.claimedSurfaces.join(", ") || "aucune"
        }).`
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

  // Cluster taxonomique : doit exister et ne pas être retiré.
  const cluster = getCluster(fm.clusterId);
  if (!cluster) throw new Error(`Cluster inconnu du registre : ${fm.clusterId}`);
  if (cluster.status === "retired") {
    throw new Error(`Cluster retiré, contenu non rattachable : ${fm.clusterId}.`);
  }

  // CTA : la variante doit EXISTER (refus bruyant — une variante fantôme est une erreur de
  // contenu, pas un CTA absent). Si elle est `approved`, elle doit être PUBLIABLE, sinon le build
  // échoue : destination, surface, capacités commercialisables, claims autorisés sur sales_copy.
  //
  // NOTE : on ne vérifie PAS que requiredCapabilities ⊆ fm.capabilityIds. Les deux ensembles ont
  // des fonctions distinctes — l'article gouverne ses affirmations éditoriales, le CTA gouverne une
  // surface commerciale prouvée par ses propres claims. Exiger l'inclusion forcerait un article à
  // revendiquer des capacités dont il ne parle pas pour pouvoir porter son propre CTA.
  assertConfiguredCtaPublishable({ configuredVariant: fm.ctaVariant, surface });

  // Résolution STRICTE : c'est elle qui fait autorité, et la seule que le rendu consommera.
  const ctaResolution: CtaResolution = resolveCtaForDocument({
    configuredVariant: fm.ctaVariant,
    contentType: fm.contentType,
    delivery: deliveryContext(),
  });

  // Visuels : chaque id doit exister, être approved, couvrir ce contentType — et ne PAS introduire
  // de claim clandestin. Sans le dernier contrôle, une page pourrait déclarer trois claims
  // autorisés dans son frontmatter puis afficher un schéma approuvé qui en porte un quatrième,
  // non déclaré : le claim entrerait dans la page sans passer par le gate de claims.
  for (const visualId of fm.visualIds ?? []) {
    const visual = getVisual(visualId);
    if (!visual) throw new Error(`Visuel inconnu du registre : ${visualId}`);
    if (visual.status !== "approved") {
      throw new Error(`Visuel ${visualId} non approved (statut ${visual.status}).`);
    }
    if (!visual.allowedContentTypes.includes(fm.contentType)) {
      throw new Error(
        `Visuel ${visualId} non autorisé sur le contentType ${fm.contentType}.`
      );
    }
    const documentClaims = new Set(fm.claimIds);
    for (const claimId of visual.claimIds) {
      if (!findClaim(claimId)) {
        throw new Error(`Visuel ${visualId} porte un claim inconnu du registre : ${claimId}.`);
      }
      if (!documentClaims.has(claimId)) {
        throw new Error(
          `Visuel ${visualId} porte ${claimId}, absent des claimIds du document — un visuel ne peut pas introduire un claim non déclaré.`
        );
      }
    }
  }

  // Tous les labels, pas seulement le premier : une restriction ne doit
  // jamais disparaître quand plusieurs capacités sont référencées.
  const maturityLabels = [
    ...new Set(
      capabilities
        .map((cap) =>
          cap.declaration.implementationStatus
            ? MATURITY_LABEL[cap.declaration.implementationStatus]
            : undefined
        )
        .filter((label): label is string => Boolean(label))
    ),
  ];

  return { capabilities, surface, maturityLabels, ctaResolution };
}
