/**
 * no-banned-comment-words
 *
 * What: Report comments that contain a banned word.
 * Why: Placeholder words in a comment mark code nobody wants to own.
 * Source: none
 * Scope: base preset, all files
 * Not covered: Matching is case-insensitive and whole-word only, so a word inside a longer word is
 *   ignored. Only the first banned word in each comment is reported. `// banned-words: a, b` directive
 *   comments add words for their own file and are never reported themselves.
 *
 * @example Bad
 * // with options { words: ["wip"] }
 * // wip: fix later
 *
 * @example Good
 * // with options { words: ["wip"] }
 * // wiper blades are replaced when worn
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

const DIRECTIVE = /^\s*banned-words:(.*)$/u;

function readWords(options: readonly unknown[]): string[] {
  const [first] = options;
  if (typeof first !== "object" || first === null || !("words" in first) || !Array.isArray(first.words)) {
    return [];
  }
  return first.words.filter((word): word is string => typeof word === "string" && word !== "");
}

// `// banned-words: foo, bar` adds `foo` and `bar` to the banned words of the file it appears in.
function directiveWords(comment: ESTree.Comment): string[] | undefined {
  const match = DIRECTIVE.exec(comment.value);
  if (!match) {
    return undefined;
  }
  return (match[1] ?? "")
    .split(",")
    .map((word) => word.trim())
    .filter((word) => word !== "");
}

export const noBannedCommentWords = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Report comments that contain a banned word." },
    messages: {
      banned:
        "Comment contains the banned word `{{word}}`. Fix the code the comment describes, or rewrite the comment to explain why the code is written this way without using `{{word}}`.",
    },
    schema: [
      {
        type: "object",
        properties: { words: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const configured = readWords(context.options);

    return {
      Program() {
        const comments = context.sourceCode.getAllComments();
        const words = [...configured];
        for (const comment of comments) {
          words.push(...(directiveWords(comment) ?? []));
        }
        if (words.length === 0) {
          return;
        }

        const escaped = words.map((word) => word.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`));
        const banned = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${escaped.join("|")})(?![\\p{L}\\p{N}_])`, "iu");
        for (const comment of comments) {
          if (directiveWords(comment)) {
            continue;
          }
          const found = banned.exec(comment.value);
          if (found) {
            context.report({ node: comment, messageId: "banned", data: { word: found[0] } });
          }
        }
      },
    };
  },
});
