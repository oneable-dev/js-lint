import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { preferFunctionalUpdate } from "./prefer-functional-update.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

function component(body: string): string {
  return `function Counter() {\n  const [count, setCount] = useState(0);\n  ${body}\n}`;
}

ruleTester.run("prefer-functional-update", preferFunctionalUpdate, {
  valid: [
    component("setCount((count) => count + 1);"),
    component("setCount((previous) => previous + count);"),
    component("setCount(0);"),
    component("setCount(other + 1);"),
    // Sets the state to itself, nothing is computed from it.
    component("setCount(count);"),
    // Read through another variable: not tracked.
    component("const next = count + 1; setCount(next);"),
    // The setter is passed on, not called.
    component("return <Child onChange={setCount} />;"),
    // A different variable with the same name.
    component("items.forEach((count) => setCount(count * 2));"),
    // Not `useState`
    "function A() { const [count, setCount] = useCounter(); setCount(count + 1); }",
    "function A() { const [count, dispatch] = useReducer(reducer, 0); dispatch(count + 1); }",
  ],
  invalid: [
    {
      code: component("setCount(count + 1);"),
      errors: [
        {
          messageId: "preferFunctionalUpdate",
          data: { setter: "setCount", state: "count" },
          suggestions: [
            {
              messageId: "useUpdater",
              data: { setter: "setCount", state: "count" },
              output: component("setCount((count) => count + 1);"),
            },
          ],
        },
      ],
    },
    {
      code: "function A() {\n  const [open, setOpen] = React.useState(false);\n  return <Button onPress={() => setOpen(!open)} />;\n}",
      errors: [
        {
          messageId: "preferFunctionalUpdate",
          suggestions: [
            {
              messageId: "useUpdater",
              output: "function A() {\n  const [open, setOpen] = React.useState(false);\n  return <Button onPress={() => setOpen((open) => !open)} />;\n}",
            },
          ],
        },
      ],
    },
    {
      code: "function A() {\n  const [todos, setTodos] = useState<Todo[]>([]);\n  setTodos([...todos, todo]);\n  setTodos(todos.filter((t) => t.id !== id));\n}",
      errors: [
        {
          messageId: "preferFunctionalUpdate",
          suggestions: [
            {
              messageId: "useUpdater",
              output: "function A() {\n  const [todos, setTodos] = useState<Todo[]>([]);\n  setTodos((todos) => [...todos, todo]);\n  setTodos(todos.filter((t) => t.id !== id));\n}",
            },
          ],
        },
        {
          messageId: "preferFunctionalUpdate",
          suggestions: [
            {
              messageId: "useUpdater",
              output: "function A() {\n  const [todos, setTodos] = useState<Todo[]>([]);\n  setTodos([...todos, todo]);\n  setTodos((todos) => todos.filter((t) => t.id !== id));\n}",
            },
          ],
        },
      ],
    },
    {
      // Object literals are wrapped in parentheses so the arrow body is not a block.
      code: "function A() {\n  const [form, setForm] = useState(initial);\n  setForm({ ...form, name });\n}",
      errors: [
        {
          messageId: "preferFunctionalUpdate",
          suggestions: [
            {
              messageId: "useUpdater",
              output: "function A() {\n  const [form, setForm] = useState(initial);\n  setForm((form) => ({ ...form, name }));\n}",
            },
          ],
        },
      ],
    },
    {
      // Inside an async callback
      code: "function A() {\n  const [count, setCount] = useState(0);\n  useEffect(() => { load().then(() => setCount(count + 1)); }, []);\n}",
      errors: [{ messageId: "preferFunctionalUpdate" }],
    },
  ],
});
