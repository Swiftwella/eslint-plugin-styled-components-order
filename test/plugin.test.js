"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { Linter } = require("eslint");
const plugin = require("../lib");
const groupedOrder = require("../lib/utils/grouped-order");

function lint(code, rule) {
  const linter = new Linter();
  return linter.verifyAndFix(code, {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
    plugins: {
      "styled-components-order": plugin,
    },
    rules: {
      [`styled-components-order/${rule}`]: "error",
    },
  });
}

test("exports plugin metadata, rules, and shareable configs", () => {
  assert.equal(plugin.meta.name, "eslint-plugin-styled-components-order");
  assert.deepEqual(Object.keys(plugin.rules), [
    "sort-declarations-alphabetically",
    "sort-declarations-concentrically",
  ]);
  assert.ok(plugin.configs.recommended);
  assert.ok(plugin.configs["flat/recommended"]);
});

test("flat recommended config can be consumed directly by ESLint", () => {
  const linter = new Linter();
  const messages = linter.verify(
    "const Box = styled.div`width: 1px; color: red;`;",
    plugin.configs["flat/recommended"],
  );

  assert.equal(messages.length, 1);
  assert.equal(
    messages[0].ruleId,
    "styled-components-order/sort-declarations-alphabetically",
  );
});

test("alphabetical rule leaves sorted declarations unchanged", () => {
  const code = [
    "const Button = styled.button`",
    "  color: red;",
    "  display: block;",
    "`;",
  ].join("\n");

  const result = lint(code, "sort-declarations-alphabetically");

  assert.equal(result.fixed, false);
  assert.deepEqual(result.messages, []);
  assert.equal(result.output, code);
});

test("alphabetical rule fixes declarations and preserves interpolations", () => {
  const code = [
    "const Button = styled.button`",
    "  width: ${({ width }) => width}px;",
    "  color: red;",
    "`;",
  ].join("\n");
  const expected = [
    "const Button = styled.button`",
    "  color: red;",
    "  width: ${({ width }) => width}px;",
    "`;",
  ].join("\n");

  const result = lint(code, "sort-declarations-alphabetically");

  assert.equal(result.fixed, true);
  assert.deepEqual(result.messages, []);
  assert.equal(result.output, expected);
});

test("alphabetical rule preserves multiline interpolations", () => {
  const code = [
    "const Button = styled.button`",
    "  width: ${({",
    "    width,",
    "  }) => width}px;",
    "  color: red;",
    "`;",
  ].join("\n");
  const expected = [
    "const Button = styled.button`",
    "  color: red;",
    "  width: ${({",
    "    width,",
    "  }) => width}px;",
    "`;",
  ].join("\n");

  assert.equal(lint(code, "sort-declarations-alphabetically").output, expected);
});

test("alphabetical rule fixes nested rules and at-rules", () => {
  const code = [
    "const Button = styled.button.attrs({ type: 'button' })`",
    "  @media (hover: hover) {",
    "    width: 10px;",
    "    color: red;",
    "  }",
    "  &:hover {",
    "    top: 0;",
    "    left: 0;",
    "  }",
    "`;",
  ].join("\n");
  const expected = [
    "const Button = styled.button.attrs({ type: 'button' })`",
    "  @media (hover: hover) {",
    "    color: red;",
    "    width: 10px;",
    "  }",
    "  &:hover {",
    "    left: 0;",
    "    top: 0;",
    "  }",
    "`;",
  ].join("\n");

  assert.equal(lint(code, "sort-declarations-alphabetically").output, expected);
});

test("alphabetical rule moves declaration comments with their declarations", () => {
  const code = [
    "const Button = styled.button`",
    "  /* Sizing */",
    "  width: 10px; /* Keep with width */",
    "  /* Appearance */",
    "  color: red;",
    "`;",
  ].join("\n");
  const expected = [
    "const Button = styled.button`",
    "  /* Appearance */",
    "  color: red;",
    "  /* Sizing */",
    "  width: 10px; /* Keep with width */",
    "`;",
  ].join("\n");

  assert.equal(lint(code, "sort-declarations-alphabetically").output, expected);
});

test("rule supports the css helper and ignores unrelated tag functions", () => {
  const cssCode = "const mixin = css`width: 1px; color: red;`;";
  const unrelatedCode = "const value = other.div`width: 1px; color: red;`;";

  assert.equal(
    lint(cssCode, "sort-declarations-alphabetically").output,
    "const mixin = css`color: red; width: 1px;`;",
  );
  assert.equal(
    lint(unrelatedCode, "sort-declarations-alphabetically").fixed,
    false,
  );
});

test("concentric rule puts known properties first and sorts unknown ones", () => {
  const code = [
    "const Box = styled.div`",
    "  zebra: 1;",
    "  appearance: none;",
    "  display: block;",
    "`;",
  ].join("\n");
  const expected = [
    "const Box = styled.div`",
    "  display: block;",
    "  appearance: none;",
    "  zebra: 1;",
    "`;",
  ].join("\n");

  assert.equal(lint(code, "sort-declarations-concentrically").output, expected);
});

test("concentric rule puts custom properties before standard declarations", () => {
  const code = [
    "const Box = styled.div`",
    "  display: block;",
    "  --top-distance: 2rem;",
    "  zebra: 1;",
    "  --header-height: 4rem;",
    "`;",
  ].join("\n");
  const expected = [
    "const Box = styled.div`",
    "  --header-height: 4rem;",
    "  --top-distance: 2rem;",
    "  display: block;",
    "  zebra: 1;",
    "`;",
  ].join("\n");

  assert.equal(lint(code, "sort-declarations-concentrically").output, expected);
});

test("concentric rule recognizes modern and vendor-prefixed properties", () => {
  const code = [
    "const Box = styled.div`",
    "  color: red;",
    "  -webkit-user-select: none;",
    "  aspect-ratio: 1;",
    "  inset: 0;",
    "`;",
  ].join("\n");
  const expected = [
    "const Box = styled.div`",
    "  inset: 0;",
    "  aspect-ratio: 1;",
    "  color: red;",
    "  -webkit-user-select: none;",
    "`;",
  ].join("\n");

  assert.equal(lint(code, "sort-declarations-concentrically").output, expected);
});

test("concentric order follows structural groups and box-model edges", () => {
  const representatives = [
    "content",
    "position",
    "float",
    "display",
    "visibility",
    "overflow",
    "animation",
    "margin",
    "border",
    "padding",
    "width",
    "background",
    "font-size",
    "line-height",
    "text-align",
    "word-spacing",
    "letter-spacing",
    "cursor",
  ];
  const clockwiseMargins = [
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
  ];

  assert.equal(new Set(groupedOrder).size, groupedOrder.length);
  for (const properties of [representatives, clockwiseMargins]) {
    properties.reduce((previousIndex, property) => {
      const currentIndex = groupedOrder.indexOf(property);
      assert.ok(currentIndex > previousIndex, `${property} is out of order`);
      return currentIndex;
    }, -1);
  }
});

test("concentric rule places nested blocks after declarations", () => {
  const code = [
    "const Button = styled.button`",
    "  &:hover {",
    "    color: blue;",
    "    display: block;",
    "  }",
    "  color: red;",
    "  --button-color: red;",
    "`;",
  ].join("\n");
  const expected = [
    "const Button = styled.button`",
    "  --button-color: red;",
    "  color: red;",
    "  &:hover {",
    "    display: block;",
    "    color: blue;",
    "  }",
    "`;",
  ].join("\n");

  assert.equal(lint(code, "sort-declarations-concentrically").output, expected);
});

test("concentric rule preserves comments and nested-block order", () => {
  const code = [
    "const Button = styled.button`",
    "  /* Hover state */",
    "  &:hover { color: blue; }",
    "  /* Base display */",
    "  display: block;",
    "  /* Responsive state */",
    "  @media (width > 40rem) { color: green; }",
    "  color: red;",
    "`;",
  ].join("\n");
  const expected = [
    "const Button = styled.button`",
    "  /* Base display */",
    "  display: block;",
    "  color: red;",
    "  /* Hover state */",
    "  &:hover { color: blue; }",
    "  /* Responsive state */",
    "  @media (width > 40rem) { color: green; }",
    "`;",
  ].join("\n");

  assert.equal(lint(code, "sort-declarations-concentrically").output, expected);
});

test("malformed CSS is ignored instead of crashing ESLint", () => {
  const code = "const Box = styled.div`color: red; }`;";
  const result = lint(code, "sort-declarations-alphabetically");

  assert.equal(result.fixed, false);
  assert.deepEqual(result.messages, []);
});

test("statement at-rules without child nodes do not crash traversal", () => {
  const code = [
    "const styles = css`",
    '  @import "theme.css";',
    "  width: 1px;",
    "  color: red;",
    "`;",
  ].join("\n");

  assert.equal(
    lint(code, "sort-declarations-alphabetically").output,
    [
      "const styles = css`",
      '  @import "theme.css";',
      "  color: red;",
      "  width: 1px;",
      "`;",
    ].join("\n"),
  );
});
