import { buildLexer } from 'typescript-parsec';

export enum TokenKind {
  Import,
  LBrace,
  RBrace,
  Asterisk,
  As,
  Path,
  Type,
  In,
  HasFields,
  OfType,
  Ident,
  Union,
  Comma,
  Comment,
  Whitespace,
  Illegal
}

export const scanner = buildLexer([
  [true, /^import(?![a-zA-Z_-\/.])/, TokenKind.Import],
  [true, /^type(?![a-zA-Z_\/.])/, TokenKind.Type],
  [true, /^in(?![a-zA-Z_\/.]/, TokenKind.In],
  [true, /^{/, TokenKind.LBrace],
  [true, /^}/, TokenKind.RBrace],
  [true, /^\*/, TokenKind.Asterisk],
  [true, /^as/, TokenKind.As],
  [true, /^"([^"\\]|\\.)*"/, TokenKind.Path],
  [true, /^'([^'\\]|\\.)*'/, TokenKind.Path],
  [true, /^[a-zA-Z0-9_\[\]]+/, TokenKind.Ident],
  [true, /^=>/, TokenKind.HasFields],
  [true, /^:/, TokenKind.OfType],
  [true, /^|/, TokenKind.Union],
  [true, /^,/, TokenKind.Comma],
  [true, /^[/][/][^\r^\n]*\r+\n/, TokenKind.Comment],
  [false, /^\s*/, TokenKind.Whitespace],
  [true, /.*/, TokenKind.Illegal]
]);
