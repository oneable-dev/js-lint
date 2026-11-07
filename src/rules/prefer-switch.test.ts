import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { preferSwitch } from "./prefer-switch.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("prefer-switch", preferSwitch, {
  valid: [
    // One `if` with several values is a single condition
    "if (x === 'a' || x === 'b' || x === 'c') f();",
    "if (x === 'a' || x === 'b' || x === 'c') f(); else g();",
    // Only 2 comparisons
    "if (x === 'a') f(); else if (x === 'b') g();",
    // Different values
    "if (x === 'a') f(); else if (y === 'b') g(); else if (x === 'c') h();",
    // Range checks
    "if (n > 10) f(); else if (n > 5) g(); else if (n > 0) h();",
    // One branch is not a comparison
    "if (x === 'a') f(); else if (isReady) g(); else if (x === 'c') h();",
    // Comparing with a non-constant
    "if (x === a) f(); else if (x === b) g(); else if (x === c) h();",
    // `&&` is not a set of cases
    "if (x === 'a' && y) f(); else if (x === 'b') g(); else if (x === 'c') h();",
    // Separate guard clauses
    "function f(x) { if (x === 'a') return 1; if (x === 'b') return 2; if (x === 'c') return 3; }",
    // Nested inside an else block is a separate chain
    "if (x === 'a') f(); else { if (x === 'b') g(); else if (x === 'c') h(); }",
  ],
  invalid: [
    {
      code: "if (role === 'admin') f(); else if (role === 'member') g(); else if (role === 'guest') h();",
      errors: [{ messageId: "preferSwitch", data: { discriminant: "role", count: "3" } }],
    },
    {
      code: "if (x === 1) f(); else if (x === 2) g(); else if (x === 3) h(); else i();",
      errors: [{ messageId: "preferSwitch", data: { discriminant: "x", count: "3" } }],
    },
    {
      code: "if ('a' === x) f(); else if (x === 'b' || x === 'c') g();",
      errors: [{ messageId: "preferSwitch", data: { discriminant: "x", count: "3" } }],
    },
    {
      code: "if (method.type === 'card') f(); else if (method.type === 'bank') g(); else if (method.type === `crypto`) h();",
      errors: [{ messageId: "preferSwitch", data: { discriminant: "method.type", count: "3" } }],
    },
  ],
});
