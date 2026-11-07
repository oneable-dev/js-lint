/**
 * prefer-switch
 *
 * What: Disallow `if`/`else if` chains that compare one value with `===` in 3 or more branches; use `switch`.
 * Why: A `switch` shows every case of one value in one place, and `switch-exhaustiveness-check`
 *   can then report cases that are missing when the value is a union. Agents tend to keep
 *   appending `else if` branches instead.
 * Source: write-good-typescript (conditional branches). Port of `unicorn/prefer-switch` from
 *   eslint-plugin-unicorn v79.0.0 (MIT, Copyright (c) Sindre Sorhus), which oxlint does not
 *   have. Reports, fixes, suggestions, and options follow the original.
 * Scope: base preset, all files
 * Not covered (same as unicorn): separate `if` statements; `==` comparisons; `&&` conditions.
 *   No fix when the compared value has side effects or a branch contains a `break` for an outer
 *   loop; only a suggestion when the value is a member access (it may be a getter). Duplicate
 *   case labels are detected for literals, `const` values, and simple operators; unicorn also
 *   evaluates calls to built-ins.
 *
 * @example Bad
 * if (role === "admin") {
 *   return "Admin";
 * } else if (role === "member") {
 *   return "Member";
 * } else if (role === "guest") {
 *   return "Guest";
 * }
 *
 * @example Good
 * switch (role) {
 *   case "admin": {
 *     return "Admin";
 *   }
 *   case "member": {
 *     return "Member";
 *   }
 *   case "guest": {
 *     return "Guest";
 *   }
 * }
 */
import { defineRule, type Context, type ESTree, type Fix, type Fixer, type Range } from "@oxlint/plugins";
import { isSameReference } from "../utils/same-reference.ts";
import { hasSideEffect } from "../utils/side-effect.ts";
import { getStaticStringValue, getStaticValue } from "../utils/static-value.ts";

type SourceCode = Context["sourceCode"];
type EmptyDefaultCase = "no-default-comment" | "do-nothing-comment" | "no-default-case";

interface Options {
  minimumCases: number;
  emptyDefaultCase: EmptyDefaultCase;
}

interface Branch {
  statement: ESTree.IfStatement;
  comparisons: ESTree.BinaryExpression[];
}

interface Chain {
  branches: Branch[];
  discriminant: ESTree.Node | undefined;
}

interface Edit {
  range: Range;
  text: string;
}

// Shared by every branch of one fix: unicorn indents all inserted lines like the first `if`.
interface FixLayout {
  discriminant: ESTree.Node;
  sourceCode: SourceCode;
  indent: string;
  linebreak: string;
}

const EMPTY_DEFAULT_CASES = new Set<string>(["no-default-comment", "do-nothing-comment", "no-default-case"]);

const BREAKABLE_TYPES = new Set([
  "WhileStatement",
  "DoWhileStatement",
  "ForStatement",
  "ForOfStatement",
  "ForInStatement",
  "SwitchStatement",
]);

function isEmptyDefaultCase(value: unknown): value is EmptyDefaultCase {
  return typeof value === "string" && EMPTY_DEFAULT_CASES.has(value);
}

function readOptions(options: readonly unknown[]): Options {
  const [first] = options;
  const result: Options = { minimumCases: 3, emptyDefaultCase: "no-default-comment" };
  if (typeof first !== "object" || first === null) {
    return result;
  }
  if ("minimumCases" in first && typeof first.minimumCases === "number") {
    result.minimumCases = first.minimumCases;
  }
  if ("emptyDefaultCase" in first && isEmptyDefaultCase(first.emptyDefaultCase)) {
    result.emptyDefaultCase = first.emptyDefaultCase;
  }
  return result;
}

function isSame(left: ESTree.Node, right: ESTree.Node): boolean {
  return left === right || isSameReference(left, right);
}

function isConstant(node: ESTree.Node): boolean {
  const isUndefined = node.type === "Identifier" && node.name === "undefined";
  return node.type === "Literal" || getStaticStringValue(node) !== undefined || isUndefined;
}

// `a || b || c` -> [a, b, c]
function logicalOrOperands(node: ESTree.Expression): ESTree.Expression[] {
  if (node.type !== "LogicalExpression" || node.operator !== "||") {
    return [node];
  }
  return [...logicalOrOperands(node.left), ...logicalOrOperands(node.right)];
}

// `x === 1 || x === 2` -> both comparisons; anything else -> []
function equalityComparisons(test: ESTree.Expression): ESTree.BinaryExpression[] {
  const comparisons: ESTree.BinaryExpression[] = [];
  for (const operand of logicalOrOperands(test)) {
    if (operand.type !== "BinaryExpression" || operand.operator !== "===") {
      return [];
    }
    comparisons.push(operand);
  }
  return comparisons;
}

function discriminantCandidates({ left, right }: ESTree.BinaryExpression): ESTree.Node[] {
  return [left, right].filter((node) => !isConstant(node));
}

function commonReferences(comparisons: ESTree.BinaryExpression[], candidates: ESTree.Node[]): ESTree.Node[] {
  let common = candidates;
  for (const { left, right } of comparisons) {
    common = common.filter((node) => isSame(node, left) || isSame(node, right));
    if (common.length === 0) {
      break;
    }
  }
  return common;
}

function collectChain(head: ESTree.IfStatement): Chain {
  const branches: Branch[] = [];
  let candidates: ESTree.Node[] | undefined;

  for (let statement: ESTree.Node | null = head; statement?.type === "IfStatement"; statement = statement.alternate) {
    const comparisons = equalityComparisons(statement.test);
    const [first] = comparisons;
    if (!first) {
      break;
    }

    const common = commonReferences(comparisons, candidates ?? discriminantCandidates(first));
    if (common.length === 0) {
      break;
    }

    candidates = common;
    branches.push({ statement, comparisons });
  }
  return { branches, discriminant: candidates?.[0] };
}

function isInside(inner: ESTree.Node, outer: ESTree.Node): boolean {
  return inner.range[0] >= outer.range[0] && inner.range[1] <= outer.range[1];
}

function breakTarget(node: ESTree.Node): ESTree.Node | undefined {
  for (let current = node.parent; current; current = current.parent) {
    if (BREAKABLE_TYPES.has(current.type)) {
      return current;
    }
  }
  return undefined;
}

// A `break` that leaves a loop or switch around the chain would only leave the new `switch`.
function hasBreakInside(breaks: ESTree.Node[], statement: ESTree.Node): boolean {
  return breaks.some((node) => {
    if (!isInside(node, statement)) {
      return false;
    }
    const target = breakTarget(node);
    return !target || isInside(statement, target);
  });
}

function blockLastNode(block: ESTree.BlockStatement): ESTree.Node | undefined {
  for (const node of block.body.toReversed()) {
    if (node.type === "FunctionDeclaration" || node.type === "EmptyStatement") {
      continue;
    }
    if (node.type !== "BlockStatement") {
      return node;
    }

    const last = blockLastNode(node);
    if (last) {
      return last;
    }
  }
  return undefined;
}

// Not worth code path analysis: a false positive only adds a redundant `break`.
function needsBreak(node: ESTree.Node): boolean {
  if (node.type === "ReturnStatement" || node.type === "ThrowStatement") {
    return false;
  }
  if (node.type === "IfStatement") {
    return !node.alternate || needsBreak(node.consequent) || needsBreak(node.alternate);
  }
  if (node.type === "BlockStatement") {
    const last = blockLastNode(node);
    return !last || needsBreak(last);
  }
  return true;
}

function indentOf(node: ESTree.Node, sourceCode: SourceCode): string {
  const { line, column } = sourceCode.getLoc(node).start;
  const before = sourceCode.lines[line - 1]?.slice(0, column) ?? "";
  return /\s*$/.exec(before)?.[0] ?? "";
}

function linebreakOf(sourceCode: SourceCode): string {
  return /\r\n|[\n\r\u2028\u2029]/.exec(sourceCode.text)?.[0] ?? "\n";
}

function removesComment(range: Range, sourceCode: SourceCode): boolean {
  return sourceCode.getAllComments().some(({ range: [start, end] }) => start >= range[0] && end <= range[1]);
}

// The `if` heads and the text before each `else` are removed, so a comment there would be lost.
function wouldRemoveComments(branches: Branch[], sourceCode: SourceCode): boolean {
  return branches.some(({ statement: { range, consequent, alternate } }) => {
    if (removesComment([range[0], consequent.range[0]], sourceCode)) {
      return true;
    }
    return alternate !== null && removesComment([consequent.range[1], alternate.range[0]], sourceCode);
  });
}

function caseValue(comparison: ESTree.BinaryExpression, discriminant: ESTree.Node): ESTree.Node {
  return isSame(comparison.left, discriminant) ? comparison.right : comparison.left;
}

// `case '1':` and `case "1":` are the same label, so values are compared, not text.
function hasDuplicateCase(chain: Chain, sourceCode: SourceCode): boolean {
  const { discriminant } = chain;
  const labels = new Set<string>();

  for (const comparison of chain.branches.flatMap(({ comparisons }) => comparisons)) {
    const node = discriminant ? caseValue(comparison, discriminant) : comparison.right;
    const value = getStaticValue(node, sourceCode.getScope(node));
    const label = value ? `value:${typeof value.value}:${String(value.value)}` : `text:${sourceCode.getText(node)}`;
    if (labels.has(label)) {
      return true;
    }
    labels.add(label);
  }
  return false;
}

// Same as ESLint's merge of a fix array: sort by range, keep the given order at equal positions.
function applyEdits(edits: Edit[], range: Range, sourceCode: SourceCode): string {
  const sorted = edits.toSorted((a, b) => a.range[0] - b.range[0] || a.range[1] - b.range[1]);
  let text = "";
  let position = range[0];

  for (const edit of sorted) {
    text += sourceCode.text.slice(position, edit.range[0]) + edit.text;
    position = edit.range[1];
  }
  return text + sourceCode.text.slice(position, range[1]);
}

function branchEdits(branch: Branch, layout: FixLayout): Edit[] {
  const { statement, comparisons } = branch;
  const { consequent, alternate } = statement;
  const { discriminant, sourceCode, indent, linebreak } = layout;
  const edits: Edit[] = [];

  if (alternate) {
    edits.push({ range: [consequent.range[1], alternate.range[0]], text: "" });
  }
  edits.push({ range: [statement.range[0], consequent.range[0]], text: "" });
  for (const comparison of comparisons) {
    const text = `${linebreak}${indent}case ${sourceCode.getText(caseValue(comparison, discriminant))}: `;
    edits.push({ range: [consequent.range[0], consequent.range[0]], text });
  }

  if (!needsBreak(consequent)) {
    return edits;
  }
  if (consequent.type === "BlockStatement") {
    const closingBrace = consequent.range[1] - 1;
    edits.push({ range: [closingBrace, closingBrace], text: `${linebreak}${indent}break;${linebreak}${indent}` });
    return edits;
  }
  edits.push(
    { range: [consequent.range[1], consequent.range[1]], text: `${linebreak}${indent}break;` },
    { range: [consequent.range[0], consequent.range[0]], text: `{${linebreak}${indent}` },
    { range: [consequent.range[1], consequent.range[1]], text: `${linebreak}${indent}}` },
  );
  return edits;
}

function emptyDefaultText(options: Options, indent: string, linebreak: string): string | undefined {
  if (options.emptyDefaultCase === "no-default-comment") {
    return `${linebreak}${indent}// No default`;
  }
  if (options.emptyDefaultCase === "do-nothing-comment") {
    return `${linebreak}${indent}default:${linebreak}${indent}// Do nothing`;
  }
  return undefined;
}

function switchText(chain: Chain, options: Options, sourceCode: SourceCode): { range: Range; text: string } | null {
  const { branches, discriminant } = chain;
  const first = branches[0]?.statement;
  const last = branches.at(-1)?.statement;
  if (!first || !last || !discriminant) {
    return null;
  }

  const indent = indentOf(first, sourceCode);
  const linebreak = linebreakOf(sourceCode);
  const end = first.range[1];
  const edits: Edit[] = [{ range: [first.range[0], first.range[0]], text: `switch (${sourceCode.getText(discriminant)}) {` }];

  if (last.alternate) {
    edits.push({ range: [last.alternate.range[0], last.alternate.range[0]], text: `${linebreak}${indent}default: ` });
  }
  const layout: FixLayout = { discriminant, sourceCode, indent, linebreak };
  edits.push(...branches.flatMap((branch) => branchEdits(branch, layout)));

  const emptyDefault = last.alternate ? undefined : emptyDefaultText(options, indent, linebreak);
  if (emptyDefault) {
    edits.push({ range: [end, end], text: emptyDefault });
  }
  edits.push({ range: [end, end], text: `${linebreak}${indent}}` });

  return { range: first.range, text: applyEdits(edits, first.range, sourceCode) };
}

export const preferSwitch = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow `if`/`else if` chains that compare one value with `===` in 3 or more branches; use `switch`." },
    fixable: "code",
    hasSuggestions: true,
    messages: {
      preferSwitch:
        "Use `switch ({{discriminant}})` instead of multiple `else-if` branches that compare `{{discriminant}}`. If the value comes from a call, store it in a `const` first.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          minimumCases: { type: "integer", minimum: 2 },
          emptyDefaultCase: { enum: ["no-default-comment", "do-nothing-comment", "no-default-case"] },
        },
      },
    ],
  },
  create(context) {
    const options = readOptions(context.options);
    const { sourceCode } = context;
    const ifStatements: ESTree.IfStatement[] = [];
    const breaks: ESTree.Node[] = [];
    const checked = new Set<ESTree.Node>();

    function report(head: ESTree.IfStatement, chain: Chain, discriminant: ESTree.Node) {
      const sideEffect = hasSideEffect(discriminant, { visitorKeys: sourceCode.visitorKeys, considerGetters: false });
      const fixable =
        !sideEffect &&
        chain.branches.every(({ statement }) => !hasBreakInside(breaks, statement)) &&
        !wouldRemoveComments(chain.branches, sourceCode) &&
        !hasDuplicateCase(chain, sourceCode);
      const replacement = fixable ? switchText(chain, options, sourceCode) : null;
      const fix = replacement ? (fixer: Fixer): Fix => fixer.replaceTextRange(replacement.range, replacement.text) : undefined;

      // A getter can return a different value on each read, and a case value with side effects can
      // change the discriminant, so those are only suggested.
      const onlySuggest =
        hasSideEffect(discriminant, { visitorKeys: sourceCode.visitorKeys, considerGetters: true }) ||
        chain.branches.some(({ statement }) => hasSideEffect(statement.test, { visitorKeys: sourceCode.visitorKeys, considerGetters: false }));
      const data = { discriminant: sourceCode.getText(discriminant) };

      context.report({
        loc: { start: sourceCode.getLoc(head).start, end: sourceCode.getLoc(head.consequent).start },
        messageId: "preferSwitch",
        data,
        fix: fix && !onlySuggest ? fix : undefined,
        suggest: fix && onlySuggest ? [{ messageId: "preferSwitch", data, fix }] : undefined,
      });
    }

    return {
      IfStatement(node) {
        ifStatements.push(node);
      },
      BreakStatement(node) {
        if (!node.label) {
          breaks.push(node);
        }
      },
      "Program:exit"() {
        for (const node of ifStatements) {
          if (checked.has(node)) {
            continue;
          }

          const chain = collectChain(node);
          if (!chain.discriminant || chain.branches.length < options.minimumCases) {
            continue;
          }

          for (const { statement } of chain.branches) {
            checked.add(statement);
          }
          report(node, chain, chain.discriminant);
        }
      },
    };
  },
});
