/**
 * max-params
 *
 * What: Allow at most 3 parameters on any function or function type.
 * Why: Long parameter lists let callers mix up positional values (`f(1, 2, true, false)`).
 *   The built-in `max-params` only says "too many parameters", so agents split the function
 *   or move values to outer variables; this message tells them to group the values into one
 *   named object instead. It also checks every function-like form, where the built-in skips
 *   interface methods, call signatures, and constructor types.
 * Source: write-good-code (function responsibility and arguments)
 * Scope: base preset, all files except `*.d.ts` and test files
 * Not covered: TypeScript `this` parameters, which are not real arguments.
 *
 * @example Bad
 * function createUser(name: string, email: string, role: Role, team: Team) {}
 *
 * @example Good
 * function createUser({ name, email, role, team }: CreateUserInput) {}
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

const DEFAULT_MAX = 3;

type FunctionLike =
  | ESTree.Function
  | ESTree.ArrowFunctionExpression
  | ESTree.TSFunctionType
  | ESTree.TSConstructorType
  | ESTree.TSMethodSignature
  | ESTree.TSCallSignatureDeclaration
  | ESTree.TSConstructSignatureDeclaration;

function isThisParam(param: ESTree.Node): boolean {
  return param.type === "Identifier" && param.name === "this";
}

function keyName(key: ESTree.Node): string | undefined {
  return key.type === "Identifier" ? key.name : undefined;
}

// The name a function gets from where it is declared: `const f = ...`, a method key, a type alias.
function parentName(parent: ESTree.Node | null): string | undefined {
  if (!parent) {
    return undefined;
  }
  if (parent.type === "VariableDeclarator") {
    return parent.id.type === "Identifier" ? parent.id.name : undefined;
  }
  if (parent.type === "MethodDefinition" || parent.type === "PropertyDefinition" || parent.type === "Property") {
    return keyName(parent.key);
  }
  if (parent.type === "TSTypeAliasDeclaration") {
    return parent.id.name;
  }
  if (parent.type === "TSTypeAnnotation" && parent.parent?.type === "TSPropertySignature") {
    return keyName(parent.parent.key);
  }
  return undefined;
}

// Best-effort name for the message: `createUser`, `run`, `constructor`, or a type alias name.
function functionName(node: FunctionLike): string | undefined {
  if ("id" in node && node.id) {
    return node.id.name;
  }
  if (node.type === "TSMethodSignature") {
    return keyName(node.key);
  }

  return parentName(node.parent);
}

// `name` for `name: string`, `...rest` for rest parameters, `options` for patterns.
function paramName(param: ESTree.Node): string {
  if (param.type === "Identifier") {
    return param.name;
  }
  if (param.type === "RestElement") {
    return "...rest";
  }
  if (param.type === "TSParameterProperty") {
    return paramName(param.parameter);
  }
  if (param.type === "AssignmentPattern") {
    return paramName(param.left);
  }
  return "options";
}

function readMax(options: readonly unknown[]): number {
  const [first] = options;
  if (typeof first !== "object" || first === null || !("max" in first)) {
    return DEFAULT_MAX;
  }
  return typeof first.max === "number" ? first.max : DEFAULT_MAX;
}

export const maxParams = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Allow at most 3 parameters on any function or function type." },
    messages: {
      tooMany:
        "`{{name}}` has {{count}} parameters (maximum {{max}}). Group the values that are passed together into one named object, e.g. `{{name}}({ {{params}} })`, instead of splitting the function or moving values to outer variables.",
    },
    schema: [
      {
        type: "object",
        properties: { max: { type: "integer", minimum: 0 } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const max = readMax(context.options);

    function check(node: FunctionLike) {
      const params = node.params.filter((param) => !isThisParam(param));
      if (params.length <= max) {
        return;
      }

      context.report({
        node,
        messageId: "tooMany",
        data: {
          name: functionName(node) ?? "This function",
          count: String(params.length),
          max: String(max),
          params: params.map(paramName).join(", "),
        },
      });
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
      TSDeclareFunction: check,
      TSEmptyBodyFunctionExpression: check,
      TSFunctionType: check,
      TSConstructorType: check,
      TSMethodSignature: check,
      TSCallSignatureDeclaration: check,
      TSConstructSignatureDeclaration: check,
    };
  },
});
