import { defineConfig } from "vite";
import { buildDefineConfig } from "./vite.utils";
import preact from "@preact/preset-vite";

export default defineConfig(
  buildDefineConfig({
    plugins: [preact()],
    input: {
      content: "src/content/index.ts",
      style: "src/content/index.css",
    },
  }),
);
