// Rendu de /llms.txt (app/llms.txt/route.ts) : une liste d'URL, jamais plus que le sitemap.

export function renderLlmsTxt(urls: readonly string[]): string {
  const header = [
    "# TextOS",
    "",
    "> TextOS measures how AI answer engines cite a brand, on a versioned query panel, and turns a",
    "> worthwhile gap into an evidence-backed draft that the brand reviews and publishes.",
    "",
  ];
  if (urls.length === 0) {
    return [...header, "This site is not yet open to indexing. No page is listed.", ""].join("\n");
  }
  return [...header, "## Pages", "", ...urls.map((url) => `- ${url}`), ""].join("\n");
}
