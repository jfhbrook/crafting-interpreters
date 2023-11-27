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

export const errors = {
  hadError: false,
  error(line: number, message: string): void {
    this.report(line, '', message);
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
