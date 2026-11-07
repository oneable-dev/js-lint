/**
 * no-declaration-merging
 *
 * What: Disallow declaring the same name more than once in one scope, across types and values.
 * Why: TypeScript silently merges same-named interfaces, and lets a type and a value share a
 *   name (`interface User` + `const User`, `interface Foo` + `class Foo`). Readers and agents
 *   then cannot tell which one an identifier refers to, and merged interfaces gain members
 *   nobody declared in one place.
 * Source: write-good-typescript (type declarations)
 * Scope: typescript preset, all files
 * Not covered: merging across files (global scripts, `declare module` augmentation of other
 *   packages, which is intended); destructured variables; namespaces; function overloads,
 *   which are allowed.
 *
 * @example Bad
 * interface User { id: string }
 * const User = { id: "1" };
 *
 * @example Good
 * interface User { id: string }
 * const defaultUser: User = { id: "1" };
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

type Kind = "interface" | "type" | "class" | "function" | "variable" | "enum";

interface Entry {
  kind: Kind;
  node: ESTree.Node;
}

type StatementList = Array<ESTree.Directive | ESTree.Statement>;

// Every declaration kind, so a new kind in the AST types fails to compile here.
const DECLARATION_TYPES: Record<ESTree.Declaration["type"], true> = {
  VariableDeclaration: true,
  FunctionDeclaration: true,
  FunctionExpression: true,
  TSDeclareFunction: true,
  TSEmptyBodyFunctionExpression: true,
  ClassDeclaration: true,
  ClassExpression: true,
  TSTypeAliasDeclaration: true,
  TSInterfaceDeclaration: true,
  TSEnumDeclaration: true,
  TSModuleDeclaration: true,
  TSImportEqualsDeclaration: true,
};

function isDeclaration(node: ESTree.Node): node is ESTree.Declaration {
  return Object.hasOwn(DECLARATION_TYPES, node.type);
}

function unwrapExport(statement: ESTree.Node): ESTree.Node | null {
  if (statement.type === "ExportNamedDeclaration") return statement.declaration;
  if (statement.type === "ExportDefaultDeclaration") return statement.declaration;
  return statement;
}

function collect(declaration: ESTree.Declaration, add: (name: string, entry: Entry) => void) {
  switch (declaration.type) {
    case "TSInterfaceDeclaration":
      add(declaration.id.name, { kind: "interface", node: declaration.id });
      return;
    case "TSTypeAliasDeclaration":
      add(declaration.id.name, { kind: "type", node: declaration.id });
      return;
    case "TSEnumDeclaration":
      add(declaration.id.name, { kind: "enum", node: declaration.id });
      return;
    case "ClassDeclaration":
      if (declaration.id) add(declaration.id.name, { kind: "class", node: declaration.id });
      return;
    case "FunctionDeclaration":
    case "TSDeclareFunction":
      if (declaration.id) add(declaration.id.name, { kind: "function", node: declaration.id });
      return;
    case "VariableDeclaration":
      for (const declarator of declaration.declarations) {
        if (declarator.id.type === "Identifier") {
          add(declarator.id.name, { kind: "variable", node: declarator.id });
        }
      }
      return;
    // Expressions only appear here as `export default`, where they declare no name.
    case "FunctionExpression":
    case "TSEmptyBodyFunctionExpression":
    case "ClassExpression":
    // Namespaces may merge with functions and classes by design; not checked.
    case "TSModuleDeclaration":
    case "TSImportEqualsDeclaration":
      return;
  }
}

export const noDeclarationMerging = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow declaring the same name more than once in one scope, across types and values." },
    messages: {
      duplicateInterface:
        "Interface `{{name}}` is already declared in this scope, so TypeScript merges them. Put all members in one interface, or give the second one a different name.",
      sharedName:
        "`{{name}}` is already declared as a {{first}} in this scope. Give the {{kind}} a different name (e.g. `User` for the type and `userSchema` for the value).",
    },
    schema: [],
  },
  create(context) {
    function check(body: StatementList) {
      const seen = new Map<string, Entry>();

      for (const statement of body) {
        const declaration = unwrapExport(statement);
        if (!declaration || !isDeclaration(declaration)) continue;

        collect(declaration, (name, entry) => {
          const first = seen.get(name);
          if (!first) {
            seen.set(name, entry);
            return;
          }

          // Function overloads are separate declarations of one function.
          if (first.kind === "function" && entry.kind === "function") return;

          if (first.kind === "interface" && entry.kind === "interface") {
            context.report({ node: entry.node, messageId: "duplicateInterface", data: { name } });
            return;
          }

          context.report({
            node: entry.node,
            messageId: "sharedName",
            data: { name, first: first.kind, kind: entry.kind },
          });
        });
      }
    }

    return {
      Program(node) {
        check(node.body);
      },
      TSModuleBlock(node) {
        check(node.body);
      },
      BlockStatement(node) {
        check(node.body);
      },
    };
  },
});
