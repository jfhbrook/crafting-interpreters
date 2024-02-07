# Crafting Interpreters

This repo contains two interpreters for a variant of `lox`, based on the book
[Crafting Interpreters](https://craftinginterpreters.com).

The [first](./tslox) is a port of the Java
[tree-walking interpreter](https://craftinginterpreters.com/a-tree-walk-interpreter.html)
to TypeScript. Aside from bugs it's very similar, but makes a few changes due
to some language differences between Java and TypeScript.

The [second](./clox) is the book's C interpreter, minus bugs and plus a
[cmake](https://cmake.org/) build.

In addition, it also includes an [AST generator DSL](./citree) for TypeScript,
inspired by the AST generation script used in the Java implementation.

Each project has a brief README which should give some hints on getting them
running, if you so choose.
