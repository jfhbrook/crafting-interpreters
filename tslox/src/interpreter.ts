import * as expr from './expr';
import * as stmt from './stmt';
import { Token, TokenType } from './token';
import { Value } from './value';
import { errors, RuntimeError } from './error';

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

export class Interpreter implements expr.Visitor<Value>, stmt.Visitor<void> {
  public flags: Flags = { repl: false };
  private executedExprStmtValue: Value | undefined = undefined;
  private lastExecutedExprStmtValue: Value | undefined = undefined;

  public interpret(statements: stmt.Stmt[]): void {
    try {
      let statement: stmt.Stmt = null as unknown as stmt.Stmt;
      for (let i = 0; i < statements.length; i++) {
        statement = statements[i];

        this.execute(statement);

        if (i == statements.length - 1) {
          this.saveExecutedExprStmtValue();
        }

        this.clearExecutedExprStmtValue();
      }
    } catch (err) {
      if (err instanceof RuntimeError) {
        errors.runtimeError(err);
      }
      throw err;
    }

    this.printExecutedExprStmtValue();
  }

  // This logic is meant to print the last statement, *if* it was an
  // expression statement *and* repl mode is activated. It's a bit obnoxious
  // to implement but really helps with the usability of the repl.
  //
  // I'll almost certainly want to implement this in my BASIC.
  private registerExecutedExprStmtValue(value: Value): void {
    if (this.flags.repl) {
      this.executedExprStmtValue = value;
    }
  }

  private saveExecutedExprStmtValue(): void {
    if (typeof this.executedExprStmtValue !== 'undefined') {
      this.lastExecutedExprStmtValue = this.executedExprStmtValue;
    }
  }

  private clearExecutedExprStmtValue(): void {
    this.executedExprStmtValue = undefined;
  }

  private printExecutedExprStmtValue(): void {
    if (this.flags.repl && typeof this.lastExecutedExprStmtValue !== 'undefined') {
      console.log(this.stringify(this.lastExecutedExprStmtValue));
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

  private evaluate<E extends expr.Expr>(ex: E): Value {
    return ex.accept(this);
  }

  private isTruthy(value: Value) {
    if (value === null) return false;
    if (typeof value === 'boolean') return value;
    return true;
  }

  private isEqual(a: Value, b: Value): boolean {
    if (a === null && b === null) return true;
    if (a === null) return false;
    return a === b;
  }

  visitExpressionStmt(stmt: stmt.Expression): void {
    const value = this.evaluate(stmt.expression);

    this.registerExecutedExprStmtValue(value);
  }

  visitPrintStmt(stmt: stmt.Print): void {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
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
}
