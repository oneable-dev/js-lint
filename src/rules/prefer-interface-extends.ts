/**
 * prefer-interface-extends
 *
 * What: Disallow `type X = A & { ... }` for object types; use `interface X extends A { ... }`.
 * Why: `consistent-type-definitions` only reports plain object aliases, so agents keep building
 *   object types with `&`. Interfaces report conflicting members as errors instead of silently
 *   producing `never`, and TypeScript caches `extends` relations, which keeps checking fast.
 * Source: write-good-typescript (type declarations)
 * Scope: typescript preset, all files
 * Not covered: intersections with a type parameter (`T & { id: string }`), which an interface
 *   cannot extend; references to union aliases declared in another file, which an interface
 *   cannot extend either (needs type information); intersections that are not the whole alias.
 *
 * @example Bad
 * type Admin = User & { level: number };
 *
 * @example Good
 * interface Admin extends User { level: number }
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

function referenceName(typeName: ESTree.TSTypeName): string | undefined {
  return typeName.type === "Identifier" ? typeName.name : undefined;
}

export const preferInterfaceExtends = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow `type X = A & { ... }` for object types; use `interface X extends A { ... }`." },
    messages: {
      preferInterfaceExtends:
        "Use `interface {{name}} extends ...` instead of combining object types with `&`. Interfaces report conflicting members as errors instead of silently producing `never`.",
    },
    schema: [],
  },
  create(context) {
    // Same-file aliases that are not object types (unions etc.) cannot be extended by an interface.
    const nonObjectAliases = new Set<string>();

    return {
      Program(program) {
        for (const statement of program.body) {
          const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
          if (declaration?.type !== "TSTypeAliasDeclaration") {
            continue;
          }

          const kind = declaration.typeAnnotation.type;
          if (kind !== "TSTypeLiteral" && kind !== "TSIntersectionType") {
            nonObjectAliases.add(declaration.id.name);
          }
        }
      },
      TSTypeAliasDeclaration(node) {
        if (node.typeAnnotation.type !== "TSIntersectionType") {
          return;
        }

        const typeParameters = new Set(node.typeParameters?.params.map((param) => param.name.name));
        const extendable = node.typeAnnotation.types.every((member) => {
          if (member.type === "TSTypeLiteral") {
            return true;
          }
          if (member.type !== "TSTypeReference") {
            return false;
          }

          const name = referenceName(member.typeName);
          if (name === undefined) {
            return true;
          }
          if (typeParameters.has(name) || nonObjectAliases.has(name)) {
            return false;
          }
          return true;
        });

        if (extendable) {
          context.report({ node: node.id, messageId: "preferInterfaceExtends", data: { name: node.id.name } });
        }
      },
    };
  },
});
