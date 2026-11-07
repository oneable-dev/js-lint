// Expected results come from running unicorn/prefer-switch (eslint-plugin-unicorn v79.0.0) on the same code.
import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { preferSwitch } from "./prefer-switch.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("prefer-switch", preferSwitch, {
  valid: [
    // two-cases
    "if (x === 1) {\n  a();\n} else if (x === 2) {\n  b();\n}\n",
    // or-group-two-cases
    "if (x === 1 || x === 2) {\n  a();\n} else if (x === 3) {\n  b();\n}\n",
    // call-discriminant
    "if (getX() === 1) {\n  a();\n} else if (getX() === 2) {\n  b();\n} else if (getX() === 3) {\n  c();\n}\n",
    // loose-equality
    "if (x == 1) {\n  a();\n} else if (x == 2) {\n  b();\n} else if (x == 3) {\n  c();\n}\n",
    // typeof
    "if (typeof v === \"string\") {\n  a();\n} else if (typeof v === \"number\") {\n  b();\n} else if (typeof v === \"boolean\") {\n  c();\n}\n",
    // and-condition
    "if (x === 1 && y) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
    // four-branches-break-third
    "if (x === 1) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (y === 3) {\n  c();\n} else if (y === 4) {\n  d();\n}\n",
  ],
  invalid: [
    {
      // basic-else
      code: "function f(x) {\n  if (x === 1) {\n    a();\n  } else if (x === 2) {\n    b();\n  } else if (x === 3) {\n    c();\n  } else {\n    d();\n  }\n}\n",
      output: "function f(x) {\n  switch (x) {\n  case 1: {\n    a();\n  \n  break;\n  }\n  case 2: {\n    b();\n  \n  break;\n  }\n  case 3: {\n    c();\n  \n  break;\n  }\n  default: {\n    d();\n  }\n  }\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // basic-no-else
      code: "if (x === 1) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
      output: "switch (x) {\ncase 1: {\n  a();\n\nbreak;\n}\ncase 2: {\n  b();\n\nbreak;\n}\ncase 3: {\n  c();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // or-group-three
      code: "if (x === 1 || x === 2) {\n  a();\n} else if (x === 3) {\n  b();\n} else if (x === 4) {\n  c();\n}\n",
      output: "switch (x) {\ncase 1: \ncase 2: {\n  a();\n\nbreak;\n}\ncase 3: {\n  b();\n\nbreak;\n}\ncase 4: {\n  c();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // enum
      code: "if (role === Role.Admin) {\n  a();\n} else if (role === Role.Member) {\n  b();\n} else if (role === Role.Guest) {\n  c();\n}\n",
      output: "switch (role) {\ncase Role.Admin: {\n  a();\n\nbreak;\n}\ncase Role.Member: {\n  b();\n\nbreak;\n}\ncase Role.Guest: {\n  c();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // variables
      code: "if (a === b) {\n  x();\n} else if (a === c) {\n  y();\n} else if (a === d) {\n  z();\n}\n",
      output: "switch (a) {\ncase b: {\n  x();\n\nbreak;\n}\ncase c: {\n  y();\n\nbreak;\n}\ncase d: {\n  z();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // reversed
      code: "if (1 === x) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (3 === x) {\n  c();\n}\n",
      output: "switch (x) {\ncase 1: {\n  a();\n\nbreak;\n}\ncase 2: {\n  b();\n\nbreak;\n}\ncase 3: {\n  c();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // member-discriminant
      code: "if (foo.bar === 1) {\n  a();\n} else if (foo.bar === 2) {\n  b();\n} else if (foo[\"bar\"] === 3) {\n  c();\n}\n",
      output: null,
      errors: [{ messageId: "preferSwitch", suggestions: [{ messageId: "preferSwitch", output: "switch (foo.bar) {\ncase 1: {\n  a();\n\nbreak;\n}\ncase 2: {\n  b();\n\nbreak;\n}\ncase 3: {\n  c();\n\nbreak;\n}\n// No default\n}\n" }] }],
    },
    {
      // call-case-value
      code: "if (x === f()) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
      output: null,
      errors: [{ messageId: "preferSwitch", suggestions: [{ messageId: "preferSwitch", output: "switch (x) {\ncase f(): {\n  a();\n\nbreak;\n}\ncase 2: {\n  b();\n\nbreak;\n}\ncase 3: {\n  c();\n\nbreak;\n}\n// No default\n}\n" }] }],
    },
    {
      // break-outer-loop
      code: "for (const x of xs) {\n  if (x === 1) {\n    break;\n  } else if (x === 2) {\n    a();\n  } else if (x === 3) {\n    b();\n  }\n}\n",
      output: null,
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // break-inner-loop
      code: "if (x === 1) {\n  for (;;) {\n    break;\n  }\n} else if (x === 2) {\n  a();\n} else if (x === 3) {\n  b();\n}\n",
      output: "switch (x) {\ncase 1: {\n  for (;;) {\n    break;\n  }\n\nbreak;\n}\ncase 2: {\n  a();\n\nbreak;\n}\ncase 3: {\n  b();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // comment-in-head
      code: "if (x === 1 /* one */) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
      output: null,
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // comment-before-else
      code: "if (x === 1) {\n  a();\n} // one\nelse if (x === 2) {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
      output: null,
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // comment-in-body
      code: "if (x === 1) {\n  // one\n  a();\n} else if (x === 2) {\n  b(); // two\n} else if (x === 3) {\n  c();\n}\n",
      output: "switch (x) {\ncase 1: {\n  // one\n  a();\n\nbreak;\n}\ncase 2: {\n  b(); // two\n\nbreak;\n}\ncase 3: {\n  c();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // duplicate-labels
      code: "if (x === '1') {\n  a();\n} else if (x === \"1\") {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
      output: null,
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // duplicate-const
      code: "const ONE = 1;\nif (x === ONE) {\n  a();\n} else if (x === 1) {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
      output: null,
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // non-block
      code: "if (x === 1) a();\nelse if (x === 2) b();\nelse if (x === 3) c();\nelse d();\n",
      output: "switch (x) {\ncase 1: {\na();\nbreak;\n}\ncase 2: {\nb();\nbreak;\n}\ncase 3: {\nc();\nbreak;\n}\ndefault: d();\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // returns
      code: "function f(x) {\n  if (x === 1) {\n    return 1;\n  } else if (x === 2) {\n    throw new Error();\n  } else if (x === 3) {\n    if (y) {\n      return 3;\n    } else {\n      return 4;\n    }\n  }\n  return 0;\n}\n",
      output: "function f(x) {\n  switch (x) {\n  case 1: {\n    return 1;\n  }\n  case 2: {\n    throw new Error();\n  }\n  case 3: {\n    if (y) {\n      return 3;\n    } else {\n      return 4;\n    }\n  }\n  // No default\n  }\n  return 0;\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // nested-if-without-else
      code: "function f(x) {\n  if (x === 1) {\n    if (y) {\n      return 1;\n    }\n  } else if (x === 2) {\n    return 2;\n  } else if (x === 3) {\n    return 3;\n  }\n}\n",
      output: "function f(x) {\n  switch (x) {\n  case 1: {\n    if (y) {\n      return 1;\n    }\n  \n  break;\n  }\n  case 2: {\n    return 2;\n  }\n  case 3: {\n    return 3;\n  }\n  // No default\n  }\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // mid-chain-break
      code: "if (x === 1) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (x === 3) {\n  c();\n} else if (isReady) {\n  d();\n}\n",
      output: "switch (x) {\ncase 1: {\n  a();\n\nbreak;\n}\ncase 2: {\n  b();\n\nbreak;\n}\ncase 3: {\n  c();\n\nbreak;\n}\ndefault: if (isReady) {\n  d();\n}\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // tail-chain
      code: "if (isReady) {\n  d();\n} else if (x === 1) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
      output: "if (isReady) {\n  d();\n} else switch (x) {\n case 1: {\n  a();\n\n break;\n }\n case 2: {\n  b();\n\n break;\n }\n case 3: {\n  c();\n\n break;\n }\n // No default\n }\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // null-undefined-template
      code: "if (v === null) {\n  a();\n} else if (v === undefined) {\n  b();\n} else if (v === `x`) {\n  c();\n}\n",
      output: "switch (v) {\ncase null: {\n  a();\n\nbreak;\n}\ncase undefined: {\n  b();\n\nbreak;\n}\ncase `x`: {\n  c();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // ts-wrappers
      code: "if ((x as Foo) === 1) {\n  a();\n} else if (x! === 2) {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
      output: "switch (x as Foo) {\ncase 1: {\n  a();\n\nbreak;\n}\ncase 2: {\n  b();\n\nbreak;\n}\ncase 3: {\n  c();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // optional-chain
      code: "if (a?.b === 1) {\n  x();\n} else if (a?.b === 2) {\n  y();\n} else if (a?.b === 3) {\n  z();\n}\n",
      output: null,
      errors: [{ messageId: "preferSwitch", suggestions: [{ messageId: "preferSwitch", output: "switch (a?.b) {\ncase 1: {\n  x();\n\nbreak;\n}\ncase 2: {\n  y();\n\nbreak;\n}\ncase 3: {\n  z();\n\nbreak;\n}\n// No default\n}\n" }] }],
    },
    {
      // nested-chain
      code: "if (x === 1) {\n  if (y === 1) {\n    a();\n  } else if (y === 2) {\n    b();\n  } else if (y === 3) {\n    c();\n  }\n} else if (x === 2) {\n  d();\n} else if (x === 3) {\n  e();\n}\n",
      output: "switch (x) {\ncase 1: {\n  if (y === 1) {\n    a();\n  } else if (y === 2) {\n    b();\n  } else if (y === 3) {\n    c();\n  }\n\nbreak;\n}\ncase 2: {\n  d();\n\nbreak;\n}\ncase 3: {\n  e();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }, { messageId: "preferSwitch" }],
    },
    {
      // negative-numbers
      code: "if (x === -1) {\n  a();\n} else if (x === -2) {\n  b();\n} else if (x === -3) {\n  c();\n}\n",
      output: "switch (x) {\ncase -1: {\n  a();\n\nbreak;\n}\ncase -2: {\n  b();\n\nbreak;\n}\ncase -3: {\n  c();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // this-member
      code: "class K {\n  m() {\n    if (this.mode === \"a\") {\n      a();\n    } else if (this.mode === \"b\") {\n      b();\n    } else if (this.mode === \"c\") {\n      c();\n    }\n  }\n}\n",
      output: null,
      errors: [{ messageId: "preferSwitch", suggestions: [{ messageId: "preferSwitch", output: "class K {\n  m() {\n    switch (this.mode) {\n    case \"a\": {\n      a();\n    \n    break;\n    }\n    case \"b\": {\n      b();\n    \n    break;\n    }\n    case \"c\": {\n      c();\n    \n    break;\n    }\n    // No default\n    }\n  }\n}\n" }] }],
    },
    {
      // assignment-in-test
      code: "if (x === (y = 1)) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
      output: null,
      errors: [{ messageId: "preferSwitch", suggestions: [{ messageId: "preferSwitch", output: "switch (x) {\ncase y = 1: {\n  a();\n\nbreak;\n}\ncase 2: {\n  b();\n\nbreak;\n}\ncase 3: {\n  c();\n\nbreak;\n}\n// No default\n}\n" }] }],
    },
    {
      // empty-blocks
      code: "if (x === 1) {\n} else if (x === 2) {\n} else if (x === 3) {\n}\n",
      output: "switch (x) {\ncase 1: {\n\nbreak;\n}\ncase 2: {\n\nbreak;\n}\ncase 3: {\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // two-chains
      code: "if (x === 1) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (x === 3) {\n  c();\n}\nif (y === \"a\") {\n  a();\n} else if (y === \"b\") {\n  b();\n} else if (y === \"c\") {\n  c();\n}\n",
      output: "switch (x) {\ncase 1: {\n  a();\n\nbreak;\n}\ncase 2: {\n  b();\n\nbreak;\n}\ncase 3: {\n  c();\n\nbreak;\n}\n// No default\n}\nswitch (y) {\ncase \"a\": {\n  a();\n\nbreak;\n}\ncase \"b\": {\n  b();\n\nbreak;\n}\ncase \"c\": {\n  c();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }, { messageId: "preferSwitch" }],
    },
    {
      // opt-minimum-2
      code: "if (x === 1) {\n  a();\n} else if (x === 2) {\n  b();\n}\n",
      options: [{"minimumCases":2}],
      output: "switch (x) {\ncase 1: {\n  a();\n\nbreak;\n}\ncase 2: {\n  b();\n\nbreak;\n}\n// No default\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // opt-do-nothing
      code: "if (x === 1) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
      options: [{"emptyDefaultCase":"do-nothing-comment"}],
      output: "switch (x) {\ncase 1: {\n  a();\n\nbreak;\n}\ncase 2: {\n  b();\n\nbreak;\n}\ncase 3: {\n  c();\n\nbreak;\n}\ndefault:\n// Do nothing\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
    {
      // opt-no-default-case
      code: "if (x === 1) {\n  a();\n} else if (x === 2) {\n  b();\n} else if (x === 3) {\n  c();\n}\n",
      options: [{"emptyDefaultCase":"no-default-case"}],
      output: "switch (x) {\ncase 1: {\n  a();\n\nbreak;\n}\ncase 2: {\n  b();\n\nbreak;\n}\ncase 3: {\n  c();\n\nbreak;\n}\n}\n",
      errors: [{ messageId: "preferSwitch" }],
    },
  ],
});
