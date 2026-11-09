import { definePlugin } from "@oxlint/plugins";
import { destructureProps } from "./rules/destructure-props.ts";
import { maxParams } from "./rules/max-params.ts";
import { noBannedIdentifiers } from "./rules/no-banned-identifiers.ts";
import { noDeclarationMerging } from "./rules/no-declaration-merging.ts";
import { noRawText } from "./rules/no-raw-text.ts";
import { preferFunctionalUpdate } from "./rules/prefer-functional-update.ts";
import { preferInterfaceExtends } from "./rules/prefer-interface-extends.ts";
import { preferStaticEnv } from "./rules/prefer-static-env.ts";
import { preferSwitch } from "./rules/prefer-switch.ts";

export default definePlugin({
  meta: { name: "oneable" },
  rules: {
    "destructure-props": destructureProps,
    "max-params": maxParams,
    "no-banned-identifiers": noBannedIdentifiers,
    "no-declaration-merging": noDeclarationMerging,
    "no-raw-text": noRawText,
    "prefer-functional-update": preferFunctionalUpdate,
    "prefer-interface-extends": preferInterfaceExtends,
    "prefer-static-env": preferStaticEnv,
    "prefer-switch": preferSwitch,
  },
});
