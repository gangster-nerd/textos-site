// A2 — inline author bridge for the reference preview.
//
// The mission requires `app/authors/**` may exist. In A2 we only need a light seam so the
// managed surface can display author names for the fixtures — the full author registry
// belongs to a future producer-side migration. This bridge is INTENTIONALLY tiny and lives
// under content-surface-engine so nothing outside CSE depends on it.

const AUTHORS: Record<string, { name: string; role: string }> = {
  "textos-editorial-team": { name: "TextOS Editorial Team", role: "Product Editorial" },
  "marc-p": { name: "Marc P.", role: "Founder & CPO" },
};

export function resolveReferenceAuthor(id: string): { name: string; role: string } | null {
  return AUTHORS[id] ?? null;
}
