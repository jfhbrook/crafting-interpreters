import { readFile } from 'fs/promises';

import { read } from 'read';

import { AstPrinter } from './printer';
import { Token } from './token';
import { Scanner } from './scanner';
import { Parser } from './parser';
import { Interpreter } from './interpreter';
import { errors } from './error';

const interpreter = new Interpreter();

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

  if (errors.hadRuntimeError) {
    process.exit(70);
  }
}

async function readLine(): Promise<string | null> {
  let line = await read({ prompt: '> ' });

  line.trim();

  // This is a massive hack - I could also see doing this 
  if (line.length && !';}'.includes(line[line.length - 1])) {
    line += ';';
  }

  return line.length ? line : null;
}

async function runPrompt(): Promise<void> {
  interpreter.flags.repl = true;
  let line: string | null = null;

  while (true) {
    try {
      line = await readLine();

      if (line) {
        await run(line);

        errors.hadError = false;
        errors.hadRuntimeError = false;
      }
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
  const statements = parser.parse();

  if (errors.hadError) return;

  if (process.env.DEBUG) {
    const printer = new AstPrinter();

    console.log(printer.print(statements));
  }

  interpreter.interpret(statements);
}


