import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { preferNamedCondition } from "./prefer-named-condition.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("prefer-named-condition", preferNamedCondition, {
  valid: [
    "if (a || b) {}",
    // Not a test: the chain is already assigned, returned, or passed on.
    "const x = a || b || c;",
    "function f() { return a && b && c; }",
    "if (f(a || b || c)) {}",
    // Sub-chains inside `!`, comparisons, and calls count as one operand.
    "if (!(a || b) && c) {}",
    "if ((a || b) === c) {}",
    // `for` tests are not covered.
    "for (; a && b && c;) {}",
    { code: "if (a || b || c) {}", options: [{ max: 3 }] },
  ],
  invalid: [
    {
      code: "if (a || b || c) {}",
      errors: [{ messageId: "nameCondition", data: { count: "3", max: "2" } }],
    },
    {
      // Mixed operators are flattened too.
      code: "if (a && b || c) {}",
      errors: [{ messageId: "nameCondition", data: { count: "3", max: "2" } }],
    },
    {
      code: "if (a && (b || c)) {}",
      errors: [{ messageId: "nameCondition", data: { count: "3", max: "2" } }],
    },
    {
      code: "if ((a ?? b) || c) {}",
      errors: [{ messageId: "nameCondition", data: { count: "3", max: "2" } }],
    },
    {
      code: "while (a && b && c) {}",
      errors: [{ messageId: "nameConditionFunction", data: { count: "3", max: "2" } }],
    },
    {
      code: "do {} while (a || b || c);",
      errors: [{ messageId: "nameConditionFunction", data: { count: "3", max: "2" } }],
    },
    {
      code: "const v = a || b || c ? 1 : 2;",
      errors: [{ messageId: "nameCondition", data: { count: "3", max: "2" } }],
    },
    {
      // Only the inner `if` has a long test, so it is reported once.
      code: "if (x) {} else if (a || b || c) {}",
      errors: [{ messageId: "nameConditionFunction", data: { count: "3", max: "2" } }],
    },
    {
      // An `if` nested in an `else` block is not an `else if`; a `const` fits there.
      code: "if (x) {} else { if (a || b || c) {} }",
      errors: [{ messageId: "nameCondition", data: { count: "3", max: "2" } }],
    },
    {
      // `!(a || b)` counts as one operand.
      code: "if (!(a || b) && c && d) {}",
      errors: [{ messageId: "nameCondition", data: { count: "3", max: "2" } }],
    },
    {
      code: "if (a || b) {}",
      options: [{ max: 1 }],
      errors: [{ messageId: "nameCondition", data: { count: "2", max: "1" } }],
    },
    {
      code: "if (a && b && c && d) {}",
      errors: [{ messageId: "nameCondition", data: { count: "4", max: "2" } }],
    },
  ],
});
