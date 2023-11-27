import { Token, TokenType } from './token';
import * as expr from './expr';
import { errors } from './error';

export class Parser {
  private current: number;

  constructor(private readonly tokens: Token[]) {
    this.current = 0;
  }

  private match(...types: TokenType[]): boolean {
    for (let type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type == TokenType.Eof;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private expression(): expr.Expr {
    return this.equality();
  }

  private equality(): expr.Expr {
    let ex = this.comparison();

    let operator: Token | null = null;
    let right: expr.Expr | null = null;
    while (this.match(TokenType.BangEqual, TokenType.EqualEqual)) {
      operator = this.previous();
      right = this.comparison();

      if (operator === null || right === null) {
        throw new Error('operator and right must not be null');
      }

      ex = new expr.Binary(ex, operator, right);
    }

    return ex;
  }

  private comparision(): expr.Expr {
    let ex: expr.Expr = this.term();

    let operator: Token | null = null;
    let right: expr.Expr | null = null;

    while (this.match(TokenType.Greater, TokenType.GreaterEqual, TokenType.Less, TokenType.LessEqual)) {
      operator = this.previous();
      right = this.term();

      if (operator === null || right === null) {
        throw new Error('operator and right must not be null');
      }

      ex = new expr.Binary(ex, operator, right);
    }

    return ex;
  }

  private term(): expr.Expr {
    let ex: expr.Expr = this.factor();

    let operator: Token | null = null;
    let right: expr.Expr | null = null;

    while (this.match(TokenType.Minus, TokenType.Plus)) {
      operator = this.previous();
      right = this.factor();

      if (operator === null || right === null) {
        throw new Error('operator and right must not be null');
      }

      ex = new expr.Binary(ex, operator, right);
    }

    return ex;
  }

  private factor(): expr.Expr {
    let ex: expr.Expr = this.unary();

    let operator: Token | null = null;
    let right: expr.Expr | null = null;

    while (this.match(TokenType.Slash, TokenType.Star)) {
      operator = this.previous();
      right = this.unary();

      if (operator === null || right === null) {
        throw new Error('operator and right must not be null');
      }

      ex = new expr.Binary(ex, operator, right);
    }

    return ex;
  }

  private unary(): expr.Expr {
    if (this.match(TokenType.Bang, TokenType.Minus)) {
      const operator = this.previous();
      const right = this.unary();
      return new expr.Unary(operator, right);
    }

    return this.primary();
  }

  private primary(): expr.Expr {
    if (this.match(TokenType.False)) return new expr.Literal(false);
    if (this.match(TokenType.True)) return new expr.Literal(true);
    if (this.match(TokenType.Nil)) return new expr.Literal(null);

    if (this.match(TokenType.Number, TokenType.String)) {
      return new expr.Literal(this.previous().literal);
    }

    if (this.match(TokenType.LeftParen)) {
      const ex: expr.Expr = this.expression();
      this.consume(TokenType.RightParen, "Expect ')' after expression.");
      return new expr.Grouping(ex);
    }

    throw new Error(`unexpected token: ${this.peek()}`);
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string) {
    errors.error(token, message);
    return new Error('ParseError');
  }
}
