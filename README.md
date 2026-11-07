# ts-lint

oxlint rules that enforce what agent skills used to ask for.

## Usage

```sh
pnpm add -D <ts-lint> oxlint oxlint-tsgolint
```

`.oxlintrc.json` in your project root:

```json
{
  "extends": ["./node_modules/ts-lint/preset.json"]
}
```

- `extends` must be a file path; a package name (`ts-lint/preset.json`) does not work.
- Type-aware rules need a `tsconfig.json`.
- Add `node_modules/` to `.gitignore`; oxlint uses it to skip files.
