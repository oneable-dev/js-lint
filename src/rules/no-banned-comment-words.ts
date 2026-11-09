/**
 * no-banned-comment-words
 *
 * What: Report comments that contain a banned word.
 * Why: Placeholder words in a comment mark code nobody wants to own.
 * Source: none
 * Scope: base preset, all files except `.d.ts` files (turned off by an override). Words come from the `words` option,
 *   `// banned-words: a, b` directives, and `// banned-words-file: words.txt` directives.
 * Not covered: Only comments are checked, never code or strings. Matching is by whole word, case-insensitive.
 *   A words file must be a regular file under 64 KiB inside the linted file's directory or a subdirectory of it,
 *   with no dot-prefixed path segments; each line must be a plain word. Directive comments are never reported.
 *
 * @example Bad
 * // options: { words: ["placeholder"] }
 * // this is a placeholder
 * const a = 1;
 *
 * @example Good
 * // options: { words: ["placeholder"] }
 * // retries once because the API drops the first request
 * const a = 1;
 */
import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { defineRule, type ESTree } from "@oxlint/plugins";

const WORDS_DIRECTIVE = /^\s*banned-words:(.*)$/u;
const FILE_DIRECTIVE = /^\s*banned-words-file:(.*)$/u;
const MAX_WORDS_FILE_BYTES = 64 * 1024;
const PLAIN_WORD =/^[\p{L}\p{N}_-]+$/u;

function readWords(options: readonly unknown[]): string[] {
  const [first] = options;
  if (typeof first !== "object" || first === null || !("words" in first) || !Array.isArray(first.words)) {
    return [];
  }
  return first.words.filter((word): word is string => typeof word === "string" && word !== "");
}

// Make a words-file line safe to quote in a message: no control characters or backticks, bounded length.
function sanitizeEntry(entry: string): string {
  const cleaned = entry.replaceAll(/[\p{Cc}\p{Cf}`]/gu, "?");
  return cleaned.length > 40 ? `${cleaned.slice(0, 40)}...` : cleaned;
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
      banned:
        "Comment contains the banned word `{{word}}`. Describe the actual limitation or the follow-up work instead, or fix the code so the comment is not needed. Do not reword the word or disable this rule.",
      invalidEntry:
        "Line {{line}} in `{{path}}` is not a plain word (`{{entry}}`). Use letters, digits, `-` and `_` only, one word per line.",
      unreadable:
        "Cannot read the banned-words file `{{path}}`. It must be a regular file (under 64 KiB) inside the directory of the linted file or a subdirectory of it.",
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

          const baseDir = dirname(context.filename);
          const target = resolve(baseDir, path);
          let content: string;
          try {
            // Resolve symlinks on both sides so a link cannot point outside the base directory.
            const realBase = realpathSync(baseDir);
            const realTarget = realpathSync(target);
            const relation = relative(realBase, realTarget);
            if (relation === "" || relation.startsWith("..") || isAbsolute(relation) || relation.split(/[\\/]/u).some((segment) => segment.startsWith("."))) {
              throw new Error("outside");
            }
            const stats = statSync(realTarget);
            if (!stats.isFile() || stats.size > MAX_WORDS_FILE_BYTES) {
              throw new Error("unsupported");
            }
            content = readFileSync(realTarget, "utf8");
          } catch {
            context.report({ node: comment, messageId: "unreadable", data: { path } });
            continue;
          }
          const lines = content.split("\n");
          for (const [index, line] of lines.entries()) {
            const entry = line.trim();
            if (entry === "") {
              continue;
            }
            if (PLAIN_WORD.test(entry)) {
              words.push(entry);
            } else {
              context.report({
                node: comment,
                messageId: "invalidEntry",
                data: {
                  line: String(index + 1),
                  path,
                  entry: sanitizeEntry(entry),
                },
              });
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
