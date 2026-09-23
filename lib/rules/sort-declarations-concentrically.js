"use strict";

const createSortRule = require("../utils/create-sort-rule");
const groupedOrder = require("../utils/grouped-order");

const orderByProperty = new Map(
  groupedOrder.map((property, index) => [property, index]),
);

function normalize(property) {
  return property.toLowerCase().replace(/^-(?:webkit|moz|ms|o)-/, "");
}

function compare(left, right) {
  const leftIsCustomProperty = left.startsWith("--");
  const rightIsCustomProperty = right.startsWith("--");

  if (leftIsCustomProperty && rightIsCustomProperty) {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (leftIsCustomProperty) {
    return -1;
  }
  if (rightIsCustomProperty) {
    return 1;
  }

  const leftIndex = orderByProperty.get(normalize(left));
  const rightIndex = orderByProperty.get(normalize(right));

  if (leftIndex === undefined && rightIndex === undefined) {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (leftIndex === undefined) {
    return 1;
  }
  if (rightIndex === undefined) {
    return -1;
  }
  return leftIndex - rightIndex;
}

module.exports = createSortRule({
  description: "CSS declarations must be sorted concentrically.",
  messageId: "unsorted",
  compare,
  nestedRulesLast: true,
});
