/**
 * prefer-functional-update
 *
 * What: Require an updater function when a `useState` setter computes the next state from the current one.
 * Why: `count` in `setCount(count + 1)` is the value from the last render. When several updates
 *   run before the next render (two calls in one handler, a late async callback, a stale
 *   closure), they all start from that old value and some updates are lost. The updater form
 *   always receives the latest state.
 * Source: write-good-react (컴포넌트와 상태: 이전 상태에 의존하는 갱신은 함수형 갱신을 사용한다)
 * Scope: react preset, all files
 * Not covered: the current state read through another variable (`const next = count + 1;
 *   setCount(next)`), state and setter received as props, setters from `useReducer` or custom
 *   hooks, and setting the state to itself (`setCount(count)`). These stay in the skill.
 *
 * @example Bad
 * const [count, setCount] = useState(0);
 * setCount(count + 1);
 *
 * @example Good
 * const [count, setCount] = useState(0);
 * setCount((count) => count + 1);
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

// `useState(...)`, `React.useState(...)`
function isUseStateCall(node: ESTree.Node | null): boolean {
  if (node?.type !== "CallExpression") {
    return false;
  }
  const { callee } = node;
  if (callee.type === "Identifier") {
    return callee.name === "useState";
  }
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
    return callee.property.name === "useState";
  }
  return false;
}

function isWithin(inner: ESTree.Node, outer: ESTree.Node): boolean {
  return inner.range[0] >= outer.range[0] && inner.range[1] <= outer.range[1];
}

function isFunction(node: ESTree.Node): boolean {
  return node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression";
}

export const preferFunctionalUpdate = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Require an updater function when a `useState` setter computes the next state from the current one.",
    },
    messages: {
      preferFunctionalUpdate:
        "`{{setter}}` computes the next state from `{{state}}`, which is the value from the last render. Pass an updater function instead, e.g. `{{setter}}(({{state}}) => ...)`, so the update starts from the latest state.",
      useUpdater: "Use `{{setter}}(({{state}}) => ...)`.",
    },
    hasSuggestions: true,
    schema: [],
  },
  create(context) {
    const { sourceCode } = context;

    return {
      VariableDeclarator(node) {
        if (node.id.type !== "ArrayPattern" || !isUseStateCall(node.init)) {
          return;
        }
        const [stateNode, setterNode] = node.id.elements;
        if (stateNode?.type !== "Identifier" || setterNode?.type !== "Identifier") {
          return;
        }

        const variables = sourceCode.getDeclaredVariables(node);
        const state = variables.find((variable) => variable.name === stateNode.name);
        const setter = variables.find((variable) => variable.name === setterNode.name);
        if (!state || !setter) {
          return;
        }

        for (const reference of setter.references) {
          const call = reference.identifier.parent;
          if (call?.type !== "CallExpression" || call.callee !== reference.identifier) {
            continue;
          }
          const [argument] = call.arguments;
          if (!argument || argument.type === "SpreadElement" || isFunction(argument)) {
            continue;
          }
          // `setCount(count)` sets the state to itself; it does not compute anything from it.
          if (argument.type === "Identifier" && argument.name === state.name) {
            continue;
          }
          const readsState = state.references.some((stateReference) => isWithin(stateReference.identifier, argument));
          if (!readsState) {
            continue;
          }

          const data = { setter: setter.name, state: state.name };
          const text = sourceCode.getText(argument);
          // An arrow body starting with `{` would be parsed as a block.
          const body = text.startsWith("{") ? `(${text})` : text;
          context.report({
            node: call,
            messageId: "preferFunctionalUpdate",
            data,
            suggest: [
              {
                messageId: "useUpdater",
                data,
                fix: (fixer) => fixer.replaceText(argument, `(${state.name}) => ${body}`),
              },
            ],
          });
        }
      },
    };
  },
});
