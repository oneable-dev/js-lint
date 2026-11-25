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
    // Inline functions passed to `render*` props (e.g. `renderItem`) are allowed by default.
    "react/no-unstable-nested-components": "error",
    "oneable/destructure-props": "error",
    "oneable/prefer-functional-update": "error",
  },
  overrides: [
    {
      // JSX markup lengthens components. Tests are excluded so the vitest preset's `off` wins regardless of `extends` order.
      files: ["**/*.{tsx,jsx}"],
      excludeFiles: ["**/*.{test,spec}.{ts,tsx}"],
      rules: {
        "max-lines-per-function": ["error", { max: 120, skipBlankLines: true, skipComments: true }],
      },
    },
  ],
} satisfies OxlintConfig;
