import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noBannedCommentWords } from "./no-banned-comment-words.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

const dir = mkdtempSync(join(tmpdir(), "banned-words-"));
writeFileSync(join(dir, "words.txt"), "wip\n\n  temp  \n");
writeFileSync(join(dir, "mixed.txt"), "wip\nnot a word!\n");
const filename = join(dir, "source.ts");

ruleTester.run("no-banned-comment-words", noBannedCommentWords, {
  valid: [
    // No `words` option and no directive: nothing is banned.
    "// this is a hack\nconst a = 1;",
    { code: "// this is fine\nconst a = 1;", options: [{ words: ["hack"] }] },
    // Whole words only.
    { code: "// hackathon notes\nconst a = 1;", options: [{ words: ["hack"] }] },
    // Code is not a comment.
    { code: "const hack = 1;", options: [{ words: ["hack"] }] },
    // Regex metacharacters in a word are matched literally.
    { code: "// axb\nconst a = 1;", options: [{ words: ["a.b"] }] },
    // The directive comments themselves are not reported.
    "// banned-words: hack\nconst a = 1;",
    { code: "// banned-words-file: words.txt\nconst a = 1;", filename },
    // Declaration files are skipped.
    { code: "// hack\nexport declare const a: number;", filename: join(dir, "types.d.ts"), options: [{ words: ["hack"] }] },
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
      code: "// banned-words: c++\n// uses c++ here\nconst a = 1;",
      errors: [{ messageId: "banned", data: { word: "c++" } }],
    },
    {
      code: "// banned-words-file: words.txt\n// temp fix\nconst a = 1;",
      filename,
      errors: [{ messageId: "banned", data: { word: "temp" } }],
    },
    {
      code: "// banned-words-file: mixed.txt\n// wip\nconst a = 1;",
      filename,
      errors: [
        { messageId: "invalidEntry", data: { line: "2", entry: "not a word!", path: "mixed.txt" } },
        { messageId: "banned", data: { word: "wip" } },
      ],
    },
    {
      code: "// banned-words-file: missing.txt\nconst a = 1;",
      filename,
      errors: [{ messageId: "unreadable", data: { path: "missing.txt" } }],
    },
    {
      code: "// banned-words-file: ../words.txt\nconst a = 1;",
      filename: join(dir, "sub", "source.ts"),
      errors: [{ messageId: "unreadable", data: { path: "../words.txt" } }],
    },
    {
      code: "// banned-words-file: /etc/passwd\nconst a = 1;",
      filename,
      errors: [{ messageId: "unreadable", data: { path: "/etc/passwd" } }],
    },
  ],
});
