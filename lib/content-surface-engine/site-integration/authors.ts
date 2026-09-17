// A1R Phase 4 — CSE-side inline entity registry.
//
// Governs which entities the ContentDocument may reference as authors, reviewers or
// publishers. Distinguishes Person vs Organization. `marc-prempain` is the canonical
// Person named by EditorialIdentityPolicy
// (see authority/editorial-identity-policy.ts). The legacy "textos-editorial-team"
// is an Organization and CANNOT satisfy PERSON_AUTHOR — it may only appear as
// publisher / attribution. `marc-p` remains as a historical alias for the SURFACE_PASS
// fixtures already on main.
//
// A future producer-side migration may extract this into a dedicated authors module.

export type EntityType = "Person" | "Organization";

export interface EntityRegistryEntry {
  id: string;
  name: string;
  role: string;
  entityType: EntityType;
  profilePath?: string;
  sameAs?: readonly string[];
}

const ENTITIES: Record<string, EntityRegistryEntry> = {
  "marc-prempain": {
    id: "marc-prempain",
    name: "Marc Prempain",
    role: "Founder & CPO",
    entityType: "Person",
    profilePath: "/authors/marc-prempain",
    sameAs: [],
  },
  "textos-editorial-team": {
    id: "textos-editorial-team",
    name: "TextOS Editorial Team",
    role: "Product Editorial",
    entityType: "Organization",
    sameAs: [],
  },
  // Kept for CSE A2 SURFACE_PASS fixtures already checked in on main. A1R does not
  // certify surfaces ; this entry is not referenced by any A1R corpus.
  "marc-p": {
    id: "marc-p",
    name: "Marc P.",
    role: "Founder & CPO",
    entityType: "Person",
    sameAs: [],
  },
};

/**
 * Back-compat shape used by ManagedTextosSurface and compileAuthority. Returns the
 * legacy `{ name, role }` projection when an id resolves, `null` otherwise. Callers
 * wanting the entityType MUST use `resolveReferenceEntity` instead.
 */
export function resolveReferenceAuthor(id: string): { name: string; role: string } | null {
  const e = ENTITIES[id];
  return e ? { name: e.name, role: e.role } : null;
}

/** Full-shape lookup for EditorialIdentityPolicy and future entity-typed rendering. */
export function resolveReferenceEntity(id: string): EntityRegistryEntry | null {
  return ENTITIES[id] ?? null;
}

/** Enumerate registered ids. */
export function listRegisteredEntityIds(): readonly string[] {
  return Object.keys(ENTITIES);
}
