import "dotenv/config";
import { type AliasOptions, type PluginOption, type UserConfig } from "vite";
import { version } from "./package.json";
import path from "path";

export const banner: string = `/**
 * Chatterpack Browser Extension
 * Release date: ${new Date().toISOString().split("T")[0]}
 * @version ${version}
 * @author Garest
 * @license MIT
 */`;

export const alias: AliasOptions = {
  "@": path.resolve(__dirname, "./src"),
  "@components": path.resolve(__dirname, "./src/app/components"),
};

const debug = process.env.DEBUG == "true";

export const define = {
  __DEBUG__: debug,
  __VERSION__: JSON.stringify(version),
};

interface BuildDefineConfig {
  plugins?: PluginOption[];
  input: Record<string, string>;
}

export const buildDefineConfig = (options: BuildDefineConfig): UserConfig => {
  return {
    plugins: options.plugins,
    resolve: {
      alias,
    },
    define,
    build: {
      cssCodeSplit: true,
      emptyOutDir: false,
      rollupOptions: {
        input: options.input,
        output: {
          format: "es",
          //   format: "iife",
          inlineDynamicImports: false,
          entryFileNames: `assets/[name].js`,
          assetFileNames: `assets/[name].[ext]`,
          banner,
        },
      },
      sourcemap: debug,
    },
  };
};
