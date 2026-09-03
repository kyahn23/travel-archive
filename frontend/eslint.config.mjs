// Travel Archive — frontend ESLint flat config
// Next 16 removed `next lint`. We use `eslint-config-next` flat presets directly.
// Correctness rules (no-unreachable, valid-typeof, ...) are intentionally NOT
// blanket-disabled. Real false positives get a one-line `// eslint-disable-next-line`
// with a reason at the call site only.

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default config;
