import * as path from "path";

import { Spec } from "./parser";

function resolvePath(inputFile: string, outputFile: string): string {
  return path.relative(path.dirname(inputFile), outputFile);
}

type ImportStatement = string;
type TypeName = string;

export type Imports = Record<TypeName, ImportStatement[]>;

// TODO: paths are more or less hard-coded right now. It would be cool to
// adjust the global paths based on where the files are being written.
export function resolveImports(spec: Spec): Imports {
  const imps: Imports = {};

  for (const type of spec.types) {
    imps[type.name] = spec.imports
      .map((i) => i.statement)
      .concat(type.imports.map((i) => i.statement));
  }

  return imps;
}
