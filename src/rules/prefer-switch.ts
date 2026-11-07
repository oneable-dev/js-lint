/**
 * prefer-switch
 *
 * What: Disallow `if`/`else if` chains that compare one value against 3 or more constants; use `switch`.
 * Why: A `switch` shows every case of one value in one place, and `switch-exhaustiveness-check`
 *   can then report cases that are missing when the value is a union. Agents tend to keep
 *   appending `else if` branches instead.
 * Source: write-good-typescript (conditional branches)
 * Scope: base preset, all files
 * Not covered: separate guard clauses (`if (x === "a") return; if (x === "b") return;`), which
 *   are often unrelated checks; comparisons with non-constant values (`x === other`), because
 *   they cannot become `case` labels safely; chains with fewer than 3 comparisons.
 *
 * @example Bad
 * if (role === "admin") return "Admin";
 * else if (role === "member") return "Member";
 * else if (role === "guest") return "Guest";
 *
 * @example Good
 * switch (role) {
 *   case "admin": return "Admin";
 *   case "member": return "Member";
 *   case "guest": return "Guest";
 * }
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

const MINIMUM_COMPARISONS = 3;

interface Comparison {
  discriminant: string;
  count: number;
}

function isConstant(node: ESTree.Node): boolean {
  if (node.type === "Literal") {
    return true;
  }
  return node.type === "TemplateLiteral" && node.expressions.length === 0;
}

export const preferSwitch = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow `if`/`else if` chains that compare one value against 3 or more constants; use `switch`." },
    messages: {
      preferSwitch:
        "This `if`/`else if` chain compares `{{discriminant}}` against {{count}} values. Use `switch ({{discriminant}})` so every case is in one place and missing cases can be checked.",
    },
    schema: [],
  },
  create(context) {
    // `x === "a"` or `"a" === x` -> { "x", 1 }; `x === "a" || x === "b"` -> { "x", 2 }
    function comparison(test: ESTree.Node): Comparison | undefined {
      if (test.type === "LogicalExpression") {
        if (test.operator !== "||") {
          return undefined;
        }

        const left = comparison(test.left);
        const right = comparison(test.right);
        if (!left || !right || left.discriminant !== right.discriminant) {
          return undefined;
        }
        return { discriminant: left.discriminant, count: left.count + right.count };
      }

      if (test.type !== "BinaryExpression") {
        return undefined;
      }
      if (test.operator !== "===" && test.operator !== "==") {
        return undefined;
      }

      const leftConstant = isConstant(test.left);
      const rightConstant = isConstant(test.right);
      if (leftConstant === rightConstant) {
        return undefined;
      }

      const subject = leftConstant ? test.right : test.left;
      return { discriminant: context.sourceCode.getText(subject), count: 1 };
    }

    return {
      IfStatement(node) {
        // Only start from the head of a chain, not from each `else if`.
        if (node.parent.type === "IfStatement" && node.parent.alternate === node) {
          return;
        }

        let discriminant: string | undefined;
        let count = 0;
        let current: ESTree.Node | null = node;

        while (current?.type === "IfStatement") {
          const result = comparison(current.test);
          if (!result) {
            return;
          }
          if (discriminant !== undefined && result.discriminant !== discriminant) {
            return;
          }

          discriminant = result.discriminant;
          count += result.count;
          current = current.alternate;
        }

        if (discriminant !== undefined && count >= MINIMUM_COMPARISONS) {
          context.report({ node, messageId: "preferSwitch", data: { discriminant, count: String(count) } });
        }
      },
    };
  },
});
