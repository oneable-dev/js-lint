import { definePlugin } from "@oxlint/plugins";
import { noDefaultExport } from "./rules/no-default-export.ts";
import { noRawText } from "./rules/no-raw-text.ts";

export default definePlugin({
  meta: { name: "ts-lint" },
  rules: {
    "no-default-export": noDefaultExport,
    "no-raw-text": noRawText,
  },
});
