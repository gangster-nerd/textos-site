// Résolution CTA — SOURCE UNIQUE, STRICTE, de la vérité de conversion.
//
// Doctrine (arbitrage S1) :
//   Le contenu choisit une INTENTION de conversion. Le gate décide si elle est AUTORISÉE.
//   Le composant ne fait que RENDRE cette décision.
//
// Conséquence sur les signatures : `resolveCtaForDocument` exige tout le contexte dont elle a
// besoin — aucun paramètre optionnel. Une même fonction ne peut pas être stricte avec contexte et
// permissive sans : cette asymétrie serait une voie de contournement dès que `ContentCta` serait
// employé sur une autre route ou dans un autre template. Le composant, lui, ne résout plus rien :
// il reçoit la variante DÉJÀ résolue.
//
// Séparation des deux ensembles de capacités, à ne jamais confondre :
//   document.capabilityIds     → prémisses du corps ÉDITORIAL
//   cta.requiredCapabilities   → prémisses de la proposition COMMERCIALE (surface gouvernée)
// Le CTA n'a pas à être « couvert » par l'article : il est entièrement prouvé par SES claims. Un
// article peut donc porter un CTA de mesure sans revendiquer les capacités vendues — sans quoi il
// faudrait polluer son frontmatter avec des capacités dont il ne parle pas.

import { findCapability, isMarketableOn } from "@/lib/capability-registry";
import type { Surface } from "@/lib/claims-registry";
import { SURFACE_BY_CONTENT_TYPE } from "@/lib/content/content-types";
import { findClaim } from "@/lib/claims-registry";
import type { ContentTypeName } from "@/lib/content/content-types";
import type { ConversionMode } from "./conversion-config";
import { getCtaVariant, type CtaVariant, type CtaVariantId } from "./cta-registry";

/** Surface commerciale des claims portés par un CTA. Distincte des surfaces éditoriales. */
const SALES_SURFACE = "sales_copy" as const;

export interface CtaResolution {
  /** Ce que le contenu a DEMANDÉ (frontmatter), même si c'est irrésoluble. */
  configuredVariant: string;
  /** Ce qui sera RENDU — `null` = aucun CTA. C'est cette valeur que reçoit `ContentCta`. */
  resolvedVariant: CtaVariantId | null;
  /** Version du CTA rendu ; `null` quand rien n'est rendu. Jamais l'un sans l'autre. */
  version: number | null;
  /** Définition du CTA rendu ; `null` quand rien n'est rendu. */
  definition: CtaVariant | null;
}

export interface ResolveCtaForDocumentInput {
  configuredVariant: string;
  /** REQUIS. Le contexte n'est jamais optionnel : sans lui, pas de décision. */
  contentType: ContentTypeName;
  /** REQUIS. Une variante approuvée éditorialement n'est rendue que si elle est LIVRABLE. */
  delivery: CtaDeliveryContext;
}

const NOT_RESOLVED = (configuredVariant: string): CtaResolution => ({
  configuredVariant,
  resolvedVariant: null,
  version: null,
  definition: null,
});

/**
 * Règle d'éligibilité UNIQUE d'une variante `approved`, exprimée comme liste de violations.
 *
 * Deux consommateurs, un seul jeu de règles : `assertCtaPublishable` les transforme en échec de
 * build, `resolveCtaForDocument` en `null`. Aucune règle n'est réécrite d'un côté ou de l'autre.
 */
export function ctaViolations(v: CtaVariant, surface: Surface): string[] {
  const problems: string[] = [];

  // Destination réelle : un CTA approuvé sans URL serait un lien mort.
  if (v.destination === null) {
    problems.push(`approved sans destination — aucune URL réelle n'existe`);
  }

  // Surface : elle doit être couverte par la variante.
  if (!v.allowedSurfaces.includes(surface)) {
    problems.push(`non autorisée sur la surface ${surface}`);
  }

  // Capacités de la PROPOSITION COMMERCIALE : connues et globalement public_marketable.
  // Adosser un CTA à une capacité non commercialisable serait un overclaim (même doctrine que le
  // verrou featureList de l'entity-graph). Aucun rapport avec les capabilityIds de l'article.
  for (const capId of v.requiredCapabilities) {
    const capability = findCapability(capId);
    if (!capability) {
      problems.push(`requiert une capacité inconnue : ${capId}`);
    } else if (!isMarketableOn(capability, "sales_copy")) {
      // La surface compte autant que le statut : une capacité commercialisable ailleurs mais non
      // revendiquée sur `sales_copy` ne peut pas adosser une proposition commerciale.
      problems.push(
        `requiert ${capId} (publication ${capability.publicationStatus}, surfaces : ${
          capability.claimedSurfaces.join(", ") || "aucune"
        }) — non commercialisable sur sales_copy`
      );
    }
  }

  // Claims de la proposition commerciale : la surface sales_copy est gouvernée à part, et chaque
  // claim doit être adossé à une capacité que le CTA revendique lui-même. C'est ce qui rend la
  // proposition entièrement prouvée par ses propres claims.
  const required = new Set(v.requiredCapabilities);
  for (const claimId of v.claimIds) {
    const claim = findClaim(claimId);
    if (!claim) {
      problems.push(`porte un claim inconnu du registre : ${claimId}`);
      continue;
    }
    if (!claim.allowedSurfaces.includes(SALES_SURFACE)) {
      problems.push(`porte ${claimId}, non autorisé sur la surface ${SALES_SURFACE}`);
    }
    if (claim.capabilityId === null || !required.has(claim.capabilityId)) {
      problems.push(
        `porte ${claimId} (capabilityId ${claim.capabilityId ?? "null"}), hors des requiredCapabilities du CTA`
      );
    }
  }

  return problems;
}

/**
 * Contexte de LIVRAISON d'un CTA — ce qui doit exister réellement pour qu'une variante puisse être
 * approuvée. Injecté plutôt que lu ici : `ctaViolations` et ses voisines restent pures et
 * testables, la lecture du filesystem et de l'environnement reste au bord (`runGates`).
 */
export interface CtaDeliveryContext {
  /** Mode de conversion — gouverne la livraison, pas la copy. */
  mode: ConversionMode;
  /** La destination interne correspond-elle à une route réellement exportée ? */
  routeExists: (path: string) => boolean;
  /** L'endpoint du sous-traitant est-il configuré ? Exigé en `live` seulement. */
  endpointConfigured: boolean;
  /** Les mentions légales sont-elles publiées ? Exigé en `live` seulement. */
  legalNoticePublished: boolean;
}

/**
 * Préconditions de LIVRAISON (S2.6). Une destination interne ne suffit pas : la page doit exister,
 * le formulaire doit pouvoir aboutir, et la notice doit être publiée. Sans ces contrôles, un CTA
 * `approved` pourrait pointer vers une 404, poster dans le vide, ou collecter des données sans
 * information préalable — trois façons d'être en faute sans qu'aucun test ne s'en aperçoive.
 */
export function ctaDeliveryViolations(
  v: CtaVariant,
  ctx: CtaDeliveryContext
): string[] {
  const problems: string[] = [];

  // Mode `off` : rien n'est livrable, donc rien n'est rendu. Ce n'est pas une faute de config —
  // c'est un retrait volontaire (développement incomplet, incident fournisseur).
  if (ctx.mode === "off") return ["mode de conversion « off »"];

  if (v.destination === null) return problems; // déjà signalé par `ctaViolations`

  // Destination EXTERNE : hors périmètre gouverné. On refuse — le parcours éditorial ne se délègue
  // pas au fournisseur (il ne reçoit que la soumission).
  if (!v.destination.startsWith("/")) {
    problems.push(`pointe vers une destination externe (${v.destination})`);
    return problems;
  }

  if (!ctx.routeExists(v.destination)) {
    problems.push(`pointe vers ${v.destination}, qui n'est pas une route exportée`);
  }
  // En `demo`, RIEN n'est transmis ni stocké : ni endpoint ni mentions légales ne sont requis, et
  // le parcours doit être intégralement praticable. C'est tout l'objet du mode — montrer la
  // production, pas une version amputée.
  if (ctx.mode === "live") {
    if (!ctx.endpointConfigured) {
      problems.push("aucun endpoint de réception configuré — le formulaire n'aboutirait nulle part");
    }
    if (!ctx.legalNoticePublished) {
      problems.push("mentions légales non publiées — aucune collecte sans information préalable");
    }
  }
  return problems;
}

/**
 * Échec BRUYANT au build pour une variante `approved` mal configurée. Le silence serait un piège :
 * un CTA approuvé qui ne rend rien sans explication est plus coûteux à diagnostiquer qu'un build
 * rouge. Ne dit rien des variantes `disabled`/`retired`/`none` — leur non-rendu est voulu.
 */
export function assertCtaPublishable(v: CtaVariant, surface: Surface): void {
  if (v.status !== "approved") return;
  const problems = ctaViolations(v, surface);
  if (problems.length > 0) {
    throw new Error(`CTA "${v.id}" est approved mais ${problems.join(" ; ")}.`);
  }
}

/**
 * Résolution stricte. Ne lève jamais : un CTA irrésoluble n'est pas une erreur, c'est un `null`.
 * (Le refus bruyant, quand il est justifié, est le rôle de `assertCtaPublishable` via `runGates`.)
 */
export function resolveCtaForDocument(input: ResolveCtaForDocumentInput): CtaResolution {
  const { configuredVariant, contentType, delivery } = input;
  // Un document connaît son contentType, pas sa surface : la traduction se fait ICI, une fois, et
  // les appelants documentaires n'ont rien à changer.
  return resolveCtaForSurface({
    configuredVariant,
    surface: SURFACE_BY_CONTENT_TYPE[contentType],
    delivery,
  });
}

export interface ResolveCtaForSurfaceInput {
  configuredVariant: string;
  /** REQUISE. Le contexte n'est jamais optionnel : sans lui, pas de décision. */
  surface: Surface;
  /** REQUIS. Une variante approuvée éditorialement n'est rendue que si elle est LIVRABLE. */
  delivery: CtaDeliveryContext;
}

/**
 * Résolution par SURFACE — la forme générale.
 *
 * Elle existe parce que toutes les surfaces ne sont pas des documents : la page d'accueil porte une
 * proposition commerciale sans avoir ni frontmatter ni contentType. Elle applique exactement les
 * mêmes règles ; il n'y a pas de chemin allégé pour la homepage.
 */
export function resolveCtaForSurface(input: ResolveCtaForSurfaceInput): CtaResolution {
  const { configuredVariant, surface, delivery } = input;
  const definition = getCtaVariant(configuredVariant);

  if (!definition) return NOT_RESOLVED(configuredVariant);

  // `none` : sentinel. Résout vers null PAR IDENTITÉ, quel que soit son statut — il ne peut donc
  // jamais devenir un CTA visible, même si quelqu'un le passait un jour en `approved`.
  if (definition.id === "none") return NOT_RESOLVED(configuredVariant);

  if (definition.status !== "approved") return NOT_RESOLVED(configuredVariant);
  if (ctaViolations(definition, surface).length > 0) {
    return NOT_RESOLVED(configuredVariant);
  }
  // Approbation éditoriale ET livraison opérationnelle. Les deux, jamais l'une pour l'autre.
  if (ctaDeliveryViolations(definition, delivery).length > 0) {
    return NOT_RESOLVED(configuredVariant);
  }

  return {
    configuredVariant,
    resolvedVariant: definition.id,
    version: definition.version,
    definition,
  };
}
