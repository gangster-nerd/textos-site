import Link from "next/link";

import { PRODUCT_SIGN_IN_LABEL } from "@/lib/conversion/product-entry";
import { productSignInForHeader } from "@/lib/conversion/product-entry-context";

/**
 * En-tête public. PAS un AppShell : aucun sélecteur de compte, aucune barre latérale, aucun état
 * connecté. Une marque, deux destinations, et rien d'autre.
 *
 * « Product » n'y figure pas. La page d'accueil EST la page produit — créer une entrée vers un
 * doublon, ou vers une page à écrire plus tard, gonflerait la navigation sans rien ajouter. On
 * n'ouvre un item que lorsqu'il a une destination qui existe et qui dit autre chose.
 *
 * « Sign in » n'apparaît que le jour où l'accès existe : même porte que l'entrée self-serve
 * (`productSignInForHeader`), jamais un « Log in » factice ni un « bientôt ».
 *
 * Pas de menu mobile repliable : quatre liens courts tiennent sur une seule ligne à 375 px. Un `<details>`
 * ou un bouton d'ouverture ajouterait de l'état, du JavaScript et un piège de focus pour cacher ce
 * qui est déjà lisible.
 */
export function SiteHeader() {
  const signIn = productSignInForHeader();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__mark">
          TextOS
        </Link>
        <nav className="site-header__nav" aria-label="Main">
          <Link href="/insights">Insights</Link>
          <Link href="/methodology/authority-presence">Methodology</Link>
          <Link href="/faq">FAQ</Link>
          {signIn.kind === "render" && (
            <a href={signIn.href} rel="noopener" data-cta-variant="product_sign_in" data-cta-position="header">
              {PRODUCT_SIGN_IN_LABEL}
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
