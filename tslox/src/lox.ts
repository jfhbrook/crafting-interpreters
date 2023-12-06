import { readFile } from 'fs/promises';

import * as readline from 'node:readline/promises';

import { Token } from './token';
import { Scanner } from './scanner';
import { Parser } from './parser';
import { Interpreter } from './interpreter';
import { Resolver } from './resolver';
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

async function runPrompt(): Promise<void> {
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  prompt.setPrompt('> ');

  // TODO: load hitsory
  interpreter.flags.repl = true;

  prompt.prompt();
  for await (const line of prompt) {
    try {
      // TODO: I don't like that the prompt also requires semis, sigh
      /*
      line.trim();

      if (line.length && !';}'.includes(line[line.length - 1])) {
        line += ';';
      }
      */

      await run(line);

      errors.hadError = false;
      errors.hadRuntimeError = false;
    } catch (err) {
      console.error(err);
      break;
    }
    prompt.prompt();
  }

  // TODO: save history
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

  const resolver = new Resolver(interpreter);
  resolver.resolve(statements);

  if (errors.hadError) return;

  interpreter.interpret(statements);
}


