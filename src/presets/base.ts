import type { OxlintConfig } from "oxlint";

export default {
  plugins: ["typescript", "unicorn", "oxc", "import"],
  options: {
    reportUnusedDisableDirectives: "error",
  },
  rules: {
    "no-use-before-define": "error",
    "unicorn/no-abusive-eslint-disable": "error",
    "max-params": ["error", { max: 3, countThis: "never" }],

    "import/no-duplicates": "error",
    "import/no-cycle": "error",
    "import/no-mutable-exports": "error",
    "import/no-self-import": "error",
    "import/first": "error",
    "import/exports-last": "error",
  },
  overrides: [
    {
      // Declaration files describe external APIs, so their parameter counts are not ours to choose.
      // Tests are excluded by choice.
      files: ["**/*.d.ts", "**/*.{test,spec}.{js,jsx,ts,tsx}"],
      rules: { "max-params": "off" },
    },
  ],
} satisfies OxlintConfig;
