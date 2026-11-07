import { definePlugin } from "@oxlint/plugins";
import { noRawText } from "./rules/no-raw-text.ts";

export default definePlugin({
  meta: { name: "oneable" },
  rules: {
    "no-raw-text": noRawText,
  },
});
