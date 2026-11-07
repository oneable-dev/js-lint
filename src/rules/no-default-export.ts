/**
 * no-default-export
 *
 * What: Disallow default exports; use named exports.
 * Why: Default exports let each importer pick a different name, which makes code harder to
 *   search and rename. Agents often invent a new name on every import.
 * Source: none (example rule used to set up the project)
 * Scope: all files, except src/index.ts (oxlint requires the plugin entry to default-export)
 * Not covered: `export { foo as default }`.
 *
 * @example Bad
 * export default function Foo() {}
 *
 * @example Good
 * export function Foo() {}
 */
import { defineRule } from "@oxlint/plugins";

export const noDefaultExport = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow default exports; use named exports." },
    messages: {
      noDefaultExport:
        "Default export is not allowed. Use a named export instead (e.g. `export function Foo() {}`) so imports keep a consistent name.",
    },
    schema: [],
  },
  create(context) {
    return {
      ExportDefaultDeclaration(node) {
        context.report({ node, messageId: "noDefaultExport" });
      },
    };
  },
});
