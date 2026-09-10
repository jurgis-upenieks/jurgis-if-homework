import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: { "@": fileURLToPath(new URL("../Homework.Web", import.meta.url)) },
    dedupe: ["react", "react-dom", "next", "next-themes", "zustand", "@tanstack/react-query", "@base-ui/react", "cn"],
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
