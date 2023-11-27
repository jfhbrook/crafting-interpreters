import { Token, TokenType } from './token';
import * as expr from './expr';
import * as stmt from './stmt';
import { errors } from './error';

class ParseError extends Error {
  constructor() { super('ParseError'); }
}

// I'm 100% doing poor man's tracing here. I might oughta use the actual
// tracing create in my rusty BASIC for this kind of debug reporting.
function debug(...args: any): void {
  if (process.env.DEBUG) {
    console.error(...args);
  }
}

export class Parser {
  private current: number;

  constructor(private readonly tokens: Token[]) {
    this.current = 0;
  }

  public parse(): stmt.Stmt[] {
    const statements: stmt.Stmt[] = [];
    while (!this.isAtEnd()) {
      statements.push(this.statement());
    }

    return statements;
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
    if (!this.isAtEnd()) {
      this.current++;
      debug(`advance to ${this.current} (${this.peek()})`)
    }
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

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    throw this.parseError(this.peek(), message);
  }

  private parseError(token: Token, message: string) {
    errors.error(token, message);
    return new ParseError();
  }

  // When we hit a parse error, "[w]e want to discard tokens until we're right
  // at the beginning of the next statement" so that the parser can keep
  // going. This is so we can do a best effort at parsing instead of
  // crashing.
  //
  // In the case of my BASIC, I probably want "synchronize" functions which
  // drop tokens for exprs, instructions and commands respectively. I can
  // then call these in the code which collects VerboseErrors and reifies
  // them into Exceptions.
  private synchronize() {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.Semicolon) return;

      switch (this.peek().type) {
        case TokenType.Class:
        case TokenType.Fun:
        case TokenType.Var:
        case TokenType.For:
        case TokenType.If:
        case TokenType.While:
        case TokenType.Print:
        case TokenType.Return:
          return;
      }

      this.advance();
    }
  }

  private statement(): stmt.Stmt {
    if (this.match(TokenType.Print)) return this.printStatement();
    return this.expressionStatement();
  }

  private printStatement(): stmt.Stmt {
    const ex = this.expression();
    this.consume(TokenType.Semicolon, "Expect ';' after value.");
    return new stmt.Print(ex);
  }

  private expressionStatement(): stmt.Stmt {
    const ex = this.expression();
    this.consume(TokenType.Semicolon, "Expect ';' after value.");
    return new stmt.Expression(ex);
  }

  private expression(): expr.Expr {
    debug('expression()');
    return this.equality();
  }

  private binaryOperator(
    types: TokenType[],
    operand: () => expr.Expr,
  ): expr.Expr {
    debug(`binaryOperator(${types}, ${operand})`);
    const start: Token = this.peek();
    let ex: expr.Expr = operand();

    debug(`  start: ${start}`);
    // debug(`  ex: ${ex}`);

    let op: Token | null = null;
    let right: expr.Expr | null = null;

    while (this.match(...types)) {
      op = this.previous();
      debug(`  match op: ${op}`);
      right = operand();
      debug(`  right: ${right}`);

      if (op === null || right === null) {
        throw this.parseError(start, "Expect expression.");
      }

      ex = new expr.Binary(ex, op, right);
    }

    return ex;
  }

  private equality(): expr.Expr {
    return this.binaryOperator(
      [TokenType.BangEqual, TokenType.EqualEqual],
      this.comparison.bind(this)
    );
  }

  private comparison(): expr.Expr {
    return this.binaryOperator(
      [TokenType.Greater, TokenType.GreaterEqual, TokenType.Less, TokenType.LessEqual],
      this.term.bind(this)
    );
  }

  private term(): expr.Expr {
    return this.binaryOperator(
      [TokenType.Minus, TokenType.Plus],
      this.factor.bind(this)
    );
  }

  private factor(): expr.Expr {
    return this.binaryOperator(
      [TokenType.Slash, TokenType.Star],
      this.unary.bind(this)
    );
  }

  private unary(): expr.Expr {
    debug('unary()');
    if (this.match(TokenType.Bang, TokenType.Minus)) {
      const op = this.previous();
      const right = this.unary();

      debug(`  match op: ${op}`);
      // debug(`  right: ${right}`);

      return new expr.Unary(op, right);
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

    throw this.parseError(this.peek(), "Expect expression.");
  }
}
