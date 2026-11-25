import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noConditionalRenderFalsy } from "./no-conditional-render-falsy.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

ruleTester.run("no-conditional-render-falsy", noConditionalRenderFalsy, {
  valid: [
    "<View>{items.length > 0 && <X />}</View>",
    // The type is unknown, so it is not reported.
    "<View>{count && <X />}</View>",
    "<View>{isOpen && <X />}</View>",
    "<View>{items.length ? <X /> : null}</View>",
    "<View>{!!items.length && <X />}</View>",
    "<View>{items.length || <Empty />}</View>",
    "<View>{items.size && <X />}</View>",
    "<View>{items['length'] && <X />}</View>",
    // Only the left operands are conditions; the last operand is the rendered value.
    "<View>{ready && items.length}</View>",
    // Not rendered: attribute values and code outside JSX.
    "<Foo show={items.length && 1} />",
    "const n = items.length && 1;",
  ],
  invalid: [
    {
      code: "<View>{items.length && <X />}</View>",
      errors: [
        {
          messageId: "noConditionalRenderFalsy",
          data: { text: "items.length" },
          suggestions: [
            {
              messageId: "useComparison",
              data: { text: "items.length" },
              output: "<View>{items.length > 0 && <X />}</View>",
            },
          ],
        },
      ],
    },
    {
      // A literal has nothing to compare, so there is no suggestion.
      code: "<View>{0 && <X />}</View>",
      errors: [{ messageId: "noConditionalRenderFalsy", data: { text: "0" }, suggestions: [] }],
    },
    {
      code: "<View>{a.b.length && <X />}</View>",
      errors: [
        {
          messageId: "noConditionalRenderFalsy",
          data: { text: "a.b.length" },
          suggestions: [
            {
              messageId: "useComparison",
              data: { text: "a.b.length" },
              output: "<View>{a.b.length > 0 && <X />}</View>",
            },
          ],
        },
      ],
    },
    {
      // `items?.length > 0` can be a type error, so there is no suggestion.
      code: "<View>{items?.length && <X />}</View>",
      errors: [{ messageId: "noConditionalRenderFalsy", data: { text: "items?.length" }, suggestions: [] }],
    },
    {
      code: "<View>{ready && items.length && <X />}</View>",
      errors: [
        {
          messageId: "noConditionalRenderFalsy",
          data: { text: "items.length" },
          suggestions: [
            {
              messageId: "useComparison",
              data: { text: "items.length" },
              output: "<View>{ready && items.length > 0 && <X />}</View>",
            },
          ],
        },
      ],
    },
    {
      code: "<View>{items.length && ready && <X />}</View>",
      errors: [
        {
          messageId: "noConditionalRenderFalsy",
          data: { text: "items.length" },
          suggestions: [
            {
              messageId: "useComparison",
              data: { text: "items.length" },
              output: "<View>{items.length > 0 && ready && <X />}</View>",
            },
          ],
        },
      ],
    },
    {
      code: "<View>{cond ? items.length && <X /> : null}</View>",
      errors: [
        {
          messageId: "noConditionalRenderFalsy",
          data: { text: "items.length" },
          suggestions: [
            {
              messageId: "useComparison",
              data: { text: "items.length" },
              output: "<View>{cond ? items.length > 0 && <X /> : null}</View>",
            },
          ],
        },
      ],
    },
    {
      code: "<>{items.length && <X />}</>",
      errors: [
        {
          messageId: "noConditionalRenderFalsy",
          data: { text: "items.length" },
          suggestions: [
            {
              messageId: "useComparison",
              data: { text: "items.length" },
              output: "<>{items.length > 0 && <X />}</>",
            },
          ],
        },
      ],
    },
    {
      code: "<Text>{items.length && 'n'}</Text>",
      errors: [
        {
          messageId: "noConditionalRenderFalsy",
          data: { text: "items.length" },
          suggestions: [
            {
              messageId: "useComparison",
              data: { text: "items.length" },
              output: "<Text>{items.length > 0 && 'n'}</Text>",
            },
          ],
        },
      ],
    },
    {
      code: "<View>{items.length && items.map(render)}</View>",
      errors: [
        {
          messageId: "noConditionalRenderFalsy",
          data: { text: "items.length" },
          suggestions: [
            {
              messageId: "useComparison",
              data: { text: "items.length" },
              output: "<View>{items.length > 0 && items.map(render)}</View>",
            },
          ],
        },
      ],
    },
  ],
});
