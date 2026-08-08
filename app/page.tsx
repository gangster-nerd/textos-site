import Link from "next/link";
import { buildHomepageJsonLd } from "@/lib/entity-graph";
import { CAPABILITY_REGISTRY, isMarketableOn, type CapabilityId } from "@/lib/capability-registry";
import { loadCollection } from "@/lib/content/content-loader";
import { ExampleMeasurement } from "@/components/product/ExampleMeasurement";

// Homepage : surface "homepage" (page-map.spec.md §1) → uniquement public_marketable (§3).
//
// ORDRE DE LECTURE : objet de mesure → interprétation → méthode → état du produit. La page montre
// d'abord CE QUI EST MESURÉ, et seulement ensuite ce qu'on en dit. Une suite de cartes de
// fonctionnalités suivie d'un bouton dirait l'inverse : que la promesse précède l'instrument.
//
// AUCUN CTA COMMERCIAL ICI. `measurement_request` n'autorise que `faq_entry` et `product_article` ;
// la page d'accueil n'est pas un document de contenu et n'a donc pas de variante résolue. En
// afficher une reviendrait à court-circuiter le resolver — un gate sémantique ne se contourne pas
// pour des raisons de mise en page. Les liens ci-dessous sont ÉDITORIAUX : ils orientent, ils ne
// promettent rien.
export default function Home() {
  const jsonLd = buildHomepageJsonLd();

  const measures = (Object.keys(CAPABILITY_REGISTRY) as CapabilityId[])
    .filter((id) => isMarketableOn(CAPABILITY_REGISTRY[id], "homepage"))
    .map((id) => CAPABILITY_REGISTRY[id].label as string);

  // Titres et descriptions LUS depuis les documents publiés : une liste en dur divergerait dès la
  // première réécriture d'un titre, et le site porterait deux vérités sur son propre contenu.
  const methodology = loadCollection("methodology")
    .filter((doc) => doc.frontmatter.editorialStatus === "published")
    .map((doc) => ({
      href: doc.path,
      title: doc.frontmatter.title,
      description: doc.frontmatter.description,
    }));

  return (
    <main className="wide">
      {/* JSON-LD (entity-graph.spec.md §1, schema-map.spec.md §1) — statique, dans le HTML. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="hero">
        <p className="kicker">Authority Intelligence System</p>
        <h1>Measure how AI answer engines cite your brand.</h1>
        <p className="lede">
          TextOS observes what answer engines say about a market and measures a brand&rsquo;s
          authority presence &mdash; reproducibly, on a versioned query panel, with dispersion
          and completeness. <span className="muted">Not a score. A measurement.</span>
        </p>
      </section>

      <section className="hero__panel" aria-label="What a measurement looks like">
        <ExampleMeasurement />
      </section>

      <h2>How to read it</h2>
      <ul className="measures">
        <li>
          <span className="data-label">Union</span>
          <span>
            Total Authority Presence is the <strong>union</strong> of direct and indirect presence
            &mdash; never their sum. A brand cited directly <em>and</em> mentioned through a source
            is counted once.
          </span>
        </li>
        <li>
          <span className="data-label">Not zero</span>
          <span>
            When a signal is <strong>not observable</strong> with a given method, it is reported as
            such. Reporting it as zero would claim an absence that was never measured.
          </span>
        </li>
        <li>
          <span className="data-label">Panel</span>
          <span>
            Every measure is bound to a <strong>versioned query panel</strong>. Change the panel and
            you change the instrument &mdash; results are comparable only within the same version.
          </span>
        </li>
      </ul>

      <h2>What TextOS measures today</h2>
      <ul className="measures">
        {measures.map((label) => (
          <li key={label}>
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <h2>Methodology</h2>
      <ul className="cards">
        {methodology.map((page) => (
          <li key={page.href} className="card">
            <h3>
              <Link href={page.href}>{page.title}</Link>
            </h3>
            <p>{page.description}</p>
          </li>
        ))}
      </ul>

      <div className="note">
        <strong>Where the product stands.</strong> TextOS is in active development. This site
        publishes only what is measured and validated &mdash; every public statement is bound to a
        declared capability and to the evidence behind it. Nothing here describes a feature that is
        not measured.
      </div>

      <p style={{ marginTop: "var(--space-8)" }}>
        <Link href="/faq">Questions about how TextOS measures &rarr;</Link>
      </p>

      <footer>
        <span>Product in active development. This site publishes only what is measured and validated.</span>
        {/* Lien de connexion retiré : le domaine app.textos.io n'est pas contrôlé.
            À rétablir une fois le domaine produit tranché (décision produit distincte). */}
        <span aria-disabled="true">Se connecter (bientôt)</span>
      </footer>
    </main>
  );
}
