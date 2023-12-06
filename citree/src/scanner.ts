import { buildLexer } from 'typescript-parsec';

export enum TokenKind {
  Import='import',
  From='from',
  LBrace='{',
  RBrace='}',
  Asterisk='*',
  As='as',
  Path='path',
  Type='type',
  In='in',
  HasFields='=>',
  OfType=':',
  Ident='<ident>',
  Union='|',
  Comma=',',
  Comment='<comment>',
  Whitespace='<whitespace>'
}

export const scanner = buildLexer([
  [true, /^import(?![a-zA-Z_\-\/.])/g, TokenKind.Import],
  [true, /^from(?![a-zA-Z_\-\/.])/g, TokenKind.From],
  [true, /^type(?![a-zA-Z_\-\/.])/g, TokenKind.Type],
  [true, /^in(?![a-zA-Z_\-\/.])/g, TokenKind.In],
  [true, /^as(?![a-zA-Z_\-\/.])/g, TokenKind.As],
  [true, /^{/g, TokenKind.LBrace],
  [true, /^}/g, TokenKind.RBrace],
  [true, /^\*/g, TokenKind.Asterisk],
  [true, /^"([^"\\]|\\.)*"/g, TokenKind.Path],
  [true, /^'([^'\\]|\\.)*'/g, TokenKind.Path],
  [true, /^[a-zA-Z0-9_\[\]]+/g, TokenKind.Ident],
  [true, /^=>/g, TokenKind.HasFields],
  [true, /^:/g, TokenKind.OfType],
  [true, /^\|/g, TokenKind.Union],
  [true, /^,/g, TokenKind.Comma],
  [true, /^[/][/][^\n]*\n/g, TokenKind.Comment],
  [false, /^\s+/g, TokenKind.Whitespace]
]);
