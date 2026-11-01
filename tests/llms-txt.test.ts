// /llms.txt ne liste jamais plus que le sitemap ; fermé à l'indexation, il ne liste rien.
import { describe, expect, test } from "vitest";

import { GET } from "@/app/llms.txt/route";
import { renderLlmsTxt } from "@/lib/seo/llms-txt";
import sitemap from "@/app/sitemap";
import { siteConfig } from "@/lib/config/site";

describe("/llms.txt", () => {
  test("build non indexable : aucune page listée, et il le dit", async () => {
    expect(siteConfig.allowIndexing).toBe(false);
    const body = await GET().text();
    expect(body).toContain("not yet open to indexing");
    expect(body).not.toContain("## Pages");
    expect(sitemap()).toEqual([]);
  });

  test("build indexable : exactement les URL données, sans en inventer", () => {
    const body = renderLlmsTxt(["https://site.example/", "https://site.example/faq"]);
    expect(body).toContain("- https://site.example/\n- https://site.example/faq");
    expect(body.match(/^- /gm)).toHaveLength(2);
  });

  test("la promesse ne dit pas que TextOS publie", () => {
    const body = renderLlmsTxt([]);
    expect(body).toMatch(/draft that the brand reviews and publishes/);
    expect(body.toLowerCase()).not.toMatch(/automatically|guarantee/);
  });
});
