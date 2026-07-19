import type { Recipe } from "../types.js";

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
`;

const LAYOUT_TSX = `import type { ReactNode } from "react";

export const metadata = { title: "App" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;

const LAYOUT_JSX = `export const metadata = { title: "App" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;

const PAGE = `export default function Home() {
  return <h1>Hello StackPack</h1>;
}
`;

export const nextRecipe: Recipe = {
  id: "next",
  name: "Next.js",
  category: "framework",
  dependencies: [{ packages: ["next", "react", "react-dom"] }],
  devDependencies: [
    {
      when: { language: "typescript" },
      packages: ["typescript", "@types/react", "@types/react-dom", "@types/node"],
    },
  ],
  files: [
    { path: "next.config.mjs", content: NEXT_CONFIG },
    { when: { language: "typescript" }, path: "app/layout.tsx", content: LAYOUT_TSX },
    { when: { language: "javascript" }, path: "app/layout.jsx", content: LAYOUT_JSX },
    { when: { language: "typescript" }, path: "app/page.tsx", content: PAGE },
    { when: { language: "javascript" }, path: "app/page.jsx", content: PAGE },
  ],
  scripts: [
    { scripts: { dev: "next dev", build: "next build", start: "next start" } },
  ],
  notes: [
    {
      when: { language: "typescript" },
      message:
        "Next.js generates its own tsconfig.json the first time you run `next dev`.",
    },
  ],
};
