// A1R Phase 6 — EditorialIdentityPolicy negative + positive regressions.
//
// PERSON_AUTHOR = Marc Prempain, canonical path /authors/marc-prempain.
// PUBLISHER    = Organization TextOS.
//
// The policy is enforced through CONTENT_PASS(textos.article@1) at the
// `textos.article.editorial-identity-policy` gate.

import { describe, expect, it } from "vitest";

import {
  PERSON_AUTHOR_CANONICAL_ID,
  PERSON_AUTHOR_CANONICAL_NAME,
  PERSON_AUTHOR_CANONICAL_PATH,
  PUBLISHER_NAME,
  evaluateEditorialIdentity,
  type EntityDescriptor,
} from "@/lib/content-surface-engine/authority/editorial-identity-policy";
import {
  resolveReferenceEntity,
  listRegisteredEntityIds,
} from "@/lib/content-surface-engine/site-integration/authors";

function resolver(overrides: Record<string, EntityDescriptor | null> = {}) {
  return (id: string): EntityDescriptor | null => {
    if (id in overrides) return overrides[id];
    const e = resolveReferenceEntity(id);
    return e
      ? { id: e.id, name: e.name, entityType: e.entityType, profilePath: e.profilePath }
      : null;
  };
}

describe("EditorialIdentityPolicy — canonical entity registry", () => {
  it("registry contains marc-prempain as Person with canonical profilePath", () => {
    const e = resolveReferenceEntity(PERSON_AUTHOR_CANONICAL_ID);
    expect(e).not.toBeNull();
    expect(e!.entityType).toBe("Person");
    expect(e!.name).toBe(PERSON_AUTHOR_CANONICAL_NAME);
    expect(e!.profilePath).toBe(PERSON_AUTHOR_CANONICAL_PATH);
  });

  it("registry contains textos-editorial-team as Organization", () => {
    const e = resolveReferenceEntity("textos-editorial-team");
    expect(e).not.toBeNull();
    expect(e!.entityType).toBe("Organization");
  });

  it("publisher name is TextOS", () => {
    expect(PUBLISHER_NAME).toBe("TextOS");
  });

  it("registered ids include the canonical author", () => {
    expect(listRegisteredEntityIds()).toContain(PERSON_AUTHOR_CANONICAL_ID);
  });
});

describe("EditorialIdentityPolicy — positive", () => {
  it("valid Marc Prempain identity → PASS", () => {
    const issues = evaluateEditorialIdentity({
      authorIds: ["marc-prempain"],
      resolve: resolver(),
    });
    expect(issues).toEqual([]);
  });
});

describe("EditorialIdentityPolicy — negatives", () => {
  it("TextOS Editorial Team as author → FAIL (Organization not Person)", () => {
    const issues = evaluateEditorialIdentity({
      authorIds: ["textos-editorial-team"],
      resolve: resolver(),
    });
    expect(issues.some((i) => i.code === "author-not-a-person")).toBe(true);
  });

  it("Organization substituted for Person → FAIL", () => {
    const issues = evaluateEditorialIdentity({
      authorIds: ["some-org"],
      resolve: resolver({
        "some-org": {
          id: "some-org",
          name: "Some Org",
          entityType: "Organization",
          profilePath: "/team/some-org",
        },
      }),
    });
    expect(issues.some((i) => i.code === "author-not-a-person")).toBe(true);
  });

  it("unknown author identity → FAIL", () => {
    const issues = evaluateEditorialIdentity({
      authorIds: ["ghost"],
      resolve: resolver(),
    });
    expect(issues.some((i) => i.code === "author-unknown-id")).toBe(true);
  });

  it("missing canonical author-path binding → FAIL", () => {
    const issues = evaluateEditorialIdentity({
      authorIds: ["marc-prempain"],
      resolve: resolver({
        "marc-prempain": {
          id: "marc-prempain",
          name: "Marc Prempain",
          entityType: "Person",
          // profilePath deliberately absent
        },
      }),
    });
    expect(issues.some((i) => i.code === "author-canonical-path-missing")).toBe(true);
  });

  it("empty authorIds → FAIL", () => {
    const issues = evaluateEditorialIdentity({
      authorIds: [],
      resolve: resolver(),
    });
    expect(issues.some((i) => i.code === "author-missing")).toBe(true);
  });
});
