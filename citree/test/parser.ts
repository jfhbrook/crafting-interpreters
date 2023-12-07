import t from "tap";

import { expectEOF, expectSingleResult } from "typescript-parsec";

import { scanner } from "../src/scanner";
import { parser } from "../src/parser";

const EXAMPLE = `// example

import { Token } from './token'

type Expr in "./expr" {
  import * from "./value"

  Assign   => name: Token, value: Expr | null
  Call     => args: Expr[]
}`;

const EXPECT = {
  imports: [
    {
      type: "import",
      statement: 'import { Token } from "./token";',
      path: "./token",
    },
  ],
  types: [
    {
      type: "type",
      name: "Expr",
      path: './expr',
      imports: [
        {
          type: "import",
          statement: 'import * from "./value";',
          path: "./value",
        },
      ],
      nodes: [
        {
          type: "node",
          name: "Assign",
          fields:
            "public readonly name: Token, public readonly value: Expr | null",
        },
        { type: "node", name: "Call", fields: "public readonly args: Expr[]" },
      ],
    },
  ],
};

t.test("it parses a simple example", async (t) => {
  const result = expectSingleResult(
    expectEOF(parser.parse(scanner.parse(EXAMPLE))),
  );
  t.same(result, EXPECT);
});
