import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { maxParams } from "./max-params.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("max-params", maxParams, {
  valid: [
    "function f(a: number, b: number, c: number) {}",
    "function f({ a, b, c, d }: Input) {}",
    "function f(...args: number[]) {}",
    // `this` is not a real argument.
    "function f(this: Window, a: number, b: number, c: number) {}",
    "interface Api { get(a: number, b: number, c: number): void }",
    { code: "function f(a: number, b: number, c: number, d: number) {}", options: [{ max: 4 }] },
    { code: "function f(a: number, b: number, c: number, ...rest: number[]) {}", options: [{ ignoreRest: true }] },
    { code: "const f = (a: number, ...rest: number[]) => rest.length + a;", options: [{ max: 1, ignoreRest: true }] },
  ],
  invalid: [
    {
      code: "function createUser(name: string, email: string, role: Role, team: Team) {}",
      errors: [
        {
          messageId: "tooMany",
          data: { name: "createUser", count: "4", max: "3", params: "name, email, role, team" },
        },
      ],
    },
    {
      code: "const add = (a: number, b: number, c: number, d: number) => a + b + c + d;",
      errors: [{ messageId: "tooMany", data: { name: "add", count: "4", max: "3", params: "a, b, c, d" } }],
    },
    {
      code: "class K { constructor(private a: number, b: number, c = 1, ...rest: number[]) {} }",
      errors: [{ messageId: "tooMany", data: { name: "constructor", count: "4", max: "3", params: "a, b, c, ...rest" } }],
    },
    {
      code: "class K { run(a: number, b: number, c: number, d: number): void; run() {} }",
      errors: [{ messageId: "tooMany", data: { name: "run", count: "4", max: "3", params: "a, b, c, d" } }],
    },
    {
      code: "type Handler = (a: number, b: number, c: number, d: number) => void;",
      errors: [{ messageId: "tooMany", data: { name: "Handler", count: "4", max: "3", params: "a, b, c, d" } }],
    },
    {
      // Interface methods, call signatures, and constructor types are skipped by the built-in rule.
      code: "interface Api { get(a: number, b: number, c: number, d: number): void; (a: 1, b: 2, c: 3, d: 4): void }",
      errors: [{ messageId: "tooMany", data: { name: "get", count: "4", max: "3", params: "a, b, c, d" } }, { messageId: "tooMany", data: { name: "This function", count: "4", max: "3", params: "a, b, c, d" } }],
    },
    {
      code: "type Ctor = new (a: number, b: number, c: number, d: number) => K;",
      errors: [{ messageId: "tooMany", data: { name: "Ctor", count: "4", max: "3", params: "a, b, c, d" } }],
    },
    {
      code: "interface P { onChange: (a: number, b: number, c: number, d: number) => void }",
      errors: [{ messageId: "tooMany", data: { name: "onChange", count: "4", max: "3", params: "a, b, c, d" } }],
    },
    {
      code: "items.reduce((acc, cur, idx, arr) => acc, 0);",
      errors: [{ messageId: "tooMany", data: { name: "This function", count: "4", max: "3", params: "acc, cur, idx, arr" } }],
    },
    {
      code: "function f(this: Window, a: number, b: number, c: number, d: number) {}",
      errors: [{ messageId: "tooMany", data: { name: "f", count: "4", max: "3", params: "a, b, c, d" } }],
    },
    {
      code: "function f(a: number, b: number, c: number, d: number, ...rest: number[]) {}",
      options: [{ ignoreRest: true }],
      errors: [{ messageId: "tooMany", data: { name: "f", count: "5", max: "3", params: "a, b, c, d, ...rest" } }],
    },
  ],
});
