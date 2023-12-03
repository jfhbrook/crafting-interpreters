import * as expr from './expr';
import * as stmt from './stmt';
import { Token, TokenType } from './token';
import { Value } from './value';
import { Environment } from './environment';
import { Fn } from './function';
import { errors, Return, RuntimeError } from './error';

function checkNumberOperand(operator: Token, operand: Value): operand is number {
  if (typeof operand === 'number') return true;
  throw new RuntimeError(operator, "Operand must be a number.");
}

function withNumberOperands(
  operator: Token,
  left: Value,
  right: Value,
  scope: (left: number, right: number) => Value
): Value {
  if (typeof left === 'number' && typeof right === 'number') {
    return scope(left, right);
  }
  throw new RuntimeError(operator, "Operands must be numbers.");
}

// This is similar to my concept of Flags...
export interface Flags {
  repl: boolean;
}

function enumerateStatements(statements: stmt.Stmt[]) {
  return statements.map((statement, i) => {
    return {i, statement};
  });
}

export class Interpreter implements expr.Visitor<Value>, stmt.Visitor<void> {
  public flags: Flags = { repl: false };
  public readonly globals: Environment;
  private environment: Environment;

  constructor() {
    this.globals = new Environment();
    this.environment = this.globals;
    
    this.globals.define("clock", {
      arity() { return 0; },
      call(interpreter: Interpreter, args: Value[]) {
        return Date.now() / 1000;
      }
    });
  }

  public interpret(statements: stmt.Stmt[]): void {
    try {
      for (let {i, statement} of enumerateStatements(statements)) {
        this.execute(statement);
      }
    } catch (err) {
      if (RuntimeError.isRuntimeError(err)) {
        errors.runtimeError(err as RuntimeError);
      } else {
        throw err;
      }
    }
  }

  private stringify(value: Value): string {
    if (value === null) return 'nil';

    if (typeof value === 'number') {
      // jlox carries values as doubles throughout and drops the '.0' if it's
      // practically an int, but javascript's number semantics should be good
      // enough here.
      return value.toString();
    }

    return String(value);
  }

  private execute<S extends stmt.Stmt>(st: S): void {
    st.accept(this);
  }

  executeBlock(statements: stmt.Stmt[], environment: Environment): void {
    const previous = this.environment;
    let error: any = null;
    try {
      this.environment = environment;

      for (let statement of statements) {
        this.execute(statement);
      }
    } catch(err) {
      error = err;
    }
    this.environment = previous;
    if (error) throw error;
  }


  visitBlockStmt(st: stmt.Block): void {
    this.executeBlock(st.statements, new Environment(this.environment));
  }

  private evaluate<E extends expr.Expr>(ex: E): Value {
    return ex.accept(this);
  }

  private isTruthy(value: Value) {
    if (value === null) return false;
    if (value === 0) return false;
    if (typeof value === 'boolean') return value;
    return true;
  }

  private isEqual(a: Value, b: Value): boolean {
    if (a === null && b === null) return true;
    if (a === null) return false;
    return a === b;
  }

  visitExpressionStmt(st: stmt.Expression): void {
    this.evaluate(st.expression);
  }

  visitFunctionStmt(st: stmt.Function): void {
    const fn = new Fn(st, this.environment);
    this.environment.define(st.name.lexeme, fn);
  }

  visitIfStmt(st: stmt.If): void {
    if (this.isTruthy(this.evaluate(st.condition))) {
      this.execute(st.thenBranch);
    } else if (st.elseBranch !== null) {
      this.execute(st.elseBranch);
    }
  }

  visitPrintStmt(stmt: stmt.Print): void {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
  }

  visitReturnStmt(st: stmt.Return): void {
    const value = st.value !== null ? this.evaluate(st.value) : null;

    throw new Return(value);
  }

  visitVarStmt(stmt: stmt.Var): void {
    if (this.environment.has(stmt.name)) {
      throw new RuntimeError(stmt.name, "May not define a variable more than once.");
    }
    let value: Value = null;
    if (stmt.initializer != null) {
      value = this.evaluate(stmt.initializer);
    }

    this.environment.define(stmt.name.lexeme, value);
  }

  visitWhileStmt(stmt: stmt.While): void {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
  }

  visitAssignExpr(ex: expr.Assign) {
    const value = this.evaluate(ex.value);
    this.environment.assign(ex.name, value);
    return value;
  }

  visitLogicalExpr(ex: expr.Logical): Value {
    const left: Value = this.evaluate(ex.left);

    if (ex.operator.type === TokenType.Or) {
      if (this.isTruthy(left)) return left;
    } else {
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(ex.right);
  }

  visitBinaryExpr(ex: expr.Binary): Value {
    const left: Value = this.evaluate(ex.left);
    const right: Value = this.evaluate(ex.right);

    switch (ex.operator.type) {
      case TokenType.Minus:
        return withNumberOperands(ex.operator, left, right, (l, r) => l - r);
      case TokenType.Plus:
        if (typeof left === 'number' && typeof right === 'number') {
          return left + right;
        } else if (typeof left === 'string' && typeof right === 'string') {
          return left + right;
        }
        throw new RuntimeError(ex.operator, "Operands must be two numbers or two strings.");
      case TokenType.Slash:
        return withNumberOperands(ex.operator, left, right, (l, r) => l / r);
      case TokenType.Star:
        return withNumberOperands(ex.operator, left, right, (l, r) => l * r);
      case TokenType.Greater:
        return withNumberOperands(ex.operator, left, right, (l, r) => l > r);
      case TokenType.GreaterEqual:
        return withNumberOperands(ex.operator, left, right, (l, r) => l >= r);
      case TokenType.Less:
        return withNumberOperands(ex.operator, left, right, (l, r) => l < r);
      case TokenType.LessEqual:
        return withNumberOperands(ex.operator, left, right, (l, r) => l <= r);
      case TokenType.BangEqual:
        return !this.isEqual(left, right);
      case TokenType.EqualEqual:
        return this.isEqual(left, right);
    }

    return null;
  }

  visitCallExpr(ex: expr.Call): Value {
    const callee: Value = this.evaluate(ex.callee);

    const args = [];
    for (let arg of ex.args) {
      args.push(this.evaluate(arg));
    }

    if (!Fn.isFunction(callee)) {
      throw new RuntimeError(ex.paren, "Can only call functions and classes.");
    }

    if (args.length !== callee.arity()) {
      throw new RuntimeError(ex.paren, `Expected ${callee.arity()} arguments but got ${args.length}.`);
    }
    return callee.call(this, args);
  }

  visitGroupingExpr(ex: expr.Grouping): Value {
    return ex.accept(this);
  }

  visitLiteralExpr(ex: expr.Literal): Value {
    return ex.value;
  }

  visitUnaryExpr(ex: expr.Unary): Value {
    const right = this.evaluate(ex.right);

    switch (ex.operator.type) {
      case TokenType.Minus:
        if (checkNumberOperand(ex.operator, right)) return -ex.right;
      case TokenType.Bang:
        return !this.isTruthy(right);
    }

    return null;
  }

  visitVariableExpr(ex: expr.Variable): Value {
    return this.environment.get(ex.name);
  }
}
