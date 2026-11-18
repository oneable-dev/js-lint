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

// Every declaration type, so a new type in the AST types fails to compile here. The value is the
// kind it declares, or null when it declares no checked name: expressions only appear here as
// `export default`, and namespaces may merge with functions and classes by design.
const DECLARED_KIND: Record<ESTree.Declaration["type"], Kind | null> = {
  VariableDeclaration: "variable",
  FunctionDeclaration: "function",
  FunctionExpression: null,
  TSDeclareFunction: "function",
  TSEmptyBodyFunctionExpression: null,
  ClassDeclaration: "class",
  ClassExpression: null,
  TSTypeAliasDeclaration: "type",
  TSInterfaceDeclaration: "interface",
  TSEnumDeclaration: "enum",
  TSModuleDeclaration: null,
  TSImportEqualsDeclaration: null,
};

function isDeclaration(node: ESTree.Node): node is ESTree.Declaration {
  return Object.hasOwn(DECLARED_KIND, node.type);
}

function unwrapExport(statement: ESTree.Node): ESTree.Node | null {
  if (statement.type === "ExportNamedDeclaration") {
    return statement.declaration;
  }
  if (statement.type === "ExportDefaultDeclaration") {
    return statement.declaration;
  }
  return statement;
}

// Identifiers a declaration introduces. Destructured variables are skipped.
function declaredIdentifiers(declaration: ESTree.Declaration): ESTree.BindingIdentifier[] {
  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap(({ id }) => (id.type === "Identifier" ? [id] : []));
  }
  return declaration.id?.type === "Identifier" ? [declaration.id] : [];
}

function collect(declaration: ESTree.Declaration, add: (name: string, entry: Entry) => void) {
  const kind = DECLARED_KIND[declaration.type];
  if (kind === null) {
    return;
  }
  for (const id of declaredIdentifiers(declaration)) {
    add(id.name, { kind, node: id });
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
        if (!declaration || !isDeclaration(declaration)) {
          continue;
        }

        collect(declaration, (name, entry) => {
          const first = seen.get(name);
          if (!first) {
            seen.set(name, entry);
            return;
          }

          // Function overloads are separate declarations of one function.
          if (first.kind === "function" && entry.kind === "function") {
            return;
          }

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
