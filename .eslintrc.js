module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: [
      "./tsconfig-main.json",
      "./tsconfig-renderer.json",
      "./tsconfig-scripts.json",
      "./tsconfig-for-webpack-config.json",
    ],
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/typescript",
    "prettier",
  ],
  rules: {
    // Allow inference in function return type.
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    // I like non-null assertions.
    "@typescript-eslint/no-non-null-assertion": "off",
    // Disallow default exports; only allow named exports.
    "import/no-default-export": "error",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        // Allow unused parameter names that start with _,
        // like TypeScript does.
        argsIgnorePattern: "^_",
      },
    ],
    // Allow normal string concatenation.
    "@typescript-eslint/restrict-plus-operands": "off",
  },
};
