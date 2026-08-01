import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Alias `@/` → racine du repo (identique à tsconfig paths).
const rootDir = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");

export default defineConfig({
  resolve: {
    alias: { "@": rootDir },
  },
});
