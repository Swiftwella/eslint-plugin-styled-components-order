# eslint-plugin-styled-components-order

[![npm version](https://img.shields.io/npm/v/eslint-plugin-styled-components-order.svg)](https://www.npmjs.com/package/eslint-plugin-styled-components-order)
[![CI](https://github.com/Swiftwella/eslint-plugin-styled-components-order/actions/workflows/ci.yml/badge.svg)](https://github.com/Swiftwella/eslint-plugin-styled-components-order/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/eslint-plugin-styled-components-order.svg)](./LICENSE)

Automatically enforce a consistent order for CSS declarations inside
styled-components tagged templates. Both rules are autofixable and support
nested selectors, at-rules, interpolated values, the `css` helper, `.attrs()`,
intrinsic elements, and custom components.

## Requirements

- Node.js 20.19 or newer
- ESLint 8.57 or newer

## Installation

```sh
npm install --save-dev eslint eslint-plugin-styled-components-order
```

## Configuration

Choose one ordering strategy. The recommended preset uses alphabetical order.

### Flat config

```js
// eslint.config.js
const styledComponentsOrder = require("eslint-plugin-styled-components-order");

module.exports = [
  styledComponentsOrder.configs["flat/recommended"],
  // Or: styledComponentsOrder.configs["flat/concentric"],
];
```

To configure a rule directly:

```js
const styledComponentsOrder = require("eslint-plugin-styled-components-order");

module.exports = [
  {
    plugins: {
      "styled-components-order": styledComponentsOrder,
    },
    rules: {
      "styled-components-order/sort-declarations-alphabetically": "error",
    },
  },
];
```

### Legacy eslintrc

```json
{
  "extends": ["plugin:styled-components-order/recommended"]
}
```

For concentric ordering, use
`"plugin:styled-components-order/concentric"` instead.

## Rules

### `sort-declarations-alphabetically`

Sorts declarations by property name.

```js
const Button = styled.button`
  color: white;
  display: inline-flex;
  padding: 0.5rem 1rem;
`;
```

### `sort-declarations-concentrically`

Sorts declarations from outside-in: layout and positioning first, followed by
box-model, visual, and typography properties. Properties not present in the
built-in order are placed last and sorted alphabetically.

```js
const Card = styled.article`
  display: grid;
  position: relative;
  margin: 1rem;
  border: 1px solid;
  background: white;
  color: black;
`;
```

Run ESLint with `--fix` to reorder declarations automatically:

```sh
npx eslint . --fix
```

## Supported syntax

```js
styled.div`...`;
styled(Component)`...`;
styled.div.attrs({ role: "button" })`...`;
css`...`;
```

Declarations inside nested selectors and block at-rules are sorted
independently. JavaScript interpolations are preserved exactly as written.
Templates containing invalid CSS are left untouched.

## Development

```sh
npm install
npm run check
```

The `check` command runs ESLint, the Node.js test suite, and Prettier's format
check. Use `npm run format` to apply formatting.

Commits must follow the [Conventional Commits](https://www.conventionalcommits.org/)
format. Validate a commit message with:

```sh
echo "feat: add a feature" | npm run commitlint
```

## License

[Apache-2.0](./LICENSE)
