import type { Metadata } from "next";
import Link from "next/link";
import { buildHomepageJsonLd } from "@/lib/entity-graph";
import { CAPABILITY_REGISTRY, isMarketableOn, type CapabilityId } from "@/lib/capability-registry";
import { siteConfig } from "@/lib/config/site";
import { loadCollection } from "@/lib/content/content-loader";
import { frCapabilityLabel } from "@/lib/i18n/fr-homepage";
import { ContentCta } from "@/components/content/ContentCta";
import {
  assertConfiguredCtaPublishable,
  resolveCtaForSurface,
} from "@/lib/conversion/cta-resolver";
import { deliveryContext } from "@/lib/conversion/delivery-context";
import { productEntryForHero, productEntryForHomepage } from "@/lib/conversion/product-entry-context";
import { ProductEntryCta } from "@/components/conversion/ProductEntryCta";
import { HeroActions } from "@/components/conversion/HeroActions";

// Page d'accueil FRANÇAISE (décision de Marc du 25/11/2026 : « go pour le haut de page et la version
// française »). La version anglaise, inchangée, vit sous /en.
//
// ORDRE DE LECTURE : le résultat d'abord, l'instrument ensuite. Haut de page (ce que le client obtient) → trois
// piliers → comment ça marche (récit illustratif, même nuance de causalité que la version anglaise) → pourquoi
// nos chiffres tiennent (la doctrine de mesure, argument de confiance) → ce qui est mesuré aujourd'hui → état du
// produit → CTA.
//
// Vérité publique :
//   - la mesure est `public_marketable` : dite sans réserve ;
//   - la rédaction d'un brouillon sourcé relu et publié par le client est déjà dite par la version anglaise
//     (récit illustratif) : reprise avec la même réserve ;
//   - le dépôt du brouillon dans WordPress est `public_beta` dans le manifeste produit : il porte le label
//     « Bêta », jamais de date de disponibilité ;
//   - aucune comparaison nommée, aucun « meilleur / premier », aucune garantie de citation.
//
// Le CTA passe par le resolver, exactement comme la version anglaise.
export const metadata: Metadata = {
  title: { absolute: "TextOS — GEO : la visibilité de votre marque dans les réponses des IA" },
  description:
    "TextOS mesure où votre marque est absente, présente ou citée dans les réponses des IA, propose la page à créer ou à améliorer, et rédige un brouillon sourcé que vous approuvez. Sur preuves, pas sur promesses.",
  openGraph: {
    title: "TextOS — GEO : la visibilité de votre marque dans les réponses des IA",
    description:
      "Mesurer sans chiffre inventé, agir sur preuves, publier après votre approbation.",
    locale: "fr_FR",
  },
  ...(siteConfig.allowIndexing
    ? { alternates: { canonical: "/", languages: { fr: "/", en: "/en" } } }
    : {}),
};

export default function Accueil() {
  const jsonLd = buildHomepageJsonLd();

  const measures = (Object.keys(CAPABILITY_REGISTRY) as CapabilityId[])
    .filter((id) => isMarketableOn(CAPABILITY_REGISTRY[id], "homepage"))
    .map((id) => frCapabilityLabel(id, CAPABILITY_REGISTRY[id].label as string));

  // Titres lus depuis les documents publiés (en anglais) : une liste en dur divergerait.
  const methodology = loadCollection("methodology")
    .filter((doc) => doc.frontmatter.editorialStatus === "published")
    .map((doc) => ({
      href: doc.path,
      title: doc.frontmatter.title,
      description: doc.frontmatter.description,
    }));

  const CTA_INTENT = "measurement_request";
  assertConfiguredCtaPublishable({ configuredVariant: CTA_INTENT, surface: "homepage" });

  const cta = resolveCtaForSurface({
    configuredVariant: CTA_INTENT,
    surface: "homepage",
    delivery: deliveryContext(),
  });

  const productEntry = productEntryForHomepage();
  const heroEntry = productEntryForHero();
  const assisted =
    cta.resolvedVariant && cta.version !== null && cta.definition?.destination
      ? {
          variant: cta.resolvedVariant,
          version: cta.version,
          href: cta.definition.destination,
          label: cta.definition.primaryLabel,
        }
      : null;

  return (
    <main className="wide" lang="fr">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="muted" style={{ textAlign: "right" }}>
        <Link href="/en" hrefLang="en" lang="en">English version</Link>
      </p>

      <section className="hero">
        <p className="kicker">GEO &mdash; la visibilité de votre marque dans les réponses des IA</p>
        <h1>Soyez cité par ChatGPT, Perplexity et Google. Sur preuves, pas sur promesses.</h1>
        <p className="lede">
          TextOS mesure où votre marque est absente, présente ou citée, propose la page à créer ou à
          améliorer, et rédige un brouillon sourcé. Vous l&rsquo;approuvez. Puis TextOS remesure.
        </p>
        <HeroActions productEntry={heroEntry} assisted={assisted} />
      </section>

      <ul className="measures" aria-label="Les trois temps de TextOS">
        <li>
          <span className="data-label">Mesurer</span>
          <span>
            Où votre marque est absente, présente ou citée, question par question, sur un panel de
            questions versionné. <strong>Aucun chiffre inventé</strong> : ce qui n&rsquo;est pas
            observable est dit tel quel, jamais transformé en zéro.
          </span>
        </li>
        <li>
          <span className="data-label">Agir</span>
          <span>
            TextOS propose l&rsquo;écart qui vaut la peine et rédige un brouillon adossé aux preuves.
            <strong> Vous approuvez</strong>, refusez ou demandez une correction.{" "}
            <span className="data-label">Bêta</span>
          </span>
        </li>
        <li>
          <span className="data-label">Publier</span>
          <span>
            Le brouillon est déposé dans votre WordPress, jamais publié sans vous.{" "}
            <span className="data-label">Bêta</span>
          </span>
        </li>
      </ul>

      <h2>Comment ça marche</h2>
      <ul className="measures" aria-label="De l'absence à la citation, exemple illustratif">
        <li>
          <span className="data-label">1 · Absent</span>
          <span>Sur une question de votre marché, les réponses des IA citent d&rsquo;autres acteurs, pas vous.</span>
        </li>
        <li>
          <span className="data-label">2 · Écart repéré</span>
          <span>TextOS signale l&rsquo;absence de citation de votre marque sur cette question.</span>
        </li>
        <li>
          <span className="data-label">3 · Brouillon et approbation</span>
          <span>
            TextOS rédige un article sourcé qui répond à l&rsquo;écart. Vous le relisez et le publiez.
          </span>
        </li>
        <li>
          <span className="data-label">4 · Présence observée</span>
          <span>TextOS remesure la même question pour voir si votre présence a changé.</span>
        </li>
      </ul>
      <p className="muted">
        Exemple illustratif, pas une exécution réelle. Publier ne garantit pas une citation : TextOS
        remesure pour savoir si la présence a été gagnée.
      </p>

      <h2>Pourquoi nos chiffres tiennent</h2>
      <p>
        TextOS mesure la présence d&rsquo;une marque de façon reproductible, sur un panel de questions
        versionné, avec sa dispersion et sa complétude. <strong>Pas un score. Une mesure.</strong>
      </p>
      <ul className="measures">
        <li>
          <span className="data-label">Union</span>
          <span>
            La présence totale est l&rsquo;<strong>union</strong> de la présence directe et indirecte,
            jamais leur somme. Une marque citée directement <em>et</em> mentionnée par une source
            n&rsquo;est comptée qu&rsquo;une fois.
          </span>
        </li>
        <li>
          <span className="data-label">Pas zéro</span>
          <span>
            Quand un signal n&rsquo;est <strong>pas observable</strong> avec une méthode donnée, il est
            dit tel quel. L&rsquo;afficher comme zéro affirmerait une absence qui n&rsquo;a jamais été
            mesurée.
          </span>
        </li>
        <li>
          <span className="data-label">Panel</span>
          <span>
            Chaque mesure est liée à un <strong>panel de questions versionné</strong>. Changer le panel,
            c&rsquo;est changer l&rsquo;instrument : les résultats ne se comparent qu&rsquo;à version égale.
          </span>
        </li>
      </ul>

      <h2>Ce que TextOS mesure aujourd&rsquo;hui</h2>
      <ul className="measures">
        {measures.map((label) => (
          <li key={label}>
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <h2>Méthodologie</h2>
      <p className="muted">Les pages de méthode sont publiées en anglais.</p>
      <ul className="cards">
        {methodology.map((page) => (
          <li key={page.href} className="card" lang="en">
            <h3>
              <Link href={page.href}>{page.title}</Link>
            </h3>
            <p>{page.description}</p>
          </li>
        ))}
      </ul>

      <div className="note">
        <strong>Où en est le produit.</strong> TextOS est en développement actif. Ce site ne publie que
        ce qui est mesuré et validé : chaque affirmation publique est liée à une capacité déclarée et aux
        preuves qui la portent. Les fonctions en bêta sont signalées comme telles.
      </div>

      <ContentCta variant={cta.resolvedVariant} contentId="homepage" position="end" />
      <ProductEntryCta decision={productEntry} />

      <p style={{ marginTop: "var(--space-8)" }}>
        <Link href="/faq">Questions sur la façon dont TextOS mesure (en anglais) &rarr;</Link>
      </p>
    </main>
  );
}
