/**
 * no-conditional-render-falsy
 *
 * What: Disallow `&&` on a number (`.length` or a number literal) in JSX children, because it renders `0`.
 * Why: `{items.length && <List />}` renders `0` when the array is empty. In React Native a `0` outside
 *   <Text> crashes with "Text strings must be rendered within a <Text> component". Agents coming from
 *   web React write this because it only shows a stray "0" there.
 * Source: write-good-react-native (SKILL.md, 플랫폼 UI와 네이티브 경계: explicit conditions instead of number && )
 * Scope: react-native preset, all files
 * Not covered: left operands whose type is unknown (`{count && <X />}`, `{getCount() && <X />}`,
 *   `{items.size && <X />}`), because the rule has no type information. The type-aware
 *   `typescript/strict-boolean-expressions` rule (typescript preset) catches them when type-aware
 *   linting runs. Also ignored: JSX attribute values (`<X show={items.length && 1} />`), because
 *   they are not rendered; `||` and `??`, which do not render a falsy left operand as 0; computed
 *   access (`items["length"]`).
 *
 * @example Bad
 * <View>{items.length && <List items={items} />}</View>
 *
 * @example Good
 * <View>{items.length > 0 && <List items={items} />}</View>
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

// `items.length`, `a.b.length`. Not `items?.length`, which is wrapped in a ChainExpression.
function isLengthAccess(node: ESTree.Node): boolean {
  return (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier" &&
    node.property.name === "length"
  );
}

function isNumberLike(node: ESTree.Node): boolean {
  if (node.type === "Literal") {
    return typeof node.value === "number";
  }
  if (node.type === "ChainExpression") {
    return isLengthAccess(node.expression);
  }
  return isLengthAccess(node);
}

// `a && b && c` -> [a, b, c], however the `&&` operators are nested.
function flattenAnd(node: ESTree.Expression): ESTree.Expression[] {
  if (node.type === "LogicalExpression" && node.operator === "&&") {
    return [...flattenAnd(node.left), ...flattenAnd(node.right)];
  }
  return [node];
}

// The number-like operands that a JSX child can render when they are 0.
function collectNumberOperands(node: ESTree.Node): ESTree.Expression[] {
  if (node.type === "ConditionalExpression") {
    return [...collectNumberOperands(node.consequent), ...collectNumberOperands(node.alternate)];
  }
  if (node.type === "LogicalExpression" && node.operator === "&&") {
    const operands = flattenAnd(node);
    const last = operands.at(-1);
    // Every operand but the last is a condition. The last one is the rendered value.
    const conditions = operands.slice(0, -1).filter(isNumberLike);
    return last === undefined ? conditions : [...conditions, ...collectNumberOperands(last)];
  }
  return [];
}

export const noConditionalRenderFalsy = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `&&` on a number (`.length` or a number literal) in JSX children, because it renders `0`.",
    },
    messages: {
      noConditionalRenderFalsy:
        "`{{text}}` is a number, so `&&` renders 0 when it is 0. In React Native a rendered 0 outside <Text> crashes with \"Text strings must be rendered within a <Text> component\" (inside <Text> it shows \"0\"). Use a boolean condition, e.g. `{{text}} > 0 && ...`.",
      useComparison: "Replace `{{text}}` with `{{text}} > 0`.",
    },
    hasSuggestions: true,
    schema: [],
  },
  create(context) {
    const { sourceCode } = context;

    function report(operand: ESTree.Expression) {
      const data = { text: sourceCode.getText(operand) };
      context.report({
        node: operand,
        messageId: "noConditionalRenderFalsy",
        data,
        // `a?.length > 0` can be a type error and a literal has nothing to compare, so only plain `.length` gets one.
        suggest: isLengthAccess(operand)
          ? [
              {
                messageId: "useComparison",
                data,
                fix: (fixer) => fixer.replaceText(operand, `${data.text} > 0`),
              },
            ]
          : [],
      });
    }

    return {
      JSXExpressionContainer(node) {
        const { parent } = node;
        if (parent.type !== "JSXElement" && parent.type !== "JSXFragment") {
          return;
        }
        for (const operand of collectNumberOperands(node.expression)) {
          report(operand);
        }
      },
    };
  },
});
