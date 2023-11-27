import { readFile } from 'fs/promises';

import { read } from 'read';

import { AstPrinter } from './ast-printer';
import { Token } from './token';
import { Scanner } from './scanner';
import { Parser } from './parser';
import { errors } from './error';

// the java lox interpreter stores interpreter state in a big fat Lox
// class. I decided not to use a class in typescript, so these are all
// sitting at the module scope.

// there is probably a way to leverage exceptions for this, but let's see
// where things go.

// my BASIC interpreter has two entry points too, which I call "headless"
// and "interactive". These basically take the position of my `Editor`
// abstraction.
//
// I probably do in fact want two functions, not a struct. A struct would
// make the memory management annoying.

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length > 1) {
    console.log("Usage: tslox [script]");
    // this error code convention comes from the UNIX file sysexits.h.
    process.exit(64);
  } else if (args.length === 1) {
    await runFile(args[0]);
  } else {
    await runPrompt();
  }
}

async function runFile(file: string): Promise<void> {
  const program: string = await readFile(file, 'utf8');

  await run(program);

  if (errors.hadError) {
    process.exit(65);
  }
}

async function runPrompt(): Promise<void> {
  let line: string = '';

  while (true) {
    try {
      line = await read({ prompt: '> ' });

      await run(line);

      errors.hadError = false;
    } catch (err) {
      console.error(err);
      break;
    }
  }
}

async function run(source: string): Promise<void> {
  const scanner: Scanner = new Scanner(source);

  const tokens: Token[] = scanner.scanTokens();

  // A good first step for my BASIC interpreter would be to basically do
  // this:
  //
  // 1. develop the "editor" interface - but really I just need interactive
  // 2. make running a command simply call tokens() and log the results
  //
  // then I can interactively test if the scanner is working the way I think
  // it should.
  // console.log(tokens);

  const parser = new Parser(tokens);
  const expression = parser.parse();

  if (errors.hadError) return;

  const printer = new AstPrinter();

  console.log(printer.print(expression));
}


