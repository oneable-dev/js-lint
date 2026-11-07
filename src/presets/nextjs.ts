import type { OxlintConfig } from "oxlint";
import react from "./react.ts";

export default {
  extends: [react],
  plugins: ["typescript", "unicorn", "oxc", "react", "nextjs"],
  rules: {
    // Unlike the original Next.js rule, oxlint reports every `<a href="/...">`, including API
    // routes and files under `public/` that must not use `<Link>`.
    "nextjs/no-html-link-for-pages": "off",
    "react/forbid-dom-props": [
      "error",
      {
        forbid: [
          {
            propName: "suppressHydrationWarning",
            message:
              "Do not hide hydration mismatches. Render the same output on the server and the client: move browser-only values (current time, random numbers, `window`) into an effect or an event handler.",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Theme libraries such as next-themes require `<html suppressHydrationWarning>` in the root layout.
      files: ["**/app/layout.{js,jsx,ts,tsx}"],
      rules: { "react/forbid-dom-props": "off" },
    },
    {
      // `ImageResponse` renders plain JSX, where `next/image` does not work.
      files: ["**/app/**/{opengraph-image,twitter-image,icon,apple-icon}.{js,jsx,ts,tsx}"],
      rules: { "nextjs/no-img-element": "off" },
    },
  ],
} satisfies OxlintConfig;
