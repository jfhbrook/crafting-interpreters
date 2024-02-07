# citree

`citree` is a DSL for generating TypeScript AST files. It's inspired by the
[Java AST generator](https://craftinginterpreters.com/representing-code.html#metaprogramming-the-trees)
in [Crafting Interpreters](https://craftinginterpreters.com/index.html) by
Robert Nystrom.

This project is not very well documented right now. For an example of what the
DSL looks like, see [ast.citree](./ast.citree). To see what it outputs,
run it:

```sh
npm start -- ast.citree
```

I do intend on writing other interpreters in TypeScript in the future, and
it's reasonably likely I will end up using this tool. In that case, I will
clean this up, document it, and release it for real.
