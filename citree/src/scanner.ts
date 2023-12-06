import { buildLexer } from 'typescript-parsec';

export enum TokenKind {
  Import,
  LBrace,
  RBrace,
  Asterisk,
  As,
  Path,
  Separator,
  OfType,
  Ident,
  Whitespace
}

export const scanner = buildLexer([
  [true, /^import/, TokenKind.Import],
  [true, /^{/, TokenKind.LBrace],
  [true, /^}/, TokenKind.RBrace],
  [true, /^\*/, TokenKind.Asterisk],
  [true, /^as/, TokenKind.As],
  // TODO: this regexp is not cutting it lmao - test and iterate
  [true, /^"[a-zA-Z_-\/.]+"/, TokenKind.Path],
  [true, /^::/, TokenKind.Separator],
  [true, /^:/, TokenKind.OfType],
  [true, /^[a-zA-Z0-9_\[\]]/, TokenKind.Ident],
  [false, /^\s*/, TokenKind.Whitespace]
]);
