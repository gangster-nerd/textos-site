import { z } from "zod";

const SiteOriginSchema = z.string().url();

const raw = process.env.SITE_ORIGIN ?? "http://localhost:3000";
const origin = SiteOriginSchema.parse(new URL(raw).origin);

const isProvisional =
  /localhost|127\.0\.0\.1|placeholder|example\.|github\.io/i.test(origin);

const isIndexableBuild = process.env.PUBLIC_INDEXABLE_BUILD === "true";

const allowIndexing = isIndexableBuild && !isProvisional;

if (isIndexableBuild && isProvisional) {
  throw new Error(
    `SITE_ORIGIN provisoire (${origin}) avec PUBLIC_INDEXABLE_BUILD=true. ` +
      `Le domaine final doit être tranché avant toute publication indexable.`
  );
}

export const siteConfig = {
  origin,
  isProvisional,
  isIndexableBuild,
  allowIndexing,
} as const;
