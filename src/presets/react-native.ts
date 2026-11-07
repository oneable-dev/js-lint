import type { OxlintConfig } from "oxlint";
import react from "./react.ts";

export default {
  extends: [react],
  rules: {
    "oneable/no-raw-text": "error",
  },
} satisfies OxlintConfig;
