// Tests de `ContentCta` — le composant ne décide rien, il rend une décision.
//
// Appel direct de la fonction (pas de DOM) : on vérifie ce qu'elle RETOURNE. Suffisant ici, parce
// que le seul comportement à prouver est « null ou la copy du registre », sans branche conditionnelle
// dépendant du navigateur.

import { describe, expect, test } from "vitest";

import { ContentCta } from "@/components/content/ContentCta";
import { getCtaVariant } from "@/lib/conversion/cta-registry";

describe("ContentCta — rendu d'une décision déjà prise", () => {
  test("variant = null → rend null", () => {
    expect(ContentCta({ variant: null, contentId: "faq:x", position: "end" })).toBeNull();
  });

  test("ne peut pas rendre une variante configurée mais NON résolue", () => {
    // `measurement_request` est ce que le frontmatter déclare. Si quelqu'un le passait directement
    // au composant (au lieu de `resolvedVariant`), rien ne doit sortir : la variante est disabled
    // et sans destination. Le composant n'a aucun moyen de « rattraper » une décision non prise.
    expect(getCtaVariant("measurement_request")!.status).toBe("disabled");
    expect(
      ContentCta({ variant: "measurement_request", contentId: "faq:x", position: "end" })
    ).toBeNull();
  });

  test("aucune variante du registre S1 ne produit de rendu", () => {
    for (const id of ["measurement_request", "claim_lookup", "trial", "none"] as const) {
      expect(
        ContentCta({ variant: id, contentId: "faq:x", position: "end" }),
        `${id} ne doit rien rendre en S1`
      ).toBeNull();
    }
  });

  test("les deux positions sont acceptées et n'influencent pas la décision", () => {
    for (const position of ["inline", "end"] as const) {
      expect(ContentCta({ variant: null, contentId: "faq:x", position })).toBeNull();
    }
  });
});
