# AGENTS.md

This project turns rules that used to live in agent skills into oxlint JS plugin rules, so they are enforced deterministically instead of relying on the agent to follow instructions.

## Gotchas

- Consumers load `dist`, not `src`: Node cannot strip types inside `node_modules`. This is why `pnpm lint` builds first.
- Register every new rule in `src/index.ts`. Unit tests do not catch a missing registration (`RuleTester` imports the rule module directly), and lint catches it only in some cases.
- Do not make `src/utils/` depend on packages that need `eslint`. pnpm installs their `eslint` peer dependency into every consumer.
- Custom JS rules cannot use type information. Type-aware checks are only possible with oxlint's built-in rules (via `oxlint-tsgolint`).
- `options` (`typeAware`, `reportUnusedDisableDirectives`) work from presets through `extends` (verified with oxlint 1.92.0), even though the schema says "root configuration only". They do not work in nested configs inside subdirectories.
- Presets reference this plugin by package name (`jsPlugins: ["@oneable/js-lint"]`), not by path, so they work from `node_modules`.

## Presets

- Put each rule in the lowest layer it applies to: `base` ← `typescript` ← `react` ← `react-native` / `nextjs`. `vitest` is separate and combined with any of them.
- A rule set in a higher preset replaces its options from lower presets; they do not merge. Shared option values (e.g. `no-restricted-imports` patterns) live in `src/presets/restricted-imports.ts` so each layer can repeat them.
- Later `extends` entries win over earlier ones, but an earlier config's `overrides` still beat a later config's top-level `rules` (verified with oxlint 1.92.0).
- Scope rules with `overrides` in the preset instead of checking the filename inside the rule.

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
- Pick the severity by what the rule checks:
  - `"error"`: a strict invariant. Every violation is a real defect or a broken convention, the fix is clear, and valid code never needs to violate it.
  - `"warn"`: a heuristic. Crossing it is a signal to reconsider, but valid code can legitimately cross it (e.g. file length).
  - `"off"`: the rule does not apply.
  - Never use `"warn"` for something that must be enforced. Warnings do not fail lint, and agents move past them.
- Add a `fix` only when the fixed code is guaranteed to behave the same. Use `suggest` when it usually does but cannot be proven (e.g. a getter may be read a different number of times). Otherwise report without a fix, and make the message say how to fix it.
- Code ported from another project keeps a comment naming the project, version, and license.
- Every rule needs a test file with both `valid` and `invalid` cases.
