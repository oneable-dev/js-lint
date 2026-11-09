import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noBannedIdentifiers } from "./no-banned-identifiers.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("no-banned-identifiers", noBannedIdentifiers, {
  valid: [
    "const tmp = 1;",
    { code: "const users = [];", options: [{ match: "^tmp$" }] },
    { code: "const { tmp } = value;", options: [{ match: "^tmp$" }] },
  ],
  invalid: [
    {
      code: "const tmp = 1;",
      options: [{ match: "^tmp$" }],
      errors: [{ messageId: "banned", data: { name: "tmp" } }],
    },
    {
      code: "const a = 1, data = 2;",
      options: [{ match: "^(.|data)$" }],
      errors: [{ messageId: "banned", data: { name: "a" } }, { messageId: "banned", data: { name: "data" } }],
    },
  ],
});
