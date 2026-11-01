// Audit CMO du 01/11 : une action en haut de page et un « Sign in » — rendus seulement quand
// l'accès existe (même porte que l'entrée self-serve), jamais un bouton factice.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { HeroActions } from "@/components/conversion/HeroActions";
import { decideProductEntry, PRODUCT_ENTRY_HERO_LABEL } from "@/lib/conversion/product-entry";
import { FORBIDDEN_CONVERSION_PHRASES } from "@/lib/conversion/measurement-request-copy";

const BASE = {
  mode: "live" as const,
  gate: { eligible: true },
  entryUrl: "https://app.example.test/auth/start",
  contentId: "site-header",
  position: "header" as const,
};
const ASSISTED = { variant: "measurement_request", version: 1, href: "/request-measurement", label: "Request your first measurement" };

describe("haut de page et en-tête", () => {
  test("Sign in mène à /auth/start?intent=sign_in, avec la même porte que l'entrée", () => {
    const decision = decideProductEntry({ ...BASE, intent: "sign_in" });
    expect(decision.kind).toBe("render");
    const url = new URL((decision as { href: string }).href);
    expect(url.pathname).toBe("/auth/start");
    expect(url.searchParams.get("intent")).toBe("sign_in");
    expect(url.searchParams.get("position")).toBe("header");
    expect(decideProductEntry({ ...BASE, intent: "sign_in", gate: { eligible: false } }).kind).toBe("none");
    expect(decideProductEntry({ ...BASE, intent: "sign_in", mode: "off" }).kind).toBe("none");
  });

  test("sans aucune décision, le haut de page ne rend rien", () => {
    const none = decideProductEntry({ ...BASE, entryUrl: undefined });
    expect(renderToStaticMarkup(<HeroActions productEntry={none} assisted={null} />)).toBe("");
  });

  test("les deux voies, chacune instrumentée sans donnée personnelle", () => {
    const entry = decideProductEntry({ ...BASE, intent: "measure", position: "contextual", contentId: "textos-homepage" });
    const html = renderToStaticMarkup(<HeroActions productEntry={entry} assisted={ASSISTED} />);
    expect(html).toContain(PRODUCT_ENTRY_HERO_LABEL);
    expect(html).toContain("intent=measure");
    expect(html).toContain('href="/request-measurement"');
    expect(html.match(/data-cta-position="hero"/g)).toHaveLength(2);
    expect(html).not.toMatch(/@|email/i);
    for (const phrase of FORBIDDEN_CONVERSION_PHRASES) expect(html.toLowerCase()).not.toContain(phrase.toLowerCase());
  });

  test("demande accompagnée seule : rendue comme action principale", () => {
    const none = decideProductEntry({ ...BASE, mode: "off" });
    const html = renderToStaticMarkup(<HeroActions productEntry={none} assisted={ASSISTED} />);
    expect(html).toContain('class="content-cta__action"');
    expect(html).not.toContain("auth/start");
  });
});
