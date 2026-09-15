import { describe, expect, it } from "vitest";
import { computeFreshness, type FreshnessInput } from "@/lib/content/freshness";

function base(overrides: Partial<FreshnessInput> = {}): FreshnessInput {
  return {
    editorialStatus: "published",
    publishedAt: "2026-01-01",
    updatedAt: "2026-01-01",
    productSnapshotSha: "a".repeat(40),
    currentPinnedManifestSha: "a".repeat(40),
    today: new Date("2026-02-01T00:00:00Z"),
    ...overrides,
  };
}

describe("computeFreshness — seven states + precedence", () => {
  it("ARCHIVED wins over everything", () => {
    expect(
      computeFreshness(
        base({
          editorialStatus: "archived",
          supersededBy: "x",
          currentSourceDigests: { "p.md": "b".repeat(64) },
          sourceDigests: { "p.md": "a".repeat(64) },
          publicMaturityChanged: true,
          hasBrokenLinks: true,
        }),
      ),
    ).toBe("ARCHIVED");
  });

  it("SUPERSEDED wins over source change / maturity / needs-review", () => {
    expect(
      computeFreshness(
        base({
          supersededBy: "insights:new",
          currentSourceDigests: { "p.md": "b".repeat(64) },
          sourceDigests: { "p.md": "a".repeat(64) },
          publicMaturityChanged: true,
          hasBrokenLinks: true,
        }),
      ),
    ).toBe("SUPERSEDED");
  });

  it("SOURCE_CHANGED wins over MATURITY_CHANGED and NEEDS_REVIEW", () => {
    expect(
      computeFreshness(
        base({
          currentSourceDigests: { "p.md": "b".repeat(64) },
          sourceDigests: { "p.md": "a".repeat(64) },
          publicMaturityChanged: true,
          hasBrokenLinks: true,
        }),
      ),
    ).toBe("SOURCE_CHANGED");
  });

  it("MATURITY_CHANGED wins over NEEDS_REVIEW and LINK_OPPORTUNITY", () => {
    expect(
      computeFreshness(
        base({
          publicMaturityChanged: true,
          hasBrokenLinks: true,
          hasNewRelatedCandidates: true,
        }),
      ),
    ).toBe("MATURITY_CHANGED");
  });

  it("NEEDS_REVIEW triggered by hasBrokenLinks", () => {
    expect(
      computeFreshness(base({ hasBrokenLinks: true, hasNewRelatedCandidates: true })),
    ).toBe("NEEDS_REVIEW");
  });

  it("NEEDS_REVIEW triggered by cadence age > reviewCadenceDays", () => {
    expect(
      computeFreshness(
        base({
          publishedAt: "2025-01-01",
          lastReviewedAt: "2025-01-01",
          today: new Date("2026-01-01T00:00:00Z"),
          reviewCadenceDays: 180,
        }),
      ),
    ).toBe("NEEDS_REVIEW");
  });

  it("LINK_OPPORTUNITY when only new related candidates exist", () => {
    expect(computeFreshness(base({ hasNewRelatedCandidates: true }))).toBe(
      "LINK_OPPORTUNITY",
    );
  });

  it("CURRENT when nothing else applies", () => {
    expect(computeFreshness(base())).toBe("CURRENT");
  });
});
