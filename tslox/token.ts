import { Value } from './value';

export enum TokenType {
  // Single-character tokens.
  LeftParen='(', RightParen=')', LeftBrace='{', RightBrace='}',
  Comma=',', Dot='.', Minus='-', Plus='+', Semicolon=';', Slash='/', Star='*',

  // One or two character tokens.
  Bang='!', BangEqual='!=', Equal='=', EqualEqual='==', Greater='>', GreaterEqual='>=', Less='<', LessEqual='<=',

  // Literals.
  Identifier='identifier', String='string', Number='number',

  // Keywords.
  And='and', Class='class', Else='else', False='false', Fun='fun', For='for', If='if', Nil='nil',
  Or='or', Print='print', Return='return', Super='super', This='this', True='true', Var='var', While='while',

  Eof='EOF'
}

export class Token {
  constructor(
    public readonly type: TokenType,
    public readonly lexeme: string,
    public readonly literal: Value,
    public readonly line: number
  ) {}

  toString() {
    return `${this.type} ${this.lexeme} ${this.literal}`;
  }
}
