// A1R Phase 4 — EditorialIdentityPolicy.
//
// CTC-ARTICLE-SYSTEM-1 / A1R ratifies :
//   PERSON_AUTHOR = Marc Prempain, canonical author path = /authors/marc-prempain
//   PUBLISHER    = Organization "TextOS"
//
// The policy validates SEMANTIC identity, not field presence. An article whose
// `editorial.authorIds` names an Organization ("TextOS Editorial Team") satisfies
// zero-author-of-type-Person and therefore FAILS. An article whose `authorIds`
// references an unknown id FAILS. An article that omits the canonical author-path
// binding FAILS.
//
// Actual visual author-page rendering belongs to A2R. A1R only validates the
// contract — that the ContentDocument declares a *real named human* as its author.

export const PERSON_AUTHOR_CANONICAL_ID = "marc-prempain" as const;
export const PERSON_AUTHOR_CANONICAL_NAME = "Marc Prempain" as const;
export const PERSON_AUTHOR_CANONICAL_PATH = "/authors/marc-prempain" as const;
export const PUBLISHER_NAME = "TextOS" as const;

export type EntityType = "Person" | "Organization";

export interface EntityDescriptor {
  id: string;
  name: string;
  entityType: EntityType;
  profilePath?: string;
}

export type EntityResolver = (id: string) => EntityDescriptor | null;

export interface EditorialIdentityIssue {
  code:
    | "author-missing"
    | "author-unknown-id"
    | "author-not-a-person"
    | "author-canonical-path-missing"
    | "author-name-mismatch";
  path: readonly (string | number)[];
  message: string;
}

export interface EditorialIdentityInput {
  authorIds: readonly string[];
  resolve: EntityResolver;
}

/**
 * Evaluate the EditorialIdentityPolicy against a document's `editorial.authorIds`.
 * Returns an empty issue list when the policy is satisfied.
 *
 * Contract :
 *   - `authorIds` MUST be non-empty.
 *   - EVERY id in `authorIds` MUST resolve to a registered entity.
 *   - EVERY resolved entity MUST have entityType === "Person" (an Organization
 *     never satisfies PERSON_AUTHOR).
 *   - AT LEAST ONE resolved Person MUST carry a canonical profilePath.
 *   - The canonical Person `marc-prempain` MUST resolve to name `Marc Prempain`
 *     and path `/authors/marc-prempain` — a mismatch is a governance error, not
 *     a style choice.
 */
export function evaluateEditorialIdentity(
  input: EditorialIdentityInput,
): EditorialIdentityIssue[] {
  const issues: EditorialIdentityIssue[] = [];

  if (input.authorIds.length === 0) {
    issues.push({
      code: "author-missing",
      path: ["editorial", "authorIds"],
      message: "EditorialIdentityPolicy requires at least one authorId (a Person).",
    });
    return issues;
  }

  let anyWithProfile = false;

  for (let i = 0; i < input.authorIds.length; i++) {
    const id = input.authorIds[i];
    const entity = input.resolve(id);
    if (!entity) {
      issues.push({
        code: "author-unknown-id",
        path: ["editorial", "authorIds", i],
        message: `authorId "${id}" is not registered.`,
      });
      continue;
    }
    if (entity.entityType !== "Person") {
      issues.push({
        code: "author-not-a-person",
        path: ["editorial", "authorIds", i],
        message: `authorId "${id}" resolves to a ${entity.entityType} ; PERSON_AUTHOR requires a Person.`,
      });
      continue;
    }
    if (entity.profilePath) anyWithProfile = true;

    if (id === PERSON_AUTHOR_CANONICAL_ID) {
      if (entity.name !== PERSON_AUTHOR_CANONICAL_NAME) {
        issues.push({
          code: "author-name-mismatch",
          path: ["editorial", "authorIds", i],
          message: `canonical author "${PERSON_AUTHOR_CANONICAL_ID}" must resolve to name "${PERSON_AUTHOR_CANONICAL_NAME}" ; got "${entity.name}".`,
        });
      }
      if (entity.profilePath !== PERSON_AUTHOR_CANONICAL_PATH) {
        issues.push({
          code: "author-canonical-path-missing",
          path: ["editorial", "authorIds", i],
          message: `canonical author "${PERSON_AUTHOR_CANONICAL_ID}" must carry profilePath "${PERSON_AUTHOR_CANONICAL_PATH}" ; got "${entity.profilePath ?? "<none>"}".`,
        });
      }
    }
  }

  if (!anyWithProfile && issues.length === 0) {
    issues.push({
      code: "author-canonical-path-missing",
      path: ["editorial", "authorIds"],
      message:
        "EditorialIdentityPolicy requires at least one resolved Person to carry a canonical profilePath.",
    });
  }

  return issues;
}
