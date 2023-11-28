// these are inside the Lox class in bob's interpreter, but that causes us
// an import loop problem - so we define them here and import.

// "it's good engineering practice to separate the code that *generates* the
// errors from the code that *reports* them."
//
// "Ideally, we would have an actual abstraction, some kind of ErrorReporter
// interface that gets passed to the scanner and parser so that we can swap
// out different reporting strategies."
//
// in my BASIC, the ErrorReporter functionality will probably be handled by
// the Host.

import { Token, TokenType } from './token';

export class RuntimeError extends Error {
  code: string = 'RuntimeError';

  // instanceof checks don't work for errors, since super() transpiles to
  // Error.call, which throws a type Error in node.js. So we use an error
  // code instead.
  static isRuntimeError(err: any): err is RuntimeError {
    return err.code === 'RuntimeError' && err instanceof Error;
  }

  constructor(public readonly token: Token, message: string) {
    super(message);
  }
}

export const errors = {
  hadError: false,
  hadRuntimeError: false,

  error(where: Token | number, message: string): void {
    if (typeof where === 'number') {
      this.report(where, '', message);
    } else {
      if (where.type === TokenType.Eof) {
        this.report(where.line, 'at end', message);
      } else {
        this.report(where.line, `at '${where.lexeme}'`, message);
      }
    }
  },

  runtimeError(err: RuntimeError): void {
    console.error(`${err.message}
[line ${err.token.line}]`);
    this.hadRuntimeError = true;
  },

  // "...the honest truth is that [implementing good error reporting like miette is]
  // a lot of grungy string manipulation code. Very useful for users, but not
  // super fun to read in a book and not very technically interesting... please
  // do as I say and not as I do.
  report(line: number, where: string, message: string): void {
    console.error(`[line ${line}] Error${where.length ? ' ' + where : ''}: ${message}`);
    this.hadError = true;
  }
}
