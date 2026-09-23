"use strict";

const packageJson = require("../package.json");
const sortAlphabetically = require("./rules/sort-declarations-alphabetically");
const sortConcentrically = require("./rules/sort-declarations-concentrically");

const plugin = {
  meta: {
    name: packageJson.name,
    version: packageJson.version,
  },
  rules: {
    "sort-declarations-alphabetically": sortAlphabetically,
    "sort-declarations-concentrically": sortConcentrically,
  },
  configs: {},
};

const alphabeticalRule =
  "styled-components-order/sort-declarations-alphabetically";
const concentricRule =
  "styled-components-order/sort-declarations-concentrically";

plugin.configs.recommended = {
  plugins: ["styled-components-order"],
  rules: { [alphabeticalRule]: "error" },
};

plugin.configs.alphabetical = plugin.configs.recommended;
plugin.configs.concentric = {
  plugins: ["styled-components-order"],
  rules: { [concentricRule]: "error" },
};

plugin.configs["flat/recommended"] = {
  name: "styled-components-order/flat/recommended",
  plugins: { "styled-components-order": plugin },
  rules: { [alphabeticalRule]: "error" },
};

plugin.configs["flat/alphabetical"] = plugin.configs["flat/recommended"];
plugin.configs["flat/concentric"] = {
  name: "styled-components-order/flat/concentric",
  plugins: { "styled-components-order": plugin },
  rules: { [concentricRule]: "error" },
};

module.exports = plugin;
