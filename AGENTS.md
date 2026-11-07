# AGENTS.md

This project turns rules that used to live in agent skills into oxlint JS plugin rules, so they are enforced deterministically instead of relying on the agent to follow instructions.

## Commands

- `pnpm build` — compile `src` to `dist` (Node cannot strip types inside `node_modules`, so consumers load `dist`)
- `pnpm lint` — build, then run oxlint on this repo with `oxlint.config.ts`
- `pnpm test` — run rule tests (vitest + `RuleTester`)
- `pnpm typecheck` — type check

## Layout

- `src/index.ts` — plugin entry (plugin name `oneable`, so rules are `oneable/<rule-name>`); register every rule here
- `src/rules/<rule-name>.ts` — one rule per file
- `src/rules/<rule-name>.test.ts` — `RuleTester` tests for that rule
- `src/utils/` — AST helpers shared by rules. Do not depend on packages that need `eslint`; pnpm installs their `eslint` peer dependency into every consumer
- `src/presets/*.ts` — shared configs consumers import as `@oneable/js-lint/<preset>`. Layered: `base` ← `typescript` ← `react` ← `react-native` / `nextjs`; `vitest` is separate and combined with any of them. Put each rule in the lowest layer it applies to. Use `overrides` to scope a rule to certain files
- `oxlint.config.ts` — this repo's own config (`typescript` + `vitest`)

## Limits

- Custom JS rules cannot use type information. Type-aware checks are only possible with oxlint's built-in rules (via `oxlint-tsgolint`).
- `options` (`typeAware`, `reportUnusedDisableDirectives`) work from presets through `extends` (verified with oxlint 1.92.0), even though the schema says "root configuration only". They do not work in nested configs inside subdirectories.
- Presets reference this plugin by package name (`jsPlugins: ["@oneable/js-lint"]`), not by path, so they work from `node_modules`.

## Writing a rule

Every rule file must start with a doc comment in this format:

```ts
/**
 * <rule-name>
 *
 * What: <one line: what the rule forbids or requires. Keep in sync with meta.docs.description>
 * Why: <what goes wrong without it, especially the mistake agents make>
 * Source: <skill name and section this came from, or "none">
 * Scope: <preset that enables it, and which files, e.g. "react-native preset, all files">
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
- Use `"error"` or `"off"`, never `"warn"`. Warnings do not fail lint, and agents move past them.
- Add a `fix` only when the fixed code is guaranteed to behave the same. Use `suggest` when it usually does but cannot be proven (e.g. a getter may be read a different number of times). Otherwise report without a fix, and make the message say how to fix it.
- Code ported from another project keeps a comment naming the project, version, and license.
- Every rule needs a test file with both `valid` and `invalid` cases.
- Scope rules with `overrides` in the preset instead of checking the filename inside the rule.
