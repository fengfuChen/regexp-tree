# regexp-tree: babel-plugin-transform-regexp-optimizer

TODO

Applies [regexp-tree](https://www.npmjs.com/package/regexp-tree) optimizations on JavaScript regular expressions.

## Usage

### Via `.babelrc`

`.babelrc`

```json
{
  "plugins": ["transform-regexp-optimizer"]
}
```

### Via CLI

```sh
$ babel --plugins transform-regexp-optimizer script.js
```

### Via Node.js API

```js
require('babel-core').transform(code, {
  'plugins': ['transform-regexp-optimizer']
});
```