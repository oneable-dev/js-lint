import { definePlugin } from "@oxlint/plugins";
import { noDefaultExport } from "./rules/no-default-export.ts";
import { noFocusedTests } from "./rules/no-focused-tests.ts";

export default definePlugin({
  meta: { name: "ts-lint" },
  rules: {
    "no-default-export": noDefaultExport,
    "no-focused-tests": noFocusedTests,
  },
});
