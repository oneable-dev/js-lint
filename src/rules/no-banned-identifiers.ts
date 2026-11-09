/**
 * no-banned-identifiers
 *
 * What: Disallow variable names for which the `match` option evaluates to `true`.
 * Why: Names like `data`, `tmp`, or `obj` say nothing about the value. Teams want to ban the
 *   ones they see most often without writing a new rule for each, so the ban is configured as
 *   a small JavaScript expression over `name`, e.g. `name === "tmp" || name.length < 2`.
 */
import { defineRule } from "@oxlint/plugins";

function readMatch(options: readonly unknown[]): string | undefined {
  const [first] = options;
  if (typeof first !== "object" || first === null) {
    return undefined;
  }
  return "match" in first && typeof first.match === "string" ? first.match : undefined;
}

export const noBannedIdentifiers = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow variable names for which the `match` option evaluates to true." },
    messages: {
      banned: "Identifier `{{name}}` is not allowed.",
    },
    schema: [
      {
        type: "object",
        properties: { match: { type: "string" } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const match = readMatch(context.options);
    if (match === undefined) {
      return {};
    }
    // The expression comes from the oxlint config, e.g. `name === "tmp"`.
    const isBanned = new Function("name", `return (${match});`);

    return {
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") {
          return;
        }
        const result: unknown = Reflect.apply(isBanned, undefined, [node.id.name]);
        if (result === true) {
          context.report({ node: node.id, messageId: "banned", data: { name: node.id.name } });
        }
      },
    };
  },
});
