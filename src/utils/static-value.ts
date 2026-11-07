/**
 * Static evaluation of simple expressions, adapted from `getStaticValue` in
 * @eslint-community/eslint-utils v4.10.1 (MIT, Copyright (c) 2018 Toru Nagashima).
 *
 * Covers literals, template literals, `undefined`/`NaN`/`Infinity`, `const` variables with a
 * static initializer, TypeScript wrappers (`as`, `satisfies`, `!`), and unary, binary, and
 * logical operators on static values. The original also evaluates calls to built-in functions
 * and member access on static objects; those return `null` here.
 */
import type { ESTree, Scope, Variable } from "@oxlint/plugins";

interface StaticValue {
  value: unknown;
}

// Helpers get the evaluator passed in, so `getStaticValue` is the only recursive function.
type Evaluate = (node: ESTree.Node, scope: Scope | null) => StaticValue | null;

const GLOBAL_VALUES = new Map<string, unknown>([
  ["undefined", undefined],
  ["NaN", Number.NaN],
  ["Infinity", Number.POSITIVE_INFINITY],
]);

function findVariable(scope: Scope | null, name: string): Variable | undefined {
  for (let current = scope; current; current = current.upper) {
    const variable = current.set.get(name);
    if (variable) {
      return variable;
    }
  }
  return undefined;
}

// `const NAME = <init>` with a single definition.
function constInitializer(variable: Variable): ESTree.Expression | null {
  const [definition] = variable.defs;
  if (variable.defs.length !== 1 || !definition || definition.type !== "Variable") {
    return null;
  }
  if (definition.parent?.type !== "VariableDeclaration" || definition.parent.kind !== "const") {
    return null;
  }
  if (definition.node.type !== "VariableDeclarator" || definition.node.id.type !== "Identifier") {
    return null;
  }
  return definition.node.init;
}

function identifierValue(name: string, scope: Scope | null, evaluate: Evaluate): StaticValue | null {
  const variable = findVariable(scope, name);
  const initializer = variable ? constInitializer(variable) : null;
  if (variable && initializer) {
    return evaluate(initializer, variable.scope);
  }

  const isGlobal = !variable || variable.defs.length === 0;
  if (isGlobal && GLOBAL_VALUES.has(name)) {
    return { value: GLOBAL_VALUES.get(name) };
  }
  return null;
}

function unaryValue(operator: string, value: unknown): StaticValue | null {
  if (operator === "!") {
    return { value: !value };
  }
  if (operator === "typeof") {
    return { value: typeof value };
  }
  if (operator === "void") {
    return { value: undefined };
  }
  if (operator === "-" && (typeof value === "number" || typeof value === "bigint")) {
    return { value: -value };
  }
  if (operator === "+" && (typeof value === "number" || typeof value === "string")) {
    return { value: Number(value) };
  }
  if (operator === "~" && typeof value === "number") {
    return { value: ~value };
  }
  return null;
}

function arithmetic(operator: string, left: number, right: number): StaticValue | null {
  if (operator === "-") {
    return { value: left - right };
  }
  if (operator === "*") {
    return { value: left * right };
  }
  if (operator === "/") {
    return { value: left / right };
  }
  if (operator === "%") {
    return { value: left % right };
  }
  if (operator === "**") {
    return { value: left ** right };
  }
  return null;
}

function binaryValue(operator: string, left: unknown, right: unknown): StaticValue | null {
  if (operator === "===") {
    return { value: left === right };
  }
  if (operator === "!==") {
    return { value: left !== right };
  }
  if (operator === "+" && typeof left === "number" && typeof right === "number") {
    return { value: left + right };
  }
  if (operator === "+" && (typeof left === "string" || typeof right === "string")) {
    return { value: `${String(left)}${String(right)}` };
  }
  if (typeof left === "number" && typeof right === "number") {
    return arithmetic(operator, left, right);
  }
  return null;
}

function logicalValue(node: ESTree.LogicalExpression, scope: Scope | null, evaluate: Evaluate): StaticValue | null {
  const left = evaluate(node.left, scope);
  if (!left) {
    return null;
  }

  const shortCircuits =
    (node.operator === "&&" && !left.value) ||
    (node.operator === "||" && Boolean(left.value)) ||
    (node.operator === "??" && left.value !== null && left.value !== undefined);
  return shortCircuits ? left : evaluate(node.right, scope);
}

function templateValue(node: ESTree.TemplateLiteral, scope: Scope | null, evaluate: Evaluate): StaticValue | null {
  let text = "";
  for (const [index, quasi] of node.quasis.entries()) {
    if (quasi.value.cooked === null) {
      return null;
    }
    text += quasi.value.cooked;

    const expression = node.expressions[index];
    const value = expression ? evaluate(expression, scope) : { value: "" };
    if (!value) {
      return null;
    }
    text += String(value.value);
  }
  return { value: text };
}

function literalValue(node: ESTree.Node): StaticValue | null {
  if (node.type !== "Literal" || "regex" in node) {
    return null;
  }
  return { value: node.value };
}

/** The value of `node` if it can be computed without running code, or `null`. */
function getStaticValue(node: ESTree.Node, scope: Scope | null): StaticValue | null {
  if (node.type === "Literal") {
    return literalValue(node);
  }
  if (node.type === "TemplateLiteral") {
    return templateValue(node, scope, getStaticValue);
  }
  if (node.type === "Identifier") {
    return identifierValue(node.name, scope, getStaticValue);
  }
  if (node.type === "LogicalExpression") {
    return logicalValue(node, scope, getStaticValue);
  }
  if (node.type === "UnaryExpression") {
    const argument = getStaticValue(node.argument, scope);
    return argument ? unaryValue(node.operator, argument.value) : null;
  }
  if (node.type === "BinaryExpression" && node.left.type !== "PrivateIdentifier") {
    const left = getStaticValue(node.left, scope);
    const right = getStaticValue(node.right, scope);
    return left && right ? binaryValue(node.operator, left.value, right.value) : null;
  }
  if (
    node.type === "TSAsExpression" ||
    node.type === "TSSatisfiesExpression" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSTypeAssertion"
  ) {
    return getStaticValue(node.expression, scope);
  }
  return null;
}

/** The string value of a string literal or a template literal without expressions. */
function getStaticStringValue(node: ESTree.Node): string | undefined {
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined;
  }
  return undefined;
}

export { getStaticStringValue, getStaticValue };
export type { StaticValue };
