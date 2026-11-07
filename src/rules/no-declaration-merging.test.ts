import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noDeclarationMerging } from "./no-declaration-merging.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("no-declaration-merging", noDeclarationMerging, {
  valid: [
    "interface User { id: string } const defaultUser: User = { id: '1' };",
    "interface User { id: string } interface Admin extends User { level: number }",
    // Function overloads
    "function parse(x: string): string; function parse(x: number): number; function parse(x: unknown) { return x; }",
    // Augmenting another package or the global scope is the intended use of merging.
    "declare module 'some-lib' { interface Options { retries: number } }",
    "declare global { interface Window { appVersion: string } }",
    // Different scopes
    "interface User { id: string } function f() { const User = 1; return User; }",
    // Destructuring is not checked.
    "interface User { id: string } const { User } = obj;",
  ],
  invalid: [
    {
      code: "interface User { id: string } interface User { name: string }",
      errors: [{ messageId: "duplicateInterface", data: { name: "User" } }],
    },
    {
      code: "export interface User { id: string } export const User = { id: '1' };",
      errors: [{ messageId: "sharedName", data: { name: "User", first: "interface", kind: "variable" } }],
    },
    {
      code: "interface Thing { a: string } class Thing {}",
      errors: [{ messageId: "sharedName", data: { name: "Thing", first: "interface", kind: "class" } }],
    },
    {
      code: "const User = schema(); type User = Infer<typeof User>;",
      errors: [{ messageId: "sharedName", data: { name: "User", first: "variable", kind: "type" } }],
    },
    {
      code: "const Status = { On: 'on' } as const; type Status = (typeof Status)[keyof typeof Status];",
      errors: [{ messageId: "sharedName" }],
    },
    {
      code: "function Props() {} interface Props { a: string }",
      errors: [{ messageId: "sharedName", data: { name: "Props", first: "function", kind: "interface" } }],
    },
    {
      code: "declare module 'x' { interface A { a: string } interface A { b: string } }",
      errors: [{ messageId: "duplicateInterface" }],
    },
  ],
});
