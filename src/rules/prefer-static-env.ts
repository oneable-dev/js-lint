/**
 * prefer-static-env
 *
 * What: Require environment variables to be read as `process.env.NAME`.
 * Why: Expo and Next.js replace `process.env.NAME` with its value at build time, and only that
 *   exact form. `process.env[key]`, `const { NAME } = process.env`, and `const env = process.env`
 *   work in development but are `undefined` in client builds.
 * Source: none (Expo `no-dynamic-env-var` / `no-env-var-destructuring`, Next.js environment variable docs)
 * Scope: base preset, all files
 * Not covered: `process.env` passed whole to a function or spread (`schema.parse(process.env)`,
 *   `{ ...process.env }`), which server code needs; writes and `delete`; `import.meta.env`.
 *
 * @example Bad
 * const { API_URL } = process.env;
 * const value = process.env[name];
 *
 * @example Good
 * const apiUrl = process.env.API_URL;
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function isProcessEnv(node: ESTree.MemberExpression): boolean {
  return (
    !node.computed &&
    node.object.type === "Identifier" &&
    node.object.name === "process" &&
    node.property.type === "Identifier" &&
    node.property.name === "env"
  );
}

// `"NAME"` or `` `NAME` `` as a computed key.
function staticName(node: ESTree.Node): string | undefined {
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined;
  }
  return undefined;
}

// `process.env[key] = value` and `delete process.env[key]` are not replaced at build time either way.
function isWrite(member: ESTree.MemberExpression): boolean {
  const { parent } = member;
  if (parent.type === "AssignmentExpression" || parent.type === "UpdateExpression") {
    return parent.type === "UpdateExpression" || parent.left === member;
  }
  return parent.type === "UnaryExpression" && parent.operator === "delete";
}

export const preferStaticEnv = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require environment variables to be read as `process.env.NAME`." },
    fixable: "code",
    messages: {
      computedName:
        "Write `process.env.{{name}}` instead of `process.env[...]`. Build tools (Expo, Next.js) replace only the `process.env.NAME` form.",
      dynamic:
        "Read each variable as `process.env.NAME` with a fixed name. Build tools (Expo, Next.js) replace only that form, so `process.env[key]` is `undefined` in client builds. List the names explicitly, e.g. `{ apiUrl: process.env.API_URL }`.",
      destructure:
        "Read `process.env.NAME` directly instead of destructuring `process.env`. Build tools (Expo, Next.js) replace only that form, so destructured values are `undefined` in client builds.",
      alias:
        "Read `process.env.NAME` directly instead of storing `process.env` in a variable. Build tools (Expo, Next.js) replace only that form, so values read through the variable are `undefined` in client builds.",
    },
    schema: [],
  },
  create(context) {
    const { sourceCode } = context;

    function checkMember(env: ESTree.MemberExpression, member: ESTree.MemberExpression) {
      if (!member.computed || isWrite(member)) {
        return;
      }

      const name = staticName(member.property);
      if (name === undefined || !IDENTIFIER.test(name)) {
        context.report({ node: member, messageId: "dynamic" });
        return;
      }

      const start = env.range[1];
      const end = member.range[1];
      // Keep comments inside the brackets: no fix if there may be one.
      const fixable = !sourceCode.text.slice(start, end).includes("/");
      context.report({
        node: member,
        messageId: "computedName",
        data: { name },
        fix: fixable ? (fixer) => fixer.replaceTextRange([start, end], `${member.optional ? "?." : "."}${name}`) : undefined,
      });
    }

    function checkBinding(env: ESTree.MemberExpression, target: ESTree.Node) {
      if (target.type === "ObjectPattern") {
        context.report({ node: env, messageId: "destructure" });
        return;
      }
      if (target.type === "Identifier" || target.type === "MemberExpression") {
        context.report({ node: env, messageId: "alias" });
      }
    }

    return {
      MemberExpression(node) {
        if (!isProcessEnv(node)) {
          return;
        }

        const { parent } = node;
        if (parent.type === "MemberExpression" && parent.object === node) {
          checkMember(node, parent);
          return;
        }
        if (parent.type === "VariableDeclarator" && parent.init === node) {
          checkBinding(node, parent.id);
          return;
        }
        if (parent.type === "AssignmentExpression" && parent.right === node) {
          checkBinding(node, parent.left);
        }
      },
    };
  },
});
