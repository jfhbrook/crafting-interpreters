# clox

`clox` is my implementation of the
[C bytecode VM interpreter](https://craftinginterpreters.com/a-bytecode-virtual-machine.html)
from [Crafting Interpreters](https://craftinginterpreters.com/). The C parts
are more or less the same as the implementation in the book, but with some
extra comments.

The book doesn't prescribe a build system, so I used `cmake` and `just`.

## Project Setup and Development

### Dependencies

Aside from a working C compiler toolchain, you will also need
[cmake](https://cmake.org/) and [just](https://github.com/casey/just) to
build this project.

Code formatting requires
[clang-format](https://clang.llvm.org/docs/ClangFormat.html).
It also uses `python3` (with `venv` and `pip`) to install and run
[cmake-format](https://cmake-format.readthedocs.io/en/latest/).

Finally, the `start` command uses [rlwrap](https://github.com/hanslub42/rlwrap).
The C code itself doesn't use `readline`, so we use `rlwrap` to make the
experience slightly more pleasant.

All of these are likely available in your package manager of
choice.

### Configuration

The build has a number of debug compile options, which are set in environment
variables and a `.env` file through `just`.

To start, create a `.env` file:

```sh
cp env.sample .env
```

Then open the `.env` file in your editor of choice and go through the
options. The file is reasonably well-commented.

Note that if the file isn't present, `just` will default to a release build.

### Run

To run the REPL:

```sh
just
```

To run a file, do:

```sh
just start example.lox
```

Both of these will automatically run build steps if necessary.

### Build

You can manually run the build:

```sh
just build
```

To clean up files created during that build, run:

```sh
just clean
```

### Format

To run formatting, do:

```sh
just format
```

This will automatically set up `cmake-format` in a virtualenv if necessary.
