import { readFile } from 'fs/promises';

import * as readline from 'node:readline/promises';

import { Token } from './token';
import { Scanner } from './scanner';
import { Parser } from './parser';
import { Interpreter } from './interpreter';
import { Resolver } from './resolver';
import { errors } from './error';

const interpreter = new Interpreter();

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length > 1) {
    console.log('Usage: tslox [script]');
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
  // TODO: The readline module supports loading history through an argument
  // to `createInterface` and a "history" event.
  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  prompt.setPrompt('> ');

  prompt.prompt();
  for await (const line of prompt) {
    try {
      await run(line);

      errors.hadError = false;
      errors.hadRuntimeError = false;
    } catch (err) {
      console.error(err);
      break;
    }
    prompt.prompt();
  }
}

async function run(source: string): Promise<void> {
  const scanner: Scanner = new Scanner(source);

  const tokens: Token[] = scanner.scanTokens();

  const parser = new Parser(tokens);
  const statements = parser.parse();

  if (errors.hadError) return;

  const resolver = new Resolver(interpreter);
  resolver.resolve(statements);

  if (errors.hadError) return;

  interpreter.interpret(statements);
}
