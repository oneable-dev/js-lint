import type { OxlintConfig } from "oxlint";
import base from "./base.ts";

export default {
  extends: [base],
  options: {
    typeAware: true,
  },
  rules: {
    "typescript/no-explicit-any": "error",
    "typescript/ban-ts-comment": "error",
    "typescript/no-non-null-assertion": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "typescript/switch-exhaustiveness-check": "error",
    "typescript/consistent-type-imports": "error",
    "typescript/no-require-imports": "error",
  },
} satisfies OxlintConfig;
