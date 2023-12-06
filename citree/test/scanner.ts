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

const EXPECTED = [
  [TokenKind.Comment, '// example'],

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

  [TokenKind.Type, 'type'],
  [TokenKind.Ident, 'Expr'],
  [TokenKind.In, 'in'],
  [TokenKind.Path, '"./expr"'],
  [TokenKind.LBrace, '{'],

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

t.test('it scans', t => {
  let token = scanner.parse(EXAMPLE);

  for (const [kind, text] of EXPECTED) {
    t.ok(token, 'current token is defined');
    token = <Token<TokenKind>>token;
    t.equal(token.kind, kind, `token kind is ${kind}`);
    t.equal(token.text, text, `token text is '${text}'`);
    token = token.next;
  }

  t.notOk(token, 'no more tokens');
});
