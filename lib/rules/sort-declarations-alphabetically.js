"use strict";

const createSortRule = require("../utils/create-sort-rule");

module.exports = createSortRule({
  description: "CSS declarations must be sorted alphabetically.",
  messageId: "unsorted",
  compare: (left, right) => (left < right ? -1 : left > right ? 1 : 0),
});
