import { defineConfig } from "oxlint";
import typescript from "./src/presets/typescript.ts";
import vitest from "./src/presets/vitest.ts";

export default defineConfig({ extends: [typescript, vitest] });
