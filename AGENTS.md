# AGENTS.md

This project turns rules that used to live in agent skills into oxlint JS plugin rules, so they are enforced deterministically instead of relying on the agent to follow instructions.

## Commands

- `pnpm build` — compile `src` to `dist` (Node cannot strip types inside `node_modules`, so consumers load `dist`)
- `pnpm lint` — build, then run oxlint on this repo with `preset.json`
- `pnpm test` — run rule tests (vitest + `RuleTester`)
- `pnpm typecheck` — type check

## Layout

- `src/index.ts` — plugin entry; register every rule here
- `src/rules/<rule-name>.ts` — one rule per file
- `src/rules/<rule-name>.test.ts` — `RuleTester` tests for that rule
- `preset.json` — the shared config consumers extend: chosen built-in rules + this plugin's rules. Use `overrides` to scope a rule to certain files
- `.oxlintrc.json` — this repo's own root config; extends `preset.json`

## Limits

- Custom JS rules cannot use type information. Type-aware checks are only possible with oxlint's built-in rules (via `oxlint-tsgolint`).
- `options` (`typeAware`, `reportUnusedDisableDirectives`) work from `preset.json` through `extends` (verified with oxlint 1.92.0), even though the schema says "root configuration only". They do not work in nested configs inside subdirectories.

## Writing a rule

Every rule file must start with a doc comment in this format:

```ts
/**
 * <rule-name>
 *
 * What: <one line: what the rule forbids or requires. Keep in sync with meta.docs.description>
 * Why: <what goes wrong without it, especially the mistake agents make>
 * Source: <skill name and section this came from, or "none">
 * Scope: <files it is enabled for in .oxlintrc.json, e.g. "all files" or "**\/*.{test,spec}.{ts,tsx}">
 * Not covered: <cases the rule intentionally ignores and why; what must stay in the skill>
 *
 * @example Bad
 * <code that is reported>
 *
 * @example Good
 * <code that passes>
 */
```

Other rules:

- Error messages must say what is wrong and how to fix it. Agents read the message as their only feedback.
- Prefer missing a case over reporting valid code. False positives teach agents to add `// oxlint-disable`.
- Every rule needs a test file with both `valid` and `invalid` cases.
- Scope rules with `overrides` in `.oxlintrc.json` instead of checking the filename inside the rule.
