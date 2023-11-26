import { readFile } from 'fs/promises';

import { read } from 'read';

async function runFile(file: string): Promise<void> {
  const program: string = await readFile(file, 'utf8');

  await run(program);
}

async function run(program: string): Promise<void> {
  console.log(program);
}

async function runPrompt(): Promise<void> {
  let line: string = '';

  while (true) {
    try {
      line = await read({ prompt: '> ' });
      run(line);
    } catch (err) {
      console.error(err);
      break;
    }
  }
}


export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length > 1) {
    console.log("Usage: tslox [script]");
    process.exit(64);
  } else if (args.length === 1) {
    await runFile(args[0]);
  } else {
    await runPrompt();
  }
}
