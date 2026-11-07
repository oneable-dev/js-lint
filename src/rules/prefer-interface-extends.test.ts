import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { preferInterfaceExtends } from "./prefer-interface-extends.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("prefer-interface-extends", preferInterfaceExtends, {
  valid: [
    "interface Admin extends User { level: number }",
    // An interface cannot extend a type parameter.
    "type WithId<T> = T & { id: string };",
    // An interface cannot extend a union.
    "type Result = { ok: true } | { ok: false }; type Tagged = Result & { tag: string };",
    "export type Role = 'a' | 'b'; type R = Role & { x: string };",
    // Not object types
    "type Brand = string & { __brand: 'id' };",
    "type F = (() => void) & { displayName: string };",
    // Intersection nested inside, not the whole alias
    "type Props = { user: User & { level: number } };",
  ],
  invalid: [
    {
      code: "type Admin = User & { level: number };",
      errors: [{ messageId: "preferInterfaceExtends", data: { name: "Admin" } }],
    },
    {
      code: "export type C = A & B;",
      errors: [{ messageId: "preferInterfaceExtends", data: { name: "C" } }],
    },
    {
      code: "type P = React.ComponentProps<'div'> & { title: string };",
      errors: [{ messageId: "preferInterfaceExtends" }],
    },
    {
      code: "type P<T> = Base<T> & { value: T };",
      errors: [{ messageId: "preferInterfaceExtends" }],
    },
  ],
});
