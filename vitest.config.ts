import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

process.env.TZ = "Australia/Brisbane";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
