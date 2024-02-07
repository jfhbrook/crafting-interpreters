import { spawn } from "child_process";
import { readFile, writeFile } from "fs/promises";

import { expectEOF, expectSingleResult } from "typescript-parsec";
import minimist from "minimist";
import which from "which";

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
    await writeFile(
      path,
      render({
        imports: imports[path] || [],
        types: Object.entries(ts).map(([_, t]): TypeConfig => t),
      }),
    );
  }

  try {
    await which("prettier");
    await Promise.all(
      Object.keys(types).map(
        (path) =>
          new Promise<void>((resolve, reject) => {
            const format = spawn("prettier", [path, "--write"], {
              stdio: "pipe",
            });
            format.on("exit", (code) => {
              if (code) {
                reject(
                  new Error(
                    `prettier '${path}' --write exited with code ${code}`,
                  ),
                );
                return;
              }
              resolve();
            });
          }),
      ),
    );
  } catch (err: any) {
    console.log(err.message);
    if (err.message !== "not found: prettier") {
      throw err;
    }
  }
}

if (require.main) {
  main();
}
