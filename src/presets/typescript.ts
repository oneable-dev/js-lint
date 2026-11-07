import type { OxlintConfig } from "oxlint";
import base from "./base.ts";

export default {
  extends: [base],
  options: {
    typeAware: true,
  },
  rules: {
    "typescript/no-explicit-any": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/only-throw-error": "error",
    "typescript/prefer-promise-reject-errors": ["error", { allowThrowingUnknown: true }],
    "typescript/no-wrapper-object-types": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/consistent-type-assertions": [
      "error",
      { assertionStyle: "as", objectLiteralTypeAssertions: "never" },
    ],
    "typescript/no-unsafe-type-assertion": "error",
    "typescript/consistent-type-definitions": ["error", "interface"],
    "oneable/prefer-interface-extends": "error",
    "oneable/no-declaration-merging": "error",
    "typescript/no-restricted-types": [
      "error",
      {
        types: {
          object: {
            message:
              "Use a type that names the properties you need, or Record<string, unknown> if the keys are unknown.",
          },
        },
      },
    ],
    "typescript/ban-ts-comment": "error",
    "typescript/no-non-null-assertion": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "typescript/switch-exhaustiveness-check": "error",
    // Conditions must be booleans: write `count > 0` and `name !== ""`. Objects that may be null or
    // undefined are allowed (`if (user)`), since an object is never falsy.
    "typescript/strict-boolean-expressions": [
      "error",
      {
        allowString: false,
        allowNumber: false,
        allowNullableObject: true,
        allowNullableBoolean: false,
        allowNullableString: false,
        allowNullableNumber: false,
        allowNullableEnum: false,
        allowAny: false,
      },
    ],
    // strict-boolean-expressions requires `Boolean(value)` for `unknown` values, which this rule reports.
    "no-extra-boolean-cast": "off",
    "typescript/consistent-type-imports": "error",
    "typescript/no-require-imports": "error",
  },
} satisfies OxlintConfig;
