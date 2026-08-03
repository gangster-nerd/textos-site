import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Alias `@/` → racine du repo (identique à tsconfig paths).
const rootDir = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");

export default defineConfig({
  resolve: {
    alias: { "@": rootDir },
  },
  // tsconfig est en `jsx: "preserve"` (Next transforme lui-même le JSX). Le transformeur de Vite
  // doit donc être instruit explicitement, sinon tout import d'un `.tsx` échoue au parse dans les
  // tests. Aucune incidence sur le build Next, qui n'utilise pas ce fichier.
  oxc: {
    jsx: { runtime: "automatic", importSource: "react" },
  },
});
