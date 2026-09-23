"use strict";

const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
    },
    rules: {
      "no-console": "error",
      "no-unused-vars": "error",
      "prefer-const": "error",
    },
  },
]);
