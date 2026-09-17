// A2R-PORT — canonical author route required by EditorialIdentityPolicy.
// PERSON_AUTHOR = Marc Prempain ; canonical path = /authors/marc-prempain.
// Publisher = Organization TextOS (urn:textos:org).

import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/lib/config/site";
import { resolveReferenceEntity } from "@/lib/content-surface-engine/site-integration/authors";
import { serializeJsonLd } from "@/lib/schema-org/serialize";

export const dynamic = "force-static";

const AUTHOR_ID = "marc-prempain";
const CANONICAL = "/authors/marc-prempain";

export const metadata: Metadata = {
  title: "Marc Prempain — TextOS",
  description:
    "Founder & CPO at TextOS. Product doctrine and engineering practice behind the authority observatory.",
  ...(siteConfig.allowIndexing ? { alternates: { canonical: CANONICAL } } : {}),
  // Minimal biographical surface today ; keep noindex until the page carries more editorial
  // substance. `follow: true` so the /insights links are still crawled.
  robots: { index: false, follow: true },
};

export default function AuthorPage() {
  const entity = resolveReferenceEntity(AUTHOR_ID);
  const name = entity?.name ?? "Marc Prempain";
  const role = entity?.role ?? "Founder & CPO";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "urn:textos:org",
        name: "TextOS",
        ...(siteConfig.allowIndexing ? { url: siteConfig.origin } : {}),
      },
      {
        "@type": "Person",
        "@id": siteConfig.allowIndexing
          ? `${siteConfig.origin}${CANONICAL}#person`
          : `urn:textos:person:${AUTHOR_ID}`,
        name,
        jobTitle: role,
        worksFor: { "@id": "urn:textos:org" },
        ...(siteConfig.allowIndexing
          ? { url: `${siteConfig.origin}${CANONICAL}` }
          : {}),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main>
        <nav aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">TextOS</Link>
            </li>
            <li>Authors</li>
            <li aria-current="page">{name}</li>
          </ol>
        </nav>
        <header>
          <p className="kicker">Author</p>
          <h1>{name}</h1>
          <p className="doc__lede">{role}</p>
          <p>
            Writes for <strong>TextOS</strong>, the authority observatory for AI answer
            engines.
          </p>
        </header>
        <section>
          <h2>Recent insights</h2>
          <p>
            See published articles at{" "}
            <Link href="/insights">/insights</Link>.
          </p>
        </section>
      </main>
    </>
  );
}
