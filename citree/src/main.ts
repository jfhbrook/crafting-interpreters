import { readFile } from "fs/promises";

import { expectEOF, expectSingleResult } from "typescript-parsec";
import minimist from "minimist";

import { scanner } from "../src/scanner";
import { parser } from "../src/parser";

export default async function main() {
  const argv = minimist(process.argv.slice(2));

  if (argv._.length !== 1) {
    throw new Error("expected filename");
  }

  const filename: string = argv._[0];

  const contents = await readFile(filename, "utf8");

  const spec = expectSingleResult(
    expectEOF(parser.parse(scanner.parse(contents))),
  );

  console.log(spec);
}

if (require.main) {
  main();
}
