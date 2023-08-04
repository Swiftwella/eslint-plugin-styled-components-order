# eslint-plugin-styled-components-order 💅

Auto fixable ESlint's rules for sorting styled components, either alphabetically or concentrically.

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-styled-components-order`:

```
$ npm install eslint-plugin-styled-components-order --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-styled-components-order` globally.

## Usage

Add `styled-components-order` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "styled-components-order"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "plugins": [
        "styled-components-order"
    ],
    "rules": {
        // Use only one of the following rules
        "styled-components-order/sort-declarations-alphabetically": "error",
        "styled-components-order/sort-declarations-concentrically": "error"
    }
}
```

## Supported Rules

* 🔤`sort-declarations-alphabetically`: auto fixable rule that enforces alphabetically sorted declarations.
* 🔤`sort-declarations-concentrically`: auto fixable rule that enforces concentrically sorted declarations.


## License
Unless otherwise specified this project is licensed under [Apache License Version 2.0](./LICENSE).



