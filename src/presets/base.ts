import type { OxlintConfig } from "oxlint";

export default {
  options: {
    reportUnusedDisableDirectives: "error",
  },
  rules: {
    "no-use-before-define": "error",
    "unicorn/no-abusive-eslint-disable": "error",
  },
} satisfies OxlintConfig;
