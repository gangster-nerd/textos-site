import Link from "next/link";
import { buildHomepageJsonLd } from "@/lib/entity-graph";
import { CAPABILITY_REGISTRY, isMarketableOn, type CapabilityId } from "@/lib/capability-registry";

// Homepage : surface "homepage" (page-map.spec.md §1) → uniquement public_marketable (§3).
export default function Home() {
  const jsonLd = buildHomepageJsonLd();

  const measures = (Object.keys(CAPABILITY_REGISTRY) as CapabilityId[])
    .filter((id) => isMarketableOn(CAPABILITY_REGISTRY[id], "homepage"))
    .map((id) => CAPABILITY_REGISTRY[id].label as string);

  return (
    <main>
      {/* JSON-LD (entity-graph.spec.md §1, schema-map.spec.md §1) — statique, dans le HTML. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="kicker">Authority Intelligence System</p>
      <h1>Measure how AI answer engines cite your brand.</h1>
      <p className="lede">
        TextOS observes what answer engines say about a market and measures a brand&rsquo;s
        authority presence &mdash; reproducibly, on a versioned query panel, with dispersion
        and completeness. <span className="muted">Not a score. A measurement.</span>
      </p>

      <h2>What TextOS measures today</h2>
      <ul className="measures">
        {measures.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>

      <div className="note">
        Three separate measures &mdash; Direct, Indirect and Total. Total Authority Presence is a{" "}
        <strong>union</strong> of direct and indirect presence, never a sum. When a signal is not
        observable with a given method, we report it as <strong>not observable</strong> &mdash;
        never as zero.
      </div>

      {/* Maillage interne : collection → lien → page (tranche verticale S0). */}
      <p>
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
