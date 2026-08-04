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

  test("ne peut pas rendre une variante NON approuvée, même passée directement", () => {
    // `claim_lookup` est disabled. Si quelqu'un le passait au composant au lieu de
    // `resolvedVariant`, rien ne doit sortir : le composant n'a aucun moyen de « rattraper » une
    // décision non prise. C'est la défense en profondeur, le gate restant l'autorité.
    expect(getCtaVariant("claim_lookup")!.status).toBe("disabled");
    expect(
      ContentCta({ variant: "claim_lookup", contentId: "faq:x", position: "end" })
    ).toBeNull();
  });

  test("aucune variante non approuvée ne produit de rendu", () => {
    for (const id of ["claim_lookup", "trial", "none"] as const) {
      expect(
        ContentCta({ variant: id, contentId: "faq:x", position: "end" }),
        `${id} ne doit rien rendre`
      ).toBeNull();
    }
  });

  test("la variante approuvée, elle, rend sa copy de registre", () => {
    // C'est l'objet du mode démo : le parcours de conversion est visible, identique à la production.
    expect(getCtaVariant("measurement_request")!.status).toBe("approved");
    expect(
      ContentCta({ variant: "measurement_request", contentId: "faq:x", position: "end" })
    ).not.toBeNull();
  });

  test("les deux positions sont acceptées et n'influencent pas la décision", () => {
    for (const position of ["inline", "end"] as const) {
      expect(ContentCta({ variant: null, contentId: "faq:x", position })).toBeNull();
    }
  });
});
