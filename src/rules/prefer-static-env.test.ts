import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { preferStaticEnv } from "./prefer-static-env.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("prefer-static-env", preferStaticEnv, {
  valid: [
    "const url = process.env.API_URL;",
    "const url = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost';",
    "if (process.env.NODE_ENV === 'production') {}",
    // Passed whole or spread: needed in server code.
    "const env = envSchema.parse(process.env);",
    "spawn('node', ['x.js'], { env: { ...process.env, DEBUG: '1' } });",
    "const keys = Object.keys(process.env);",
    // Writes
    "process.env.DEBUG = '1';",
    "process.env[name] = value;",
    "delete process.env[name];",
    // Not `process.env`
    "const { a } = config.env;",
    "const value = env[name];",
  ],
  invalid: [
    {
      code: "const url = process.env['API_URL'];",
      output: "const url = process.env.API_URL;",
      errors: [{ messageId: "computedName", data: { name: "API_URL" } }],
    },
    {
      code: "const url = process.env[`API_URL`];",
      output: "const url = process.env.API_URL;",
      errors: [{ messageId: "computedName" }],
    },
    {
      code: "const url = process.env?.['API_URL'];",
      output: "const url = process.env?.API_URL;",
      errors: [{ messageId: "computedName" }],
    },
    {
      // A comment would be lost, so no fix.
      code: "const url = process.env[/* api */ 'API_URL'];",
      output: null,
      errors: [{ messageId: "computedName" }],
    },
    {
      code: "const value = process.env[name];",
      output: null,
      errors: [{ messageId: "dynamic" }],
    },
    {
      code: "const value = process.env[`EXPO_PUBLIC_${name}`];",
      output: null,
      errors: [{ messageId: "dynamic" }],
    },
    {
      code: "const value = process.env['MY-VAR'];",
      output: null,
      errors: [{ messageId: "dynamic" }],
    },
    {
      code: "const { API_URL } = process.env;",
      errors: [{ messageId: "destructure" }],
    },
    {
      code: "let API_URL; ({ API_URL } = process.env);",
      errors: [{ messageId: "destructure" }],
    },
    {
      code: "const env = process.env; const url = env.API_URL;",
      errors: [{ messageId: "alias" }],
    },
    {
      code: "config.env = process.env;",
      errors: [{ messageId: "alias" }],
    },
  ],
});
