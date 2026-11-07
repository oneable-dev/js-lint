/**
 * destructure-props
 *
 * What: Require React components to destructure props in the parameter list, not read `props.x`.
 * Why: `props.onChange()` inside an effect makes `exhaustive-deps` ask for the whole `props`
 *   object, so the effect re-runs when any prop changes. Destructuring also gives defaults
 *   (`{ size = 100 }`) and keeps type narrowing inside callbacks. The signature form matches
 *   the React docs, so there is one place to look for a component's props.
 * Source: write-good-react (team convention: destructure in the signature)
 * Scope: react preset, all files
 * Not covered: components whose name does not start with an uppercase letter or that contain
 *   no JSX; class components; props passed on as a whole (`{...props}`, `fn(props)`), where a
 *   `props` parameter and body destructuring are allowed.
 *
 * @example Bad
 * function Card(props: CardProps) {
 *   return <Text>{props.title}</Text>;
 * }
 *
 * @example Good
 * function Card({ title }: CardProps) {
 *   return <Text>{title}</Text>;
 * }
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

type FunctionNode = ESTree.Function | ESTree.ArrowFunctionExpression;

interface Frame {
  node: FunctionNode;
  hasJSX: boolean;
}

function isPascalCase(name: string): boolean {
  return /^[A-Z]/.test(name);
}

// `function Card() {}`, `const Card = () => {}`, `const Card = memo(forwardRef(() => {}))`
function componentName(node: FunctionNode): string | undefined {
  if (node.id) {
    return node.id.name;
  }

  let current: ESTree.Node = node.parent;
  while (current.type === "CallExpression") {
    current = current.parent;
  }

  if (current.type === "VariableDeclarator" && current.id.type === "Identifier") {
    return current.id.name;
  }
  return undefined;
}

// `props` in `(props)`, `(props: Props)`, or `(props = {})`
function propsIdentifier(node: FunctionNode): ESTree.BindingIdentifier | undefined {
  const [first] = node.params;
  if (!first) {
    return undefined;
  }
  if (first.type === "Identifier") {
    return first;
  }
  if (first.type === "AssignmentPattern" && first.left.type === "Identifier") {
    return first.left;
  }
  return undefined;
}

function isBodyDestructuring(identifier: ESTree.Node): boolean {
  const { parent } = identifier;
  if (parent?.type !== "VariableDeclarator") {
    return false;
  }
  return parent.init === identifier && parent.id.type === "ObjectPattern";
}

function isMemberAccess(identifier: ESTree.Node): boolean {
  const { parent } = identifier;
  if (parent?.type !== "MemberExpression") {
    return false;
  }
  return parent.object === identifier;
}

export const destructureProps = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Require React components to destructure props in the parameter list, not read `props.x`." },
    messages: {
      noMemberAccess:
        "Destructure props in the parameter list (`function {{component}}({ ... }: Props)`) instead of reading `{{name}}.` directly. Reading through `{{name}}` makes hooks depend on every prop.",
      destructureInSignature:
        "Move this destructuring into the parameter list (`function {{component}}({ ... }: Props)`). Keep a `{{name}}` parameter only when the whole object is passed on, e.g. `{...{{name}}}`.",
    },
    schema: [],
  },
  create(context) {
    const stack: Frame[] = [];

    function enter(node: FunctionNode) {
      stack.push({ node, hasJSX: false });
    }

    function markJSX() {
      for (const frame of stack) {
        frame.hasJSX = true;
      }
    }

    function exit() {
      const frame = stack.pop();
      if (!frame?.hasJSX) {
        return;
      }

      const component = componentName(frame.node);
      if (!component || !isPascalCase(component)) {
        return;
      }

      const param = propsIdentifier(frame.node);
      if (!param) {
        return;
      }

      const variable = context.sourceCode
        .getDeclaredVariables(frame.node)
        .find((candidate) => candidate.name === param.name);
      if (!variable) {
        return;
      }

      const identifiers = variable.references.map((reference) => reference.identifier);
      const usedAsWhole = identifiers.some((id) => !isMemberAccess(id) && !isBodyDestructuring(id));
      const data = { component, name: param.name };

      for (const identifier of identifiers) {
        if (isMemberAccess(identifier)) {
          context.report({ node: identifier.parent, messageId: "noMemberAccess", data });
        } else if (isBodyDestructuring(identifier) && !usedAsWhole) {
          context.report({ node: identifier.parent, messageId: "destructureInSignature", data });
        }
      }
    }

    return {
      FunctionDeclaration: enter,
      FunctionExpression: enter,
      ArrowFunctionExpression: enter,
      "FunctionDeclaration:exit": exit,
      "FunctionExpression:exit": exit,
      "ArrowFunctionExpression:exit": exit,
      JSXElement: markJSX,
      JSXFragment: markJSX,
    };
  },
});
