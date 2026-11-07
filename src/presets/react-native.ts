import type { OxlintConfig } from "oxlint";
import react from "./react.ts";

export default {
  extends: [react],
  jsPlugins: ["@oneable/js-lint"],
  rules: {
    "oneable/no-raw-text": "error",
  },
} satisfies OxlintConfig;
