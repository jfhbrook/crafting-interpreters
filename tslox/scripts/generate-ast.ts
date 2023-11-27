import * as path from 'path';
import { createWriteStream, WriteStream } from 'fs';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length != 1) {
    console.error("Usage: generate_ast <output_directory>");
    process.exit(64);
  }
  const outputDir: string = args[0];
  await defineAst(outputDir, "Expr", [
    "Binary   :: left: Expr, operator: Token, right: Expr",
    "Grouping :: expression: Expr",
    "Literal  :: value: any",
    "Unary    :: operator: Token, right: Expr"
  ]);
}

async function defineAst(
  outputDir: string,
  baseName: string,
  types: string[]
): Promise<void> {
  const path_ = path.join(outputDir, `${baseName.toLowerCase()}.ts`);
  const writeStream = createWriteStream(path_, "utf8");

  writeStream.write(`import { Token } from './token';

export abstract class Expr {}

`);

  let className: string = '';
  let fields: string = '';
  for (let type of types) {
    className = type.split('::')[0].trim();
    fields = type.split('::')[1].trim();
    defineType(writeStream, baseName, className, fields);
  }

  writeStream.close();
}

function defineType(
  writeStream: WriteStream,
  baseName: string,
  className: string,
  fieldList: string
) {
  writeStream.write(`export class ${className} extends ${baseName} {
  constructor(
`);

  const fields = fieldList.split(", ");

  for (let field of fields) {
    writeStream.write(`    public readonly ${field},
`);
  }

  writeStream.write(`  ) {
    super();
  }
}

`);
}

main();
