# regexp-tree [![Build Status](https://travis-ci.org/DmitrySoshnikov/regexp-tree.svg?branch=master)](https://travis-ci.org/DmitrySoshnikov/regexp-tree) [![npm version](https://badge.fury.io/js/regexp-tree.svg)](https://badge.fury.io/js/regexp-tree)

Regular expressions parser in JavaScript

### Table of Contents

- [Installation](#installation)
- [Development](#development)
- [Usage as a CLI](#usage-as-a-cli)
- [Usage from Node](#usage-from-node)
- [Capturing locations](#capturing-locations)
- [AST nodes specification](#ast-nodes-specification)

### Installation

The parser can be installed as an [npm module](https://www.npmjs.com/package/regexp-tree):

```
npm install -g regexp-tree

regexp-tree --help
```

### Development

1. Fork https://github.com/DmitrySoshnikov/regexp-tree repo
2. Make your changes
3. Make sure `npm test` still passes (add new tests if needed)
4. Submit a PR

The _regexp-tree_ parser is implemented as an automatic LR parser using [Syntax](https://www.npmjs.com/package/syntax-cli) tool. The parser module is generated from the [regexp grammar](https://github.com/DmitrySoshnikov/regexp-tree/blob/master/regexp.bnf), which is based on the regular expressions grammar used in ECMAScript.

For development from the github repository, run `build` command to generate the parser module:

```
git clone https://github.com/<your-github-account>/regexp-tree.git
cd regexp-tree
npm install
npm run build

./bin/regexp-tree --help
```

> NOTE: You need to run `build` command every time you change the grammar file.

### Usage as a CLI

Check the options available from CLI:

```
regexp-tree --help
```

```
Usage: regexp-tree [options]

Options:
   -e, --expression   A regular expression to be parsed
   -l, --loc          Whether to capture AST node locations
```

To parse a regular expression, pass `-e` option:

```
regexp-tree -e '/a|b/i'
```

Which produces an AST node corresponding to this regular expression:

```js
{
  type: 'RegExp',
  body: {
    type: 'Disjunction',
    left: {
      type: 'Char',
      value: 'a',
      kind: 'simple'
    },
    right: {
      type: 'Char',
      value: 'b',
      kind: 'simple'
    }
  },
  flags: [
    'i'
  ]
}
```

> NOTE: the format of a regexp is `/ Body / OptionalFlags`.

### Usage from Node

The parser can also be used as a Node module:

```js
const regexpTree = require('regexp-tree');

const regexpString = (/a|b/i).toString();

console.log(regexpTree.parse(regexpString)); // RegExp AST
```

### Capturing locations

For source code transformation tools it might be useful also to capture _locations_ of the AST nodes. From the command line it's controlled via the '-l' option:

```
regexp-tree -e '/ab/' -l
```

This attaches `loc` object to each AST node:

```js
{
  type: 'RegExp',
  body: {
    type: 'Alternative',
    expressions: [
      {
        type: 'Char',
        value: 'a',
        kind: 'simple',
        loc: {
          start: 1,
          end: 2
        }
      },
      {
        type: 'Char',
        value: 'b',
        kind: 'simple',
        loc: {
          start: 2,
          end: 3
        }
      }
    ],
    loc: {
      start: 1,
      end: 3
    }
  },
  flags: [],
  loc: {
    start: 0,
    end: 4
  }
}
```

From Node it's controlled via `setOptions` method exposed on the parser:

```js
const regexpTree = require('regexp-tree');

const parsed = regexpTree
  .setOptions({captureLocations: true})
  .parse('/a|b/');
```

### AST nodes specification

Below are the AST node types for different regular expressions patterns:

- [Char](#char)
  - [Simple char](#simple-char)
  - [Escaped char](#escaped-char)
  - [Meta char](#meta-char)
  - [Control char](#control-char)
  - [Hex char-code](#hex-char-code)
  - [Decimal char-code](#decimal-char-code)
  - [Octal char-code](#octal-char-code)
  - [Unicode](#unicode)
- [Character class](#character-class)
  - [Positive character class](#positive-character-class)
  - [Negative character class](#negative-character-class)
  - [Character class ranges](#character-class-ranges)
- [Alternative](#alternative)
- [Disjunction](#disjunction)
- [Groups](#groups)
  - [Capturing group](#capturing-group)
  - [Non-capturing group](#non-capturing-group)
  - [Backreferences](#backreferences)
- [Quantifiers](#quantifiers)
  - [? zero-or-one](#-zero-or-one)
  - [* zero-or-more](#-zero-or-more)
  - [+ one-or-more](#-one-or-more)
  - [Range-based quantifiers](#range-based-quantifiers)
    - [Exact number of matches](#exact-number-of-matches)
    - [Open range](#open-range)
    - [Closed range](#closed-range)
  - [Non-greedy](#non-greedy)
- [Assertions](#assertions)
  - [^ begin marker](#-begin-marker)
  - [$ end marker](#-end-marker)
  - [Boundary assertions](#boundary-assertions)
  - [Lookahead assertions](#lookahead-assertions)
    - [Positive lookahead assertions](#positive-lookahead-assertions)
    - [Negative lookahead assertions](#negative-lookahead-assertions)
  - [Lookbehind assertions](#lookbehind-assertions)

#### Char

A basic building block, single character. Can be _escaped_, and be of different _kinds_.

##### Simple char

Basic _non-escaped_ char in a regexp:

```
z
```

Node:

```js
{
  type: 'Char',
  value: 'z',
  kind: 'simple'
}
```

> NOTE: to test this from CLI, the char should be in an actual regexp -- `/z/`.

##### Escaped char

```
\z
```

The same value, `escaped` flag is added:

```js
{
  type: 'Char',
  value: 'z',
  kind: 'simple',
  escaped: true
}
```

Escaping is mostly used with meta symbols:

```
// Syntax error
*
```

```
\*
```

OK, node:

```js
{
  type: 'Char',
  value: '*',
  kind: 'simple',
  escaped: true
}
```

##### Meta char

A _meta character_ should not be confused with an [escaped char](#escaped-char).

Example:

```
\n
```

Node:

```js
{
  type: 'Char',
  value: '\\n',
  kind: 'meta',
}
```

Among other meta character are: `\f`, `\r`, `\n`, `\t`, `\v`, `\0`, `[\b]` (backspace char), `\s`, `\S`, `\w`, `\W`, `\d`, `\D`.

> NOTE: `\b` and `\B` are parsed as `Assertion` node type, not `Char`.

##### Control char

A char preceded with `\c`, e.g. `\cx`, which stands for `CTRL+x`:

```
\cx
```

Node:

```js
{
  type: 'Char',
  value: '\\cx',
  kind: 'control',
}
```

##### HEX char-code

A char preceded with `\x`, followed by a HEX-code, e.g. `\x3B` (symbol `;`):

```
\x3B
```

Node:

```js
{
  type: 'Char',
  value: '\\x3B',
  kind: 'hex',
}
```

##### Decimal char-code

Char-code:

```
\42
```

Node:

```js
{
  type: 'Char',
  value: '\\42',
  kind: 'decimal',
}
```

##### Octal char-code

Char-code started with `\0`, followed by an octal number:

```
\073
```

Node:

```js
{
  type: 'Char',
  value: '\\073',
  kind: 'oct',
}
```

##### Unicode

Unicode char started with `\u`, followed by a hex number:

```
\u003B
\u{003B}
```

Node:

```js
{
  type: 'Char',
  value: '\\u003B',
  kind: 'unicode',
}
```

#### Character class

Character classes define a _set_ of characters. A set may include as simple characters, as well as _character ranges_. A class can be _positive_ (any from the characters in the class match), or _negative_ (any _but_ the characters from the class match).

##### Positive character class

A positive character class is defined between `[` and `]` brackets:

```
[a*]
```

A node:

```js
{
  type: 'CharacterClass',
  expressions: [
    {
      type: 'Char',
      value: 'a',
      kind: 'simple'
    },
    {
      type: 'Char',
      value: '*',
      kind: 'simple'
    }
  ]
}
```

> NOTE: some meta symbols are treated as normal characters in a character class. E.g. `*` is not a repetition quantifier, but a simple char.

##### Negative character class

A negative character class is defined between `[^` and `]` brackets:

```
[^ab]
```

An AST node is the same, just `negative` property is added:

```js
{
  type: 'CharacterClass',
  negative: true,
  expressions: [
    {
      type: 'Char',
      value: 'a',
      kind: 'simple'
    },
    {
      type: 'Char',
      value: 'b',
      kind: 'simple'
    }
  ]
}
```

##### Character class ranges

As mentioned, a character class may also contain _ranges_ of symbols:

```
[a-z]
```

A node:

```js
{
  type: 'CharacterClass',
  expressions: [
    {
      type: 'ClassRange',
      from: {
        type: 'Char',
        value: 'a',
        kind: 'simple'
      },
      to: {
        type: 'Char',
        value: 'z',
        kind: 'simple'
      }
    }
  ]
}
```

> NOTE: it is a _syntax error_ if `to` value is less than `from` value: `/[z-a]/`.

The range value can be the same for `from` and `to`, and the special range `-` character is treated as a simple character when it stands in a char position:

```
// from: 'a', to: 'a'
[a-a]

// from: '-', to: '-'
[---]

// simple '-' char:
[-]

// 3 ranges:
[a-zA-Z0-9]+
```

#### Alternative

An _alternative_ (or _concatenation_) defines a chain of patterns followed one after another:

```
abc
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'a',
      kind: 'simple'
    },
    {
      type: 'Char',
      value: 'b',
      kind: 'simple'
    },
    {
      type: 'Char',
      value: 'c',
      kind: 'simple'
    }
  ]
}
```

Another examples:

```
// 'a' with a quantifier, followed by 'b'
a?b

// A group followed by a class:
(ab)[a-z]
```

#### Disjunction

The _disjunction_ defines "OR" operation for regexp patterns. It's a _binary_ operation, having `left`, and `right` nodes.

Matches `a` or `b`:

```
a|b
```

A node:

```js
{
  type: 'Disjunction',
  left: {
    type: 'Char',
    value: 'a',
    kind: 'simple'
  },
  right: {
    type: 'Char',
    value: 'b',
    kind: 'simple'
  }
}
```

#### Groups

The groups play two roles: they define _grouping precedence_, and allow to _capture_ needed sub-expressions in case of a capturing group.

##### Capturing group

_"Capturing"_ means the matched string can be referred later by a user, including in the pattern itself -- by using [backreferences](#backreferences).

Char `a`, and `b` are grouped, followed by the `c` char:

```
(ab)c
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Group',
      capturing: true,
      expression: {
        type: 'Alternative',
        expressions: [
          {
            type: 'Char',
            value: 'a',
            kind: 'simple'
          },
          {
            type: 'Char',
            value: 'b',
            kind: 'simple'
          }
        ]
      }
    },
    {
      type: 'Char',
      value: 'c',
      kind: 'simple'
    }
  ]
}
```

Another example:

```
// A grouped disjunction of a symbol, and a character class:
(5|[a-z])
```

##### Non-capturing group

Sometimes we don't need to actually capture the matched string from a group. In this case we can use a _non-capturing_ group:

Char `a`, and `b` are grouped, _but not captured_, followed by the `c` char:

```
(?:ab)c
```

The same node, the `capturing` flag is `false`:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Group',
      capturing: false,
      expression: {
        type: 'Alternative',
        expressions: [
          {
            type: 'Char',
            value: 'a',
            kind: 'simple'
          },
          {
            type: 'Char',
            value: 'b',
            kind: 'simple'
          }
        ]
      }
    },
    {
      type: 'Char',
      value: 'c',
      kind: 'simple'
    }
  ]
}
```

##### Backreferences

A captured group can be referenced in the pattern using notation of an escaped group number.

Matches `abab` string:

```
(ab)\1
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Group',
      capturing: false,
      expression: {
        type: 'Alternative',
        expressions: [
          {
            type: 'Char',
            value: 'a',
            kind: 'simple'
          },
          {
            type: 'Char',
            value: 'b',
            kind: 'simple'
          }
        ]
      }
    },
    {
      type: 'Backreference',
      reference: 1,
    }
  ]
}
```

#### Quantifiers

Quantifiers specify _repetition_ of a regular expression (or of its part). Below are the quantifiers which _wrap_ a parsed expression into a `Repetition` node.

##### ? zero-or-one

The `?` quantifier is short for `{0,1}`.

```
a?
```

Node:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    kind: 'simple'
  },
  quantifier: {
    type: '?',
    greedy: true
  }
}
```

##### * zero-or-more

The `*` quantifier is short for `{0,}`.

```
a*
```

Node:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    kind: 'simple'
  },
  quantifier: {
    type: '*',
    greedy: true
  }
}
```

##### + one-or-more

The `+` quantifier is short for `{1,}`.

```
// Same as `aa*`, or `a{1,}`
a+
```

Node:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    kind: 'simple'
  },
  quantifier: {
    type: '+',
    greedy: true
  }
}
```

##### Range-based quantifiers

Explicit _range-based_ quantifiers are parsed as follows:

###### Exact number of matches

```
a{3}
```

The type of the quantifier is `Range`, and `from`, and `to` properties have the same value:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    kind: 'simple'
  },
  quantifier: {
    type: 'Range',
    from: 3,
    to: 3
  }
}
```

###### Open range

An open range doesn't have max value (assuming semantic "more", or Infinity value):

```
a{3,}
```

An AST node for such range doesn't contain `to` property:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    kind: 'simple'
  },
  quantifier: {
    type: 'Range',
    from: 3
  }
}
```

###### Closed range

A closed range has explicit max value: (which syntactically can be the same as min value):

```
a{3,5}

// Same as a{3}
a{3,3}
```

An AST node for a closed range:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    kind: 'simple'
  },
  quantifier: {
    type: 'Range',
    from: 3,
    to: 5
  }
}
```

> NOTE: it is a _syntax error_ if the max value is less than min value: `/a{3,2}/`

##### Non-greedy

If any quantifier is followed by the `?`, the quantifier becomes _non-greedy_.

Example:

```
a+?
```

Node:

```js
{
  type: 'Repetition',
  expression: {
    type: 'Char',
    value: 'a',
    kind: 'simple'
  },
  quantifier: {
    type: '+',
    greedy: false
  }
}
```

Other examples:

```
a??
a*?
a{1}?
a{1,}?
a{1,3}?
```

#### Assertions

Assertions appear as separate AST nodes, however instread of manipulating on the characters themselves, they _assert_ certain conditions of a matching string. Examples: `^` -- beginning of a string (or a line in multiline mode), `$` -- end of a string, etc.

##### ^ begin marker

The `^` assertion checks whether a scanner is at the beginning of a string (or a line in multiline mode).

In the example below `^` is not a property of the `a` symbol, but a separate AST node for the assertion. The parsed node is actually an `Alternative` with two nodes:

```
^a
```

The node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Assertion',
      kind: '^'
    },
    {
      type: 'Char',
      value: 'a',
      kind: 'simple'
    }
  ]
}
```

Since assertion is a separate node, it may appear anywhere in the matching string. The following regexp is completely valid, and asserts beginning of the string; it'll match an empty string:

```
^^^^^
```

##### $ end marker

The `$` assertion is similar to `^`, but asserts the end of a string (or a line in a multiline mode):

```
a$
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'a',
      kind: 'simple'
    },
    {
      type: 'Assertion',
      kind: '$'
    }
  ]
}
```

And again, this is a completely valid regexp, and matches an empty string:

```
^^^^$$$$$

// valid too:
$^
```

##### Boundary assertions

The `\b` assertion check for _word boundary_, i.e. the position between a word and a space.

Matches `x` in `x y`, but not in `xy`:

```
x\b
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'x',
      kind: 'simple'
    },
    {
      type: 'Assertion',
      kind: '\\b'
    }
  ]
}
```

The `\B` is vice-versa checks for _non-word_ boundary. The following example matches `x` in `xy`, but not in `x y`:

```
x\B
```

A node is the same:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'x',
      kind: 'simple'
    },
    {
      type: 'Assertion',
      kind: '\\B'
    }
  ]
}
```

##### Lookahead assertions

These assertions check whether a pattern is _followed_ (or not followed for the negative assertion) by another pattern.

###### Positive lookahead assertion

Matches `a` only if it's followed by `b`:

```
a(?=b)
```

A node:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'a',
      kind: 'simple'
    },
    {
      type: 'Assertion',
      kind: 'Lookahead',
      assertion: {
        type: 'Char',
        value: 'b',
        kind: 'simple'
      }
    }
  ]
}
```

###### Negative lookahead assertion

Matches `a` only if it's _not_ followed by `b`:

```
a(?!b)
```

A node is similar, just `negative` flag is added:

```js
{
  type: 'Alternative',
  expressions: [
    {
      type: 'Char',
      value: 'a',
      kind: 'simple'
    },
    {
      type: 'Assertion',
      kind: 'Lookahead',
      negative: true,
      assertion: {
        type: 'Char',
        value: 'b',
        kind: 'simple'
      }
    }
  ]
}
```

###### Lookbehind assertions

_Lookbehind_ assertions are not yet supported (since the grammar is based on ECMAScript regular expressions which don't support lookbehind assertions), however the support can be added later.