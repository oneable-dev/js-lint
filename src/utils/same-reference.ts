/**
 * Whether two expressions reference the same value (`a`, `a.b`, `a["b"]`, `a[0]`), adapted from
 * `isSameReference` in eslint-plugin-unicorn v79.0.0 (MIT, Copyright (c) Sindre Sorhus), which
 * was copied from ESLint's ast-utils.
 */
import type { ESTree } from "@oxlint/plugins";
import { getStaticStringValue, getStaticValue } from "./static-value.ts";

// The expression inside `foo?.bar` or a TypeScript wrapper (`as`, `satisfies`, `!`, `<T>`, `foo<T>`).
function wrappedExpression(node: ESTree.Node): ESTree.Node | null {
  const isWrapper =
    node.type === "ChainExpression" ||
    node.type === "TSAsExpression" ||
    node.type === "TSSatisfiesExpression" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSTypeAssertion" ||
    node.type === "TSInstantiationExpression";
  if (isWrapper) {
    return node.expression;
  }
  return null;
}

/** Unwrap `foo?.bar` and TypeScript wrappers, which have no runtime effect. */
function unwrapChainAndTypeScript(node: ESTree.Node): ESTree.Node {
  let current = node;
  for (let inner = wrappedExpression(current); inner; inner = wrappedExpression(current)) {
    current = inner;
  }
  return current;
}

// `a.b` -> "b", `a["b"]` -> "b", `a[0]` -> "0", `a[b]` -> undefined
function staticPropertyName(node: ESTree.MemberExpression): string | undefined {
  const { property } = node;
  if (property.type === "Identifier" && !node.computed) {
    return property.name;
  }
  if (property.type === "PrivateIdentifier") {
    return undefined;
  }

  const value = getStaticValue(property, null);
  return value ? String(value.value) : undefined;
}

function sameLiteral(left: ESTree.Node, right: ESTree.Node): boolean {
  if (left.type !== "Literal" || right.type !== "Literal") {
    return false;
  }
  if ("regex" in left || "regex" in right) {
    return (
      "regex" in left &&
      "regex" in right &&
      left.regex.pattern === right.regex.pattern &&
      left.regex.flags === right.regex.flags
    );
  }
  return left.value === right.value;
}

// `isSame` is passed in, so `isSameReference` is the only recursive function.
type IsSame = (left: ESTree.Node, right: ESTree.Node) => boolean;

function sameMember(left: ESTree.Node, right: ESTree.Node, isSame: IsSame): boolean {
  if (left.type !== "MemberExpression" || right.type !== "MemberExpression") {
    return false;
  }

  const name = staticPropertyName(left);
  if (name !== undefined) {
    return isSame(left.object, right.object) && name === staticPropertyName(right);
  }
  return left.computed === right.computed && isSame(left.object, right.object) && isSame(left.property, right.property);
}

function sameName(left: ESTree.Node, right: ESTree.Node): boolean {
  const leftName = left.type === "Identifier" || left.type === "PrivateIdentifier" ? left.name : undefined;
  const rightName = right.type === "Identifier" || right.type === "PrivateIdentifier" ? right.name : undefined;
  return leftName !== undefined && leftName === rightName;
}

/** Whether `left` and `right` read the same value. */
function isSameReference(leftNode: ESTree.Node, rightNode: ESTree.Node): boolean {
  const left = unwrapChainAndTypeScript(leftNode);
  const right = unwrapChainAndTypeScript(rightNode);

  const leftString = getStaticStringValue(left);
  if (leftString !== undefined) {
    return leftString === getStaticStringValue(right);
  }
  if (left.type !== right.type) {
    return false;
  }
  if (left.type === "Super" || left.type === "ThisExpression") {
    return true;
  }
  return sameName(left, right) || sameLiteral(left, right) || sameMember(left, right, isSameReference);
}

export { isSameReference, unwrapChainAndTypeScript };
