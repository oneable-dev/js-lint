import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noNestedVirtualizedList } from "./no-nested-virtualized-list.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

const RN = "import { FlatList, ScrollView, SectionList, VirtualizedList, View } from 'react-native';";

function withRN(body: string): string {
  return `${RN}\n${body}`;
}

function error(list: string, scrollView: string, direction: "horizontal" | "vertical") {
  return { messageId: "noNestedVirtualizedList" as const, data: { list, scrollView, direction } };
}

ruleTester.run("no-nested-virtualized-list", noNestedVirtualizedList, {
  valid: [
    // Different directions
    withRN("<ScrollView horizontal><FlatList data={d} renderItem={r} /></ScrollView>"),
    withRN("<ScrollView><FlatList horizontal data={d} renderItem={r} /></ScrollView>"),
    withRN("<ScrollView horizontal={false}><FlatList horizontal={true} data={d} /></ScrollView>"),
    // No known import
    "<ScrollView><FlatList data={d} /></ScrollView>",
    "import { FlatList, ScrollView } from './components';\n<ScrollView><FlatList data={d} /></ScrollView>",
    "import FlatList from './FlatList';\nimport { ScrollView } from 'react-native';\n<ScrollView><FlatList data={d} /></ScrollView>",
    "import * as RN from 'react-native';\n<RN.ScrollView><RN.FlatList data={d} /></RN.ScrollView>",
    "import type { FlatList, ScrollView } from 'react-native';\n<ScrollView><FlatList data={d} /></ScrollView>",
    // Unknown direction
    withRN("<ScrollView horizontal={isRow}><FlatList horizontal={isRow} data={d} /></ScrollView>"),
    withRN("<ScrollView {...props}><FlatList data={d} /></ScrollView>"),
    withRN("<ScrollView><FlatList {...props} /></ScrollView>"),
    withRN("<ScrollView horizontal {...props}><FlatList horizontal data={d} /></ScrollView>"),
    // Function and attribute boundaries
    withRN("<ScrollView>{items.map((item) => <FlatList key={item.id} data={item.rows} />)}</ScrollView>"),
    withRN("<ScrollView><Card content={<FlatList data={d} />} /></ScrollView>"),
    withRN("<ScrollView refreshControl={<FlatList data={d} />} />"),
    withRN("<ScrollView>{render(function () { return <FlatList data={d} />; })}</ScrollView>"),
    // Not inside the ScrollView
    withRN("<View><ScrollView /><FlatList data={d} /></View>"),
    withRN("<View><FlatList data={d} /></View>"),
    // A list inside a list is supported by React Native
    withRN("<FlatList data={d} ListHeaderComponent={<FlatList data={e} />} />"),
    // Only the nearest ScrollView counts
    withRN("<ScrollView><ScrollView horizontal><FlatList data={d} /></ScrollView></ScrollView>"),
    withRN("<ScrollView horizontal><ScrollView><View><FlatList horizontal data={d} /></View></ScrollView></ScrollView>"),
    // The ScrollView is not an import from a known source
    "import { FlatList } from 'react-native';\nimport { ScrollView } from 'custom-scroll';\n<ScrollView><FlatList data={d} /></ScrollView>",
    // Animated that is not from react-native or reanimated
    "import { FlatList } from 'react-native';\nimport Animated from 'other-animated';\n<Animated.ScrollView><FlatList data={d} /></Animated.ScrollView>",
    // A local definition shadows the import
    withRN("function Screen({ FlatList }) { return <ScrollView><FlatList data={d} /></ScrollView>; }"),
    withRN("function Screen() { const ScrollView = Custom; return <ScrollView><FlatList data={d} /></ScrollView>; }"),
    "import { FlatList } from 'react-native';\nimport Animated from 'react-native-reanimated';\nfunction Screen() { const Animated = Custom; return <Animated.ScrollView><FlatList data={d} /></Animated.ScrollView>; }",
  ],
  invalid: [
    {
      code: withRN("<ScrollView><FlatList data={d} renderItem={r} /></ScrollView>"),
      errors: [error("FlatList", "ScrollView", "vertical")],
    },
    {
      code: withRN("<ScrollView><View><View><FlatList data={d} /></View></View></ScrollView>"),
      errors: [error("FlatList", "ScrollView", "vertical")],
    },
    {
      code: withRN("<ScrollView><SectionList sections={s} /></ScrollView>"),
      errors: [error("SectionList", "ScrollView", "vertical")],
    },
    {
      code: withRN("<ScrollView><VirtualizedList data={d} /></ScrollView>"),
      errors: [error("VirtualizedList", "ScrollView", "vertical")],
    },
    {
      code: "import { ScrollView } from 'react-native';\nimport { FlashList } from '@shopify/flash-list';\n<ScrollView><FlashList data={d} /></ScrollView>",
      errors: [error("FlashList", "ScrollView", "vertical")],
    },
    {
      code: withRN("<ScrollView horizontal><FlatList horizontal data={d} /></ScrollView>"),
      errors: [error("FlatList", "ScrollView", "horizontal")],
    },
    {
      code: withRN("<ScrollView horizontal={true}><FlatList horizontal={true} data={d} /></ScrollView>"),
      errors: [error("FlatList", "ScrollView", "horizontal")],
    },
    {
      code: withRN("<ScrollView horizontal={false}><FlatList horizontal={false} data={d} /></ScrollView>"),
      errors: [error("FlatList", "ScrollView", "vertical")],
    },
    {
      code: "import { FlatList as List, ScrollView as Scroller } from 'react-native';\n<Scroller><List data={d} /></Scroller>",
      errors: [error("List", "Scroller", "vertical")],
    },
    {
      code: "import { FlatList, ScrollView } from 'react-native-gesture-handler';\n<ScrollView><FlatList data={d} /></ScrollView>",
      errors: [error("FlatList", "ScrollView", "vertical")],
    },
    {
      code: "import { Animated, ScrollView } from 'react-native';\n<ScrollView><Animated.FlatList data={d} /></ScrollView>",
      errors: [error("Animated.FlatList", "ScrollView", "vertical")],
    },
    {
      code: "import { FlatList } from 'react-native';\nimport Animated from 'react-native-reanimated';\n<Animated.ScrollView><FlatList data={d} /></Animated.ScrollView>",
      errors: [error("FlatList", "Animated.ScrollView", "vertical")],
    },
    {
      code: withRN("<ScrollView {...props} horizontal><FlatList {...props} horizontal data={d} /></ScrollView>"),
      errors: [error("FlatList", "ScrollView", "horizontal")],
    },
    {
      code: "const Screen = () => (<ScrollView><FlatList data={d} /></ScrollView>);\nimport { FlatList, ScrollView } from 'react-native';",
      errors: [error("FlatList", "ScrollView", "vertical")],
    },
    {
      code: withRN("<ScrollView><FlatList data={a} /><FlatList data={b} /></ScrollView>"),
      errors: [error("FlatList", "ScrollView", "vertical"), error("FlatList", "ScrollView", "vertical")],
    },
    {
      code: withRN("<ScrollView><ScrollView horizontal><View /></ScrollView><FlatList data={d} /></ScrollView>"),
      errors: [error("FlatList", "ScrollView", "vertical")],
    },
    {
      code: withRN(
        "function Other({ FlatList }) { return <ScrollView><FlatList data={d} /></ScrollView>; }\nfunction Screen() { return <ScrollView><FlatList data={d} /></ScrollView>; }",
      ),
      errors: [error("FlatList", "ScrollView", "vertical")],
    },
    {
      code: "import { FlatList } from 'react-native';\nimport Animated from 'react-native-reanimated';\nfunction Other() { const Animated = Custom; return <Animated.ScrollView />; }\nfunction Screen() { return <Animated.ScrollView><FlatList data={d} /></Animated.ScrollView>; }",
      errors: [error("FlatList", "Animated.ScrollView", "vertical")],
    },
  ],
});
