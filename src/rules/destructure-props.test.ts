import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { destructureProps } from "./destructure-props.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

ruleTester.run("destructure-props", destructureProps, {
  valid: [
    "function Card({ title }: Props) { return <Text>{title}</Text>; }",
    "const Card = ({ title = 'x' }: Props) => <Text>{title}</Text>;",
    "const Card = memo(({ title }: Props) => <Text>{title}</Text>);",
    "const Input = forwardRef(({ value }: Props, ref) => <TextInput ref={ref} value={value} />);",
    // Whole props passed on
    "function Wrapper(props: Props) { return <Inner {...props} />; }",
    "function Wrapper(props: Props) { const { title } = props; return <Inner {...props} label={title} />; }",
    "function Screen(props: Props) { track(props); return <View />; }",
    // Not components
    "function useCard(props: Props) { return props.title; }",
    "function CreateStore(options: Options) { return options.initial; }",
    "function card(props: Props) { return <Text>{props.title}</Text>; }",
    // No props
    "function Empty() { return <View />; }",
    // Nested function's own parameter
    "function List({ items }: Props) { return items.map((item) => <Row key={item.id} label={item.label} />); }",
  ],
  invalid: [
    {
      code: "function Card(props: Props) { return <Text>{props.title}</Text>; }",
      errors: [{ messageId: "noMemberAccess", data: { component: "Card", name: "props" } }],
    },
    {
      code: "const Card = (props: Props) => <Text>{props.title}{props.subtitle}</Text>;",
      errors: [{ messageId: "noMemberAccess" }, { messageId: "noMemberAccess" }],
    },
    {
      code: "function Card(props: Props) { const { title } = props; return <Text>{title}</Text>; }",
      errors: [{ messageId: "destructureInSignature", data: { component: "Card", name: "props" } }],
    },
    {
      code: "function Card(props: Props) { useEffect(() => { props.onChange(); }, [props]); return <View />; }",
      errors: [{ messageId: "noMemberAccess" }],
    },
    {
      code: "const Card = memo(function Card(p: Props) { return <Text>{p.title}</Text>; });",
      errors: [{ messageId: "noMemberAccess", data: { component: "Card", name: "p" } }],
    },
    {
      // Spread elsewhere still allows `props`, but not `props.x`.
      code: "function Wrapper(props: Props) { return <Inner {...props} label={props.title} />; }",
      errors: [{ messageId: "noMemberAccess" }],
    },
    {
      code: "function Layout(props: Props) { return <View>{props.children}</View>; }",
      errors: [{ messageId: "noMemberAccess" }],
    },
  ],
});
