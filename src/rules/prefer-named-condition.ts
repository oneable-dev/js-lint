/**
 * prefer-named-condition
 *
 * What: Allow at most 2 operands in an `&&`/`||`/`??` chain in the test of `if`, `while`, `do...while`, and `? :`.
 * Why: A long condition makes the reader decode what is being checked, and agents keep appending
 *   one more `&&` or `||` instead of stopping to name the idea. A `const` with a name that says
 *   what the condition means documents the intent where the branch is taken. For `while`,
 *   `do...while`, and `else if`, a `const` is the wrong tool: it is evaluated once before the loop
 *   (so the loop never sees the condition change) or before the whole `if`/`else if` chain (so it runs
 *   even when an earlier branch matches). Those get a message that asks for a function instead.
 * Source: none
 * Scope: base preset, all files
 * Not covered: `for` tests; chains in assignments, `return`, and arguments, which are already named
 *   or consumed by something else; sub-chains wrapped in `!(...)`, calls, or comparisons, which count
 *   as one operand to avoid false positives; JSX `&&` rendering.
 *
 * @example Bad
 * if (isAdmin || isOwner || hasInvite) {}
 *
 * @example Bad
 * while (node && node.next && node.next.ready) {}
 *
 * @example Good
 * const canEdit = isAdmin || isOwner || hasInvite;
 * if (canEdit) {}
 *
 * @example Good
 * while (hasReadyNext(node)) {}
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

const DEFAULT_MAX = 2;

type ConditionalNode =
  | ESTree.IfStatement
  | ESTree.WhileStatement
  | ESTree.DoWhileStatement
  | ESTree.ConditionalExpression;

// Parentheses are kept as nodes by some parsers, so look through them.
function unwrap(node: ESTree.Node): ESTree.Node {
  return node.type === "ParenthesizedExpression" ? unwrap(node.expression) : node;
}

// `a && (b || c)` -> 3. Anything that is not a logical expression counts as one operand.
function countOperands(node: ESTree.Node): number {
  const inner = unwrap(node);
  if (inner.type !== "LogicalExpression") {
    return 1;
  }
  return countOperands(inner.left) + countOperands(inner.right);
}

// A `const` cannot hold these conditions: a loop re-evaluates its test on every iteration, and an
// `else if` test must only run when the earlier branches did not match.
function needsFunction(node: ConditionalNode): boolean {
  if (node.type === "WhileStatement" || node.type === "DoWhileStatement") {
    return true;
  }
  if (node.type !== "IfStatement") {
    return false;
  }
  const { parent } = node;
  return parent.type === "IfStatement" && parent.alternate === node;
}

function readMax(options: readonly unknown[]): number {
  const [first] = options;
  if (typeof first !== "object" || first === null) {
    return DEFAULT_MAX;
  }
  if (!("max" in first)) {
    return DEFAULT_MAX;
  }
  return typeof first.max === "number" ? first.max : DEFAULT_MAX;
}

export const preferNamedCondition = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Allow at most 2 operands in an `&&`/`||`/`??` chain in the test of `if`, `while`, `do...while`, and `? :`.",
    },
    messages: {
      nameCondition:
        "This condition combines {{count}} operands with `&&`/`||`/`??` (maximum {{max}}). Extract it into a `const` whose name says what it means, e.g. `const canEdit = isAdmin || isOwner || hasInvite; if (canEdit)`. Do not split it into nested `if` statements.",
      nameConditionFunction:
        "This condition combines {{count}} operands with `&&`/`||`/`??` (maximum {{max}}). Extract it into a function whose name says what it checks, e.g. `while (hasNext(node))`. A `const` declared before a loop is not re-evaluated on each iteration, and a `const` before an `if`/`else if` chain runs even when an earlier branch matches.",
    },
    schema: [
      {
        type: "object",
        properties: { max: { type: "integer", minimum: 1 } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const max = readMax(context.options);

    function check(node: ConditionalNode) {
      const { test } = node;
      if (unwrap(test).type !== "LogicalExpression") {
        return;
      }

      const count = countOperands(test);
      if (count <= max) {
        return;
      }

      context.report({
        node: test,
        messageId: needsFunction(node) ? "nameConditionFunction" : "nameCondition",
        data: { count: String(count), max: String(max) },
      });
    }

    return {
      IfStatement: check,
      WhileStatement: check,
      DoWhileStatement: check,
      ConditionalExpression: check,
    };
  },
});
