import Link from "next/link";
import type { Metadata } from "next";

import { siteConfig } from "@/lib/config/site";
import { loadCollection } from "@/lib/content/content-loader";
import type { ContentFrontmatter } from "@/lib/content/content-schema";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Insights — how we think about authority observation",
  description:
    "Product principles, architecture decisions, engineering notes and directions we are exploring at TextOS.",
  ...(siteConfig.allowIndexing ? { alternates: { canonical: "/insights" } } : {}),
  robots: siteConfig.allowIndexing ? undefined : { index: false, follow: true },
};

const CLASS_LABEL: Record<string, string> = {
  PRODUCT_PRINCIPLE: "Product principle",
  ARCHITECTURE_DECISION: "Architecture decision",
  ENGINEERING_NOTE: "Engineering note",
  EXPERIMENT: "Experiment",
  ROADMAP_DIRECTION: "Roadmap direction",
  RETROSPECTIVE: "Retrospective",
  COMPANY_TECHNOLOGY: "How we build",
  CURRENT_CAPABILITY: "Current capability",
};

export default function InsightsIndex() {
  const docs = loadCollection("insights");
  // Publish + draft are both surfaced in Preview to enable batch review. In Production
  // (siteConfig.allowIndexing=true), only published is shown.
  const visible = siteConfig.allowIndexing
    ? docs.filter((d) => d.frontmatter.editorialStatus === "published")
    : docs;

  const grouped = new Map<string, typeof visible>();
  for (const d of visible) {
    const cls =
      (d.frontmatter as ContentFrontmatter & { editorialClass?: string }).editorialClass ??
      "PRODUCT_PRINCIPLE";
    const bucket = grouped.get(cls) ?? [];
    bucket.push(d);
    grouped.set(cls, bucket);
  }

  const orderedGroups = [
    "PRODUCT_PRINCIPLE",
    "ARCHITECTURE_DECISION",
    "ENGINEERING_NOTE",
    "EXPERIMENT",
    "ROADMAP_DIRECTION",
    "RETROSPECTIVE",
    "COMPANY_TECHNOLOGY",
    "CURRENT_CAPABILITY",
  ] as const;

  return (
    <main>
      <header>
        <p className="kicker">Insights</p>
        <h1>How we think about authority observation</h1>
        <p className="lede">
          Product principles, architecture decisions, engineering notes and directions we are
          exploring. Every article names the product SHA and source paths it was written
          against.
        </p>
      </header>

      {visible.length === 0 ? (
        <section aria-labelledby="empty-state" data-empty-state="insights">
          <h2 id="empty-state">Nothing to show yet</h2>
          <p>
            The insights surface is scaffolded but no article has been published against the
            current product SHA yet. This page is honest about that state — it does not
            invent placeholder content or fabricate a corpus. When articles land they will
            appear grouped by editorial class (product principle, architecture decision,
            engineering note, and so on).
          </p>
        </section>
      ) : (
        orderedGroups
          .filter((g) => (grouped.get(g)?.length ?? 0) > 0)
          .map((group) => (
            <section key={group} aria-labelledby={`group-${group}`}>
              <h2 id={`group-${group}`}>{CLASS_LABEL[group] ?? group}</h2>
              <ul>
                {grouped.get(group)!.map((doc) => (
                  <li key={doc.slug}>
                    <Link href={`/insights/${doc.slug}`}>{doc.frontmatter.title}</Link>
                    <p>{doc.frontmatter.description}</p>
                    {doc.frontmatter.editorialStatus !== "published" && (
                      <span data-status={doc.frontmatter.editorialStatus}>
                        {doc.frontmatter.editorialStatus}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </main>
  );
}
