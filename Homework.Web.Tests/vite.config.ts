import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: { "@": fileURLToPath(new URL("../Homework.Web", import.meta.url)) },
    dedupe: ["react", "react-dom", "zustand", "@tanstack/react-query"],
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
