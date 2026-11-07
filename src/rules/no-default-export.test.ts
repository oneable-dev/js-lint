import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noDefaultExport } from "./no-default-export.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("no-default-export", noDefaultExport, {
  valid: [
    "export function Foo() {}",
    "export const bar = 1;",
    "const a = 1; export { a };",
  ],
  invalid: [
    {
      code: "export default function Foo() {}",
      errors: [{ messageId: "noDefaultExport" }],
    },
    {
      code: "const a = 1; export default a;",
      errors: [{ messageId: "noDefaultExport" }],
    },
  ],
});
