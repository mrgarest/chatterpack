import { defineConfig } from "vite";
import { buildDefineConfig } from "./vite.utils";

export default defineConfig(
  buildDefineConfig({
    input: {
      site: "src/site/index.ts",
    },
  }),
);
