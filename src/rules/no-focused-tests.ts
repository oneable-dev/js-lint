/**
 * no-focused-tests
 *
 * What: Disallow `.only` on describe/it/test.
 * Why: `.only` skips every other test, so CI passes even when those tests are broken.
 *   Agents often add `.only` to debug one failing test and forget to remove it.
 * Source: none
 * Scope: **\/*.{test,spec}.{ts,tsx}
 * Not covered: computed access (`it["only"]`) and non-test objects (`foo.only()`),
 *   to avoid false positives.
 *
 * @example Bad
 * it.only("logs in", () => {});
 *
 * @example Good
 * it("logs in", () => {});
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

const TEST_FUNCTIONS = new Set(["describe", "suite", "it", "test"]);

// Walk `a.b.c` down to its root identifier name (e.g. `test.concurrent.only` -> "test").
function rootName(node: ESTree.Node): string | undefined {
  let current = node;
  while (current.type === "MemberExpression") current = current.object;
  return current.type === "Identifier" ? current.name : undefined;
}

export const noFocusedTests = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow `.only` on describe/it/test." },
    messages: {
      noFocusedTests:
        "`{{name}}.only` is not allowed: it silently skips every other test in the run. Remove `.only`.",
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (node.computed || node.property.type !== "Identifier" || node.property.name !== "only") return;
        const name = rootName(node.object);
        if (name && TEST_FUNCTIONS.has(name)) {
          context.report({ node: node.property, messageId: "noFocusedTests", data: { name } });
        }
      },
    };
  },
});
