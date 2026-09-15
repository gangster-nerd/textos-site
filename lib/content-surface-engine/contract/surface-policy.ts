// COMPOSER — SurfacePolicy v1.
//
// A SurfacePolicy governs presentation, navigation, indexability, conversion, analytics and
// visual/reference tokens for a given surface. It NEVER mutates editorial truth: it consumes
// a ContentDocument and produces (via resolveContentSurface) a derived read model. A policy
// that appears to change what the document says is a bug, not a feature.

import { z } from "zod";

import { BlockKindSchema, SurfaceKindSchema } from "./content-document";

export const SURFACE_POLICY_VERSION = "surface-policy@1" as const;

// A block visibility rule can hide semantic blocks a policy chooses not to render on this
// surface. Hiding does not remove content from the document; it only affects composition.
export const BlockVisibilityRuleSchema = z
  .object({
    kind: BlockKindSchema,
    action: z.enum(["show", "hide"]),
  })
  .strict();

// Slot binding: map a semantic slot name declared by a block (`ContentBlock.slot`) to a
// surface-defined region. The engine simply carries the mapping.
export const SlotBindingSchema = z
  .object({
    slot: z.string().min(1),
    region: z.string().min(1),
  })
  .strict();

export const NavigationPolicySchema = z
  .object({
    showBreadcrumbs: z.boolean().default(false),
    showTableOfContents: z.boolean().default(false),
    showRelatedContent: z.boolean().default(false),
  })
  .strict();

export const AuthorDisplayPolicySchema = z
  .object({
    showAuthor: z.boolean().default(false),
    showReviewers: z.boolean().default(false),
  })
  .strict();

export const ConversionPolicySchema = z
  .object({
    // The policy may FORBID CTAs on this surface regardless of the document intent. It can
    // never FORCE a CTA the document did not permit.
    allowCta: z.boolean().default(false),
  })
  .strict();

export const MetadataPolicySchema = z
  .object({
    emitSchemaOrg: z.boolean().default(false),
    schemaTypeOverride: z.string().min(1).optional(),
  })
  .strict();

export const IndexabilityPolicySchema = z
  .object({
    // The policy may DOWNGRADE `index` to `noindex`, never the reverse. Downgrade is enforced
    // by the composition, not by the schema, since the schema cannot see the document.
    allowIndex: z.boolean().default(false),
  })
  .strict();

export const AnalyticsPolicySchema = z
  .object({
    // Opaque analytics tag. The engine does not interpret it; it is passed through.
    surfaceTag: z.string().min(1).optional(),
  })
  .strict();

export const SurfacePolicySchema = z
  .object({
    policyVersion: z.literal(SURFACE_POLICY_VERSION),
    surface: SurfaceKindSchema,
    policyId: z.string().min(1),
    blockVisibility: z.array(BlockVisibilityRuleSchema).default([]),
    slotBindings: z.array(SlotBindingSchema).default([]),
    navigation: NavigationPolicySchema,
    authorDisplay: AuthorDisplayPolicySchema,
    conversion: ConversionPolicySchema,
    metadata: MetadataPolicySchema,
    indexability: IndexabilityPolicySchema,
    analytics: AnalyticsPolicySchema,
  })
  .strict();

export type SurfacePolicy = z.infer<typeof SurfacePolicySchema>;
