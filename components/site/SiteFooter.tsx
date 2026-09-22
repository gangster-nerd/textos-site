// Pied de page public. Comme `SiteHeader`, aucun état connecté, aucune promesse self-serve : deux
// destinations de gouvernance (confidentialité, méthode) et une identité minimale, jamais inventée.
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__mark">TextOS © {year}</p>
        <nav className="site-footer__nav" aria-label="Legal">
          <a href="/privacy">Privacy</a>
          <a href="/methodology/authority-presence">Methodology</a>
          <a href="/faq">FAQ</a>
        </nav>
      </div>
    </footer>
  );
}

export default SiteFooter;
