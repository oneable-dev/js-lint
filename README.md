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

Put `vitest` last in `extends`: later entries win, so its test-file overrides take precedence over the preset before it.

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

## Releasing

Releases use [Changesets](https://github.com/changesets/changesets) and npm Trusted Publishing.

- Add a changeset to every PR that changes `src` in a way consumers can see. Run `pnpm changeset`, or write `.changeset/<name>.md` by hand. For a `src` change that needs no release (tests, refactors), run `pnpm changeset --empty`. CI checks this on PRs with `changeset status`.
- While the version is `0.x`, a breaking change is a `minor` bump and everything else is a `patch`.
- After a PR with changesets is merged to `main`, `release.yml` opens or updates a "Version Packages" PR. Merging that PR publishes to npm with provenance through Trusted Publishing, then creates the `vX.Y.Z` tag and a GitHub Release.
- The "Version Packages" PR is created with `GITHUB_TOKEN`, so CI does not run on it.

### One-time setup

1. Confirm the `oneable` organization exists on npm and you have publish permission.
2. In GitHub, go to Settings → Actions → General and turn on "Allow GitHub Actions to create and approve pull requests".
3. Publish `0.0.0` by hand from your machine: log in with `npm login`, then run `pnpm publish`. `prepack` builds `dist`.
4. On npmjs.com, open the package's Settings → Trusted Publisher and register GitHub Actions with Organization `oneable-dev`, Repository `js-lint`, Workflow filename `release.yml`, and Environment empty. The registration expires if no OIDC publish happens within 2 days.
5. Merge the "Version Packages" PR to publish `0.1.0` and confirm it appears on npm.
6. After that succeeds, set Publishing access to "Require two-factor authentication and disallow tokens".
