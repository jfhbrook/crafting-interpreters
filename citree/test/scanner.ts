import t from 'tap';

import { Token } from 'typescript-parsec';

import { scanner, TokenKind } from '../src/scanner';

const EXAMPLE = `// example

type Expr in "./expr" {
  import { Token } from './token'
  import * from "./value"

  Assign   => name: Token, value: Expr | null
  Call     => args: Expr[]
}`

const EXPECTED_EXAMPLE = [
  [TokenKind.Type, 'type'],
  [TokenKind.Ident, 'Expr'],
  [TokenKind.In, 'in'],
  [TokenKind.Path, '"./expr"'],
  [TokenKind.LBrace, '{'],

  [TokenKind.Import, 'import'],
  [TokenKind.LBrace, '{'],
  [TokenKind.Ident, 'Token'],
  [TokenKind.RBrace, '}'],
  [TokenKind.From, 'from'],
  [TokenKind.Path, "'./token'"],

  [TokenKind.Import, 'import'],
  [TokenKind.Asterisk, '*'],
  [TokenKind.From, 'from'],
  [TokenKind.Path, '"./value"'],


  [TokenKind.Ident, 'Assign'],
  [TokenKind.HasFields, '=>'],
  [TokenKind.Ident, 'name'],
  [TokenKind.OfType, ':'],
  [TokenKind.Ident, 'Token'],
  [TokenKind.Comma, ','],
  [TokenKind.Ident, 'value'],
  [TokenKind.OfType, ':'],
  [TokenKind.Ident, 'Expr'],
  [TokenKind.Union, '|'],
  [TokenKind.Ident, 'null'],

  [TokenKind.Ident, 'Call'],
  [TokenKind.HasFields, '=>'],
  [TokenKind.Ident, 'args'],
  [TokenKind.OfType, ':'],
  [TokenKind.Ident, 'Expr[]'],


  [TokenKind.RBrace, '}']
];

const SIMPLE = [
  [TokenKind.Import, 'import'],
  [TokenKind.LBrace, '{'],
  [TokenKind.RBrace, '}'],
  [TokenKind.From, 'from'],
  [TokenKind.Path, '"./path"'],
  [TokenKind.Path, "'./path'"],
  [TokenKind.Asterisk, '*'],
  [TokenKind.Type, 'type'],
  [TokenKind.In, 'in'],
  [TokenKind.Ident, 'Assign[]'],
  [TokenKind.HasFields, '=>'],
  [TokenKind.OfType, ':'],
  [TokenKind.Comma, ','],
  [TokenKind.Union, '|']
];

for (const [kind, text] of SIMPLE) {
  t.test(`it scans ${text}`, async t => {
    let token = scanner.parse(text);

    t.ok(token, 'token is defined');
    token = <Token<TokenKind>>token;
    t.equal(token.kind, kind, `token kind is ${kind}`);
    t.equal(token.text, text, `token text is '${text}'`);
    t.notOk(token.next, 'no following tokens');
  });
}


t.test('it scans a full example', async t => {
  let token: any = scanner.parse(EXAMPLE);

  const results = [[token.kind, token.text]];
  while (token.next) {
    token = token.next;
    results.push([token.kind, token.text]);
  }

  t.same(results, EXPECTED_EXAMPLE);
});
