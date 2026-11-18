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
        // Partial mocks need `{ ... } as unknown as Service`.
        "typescript/no-unsafe-type-assertion": "off",
        // A `describe` block wraps every case in one function, so its length is not a complexity signal.
        "max-lines-per-function": "off",
      },
    },
  ],
} satisfies OxlintConfig;
