// Confrontation de DEUX DÉCLARATIONS : le registre éditorial de ce dépôt, et le manifeste émis par
// le produit. Aucune inspection de code, d'aucun côté.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// ASYMÉTRIE
//
//   site PLUS PERMISSIF que le produit  → BLOQUANT. Le site affirme plus que ce que le produit
//                                         reconnaît. C'est la seule faute qui se voie en ligne, et
//                                         elle ne se rattrape pas après publication.
//
//   site PLUS RESTRICTIF                → RAPPORTÉ. Le retard peut être parfaitement intentionnel :
//                                         du code existe, personne n'a décidé d'en parler. Bloquer
//                                         forcerait à publier pour repasser au vert.
//
// L'autorisation se joue sur les SURFACES, pas sur un rang de statut : `claimedSurfaces ⊆
// allowedSurfaces`. Deux statuts peuvent n'autoriser aucune surface pour des raisons radicalement
// différentes — les classer sur une échelle les écraserait l'un sur l'autre.
//
// Aucune conclusion de ce module ne propose de promotion. Elles ont toutes la forme « le site
// déclare X, le produit déclare Y » — le verbe qui suit appartient à un humain.
// ─────────────────────────────────────────────────────────────────────────────────────────────

import { CAPABILITY_REGISTRY, type CapabilityDeclaration } from "@/lib/capability-registry";

import type { ProductManifest } from "./manifest-schema";
import { implementationRank } from "./status-axes";

export type FindingKind =
  | "site_surface_not_allowed"
  | "site_ahead_implementation"
  | "site_publication_more_permissive"
  | "capability_absent_from_manifest"
  | "entity_kind_divergence"
  | "product_ahead_implementation"
  | "site_more_restrictive_publication"
  | "site_more_restrictive_surfaces"
  | "publication_kind_divergence"
  | "untraced_publication_decision"
  | "capability_absent_from_registry";

export interface Finding {
  kind: FindingKind;
  severity: "blocking" | "report";
  capabilityId: string;
  siteDeclares: string | null;
  productDeclares: string | null;
  message: string;
}

const SEVERITY: Record<FindingKind, Finding["severity"]> = {
  site_surface_not_allowed: "blocking",
  site_ahead_implementation: "blocking",
  site_publication_more_permissive: "blocking",
  capability_absent_from_manifest: "blocking",
  // Incompatibilité ONTOLOGIQUE, pas écart de statut : un côté tient l'entité pour une capacité,
  // l'autre pour un concept refusé. Aucune comparaison de statut ou de surface n'a de sens tant que
  // les deux ne parlent pas de la même nature de chose.
  entity_kind_divergence: "blocking",
  product_ahead_implementation: "report",
  site_more_restrictive_publication: "report",
  site_more_restrictive_surfaces: "report",
  publication_kind_divergence: "report",
  untraced_publication_decision: "report",
  capability_absent_from_registry: "report",
};

const finding = (
  kind: FindingKind,
  capabilityId: string,
  siteDeclares: string | null,
  productDeclares: string | null,
  message: string
): Finding => ({ kind, severity: SEVERITY[kind], capabilityId, siteDeclares, productDeclares, message });

/**
 * `public_marketable` est le seul statut qui autorise une surface COMMERCIALE. Le site ne peut donc
 * pas le porter si le produit ne le porte pas — indépendamment des surfaces, parce que ce statut
 * gouverne aussi `featureList` et le JSON-LD, qui ne passent pas par le gate de surface.
 */
function comparePublication(
  capabilityId: string,
  site: CapabilityDeclaration,
  product: ProductManifest["entities"][number]
): Finding[] {
  const findings: Finding[] = [];
  const sitePub = site.publicationStatus;
  const productPub = product.publicationStatus;

  if (sitePub === productPub) return findings;

  if (sitePub === "public_marketable") {
    findings.push(
      finding(
        "site_publication_more_permissive",
        capabilityId,
        `publication:${sitePub}`,
        `publication:${productPub}`,
        `Le site commercialise une capacité que le produit ne déclare pas public_marketable (produit "${productPub}").`
      )
    );
    return findings;
  }

  if (productPub === "public_marketable") {
    // Écart de PUBLICATION. L'étiqueter `product_ahead_implementation` mélangerait les deux axes que
    // tout ce dispositif sépare : le code n'a pas bougé, seule la politique diffère.
    findings.push(
      finding(
        "site_more_restrictive_publication",
        capabilityId,
        `publication:${sitePub}`,
        `publication:${productPub}`,
        `Le produit autorise la commercialisation, le site ne la revendique pas (site "${sitePub}") — décision éditoriale attendue.`
      )
    );
    return findings;
  }

  findings.push(
    finding(
      "publication_kind_divergence",
      capabilityId,
      `publication:${sitePub}`,
      `publication:${productPub}`,
      `Statuts de publication différents (site "${sitePub}", produit "${productPub}") — aucun n'autorise plus que l'autre, mais ils n'appellent pas la même action.`
    )
  );
  return findings;
}

function compareOne(
  capabilityId: string,
  site: CapabilityDeclaration,
  product: ProductManifest["entities"][number]
): Finding[] {
  // La nature de l'entité se compare AVANT ses statuts, et court-circuite le reste : comparer les
  // surfaces d'une « capacité » à celles d'un « concept prohibé » produirait des écarts dérivés qui
  // masqueraient la seule incompatibilité qui compte.
  if (site.kind !== product.kind) {
    return [
      finding(
        "entity_kind_divergence",
        capabilityId,
        `kind:${site.kind}`,
        `kind:${product.kind}`,
        `Nature d'entité incompatible : le site la traite comme "${site.kind}", le produit comme "${product.kind}".`
      ),
    ];
  }

  const findings: Finding[] = [...comparePublication(capabilityId, site, product)];

  // ── Surfaces : l'inclusion est la règle d'autorisation ───────────────────────────────────────
  const allowed = new Set<string>(product.allowedSurfaces);
  const excess = site.claimedSurfaces.filter((surface) => !allowed.has(surface));
  if (excess.length > 0) {
    findings.push(
      finding(
        "site_surface_not_allowed",
        capabilityId,
        `surfaces:[${site.claimedSurfaces.join(", ")}]`,
        `surfaces:[${product.allowedSurfaces.join(", ")}]`,
        `Le site revendique ${excess.length} surface(s) que le produit n'autorise pas : ${excess.join(", ")}.`
      )
    );
  }

  const claimed = new Set<string>(site.claimedSurfaces);
  const unused = product.allowedSurfaces.filter((surface) => !claimed.has(surface));
  if (unused.length > 0) {
    findings.push(
      finding(
        "site_more_restrictive_surfaces",
        capabilityId,
        `surfaces:[${site.claimedSurfaces.join(", ")}]`,
        `surfaces:[${product.allowedSurfaces.join(", ")}]`,
        `Surfaces autorisées par le produit et non revendiquées : ${unused.join(", ")}.`
      )
    );
  }

  // ── Axe technique ───────────────────────────────────────────────────────────────────────────
  // Les deux axes sont désormais exprimables des deux côtés : plus de traduction, donc plus de faux
  // écart dû à un vocabulaire inexpressif.
  if (site.implementationStatus !== null && product.implementationStatus !== null) {
    const siteRank = implementationRank(site.implementationStatus);
    const productRank = implementationRank(product.implementationStatus);

    if (siteRank > productRank) {
      findings.push(
        finding(
          "site_ahead_implementation",
          capabilityId,
          `implementation:${site.implementationStatus}`,
          `implementation:${product.implementationStatus}`,
          `Le site suppose un avancement technique que le produit ne déclare pas.`
        )
      );
    } else if (siteRank < productRank) {
      findings.push(
        finding(
          "product_ahead_implementation",
          capabilityId,
          `implementation:${site.implementationStatus}`,
          `implementation:${product.implementationStatus}`,
          `Le produit a avancé au-delà de ce que le registre reflète.`
        )
      );
    }
  }
  // Pas de branche « l'un des deux est null » : les deux `kind` étant égaux à ce stade, les deux
  // `implementationStatus` sont simultanément nuls (concept prohibé) ou simultanément renseignés.

  if (product.publicationDecision.decidedIn === null) {
    findings.push(
      finding(
        "untraced_publication_decision",
        capabilityId,
        `publication:${site.publicationStatus}`,
        `publication:${product.publicationStatus}`,
        `Statut de publication déclaré sans décision tracée côté produit.`
      )
    );
  }

  return findings;
}

export function compareDeclarations(
  registry: Readonly<Record<string, CapabilityDeclaration>>,
  manifest: ProductManifest
): Finding[] {
  const findings: Finding[] = [];
  const byId = new Map(manifest.entities.map((entity) => [entity.id, entity]));

  for (const [capabilityId, site] of Object.entries(registry)) {
    const product = byId.get(capabilityId);

    if (!product) {
      // BLOQUANT : le site porte une déclaration publique sur une entité dont le produit ne répond
      // pas. Il n'y a rien à confronter — donc rien qui la soutienne.
      findings.push(
        finding(
          "capability_absent_from_manifest",
          capabilityId,
          `publication:${site.publicationStatus}`,
          null,
          `Le registre déclare cette capacité ; le manifeste produit ne la mentionne pas.`
        )
      );
      continue;
    }

    findings.push(...compareOne(capabilityId, site, product));
  }

  for (const entity of manifest.entities) {
    if (!(entity.id in registry)) {
      findings.push(
        finding(
          "capability_absent_from_registry",
          entity.id,
          null,
          `implementation:${entity.implementationStatus ?? "null"} / publication:${entity.publicationStatus}`,
          `Le produit déclare cette entité ; le registre éditorial ne la connaît pas — candidat à une décision éditoriale.`
        )
      );
    }
  }

  return findings.sort(
    (a, b) => a.capabilityId.localeCompare(b.capabilityId) || a.kind.localeCompare(b.kind)
  );
}

export const compareAgainstLiveRegistry = (manifest: ProductManifest): Finding[] =>
  compareDeclarations(CAPABILITY_REGISTRY, manifest);

export const blocking = (findings: readonly Finding[]): Finding[] =>
  findings.filter((f) => f.severity === "blocking");

export const reported = (findings: readonly Finding[]): Finding[] =>
  findings.filter((f) => f.severity === "report");
