/**
 * no-nested-virtualized-list
 *
 * What: Disallow a virtualized list (FlatList, SectionList, ...) inside a ScrollView that scrolls in the same direction.
 * Why: A ScrollView gives its children unbounded space, so the nested list renders every item at once and
 *   virtualization is disabled (long lists become slow and use a lot of memory). Agents wrap a list in a
 *   ScrollView to put a header or footer next to it.
 * Source: write-good-react-native (references/list-performance.md, 목록 선택과 셀 수명)
 * Scope: react-native preset, all files
 * Not covered: components imported from other modules, because they may not be lists or ScrollViews (this
 *   avoids false positives on user-defined `FlatList` components); namespace imports (`import * as RN`),
 *   because the member name is not tied to a named import; lists that are separated from
 *   the ScrollView by a function (`.map()` callback, render prop) or a JSX attribute (`header={<FlatList />}`),
 *   because the element may be rendered somewhere else; third-party scroll components; dynamic `horizontal`
 *   values and JSX spread props that may set `horizontal`, because the direction is unknown. Lists inside
 *   lists (e.g. `ListHeaderComponent`) are supported by React Native and are not reported. A JSX name counts only
 *   when it resolves to the import itself: a local variable, parameter, or destructured prop with the same name
 *   shadows the import and is ignored.
 *
 * @example Bad
 * <ScrollView>
 *   <Header />
 *   <FlatList data={items} renderItem={renderItem} />
 * </ScrollView>
 *
 * @example Good
 * <FlatList data={items} renderItem={renderItem} ListHeaderComponent={Header} />
 */
import { defineRule, type ESTree, type Scope, type SourceCode } from "@oxlint/plugins";

type Role = "list" | "scroll";
type Direction = "horizontal" | "vertical";

interface Bindings {
  // Local name of an imported list or ScrollView.
  components: Map<string, Role>;
  // Local name of `Animated` (`Animated.FlatList`, `Animated.ScrollView`).
  animated: Set<string>;
  sourceCode: SourceCode;
}

interface Violation {
  list: string;
  scrollView: string;
  direction: Direction;
}

const COMPONENTS_BY_SOURCE = new Map<string, Map<string, Role>>([
  [
    "react-native",
    new Map<string, Role>([
      ["FlatList", "list"],
      ["SectionList", "list"],
      ["VirtualizedList", "list"],
      ["ScrollView", "scroll"],
    ]),
  ],
  [
    "react-native-gesture-handler",
    new Map<string, Role>([
      ["FlatList", "list"],
      ["ScrollView", "scroll"],
    ]),
  ],
  ["@shopify/flash-list", new Map<string, Role>([["FlashList", "list"]])],
]);

const ANIMATED_MEMBERS = new Map<string, Role>([
  ["FlatList", "list"],
  ["SectionList", "list"],
  ["ScrollView", "scroll"],
]);

// The ancestor search stops here: the element may be rendered somewhere other than inside the ScrollView.
const BOUNDARY_TYPES = new Set<string>([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "JSXAttribute",
]);

function importedName(specifier: ESTree.ImportSpecifier): string {
  const { imported } = specifier;
  return imported.type === "Literal" ? String(imported.value) : imported.name;
}

function collectNamedImport(specifier: ESTree.ImportSpecifier, source: string, bindings: Bindings) {
  const name = importedName(specifier);
  const role = COMPONENTS_BY_SOURCE.get(source)?.get(name);
  if (role !== undefined) {
    bindings.components.set(specifier.local.name, role);
  }
  if (source === "react-native" && name === "Animated") {
    bindings.animated.add(specifier.local.name);
  }
}

function collectImport(node: ESTree.ImportDeclaration, bindings: Bindings) {
  if (node.importKind === "type") {
    return;
  }
  const source = node.source.value;
  for (const specifier of node.specifiers) {
    if (specifier.type === "ImportSpecifier" && specifier.importKind !== "type") {
      collectNamedImport(specifier, source, bindings);
    } else if (specifier.type === "ImportDefaultSpecifier" && source === "react-native-reanimated") {
      bindings.animated.add(specifier.local.name);
    }
  }
}

// True when `name`, as seen from `node`, resolves to an import binding and not to a shadowing local definition.
function resolvesToImport(name: string, node: ESTree.Node, bindings: Bindings): boolean {
  let scope: Scope | null = bindings.sourceCode.getScope(node);
  while (scope !== null) {
    const variable = scope.set.get(name);
    if (variable !== undefined) {
      return variable.defs.some(({ type }) => type === "ImportBinding");
    }
    scope = scope.upper;
  }
  return false;
}

function roleOf(element: ESTree.JSXElement, bindings: Bindings): Role | undefined {
  const name = element.openingElement.name;
  if (name.type === "JSXIdentifier") {
    const role = bindings.components.get(name.name);
    return role !== undefined && resolvesToImport(name.name, element, bindings) ? role : undefined;
  }
  if (name.type !== "JSXMemberExpression" || name.object.type !== "JSXIdentifier") {
    return undefined;
  }
  const { name: objectName } = name.object;
  if (!bindings.animated.has(objectName) || !resolvesToImport(objectName, element, bindings)) {
    return undefined;
  }
  return ANIMATED_MEMBERS.get(name.property.name);
}

// `FlatList` -> "FlatList", `Animated.FlatList` -> "Animated.FlatList"
function nameText(name: ESTree.JSXElementName): string {
  if (name.type === "JSXIdentifier") {
    return name.name;
  }
  if (name.type === "JSXMemberExpression") {
    return `${nameText(name.object)}.${name.property.name}`;
  }
  return "";
}

function isHorizontalAttribute(item: ESTree.JSXAttributeItem): item is ESTree.JSXAttribute {
  return item.type === "JSXAttribute" && item.name.type === "JSXIdentifier" && item.name.name === "horizontal";
}

// `horizontal` and `horizontal={true}` are horizontal, `horizontal={false}` is vertical, anything else is unknown.
function valueDirection(value: ESTree.JSXAttributeValue | null): Direction | undefined {
  if (value === null) {
    return "horizontal";
  }
  if (value.type !== "JSXExpressionContainer") {
    return undefined;
  }
  const { expression } = value;
  if (expression.type !== "Literal" || typeof expression.value !== "boolean") {
    return undefined;
  }
  return expression.value ? "horizontal" : "vertical";
}

function directionOf(opening: ESTree.JSXOpeningElement): Direction | undefined {
  let attribute: ESTree.JSXAttribute | undefined;
  let spreadAfter = false;
  for (const item of opening.attributes) {
    if (isHorizontalAttribute(item)) {
      attribute = item;
      spreadAfter = false;
    } else if (item.type === "JSXSpreadAttribute") {
      // A spread after the last `horizontal` (or with no `horizontal`) may override or set it.
      spreadAfter = true;
    }
  }
  if (spreadAfter) {
    return undefined;
  }
  return attribute === undefined ? "vertical" : valueDirection(attribute.value);
}

function nearestScrollView(element: ESTree.JSXElement, bindings: Bindings): ESTree.JSXElement | undefined {
  let current: ESTree.Node | null = element.parent;
  while (current !== null && !BOUNDARY_TYPES.has(current.type)) {
    if (current.type === "JSXElement" && roleOf(current, bindings) === "scroll") {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

function findViolation(element: ESTree.JSXElement, bindings: Bindings): Violation | undefined {
  const { openingElement } = element;
  if (roleOf(element, bindings) !== "list") {
    return undefined;
  }
  const scrollView = nearestScrollView(element, bindings);
  if (scrollView === undefined) {
    return undefined;
  }
  const direction = directionOf(openingElement);
  if (direction === undefined || direction !== directionOf(scrollView.openingElement)) {
    return undefined;
  }
  return {
    list: nameText(openingElement.name),
    scrollView: nameText(scrollView.openingElement.name),
    direction,
  };
}

export const noNestedVirtualizedList = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a virtualized list (FlatList, SectionList, ...) inside a ScrollView that scrolls in the same direction.",
    },
    messages: {
      noNestedVirtualizedList:
        "<{{list}}> is inside a {{direction}} <{{scrollView}}> that scrolls the same way, so it renders every item and virtualization is disabled. Make the list the only scroller: move the other ScrollView content into ListHeaderComponent/ListFooterComponent (or sections), or render a small fixed set of items with .map() instead of a list.",
    },
    schema: [],
  },
  create(context) {
    const bindings: Bindings = { components: new Map(), animated: new Set(), sourceCode: context.sourceCode };
    const elements: ESTree.JSXElement[] = [];

    return {
      ImportDeclaration(node) {
        collectImport(node, bindings);
      },
      JSXElement(node) {
        elements.push(node);
      },
      // Imports may come after their use, so decide only after the whole file is visited.
      "Program:exit"() {
        for (const element of elements) {
          const violation = findViolation(element, bindings);
          if (violation !== undefined) {
            context.report({ node: element.openingElement, messageId: "noNestedVirtualizedList", data: { ...violation } });
          }
        }
      },
    };
  },
});
