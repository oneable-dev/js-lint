import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noBannedCommentWords } from "./no-banned-comment-words.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("no-banned-comment-words", noBannedCommentWords, {
  valid: [
    // No `words` option and no directive: nothing is banned.
    "// this is a hack\nconst a = 1;",
    { code: "// this is fine\nconst a = 1;", options: [{ words: ["hack"] }] },
    // Whole words only.
    { code: "// hackathon notes\nconst a = 1;", options: [{ words: ["hack"] }] },
    // Code is not a comment.
    { code: "const hack = 1;", options: [{ words: ["hack"] }] },
    // The directive comment itself is not reported.
    "// banned-words: hack\nconst a = 1;",
    // Regex metacharacters in a directive word do not crash the rule or act as a pattern.
    "// banned-words: foo(\n// foo\nconst a = 1;",
    { code: "// axb\nconst a = 1;", options: [{ words: ["a.b"] }] },
  ],
  invalid: [
    {
      code: "// this is a hack\nconst a = 1;",
      options: [{ words: ["hack", "kludge"] }],
      errors: [{ messageId: "banned", data: { word: "hack" } }],
    },
    {
      code: "/* A Kludge */\nconst a = 1;",
      options: [{ words: ["hack", "kludge"] }],
      errors: [{ messageId: "banned", data: { word: "Kludge" } }],
    },
    {
      code: "// banned-words: wip, temp\n// wip: fix later\nconst a = 1;",
      errors: [{ messageId: "banned", data: { word: "wip" } }],
    },
    {
      code: "// banned-words: temp\n// hack and temp\nconst a = 1;",
      options: [{ words: ["hack"] }],
      errors: [{ messageId: "banned", data: { word: "hack" } }],
    },
    {
      code: "// banned-words: c++, @todo\n// uses c++ here\nconst a = 1;",
      errors: [{ messageId: "banned", data: { word: "c++" } }],
    },
    {
      code: "// @todo later\nconst a = 1;",
      options: [{ words: ["@todo"] }],
      errors: [{ messageId: "banned", data: { word: "@todo" } }],
    },
  ],
});
