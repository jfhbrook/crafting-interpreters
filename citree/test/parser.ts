import t from 'tap';

import { expectEOF, expectSingleResult } from 'typescript-parsec';

import { scanner } from '../src/scanner';
import { parser } from '../src/parser';

const EXAMPLE = `// example

type Expr in "./expr" {
  import { Token } from './token'
  import * from "./value"

  Assign   => name: Token, value: Expr | null
  Call     => args: Expr[]
}`

const EXPECT = [{
  type: 'Expr',
  path: '"./expr"',
  body: [
    { import: "import { Token } from './token';" },
    { import: 'import * from "./value";' },
    { node: 'Assign', fields: 'name: Token, value: Expr | null' },
    { node: 'Call', fields: 'args: Expr[]' }
  ]
}];

t.test('it parses a simple example', async t => {
  const result = expectSingleResult(expectEOF(parser.parse(scanner.parse(EXAMPLE))));
  t.same(result, EXPECT);
});
