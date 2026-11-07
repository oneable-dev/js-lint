import { definePlugin } from "@oxlint/plugins";
import { destructureProps } from "./rules/destructure-props.ts";
import { noDeclarationMerging } from "./rules/no-declaration-merging.ts";
import { noRawText } from "./rules/no-raw-text.ts";
import { preferInterfaceExtends } from "./rules/prefer-interface-extends.ts";
import { preferSwitch } from "./rules/prefer-switch.ts";

export default definePlugin({
  meta: { name: "oneable" },
  rules: {
    "destructure-props": destructureProps,
    "no-declaration-merging": noDeclarationMerging,
    "no-raw-text": noRawText,
    "prefer-interface-extends": preferInterfaceExtends,
    "prefer-switch": preferSwitch,
  },
});
