import t from 'tap';

import { Spec } from '../src/parser';
import { resolveImports } from '../src/imports';

const SPEC: Spec = {
  imports: [
    { type: 'import', statement: 'import { Token } from "./token";', path: './token' },
  ],
  types: [{
    type: 'type',
    name: 'Expr',
    path: '"./expr"',
    imports: [
      { type: 'import', statement: 'import * from "./value";', path: './value' },
    ],
    nodes: [
      { type: 'node', name: 'Call', fields: 'args: Expr[]' }
    ]
  }]
};

const EXPECTED = {
  Expr: [
    'import { Token } from "./token";',
    'import * from "./value";'
  ]
};

t.test('resolves imports types', async t => {
  t.same(resolveImports(SPEC), EXPECTED);
});
