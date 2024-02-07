# tslox

`tslox` is an implementation of `lox` in TypeScript. It is based on the
[Java tree walking interpreter](https://craftinginterpreters.com/a-tree-walk-interpreter.html)
from [Crafting Interpreters](https://craftinginterpreters.com/).

## Project Setup and Development

As a TypeScript project, everything is handled through `npm`.

### Install

```sh
npm install
```

### Run

To start a RELP, run:

```sh
npm start
```

To run a file, do:

```sh
npm start -- example.lox
```

This will run the build automatically.

### Build

To run the build manually:

```sh
npm run build
```

In addition to running TypeScript, this command also generates TypeScript
files for the AST.

To clean up build files, do:

```sh
npm run clean
```

### Formatting

To run formatting with Prettier, do:

```sh
npm run format
```

This project does not do linting, and it doesn't have tests. Note that in a
real world implementation of a novel interpreter, there would be more tests
than you could shake a stick at - but this was me following along with a book,
so alas.

### AST Generation

This project uses a small DSL for generating very boilerplate-heavy visitor
pattern code. The two files which contain AST code are:

- [expr.ast](./src/expr.ast)
- [stmt.ast](./src/stmt.ast)

These files are used to generate `expr.ts` and `stmt.ts` respectively. To
generate these files, run:

```sh
npm run ast:generate
```

The script that does this generation lives [here](./scripts/generate-ast.ts).
