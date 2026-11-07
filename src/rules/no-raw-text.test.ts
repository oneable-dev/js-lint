import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noRawText } from "./no-raw-text.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

ruleTester.run("no-raw-text", noRawText, {
  valid: [
    "<View><Text>Hello</Text></View>",
    "<Text>Hello</Text>",
    "<Animated.Text>Hello</Animated.Text>",
    "<Button>Save</Button>",
    "<View>{name}</View>",
    "<View>{cond && <Text>Hi</Text>}</View>",
    `<View>
       <Text>Hi</Text>
     </View>`,
    "<View>{/* comment */}</View>",
  ],
  invalid: [
    { code: "<View>Hello</View>", errors: [{ messageId: "noRawText", data: { name: "View" } }] },
    { code: "<Animated.View>Hello</Animated.View>", errors: [{ messageId: "noRawText", data: { name: "View" } }] },
    { code: "<Pressable>Tap</Pressable>", errors: [{ messageId: "noRawText", data: { name: "Pressable" } }] },
    { code: "<View>{'Hello'}</View>", errors: [{ messageId: "noRawText" }] },
    { code: "<View>{`Hello`}</View>", errors: [{ messageId: "noRawText" }] },
    { code: "<View>{`Hi ${name}`}</View>", errors: [{ messageId: "noRawText" }] },
    { code: "<View><Text>a</Text>b</View>", errors: [{ messageId: "noRawText" }] },
  ],
});
