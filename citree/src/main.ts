import { readFile } from "fs/promises";

import { expectEOF, expectSingleResult } from "typescript-parsec";
import minimist from "minimist";

import { scanner } from "./scanner";
import { parser } from "./parser";
import { resolveImports } from "./imports";
import { resolveTypes } from "./types";
import { render, TypeConfig } from "./templates";

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

  const imports = resolveImports(filename, spec);
  const types = resolveTypes(filename, spec);

  for (const [path, ts] of Object.entries(types)) {
    console.log(
      render({
        imports: imports[path] || [],
        types: Object.entries(ts).map(([_, t]): TypeConfig => t),
      }),
    );
  }
}

if (require.main) {
  main();
}
