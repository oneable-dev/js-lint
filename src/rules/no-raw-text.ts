/**
 * no-raw-text
 *
 * What: Disallow raw text directly inside React Native host components such as <View>.
 * Why: React Native crashes at runtime with "Text strings must be rendered within a <Text>
 *   component". Agents coming from web React often write `<View>Hello</View>`.
 * Source: none
 * Scope: all files
 * Not covered: text inside custom components (`<Button>Save</Button>`), because they may wrap
 *   children in <Text> themselves; variables (`<View>{name}</View>`), because checking for a
 *   string needs type information; host components that are re-exported under another name.
 *
 * @example Bad
 * <View>Hello</View>
 *
 * @example Good
 * <View><Text>Hello</Text></View>
 */
import { defineRule, type ESTree } from "@oxlint/plugins";

// React Native host components that crash when given a raw string child.
const HOST_COMPONENTS = new Set([
  "View",
  "ScrollView",
  "SafeAreaView",
  "KeyboardAvoidingView",
  "ImageBackground",
  "Pressable",
  "TouchableOpacity",
  "TouchableHighlight",
  "TouchableWithoutFeedback",
]);

// `View` -> "View", `Animated.View` -> "View"
function lastName(name: ESTree.JSXElementName): string | undefined {
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") return name.property.name;
  return undefined;
}

function isStringLiteral(node: ESTree.Node): boolean {
  return (
    (node.type === "Literal" && typeof node.value === "string") ||
    node.type === "TemplateLiteral"
  );
}

export const noRawText = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow raw text directly inside React Native host components such as <View>." },
    messages: {
      noRawText:
        "Raw text inside <{{name}}> crashes React Native (\"Text strings must be rendered within a <Text> component\"). Wrap it in <Text>.",
    },
    schema: [],
  },
  create(context) {
    function check(node: ESTree.Node, parent: ESTree.Node | null) {
      if (parent?.type !== "JSXElement") return;
      const name = lastName(parent.openingElement.name);
      if (name && HOST_COMPONENTS.has(name)) {
        context.report({ node, messageId: "noRawText", data: { name } });
      }
    }

    return {
      JSXText(node) {
        if (node.value.trim() !== "") check(node, node.parent);
      },
      JSXExpressionContainer(node) {
        if (isStringLiteral(node.expression)) {
          check(node, node.parent);
        }
      },
    };
  },
});
