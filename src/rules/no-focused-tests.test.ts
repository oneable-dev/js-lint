import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noFocusedTests } from "./no-focused-tests.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("no-focused-tests", noFocusedTests, {
  valid: [
    "it('works', () => {});",
    "describe.skip('suite', () => {});",
    "test.each([1])('n %i', () => {});",
    "foo.only();",
    "it['only']('computed access is ignored', () => {});",
  ],
  invalid: [
    { code: "it.only('a', () => {});", errors: [{ messageId: "noFocusedTests", data: { name: "it" } }] },
    { code: "test.only('a', () => {});", errors: [{ messageId: "noFocusedTests", data: { name: "test" } }] },
    { code: "describe.only('a', () => {});", errors: [{ messageId: "noFocusedTests", data: { name: "describe" } }] },
    { code: "test.concurrent.only('a', () => {});", errors: [{ messageId: "noFocusedTests" }] },
    { code: "describe.only.each([1])('n %i', () => {});", errors: [{ messageId: "noFocusedTests" }] },
  ],
});
