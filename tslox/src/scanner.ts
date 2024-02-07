import { Token, TokenType } from './token';
import { Value } from './value';
import { errors } from './error';

// Java has a char type, and in jlox these functions are defined for single
// characters. TypeScript does *not* have a char type, so we have to use
// strings. These functions assume the input string is of length 1. This is
// valid for our purposes, but isn't safe in general.
function isDigit(c: string): boolean {
  return '0123456789'.includes(c);
}

function isAlpha(c: string): boolean {
  return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.includes(c);
}

function isAlphaNumeric(c: string): boolean {
  return isAlpha(c) || isDigit(c);
}

const keywords: Record<string, TokenType> = {
  and: TokenType.And,
  class: TokenType.Class,
  else: TokenType.Else,
  false: TokenType.False,
  for: TokenType.For,
  fun: TokenType.Fun,
  if: TokenType.If,
  nil: TokenType.Nil,
  or: TokenType.Or,
  print: TokenType.Print,
  return: TokenType.Return,
  super: TokenType.Super,
  this: TokenType.This,
  true: TokenType.True,
  var: TokenType.Var,
  while: TokenType.While,
};

export class Scanner {
  private tokens: Token[];
  private start: number;
  private current: number;
  private line: number;

  constructor(private readonly source: string) {
    this.tokens = [];
    this.start = 0;
    this.current = 0;
    this.line = 1;
  }

  isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.Eof, '', null, this.line));

    return this.tokens;
  }

  scanToken(): void {
    const c: string = this.advance();
    switch (c) {
      case '(':
        this.addToken(TokenType.LeftParen);
        break;
      case ')':
        this.addToken(TokenType.RightParen);
        break;
      case '{':
        this.addToken(TokenType.LeftBrace);
        break;
      case '}':
        this.addToken(TokenType.RightBrace);
        break;
      case ',':
        this.addToken(TokenType.Comma);
        break;
      case '.':
        this.addToken(TokenType.Dot);
        break;
      case '-':
        this.addToken(TokenType.Minus);
        break;
      case '+':
        this.addToken(TokenType.Plus);
        break;
      case ';':
        this.addToken(TokenType.Semicolon);
        break;
      case '*':
        this.addToken(TokenType.Star);
        break;
      case '!':
        this.addToken(this.match('=') ? TokenType.BangEqual : TokenType.Bang);
        break;
      case '=':
        this.addToken(this.match('=') ? TokenType.EqualEqual : TokenType.Equal);
        break;
      case '<':
        this.addToken(this.match('=') ? TokenType.LessEqual : TokenType.Less);
        break;
      case '>':
        this.addToken(
          this.match('=') ? TokenType.GreaterEqual : TokenType.Greater,
        );
        break;
      case '/':
        if (this.match('/')) {
          while (this.peek() !== '\n' && !this.isAtEnd()) this.advance();
          // "...when we reach the end of the comment, we DON'T call
          // addToken()."
          //
          // classic BASIC *does* hang onto these, but if I'm compiling a
          // Script into a Module then I should be able to throw these out.
        } else {
          this.addToken(TokenType.Slash);
        }
        break;
      case ' ':
      case '\r':
      case '\t':
        break;
      case '\n':
        this.line++;
        break;
      case '"':
        this.string();
        break;
      // "note that we *keep scanning*. There may be other errors later in the
      // program. It gives our users a better experience if we detect as many
      // of those as possible in one go. Otherwise, they see one tiny error
      // and fix it, only to have the next error appear, and so on. Syntax
      // error Whack-A-Mole is no fun."
      //
      // if I want to take this approach, I should scan everything, then
      // search for Invalid tokens and, if any Invalid tokens, generate an
      // error that rolls them up.
      default:
        if (isDigit(c)) {
          this.number();
        } else if (isAlpha(c)) {
          this.identifier();
        } else {
          errors.error(this.line, 'Unexpected character.');
        }
        break;
    }
  }

  match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.current] != expected) return false;
    this.current++;
    return true;
  }

  // "This is called *lookahead*. Since it only looks at the current unconsumed
  // character, we have *one character of lookahead*. The smaller this number
  // is, generally, the faster the scanner runs. The rules of the lexical
  // grammar dictate how much lookahead we need. Fortunately, most languages in
  // wide use peek only one or two characters ahead.
  peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.current];
  }

  // We are at TWO characters of lookahead!
  peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source[this.current + 1];
  }

  advance(): string {
    return this.source[this.current++];
  }

  addToken(type: TokenType, literal: Value = null): void {
    const text = this.source.slice(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line));
  }

  string(): void {
    while (this.peek() != '"' && !this.isAtEnd()) {
      // lox supports multi-line strings, funny
      if (this.peek() == '\n') this.line++;
      this.advance();
    }

    if (this.isAtEnd()) {
      errors.error(this.line, 'Unterminated string.');
      return;
    }

    // we peeked at this character and saw it's a "
    this.advance();

    // "if Lox supported escape sequences like \n, we'd unescape those here."
    const value = this.source.slice(this.start + 1, this.current - 1);
    this.addToken(TokenType.String, value);
  }

  number(): void {
    while (isDigit(this.peek())) this.advance();

    if (this.peek() === '.' && isDigit(this.peekNext())) {
      this.advance();
    }

    while (isDigit(this.peek())) this.advance();

    // "We could implement [parseFloat] ourselves, but, honestly, unless you're
    // trying to cram for an upcoming programming interview, it's not worth
    // your time."
    this.addToken(
      TokenType.Number,
      parseFloat(this.source.slice(this.start, this.current)),
    );
  }

  identifier(): void {
    while (isAlphaNumeric(this.peek())) this.advance();

    const text = this.source.slice(this.start, this.current);
    const type = keywords[text] || TokenType.Identifier;

    this.addToken(type);
  }
}
