# AGENTS.md

This project turns rules that used to live in agent skills into oxlint JS plugin rules, so they are enforced deterministically instead of relying on the agent to follow instructions.

## Commands

- `pnpm lint` — run oxlint (this repo is linted with its own plugin)
- `pnpm test` — run rule tests (vitest + `RuleTester`)
- `pnpm typecheck` — type check

## Layout

- `src/index.ts` — plugin entry; register every rule here
- `src/rules/<rule-name>.ts` — one rule per file
- `src/rules/<rule-name>.test.ts` — `RuleTester` tests for that rule
- `.oxlintrc.json` — enables rules; use `overrides` to scope a rule to certain files

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
