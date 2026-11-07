import type { OxlintConfig } from "oxlint";
import typescript from "./typescript.ts";

export default {
  extends: [typescript],
  plugins: ["typescript", "unicorn", "oxc", "react"],
  rules: {
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "error",
    "react/jsx-key": "error",
    "react/no-array-index-key": "error",
    "oneable/destructure-props": "error",
    "oneable/prefer-functional-update": "error",
  },
} satisfies OxlintConfig;
