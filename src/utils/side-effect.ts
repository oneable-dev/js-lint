/**
 * Side-effect check, adapted from `hasSideEffect` in @eslint-community/eslint-utils v4.10.1
 * (MIT, Copyright (c) 2018 Toru Nagashima). Only the `considerGetters` option is supported,
 * because that is the only option `prefer-switch` uses.
 */
interface AstNode {
  type: string;
}

interface SideEffectOptions {
  visitorKeys: Readonly<Record<string, readonly string[]>>;
  considerGetters: boolean;
}

const ALWAYS_SIDE_EFFECT = new Set([
  "AssignmentExpression",
  "AwaitExpression",
  "CallExpression",
  "ImportExpression",
  "NewExpression",
  "UpdateExpression",
  "YieldExpression",
]);

// Code inside a function does not run when the expression is evaluated.
const NOT_EVALUATED = new Set(["ArrowFunctionExpression", "FunctionExpression"]);

const NON_CHILD_KEYS = new Set(["parent", "range", "loc", "start", "end", "leadingComments", "trailingComments"]);

function isAstNode(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

function childNodes(node: AstNode, visitorKeys: SideEffectOptions["visitorKeys"]): AstNode[] {
  const keys = visitorKeys[node.type] ?? Object.keys(node).filter((key) => !NON_CHILD_KEYS.has(key));
  const children: AstNode[] = [];

  for (const key of keys) {
    const value: unknown = Reflect.get(node, key);
    const values: unknown[] = Array.isArray(value) ? value : [value];
    children.push(...values.filter(isAstNode));
  }
  return children;
}

function isDelete(node: AstNode): boolean {
  return node.type === "UnaryExpression" && "operator" in node && node.operator === "delete";
}

/** Whether evaluating `node` may change program state (or read a getter, with `considerGetters`). */
function hasSideEffect(node: AstNode, options: SideEffectOptions): boolean {
  if (NOT_EVALUATED.has(node.type)) {
    return false;
  }
  if (ALWAYS_SIDE_EFFECT.has(node.type) || isDelete(node)) {
    return true;
  }
  if (node.type === "MemberExpression" && options.considerGetters) {
    return true;
  }
  return childNodes(node, options.visitorKeys).some((child) => hasSideEffect(child, options));
}

export { hasSideEffect };
export type { SideEffectOptions };
