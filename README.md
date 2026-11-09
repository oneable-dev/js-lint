# @oneable/js-lint

oxlint rules that enforce what agent skills used to ask for.

## Usage

```sh
pnpm add -D @oneable/js-lint oxlint oxlint-tsgolint
```

`oxlint.config.ts` in your project root. Pick the one preset that matches your project, and add `vitest` if you use it:

```ts
import { defineConfig } from "oxlint";
import reactNative from "@oneable/js-lint/react-native";
import vitest from "@oneable/js-lint/vitest";

export default defineConfig({ extends: [reactNative, vitest] });
```

| Preset | Includes |
|---|---|
| `@oneable/js-lint/base` | JS rules |
| `@oneable/js-lint/typescript` | `base` + TypeScript and type-aware rules |
| `@oneable/js-lint/react` | `typescript` + React rules |
| `@oneable/js-lint/react-native` | `react` + React Native rules |
| `@oneable/js-lint/nextjs` | `react` + Next.js rules |
| `@oneable/js-lint/vitest` | Test-file rules; combine with any preset above |

- Use `oxlint.config.ts`. `.oxlintrc.json` cannot import presets by package name.
- `oxlint-tsgolint` and a `tsconfig.json` are needed for `typescript` and above.
- Add `node_modules/` to `.gitignore`; oxlint uses it to skip files.

## Optional rules

`import/no-default-export` is not in any preset, because which files need a default export depends on the framework (Expo Router and Next.js routes, `*.config.ts`, Storybook). Enable it with your own exceptions:

```ts
export default defineConfig({
  extends: [reactNative],
  rules: { "import/no-default-export": "error" },
  overrides: [
    { files: ["app/**", "*.config.ts"], rules: { "import/no-default-export": "off" } },
  ],
});
```

