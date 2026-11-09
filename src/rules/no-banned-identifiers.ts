/**
 * no-banned-identifiers
 *
 * What: Disallow variable names that match the `match` regular expression option.
 * Why: Names like `data`, `tmp`, or `obj` say nothing about the value. Teams want to ban the
 *   ones they see most often without writing a new rule for each, so the ban is configured as
 *   a regular expression over the name, e.g. `^(tmp|obj)$`.
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
    docs: { description: "Disallow variable names that match the `match` regular expression option." },
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
    // The pattern comes from the oxlint config, e.g. `^(tmp|data)$`.
    const isBanned = new RegExp(match, "u");

    return {
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") {
          return;
        }
        if (isBanned.test(node.id.name)) {
          context.report({ node: node.id, messageId: "banned", data: { name: node.id.name } });
        }
      },
    };
  },
});
