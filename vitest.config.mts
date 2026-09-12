import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Alias `@/` → racine du repo (identique à tsconfig paths).
const rootDir = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");

export default defineConfig({
  resolve: {
    alias: { "@": rootDir },
  },
  test: {
    // CTC-8 : les fichiers de test qui mutent le même fichier éditorial (CTC-7 et CTC-8) ne
    // doivent PAS s'exécuter en parallèle — un worker verrait la mutation d'un autre worker.
    // On sérialise l'exécution des fichiers (single fork) pour garantir l'isolation.
    fileParallelism: false,
  },
  // tsconfig est en `jsx: "preserve"` (Next transforme lui-même le JSX). Le transformeur de Vite
  // doit donc être instruit explicitement, sinon tout import d'un `.tsx` échoue au parse dans les
  // tests. Aucune incidence sur le build Next, qui n'utilise pas ce fichier.
  oxc: {
    jsx: { runtime: "automatic", importSource: "react" },
  },
});
