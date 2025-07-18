// need enable flag allowJs: true in tsconfig.json
import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config} */
const config = [
  {
    ignores: ["dist", "node_modules", "coverage", "schema.ts", "prisma"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts"],
      },
      "import/resolver": {
        typescript: true,
      },
      "import/extensions": [".ts", ".mts", ".js", ".mjs"],
      "import/external-module-folders": ["node_modules", "node_modules/@types"],
    },
    rules: {
      // Enforce a convention in the order of `require()` / `import` statements.
      // https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],

      // In order to provide a consistent use of file extensions across your code base, this rule can enforce or disallow the use of certain file extensions
      // https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/extensions.md
      "import/extensions": [
        "error",
        "always",
        {
          ignorePackages: true,
          pattern: {
            ts: "never",
          },
        },
      ],

      // Ensuring that default exports are named
      // https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-anonymous-default-export.md
      "import/no-anonymous-default-export": "error",

      // Reports if a resolved path is imported more than once
      // https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-duplicates.md
      "import/no-duplicates": "error",

      // Enforce having one or more empty lines after the last top-level import statement or require call
      // https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/newline-after-import.md
      "import/newline-after-import": ["error", { count: 1 }],

      // Enforce that all exports are declared at the bottom of the file
      // https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/exports-last.md
      "import/exports-last": "off",

      // Enforce that all imports are declared at the top of the file
      // https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/first.md
      "import/first": "error",

      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "prettier/prettier": [
        "error",
        {
          singleQuote: false,
        },
      ],
      "object-shorthand": ["error", "always"],
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: ["../../**", "../../../**"],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // plugins: {
    //   "@typescript-eslint": tseslint.plugin,
    // },
    files: ["*.config.{ts,mts,js,mjs}"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Disallow `require` statements except in import statements.
      // https://typescript-eslint.io/rules/no-var-requires
      "@typescript-eslint/no-var-requires": "off",

      // Enforce a maximum number of lines per file
      // https://eslint.org/docs/latest/rules/max-lines
      "max-lines": "off",

      // Disallow assigning a value with type any to variables and properties.
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
];

export default config;
