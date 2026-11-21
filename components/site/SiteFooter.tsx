// Pied de page public. Comme `SiteHeader`, aucun état connecté, aucune promesse self-serve : les
// destinations de gouvernance et une identité minimale, jamais inventée.
//
// Correction du 22/11/2026 : cette navigation portait `aria-label="Legal"` sans contenir le contrat.
// Les conditions générales étaient servies à /legal/cgv depuis le 21/11 et liées par AUCUNE page
// publique — seul quelqu'un connaissant l'URL pouvait les atteindre. Un contrat introuvable est un
// contrat difficile à opposer, et un libellé « Legal » qui omet le contrat promet plus qu'il ne
// livre. Le lien pointe l'index /legal, qui énumère les documents réellement servis et dit ce que
// chacun couvre, plutôt que de dupliquer ici une liste qui se désynchroniserait.
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__mark">TextOS © {year}</p>
        <nav className="site-footer__nav" aria-label="Legal">
          <a href="/legal">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/methodology/authority-presence">Methodology</a>
          <a href="/faq">FAQ</a>
        </nav>
      </div>
    </footer>
  );
}

export default SiteFooter;
