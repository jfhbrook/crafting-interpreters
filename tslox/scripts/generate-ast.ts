import * as path from 'path';
import { readFileSync, createWriteStream, WriteStream } from 'fs';

function main(): void {
  const args = process.argv.slice(2);
  if (args.length != 1) {
    console.error("Usage: generate_ast <output_directory>");
    process.exit(64);
  }
  const outputDir: string = args[0];
  const baseName: string = "Expr";
  defineAst(outputDir, "Expr");
  defineAst(outputDir, "Stmt");
}

function readTypes(
  outputDir: string,
  baseName: string
): string[] {
  return readFileSync(
    path.join(outputDir, `${baseName.toLowerCase()}.ast`), "utf8"
  ).trim().split('\n');
}

function defineAst(
  outputDir: string,
  baseName: string
): void {
  const types = readTypes(outputDir, baseName);
  const path_ = path.join(outputDir, `${baseName.toLowerCase()}.ts`);
  const writeStream = createWriteStream(path_, "utf8");

  writeStream.write(`import { Token } from './token';
import { Value } from './value';

`);

  defineVisitor(writeStream, baseName, types);


  writeStream.write(`export abstract class ${baseName} {
  abstract accept<R>(visitor: Visitor<R>): R;
}

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

function defineVisitor(
  writeStream: WriteStream,
  baseName: string,
  types: string[]
): void {
  writeStream.write(`export interface Visitor<R> {
`);
  let typeName: string = '';
  for (let type of types) {
    typeName = type.split('::')[0].trim();
    writeStream.write(`  visit${typeName}${baseName}(${baseName.toLowerCase()}: ${typeName}): R;
`);
  }
  writeStream.write(`}

`);

}

function defineType(
  writeStream: WriteStream,
  baseName: string,
  className: string,
  fieldList: string
): void {
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

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visit${className}${baseName}(this);
  }
}

`);
}

main();
