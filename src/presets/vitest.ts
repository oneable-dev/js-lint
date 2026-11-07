import type { OxlintConfig } from "oxlint";

export default {
  overrides: [
    {
      files: ["**/*.{test,spec}.{ts,tsx}"],
      plugins: ["vitest"],
      rules: {
        "vitest/no-focused-tests": "error",
        "vitest/no-disabled-tests": "error",
        "vitest/expect-expect": "error",
      },
    },
  ],
} satisfies OxlintConfig;
