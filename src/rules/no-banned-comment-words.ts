/**
 * no-banned-comment-words
 *
 * What: Report comments that contain a banned word.
 * Why: Placeholder words in a comment mark code nobody wants to own.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineRule, type ESTree } from "@oxlint/plugins";

const WORDS_DIRECTIVE = /^\s*banned-words:(.*)$/u;
const FILE_DIRECTIVE = /^\s*banned-words-file:(.*)$/u;
const PLAIN_WORD = /^[\p{L}\p{N}_-]+$/u;

function readWords(options: readonly unknown[]): string[] {
  const [first] = options;
  if (typeof first !== "object" || first === null || !("words" in first) || !Array.isArray(first.words)) {
    return [];
  }
  return first.words.filter((word): word is string => typeof word === "string" && word !== "");
}

function escapeRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

// `// banned-words: foo, bar` adds `foo` and `bar` to the banned words of the file it appears in.
function inlineWords(comment: ESTree.Comment): string[] | undefined {
  const match = WORDS_DIRECTIVE.exec(comment.value);
  if (!match) {
    return undefined;
  }
  return (match[1] ?? "")
    .split(",")
    .map((word) => word.trim())
    .filter((word) => word !== "");
}

// `// banned-words-file: words.txt` names a file of banned words, one per line, next to the linted file.
function wordsFilePath(comment: ESTree.Comment): string | undefined {
  const path = FILE_DIRECTIVE.exec(comment.value)?.[1]?.trim();
  return path === "" ? undefined : path;
}

export const noBannedCommentWords = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Report comments that contain a banned word." },
    messages: {
      banned: "Comment contains the banned word `{{word}}`.",
      invalidEntry:
        "Line `{{entry}}` in `{{path}}` is not a plain word. Use letters, digits, `-` and `_` only, one word per line.",
      unreadable: "Cannot read the banned-words file `{{path}}`. Check that the path is correct and the file exists.",
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
        if (context.filename.endsWith(".d.ts")) {
          return;
        }

        const comments = context.sourceCode.getAllComments();
        const words = [...configured];
        const directives = new Set<ESTree.Comment>();

        for (const comment of comments) {
          const inline = inlineWords(comment);
          if (inline) {
            directives.add(comment);
            words.push(...inline);
          }

          const path = wordsFilePath(comment);
          if (path === undefined) {
            continue;
          }
          directives.add(comment);

          let content: string;
          try {
            content = readFileSync(resolve(dirname(context.filename), path), "utf8");
          } catch {
            context.report({ node: comment, messageId: "unreadable", data: { path } });
            continue;
          }
          for (const line of content.split("\n")) {
            const entry = line.trim();
            if (entry === "") {
              continue;
            }
            if (PLAIN_WORD.test(entry)) {
              words.push(entry);
            } else {
              context.report({ node: comment, messageId: "invalidEntry", data: { entry, path } });
            }
          }
        }
        if (words.length === 0) {
          return;
        }

        const banned = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${words.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}_])`, "iu");
        for (const comment of comments) {
          if (directives.has(comment)) {
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
