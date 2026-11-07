import type { OxlintConfig } from "oxlint";
import react from "./react.ts";
import { distImports } from "./restricted-imports.ts";

export default {
  extends: [react],
  rules: {
    "oneable/no-raw-text": "error",
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          distImports,
          {
            // Public entry points besides `react-native`, from @react-native/eslint-plugin no-deep-imports (0.88.1).
            group: ["react-native/**", "!react-native/asset-registry", "!react-native/react-private-interface", "!react-native/setup-env"],
            message:
              "Import from `react-native` instead of its internal files. Deep imports like `react-native/Libraries/...` are deprecated and can break in any release.",
          },
        ],
      },
    ],
  },
} satisfies OxlintConfig;
