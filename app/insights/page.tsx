// CTC-CSE-CONVERGENCE-1 — /insights index.
//
// Lists everything the corpus catalog surfaces for the current environment. Production
// (allowIndexing=true) sees only published documents ; Preview sees drafts too, with a
// visible badge, and the whole page carries robots noindex.

import type { Metadata } from "next";
import Link from "next/link";

import { listInsightEntries } from "@/lib/content-surface-engine/site-integration";
import { siteConfig } from "@/lib/config/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Insights — TextOS",
  description:
    "Product principles, architecture decisions, engineering notes and directions we are exploring.",
  ...(siteConfig.allowIndexing
    ? { alternates: { canonical: "/insights" } }
    : {}),
  robots: siteConfig.allowIndexing ? undefined : { index: false, follow: true },
};

export default function InsightsIndex() {
  const all = listInsightEntries();
  const visible = siteConfig.allowIndexing
    ? all.filter((e) => e.document.truth.publicationStatus === "published")
    : all;

  return (
    <main>
      <header>
        <p className="kicker">Insights</p>
        <h1>How we think about authority observation</h1>
        <p className="lede">
          Product principles, architecture decisions, engineering notes and directions we
          are exploring. Every article names the product SHA and source paths it was
          written against.
        </p>
      </header>

      {visible.length === 0 ? (
        <section aria-labelledby="empty-state" data-empty-state="insights">
          <h2 id="empty-state">Nothing to show yet</h2>
          <p>
            The insights surface is scaffolded but no article has been published against
            the current product SHA yet. When articles land they will appear here.
          </p>
        </section>
      ) : (
        <ul>
          {visible.map((entry) => {
            const isDraft = entry.document.truth.publicationStatus !== "published";
            return (
              <li key={entry.slug}>
                <Link href={`/insights/${entry.slug}`}>{entry.document.identity.title}</Link>
                <p className="data-label">{entry.document.identity.description}</p>
                {isDraft && (
                  <span data-role="draft-badge">draft · not public</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
