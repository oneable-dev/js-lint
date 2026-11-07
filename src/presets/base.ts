import type { OxlintConfig } from "oxlint";

export default {
  plugins: ["typescript", "unicorn", "oxc", "import"],
  jsPlugins: ["@oneable/js-lint"],
  // oxlint enables the correctness category by default, but only as warnings, which do not fail lint.
  categories: {
    correctness: "error",
  },
  options: {
    reportUnusedDisableDirectives: "error",
  },
  rules: {
    "no-use-before-define": "error",
    "unicorn/no-abusive-eslint-disable": "error",
    "max-params": ["error", { max: 3, countThis: "never" }],
    "oneable/prefer-switch": "error",
    "no-else-return": "error",
    "one-var": ["error", "never"],
    "no-multi-assign": "error",
    "no-sequences": "error",
    "no-nested-ternary": "error",
    "max-depth": ["error", 3],
    curly: ["error", "all"],
    "no-console": ["error", { allow: ["warn", "error"] }],

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
