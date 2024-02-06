import { Token, TokenType } from './token';
import * as expr from './expr';
import * as stmt from './stmt';
import { errors, ParseError } from './error';

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
      let statement = this.declaration();
      if (statement) {
        statements.push(statement);
      }
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

  private declaration(): stmt.Stmt | null {
    try {
      if (this.match(TokenType.Class)) return this.classDeclaration();
      if (this.match(TokenType.Fun)) return this.function("function");
      if (this.match(TokenType.Var)) return this.varDeclaration();

      return this.statement();
    } catch (err) {
      if (ParseError.isParseError(err)) {
        // THERE we go lol
        this.synchronize();
        return null;
      }
      throw err;
    }
  }

  private classDeclaration(): stmt.Stmt {
    const name: Token = this.consume(TokenType.Identifier, "Expect class name.");
    this.consume(TokenType.LeftBrace, "Expect '{' before class body.");

    const methods: stmt.Function[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      methods.push(this.function("method"));
    }

    this.consume(TokenType.RightBrace, "Expect '}' after class body.");

    return new stmt.Class(name, methods);
  }


  private varDeclaration(): stmt.Stmt {
    const name: Token = this.consume(TokenType.Identifier, "Expect variable name.");

    let initializer: expr.Expr | null = null;
    if (this.match(TokenType.Equal)) {
      initializer = this.expression();
    }

    this.consume(TokenType.Semicolon, "Expect ';' after variable name declaration.");
    return new stmt.Var(name, initializer);
  }

  private statement(): stmt.Stmt {
    if (this.match(TokenType.For)) return this.forStatement();
    if (this.match(TokenType.If)) return this.ifStatement();
    if (this.match(TokenType.Print)) return this.printStatement();
    if (this.match(TokenType.Return)) return this.returnStatement();
    if (this.match(TokenType.While)) return this.whileStatement();
    if (this.match(TokenType.LeftBrace)) return new stmt.Block(this.block());
    return this.expressionStatement();
  }

  // parses into a while statement - that syntactic sugar tho
  private forStatement(): stmt.Stmt {
    this.consume(TokenType.LeftParen, "Expect '(' after 'for'.");
    let initializer: stmt.Stmt | null;
    if (this.match(TokenType.Semicolon)) {
      initializer = null;
    } else if (this.match(TokenType.Var)) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition: expr.Expr = new expr.Literal(true);
    if (!this.check(TokenType.Semicolon)) {
      condition = this.expression();
    }
    this.consume(TokenType.Semicolon, "Expect ';' after loop condition.");

    let increment: expr.Expr | null = null;
    if (!this.check(TokenType.RightParen)) {
      increment = this.expression();
    }
    this.consume(TokenType.RightParen, "Expect ')' after for clauses.");
    let body = this.statement();

    if (increment != null) {
      body = new stmt.Block([body, new stmt.Expression(increment)]);
    }

    body = new stmt.While(condition, body);

    if (initializer) {
      body = new stmt.Block([ initializer, body ]);
    }

    return body;
  }

  private ifStatement(): stmt.Stmt {
    this.consume(TokenType.LeftParen, "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume(TokenType.RightParen, "Expect ')' after if condition.");

    const thenBranch = this.statement();
    let elseBranch: stmt.Stmt | null = null;
    if (this.match(TokenType.Else)) {
      elseBranch = this.statement();
    }

    return new stmt.If(condition, thenBranch, elseBranch);
  }

  private printStatement(): stmt.Stmt {
    const ex = this.expression();
    this.consume(TokenType.Semicolon, "Expect ';' after value.");
    return new stmt.Print(ex);
  }

  private returnStatement(): stmt.Stmt {
    const keyword = this.previous();
    let value: expr.Expr | null = null;
    if (!this.check(TokenType.Semicolon)) {
      value = this.expression();
    }

    this.consume(TokenType.Semicolon, "Expect ';' after return value.");
    return new stmt.Return(keyword, value);
  }

  private whileStatement(): stmt.Stmt {
    this.consume(TokenType.LeftParen, "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume(TokenType.RightParen, "Expect ')' after condition.");
    const body = this.statement();

    return new stmt.While(condition, body);
  }

  private block(): stmt.Stmt[] {
    const statements: stmt.Stmt[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const statement = this.declaration();
      if (statement) statements.push(statement);
    }

    this.consume(TokenType.RightBrace, "Expect '}' after block.");
    return statements;
  }

  private expressionStatement(): stmt.Stmt {
    const ex = this.expression();
    this.consume(TokenType.Semicolon, "Expect ';' after value.");
    return new stmt.Expression(ex);
  }

  private function(kind: string): stmt.Function {
    const name: Token = this.consume(TokenType.Identifier,  `Expect ${kind} name.`);
    this.consume(TokenType.LeftParen, `Expect '(' after ${kind} name.`);
    const parameters: Token[] = [];
    if (!this.check(TokenType.RightParen)) {
      do {
        if (parameters.length >= 255) {
          errors.error(this.peek(), "Can't have more than 255 parameters.");
        }

        parameters.push(this.consume(TokenType.Identifier, "Expect parameter name."));
      } while (this.match(TokenType.Comma));
    }
    this.consume(TokenType.RightParen, "Expect ')' after parameters.");
    this.consume(TokenType.LeftBrace, `Expect '{' before ${kind} body.`);
    const body: stmt.Stmt[] = this.block();
    return new stmt.Function(name, parameters, body);
  }

  private expression(): expr.Expr {
    return this.assignment();
  }

  private assignment(): expr.Expr {
    const ex = this.or();

    if (this.match(TokenType.Equal)) {
      const equals = this.previous();
      // assignment is right-associative, so instead of folding like with
      // "binary operator" we recursively parse the right hand side
      const value = this.assignment();

      // "the trick is that right before we create the assignment expression
      // node, we look at the left-hand side exoression and figure out what
      // kind of assignment target it is. We convert the r-value expression
      // node into an l-value representation.
      if (ex instanceof expr.Variable) {
        // "This means we can parse the left-hand side *as if it were an
        // expression* and then after the fact produce a syntax tree that
        // turns it into an assignment target.
        const name = ex.name;
        return new expr.Assign(name, value);
      }

      errors.error(equals, "Invalid assignment type.");
    }

    // note, if the next token *isn't* an assignment operator, then we just
    // return the expression as though we didn't do this whole assignment thing
    // at all.
    return ex;
  }

  private binaryOperator(
    types: TokenType[],
    operand: () => expr.Expr,
  ): expr.Expr {
    let ex: expr.Expr = operand();

    while (this.match(...types)) {
      const op = this.previous();
      const right = operand();

      ex = new expr.Binary(ex, op, right);
    }

    return ex;
  }

  private logicalOperator(
    types: TokenType[],
    operand: () => expr.Expr,
  ): expr.Expr {
    let ex: expr.Expr = operand();

    while (this.match(...types)) {
      const op = this.previous();
      const right = operand();

      ex = new expr.Logical(ex, op, right);
    }

    return ex;
  }

  private or() {
    return this.logicalOperator(
      [TokenType.Or],
      this.and.bind(this)
    );
  }

  private and() {
    return this.logicalOperator(
      [TokenType.And],
      this.equality.bind(this)
    );
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
    if (this.match(TokenType.Bang, TokenType.Minus)) {
      const op = this.previous();
      const right = this.unary();

      return new expr.Unary(op, right);
    }

    return this.call();
  }

  private call(): expr.Expr {
    let ex = this.primary();

    while (true) {
      if (this.match(TokenType.LeftParen)) {
        ex = this.finishCall(ex);
      } else if (this.match(TokenType.Dot)) {
        const name: Token = this.consume(TokenType.Identifier, "Expect property name after '.'.");
        ex = new expr.Get(ex, name);
      } else {
        break;
      }
    }

    return ex;
  }

  private finishCall(callee: expr.Expr) {
    const args: expr.Expr[] = [];
    if (!this.check(TokenType.RightParen)) {
      do {
        if (args.length >= 255) {
          errors.error(this.peek(), "Can't have more than 255 arguments.");
        }
        args.push(this.expression());
      } while (this.match(TokenType.Comma));
    }

    const paren = this.consume(TokenType.RightParen, "Expect ')' after arguments.");

    return new expr.Call(callee, paren, args);
  }

  private primary(): expr.Expr {
    if (this.match(TokenType.False)) return new expr.Literal(false);
    if (this.match(TokenType.True)) return new expr.Literal(true);
    if (this.match(TokenType.Nil)) return new expr.Literal(null);

    if (this.match(TokenType.Number, TokenType.String)) {
      return new expr.Literal(this.previous().literal);
    }

    if (this.match(TokenType.Identifier)) {
      return new expr.Variable(this.previous());
    }

    if (this.match(TokenType.LeftParen)) {
      const ex: expr.Expr = this.expression();
      this.consume(TokenType.RightParen, "Expect ')' after expression.");
      return new expr.Grouping(ex);
    }

    throw this.parseError(this.peek(), "Expect expression.");
  }
}
