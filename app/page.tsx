import Link from "next/link";
import { buildHomepageJsonLd } from "@/lib/entity-graph";
import { CAPABILITY_REGISTRY, isMarketableOn, type CapabilityId } from "@/lib/capability-registry";
import { loadCollection } from "@/lib/content/content-loader";
import { ExampleMeasurement } from "@/components/product/ExampleMeasurement";
import { ProductProof } from "@/components/product/ProductProof";
import { ContentCta } from "@/components/content/ContentCta";
import {
  assertConfiguredCtaPublishable,
  resolveCtaForSurface,
} from "@/lib/conversion/cta-resolver";
import { deliveryContext } from "@/lib/conversion/delivery-context";

// Homepage : surface "homepage" (page-map.spec.md §1) → uniquement public_marketable (§3).
//
// ORDRE DE LECTURE : objet de mesure → interprétation → méthode → état du produit. La page montre
// d'abord CE QUI EST MESURÉ, et seulement ensuite ce qu'on en dit. Une suite de cartes de
// fonctionnalités suivie d'un bouton dirait l'inverse : que la promesse précède l'instrument.
//
// LE CTA PASSE PAR LE RESOLVER, comme sur n'importe quelle page de contenu. Le registre exprime
// désormais `homepage` parmi les surfaces autorisées de `measurement_request` — mais la page ne
// décide rien : elle demande une variante et rend la décision. Les règles restent celles du
// resolver (capacité commercialisable sur la surface commerciale, claims autorisés, destination
// réelle, livraison vérifiée), et en mode `off` la résolution vaut `null` : aucun CTA n'est rendu.
//
// Aucun identifiant de claim ni de capacité n'apparaît ici : ce fichier ne nomme rien du registre,
// il l'interroge. Un test le verrouille.
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

  // MÊME CHEMIN QUE LES DOCUMENTS : gate éditorial d'abord, résolution ensuite. Sans l'assertion,
  // une variante approuvée mais non autorisée sur cette surface disparaîtrait EN SILENCE — le
  // resolver rend `null` sur une violation éditoriale, et rien ne distinguerait ce cas d'un mode
  // `off` légitime. Le build doit rougir.
  //
  // Les deux décisions restent distinctes : en mode `off`, l'assertion passe et la résolution vaut
  // quand même `null`. Aucun CTA n'est rendu, et ce n'est pas une erreur.
  const CTA_INTENT = "measurement_request";
  assertConfiguredCtaPublishable({ configuredVariant: CTA_INTENT, surface: "homepage" });

  const cta = resolveCtaForSurface({
    configuredVariant: CTA_INTENT,
    surface: "homepage",
    delivery: deliveryContext(),
  });

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

      {/* PRODUCT PROOF — inséré ICI, au moment précis où le visiteur vient de comprendre ce que la
          mesure dit, et où la question suivante devient « sur quoi repose-t-elle ? ». Le mettre en
          fin de page l'aurait transformé en annexe technique ; le mettre avant « How to read it »
          aurait montré la matière avant d'avoir donné la grille de lecture. */}
      <h2>What a measurement is made of</h2>
      <p>
        The panel above reports three measures. Underneath them are individual observations &mdash;
        one answer at a time, each kept with the sources it cited and the instrument that produced
        it. That is what makes a measure re-examinable rather than merely reported.
      </p>

      <section className="hero__panel" aria-label="What an observation is made of">
        <ProductProof />
      </section>

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

      {/* Variante RÉSOLUE, jamais celle demandée : la page rend une décision, elle ne la prend pas. */}
      <ContentCta variant={cta.resolvedVariant} contentId="homepage" position="end" />

      <p style={{ marginTop: "var(--space-8)" }}>
        <Link href="/faq">Questions about how TextOS measures &rarr;</Link>
      </p>

      {/* AUCUN ÉLÉMENT DE CONNEXION. « Se connecter (bientôt) » a été retiré : il était en français
          sur un site anglais, il ne passait par aucun registre, et surtout il annonçait un accès
          qui n'existe pas — ni login, ni authentification, ni destination produit. C'est
          exactement le faux chrome applicatif que la règle « app-shaped, not app-fake » interdit.
          Rien ne le remplace : ni « Log in », ni « Coming soon », ni « Open TextOS ». Un accès
          s'affiche le jour où il existe. */}
      <footer>
        <span>Product in active development. This site publishes only what is measured and validated.</span>
      </footer>
    </main>
  );
}
