import * as expr from './expr';
import * as stmt from './stmt';
import { Token, TokenType } from './token';
import { Value, Callable, isCallable } from './value';
import { Environment } from './environment';
import { Fn } from './function';
import { Class, Instance } from './class';
import { errors, Return, RuntimeError } from './error';

function checkNumberOperand(
  operator: Token,
  operand: Value,
): operand is number {
  if (typeof operand === 'number') return true;
  throw new RuntimeError(operator, 'Operand must be a number.');
}

// NOTE: This is an abstraction I added to DRY up binary operations.
function withNumberOperands(
  operator: Token,
  left: Value,
  right: Value,
  scope: (left: number, right: number) => Value,
): Value {
  if (typeof left === 'number' && typeof right === 'number') {
    return scope(left, right);
  }
  throw new RuntimeError(operator, 'Operands must be numbers.');
}

// Clock is a native function defined in pure JavaScript. In this case, we
// just need to implement the Callable interface and otherwise have free rein.
const CLOCK: Callable = {
  arity() {
    return 0;
  },
  call(_interpreter: Interpreter, _args: Value[]) {
    return Date.now() / 1000;
  },
};

export class Interpreter implements expr.Visitor<Value>, stmt.Visitor<void> {
  public readonly globals: Environment;
  private environment: Environment;
  private locals: Map<expr.Expr, number>;

  constructor() {
    this.globals = new Environment();
    this.environment = this.globals;

    this.globals.define('clock', CLOCK);

    this.locals = new Map();
  }

  public interpret(statements: stmt.Stmt[]): void {
    try {
      for (let statement of statements) {
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

  resolve(ex: expr.Expr, depth: number): void {
    this.locals.set(ex, depth);
  }

  executeBlock(statements: stmt.Stmt[], environment: Environment): void {
    const previous = this.environment;
    let error: any = null;
    try {
      this.environment = environment;

      for (let statement of statements) {
        this.execute(statement);
      }
    } catch (err) {
      error = err;
    }
    this.environment = previous;
    if (error) throw error;
  }

  visitBlockStmt(st: stmt.Block): void {
    this.executeBlock(st.statements, new Environment(this.environment));
  }

  visitClassStmt(st: stmt.Class): void {
    let superclass: Value = null;

    if (st.superclass) {
      superclass = this.evaluate(st.superclass);
      if (!(superclass instanceof Class)) {
        throw new RuntimeError(
          st.superclass.name,
          'Superclass must be a class.',
        );
      }
    }

    this.environment.define(st.name.lexeme, null);

    if (st.superclass) {
      this.environment = new Environment(this.environment);
      this.environment.define('super', superclass);
    }

    const methods: Map<string, Fn> = new Map();
    for (let method of st.methods) {
      const fn: Fn = new Fn(
        method,
        this.environment,
        method.name.lexeme === 'init',
      );
      methods.set(method.name.lexeme, fn);
    }

    const cls: Class = new Class(st.name.lexeme, superclass as Class, methods);

    if (superclass) {
      this.environment = this.environment.enclosing as Environment;
    }

    this.environment.assign(st.name, cls);
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
    const fn = new Fn(st, this.environment, false);
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
      throw new RuntimeError(
        stmt.name,
        'May not define a variable more than once.',
      );
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
    const distance = this.locals.get(ex);
    if (typeof distance === 'number') {
      this.environment.assignAt(distance, ex.name, value);
    } else {
      this.globals.assign(ex.name, value);
    }
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

  visitSetExpr(ex: expr.Set): Value {
    const object: Value = this.evaluate(ex.object);

    if (!(object instanceof Instance)) {
      throw new RuntimeError(ex.name, 'Only instances have fields.');
    }

    const value: Value = this.evaluate(ex.value);
    object.set(ex.name, value);
    return value;
  }

  visitSuperExpr(ex: expr.Super): Value {
    const distance = this.locals.get(ex);
    if (typeof distance === 'undefined') {
      throw new RuntimeError(ex.keyword, "'super' is undefined.");
    }
    const superclass = this.environment.getAt(distance, 'super') as Class;
    const object = this.environment.getAt(distance - 1, 'this') as Instance;

    const method = superclass.findMethod(ex.method.lexeme);
    if (!method) {
      throw new RuntimeError(
        ex.method,
        `'super.${ex.method.lexeme} is undefined.`,
      );
    }
    return method.bind(object);
  }

  visitThisExpr(ex: expr.This): Value {
    return this.lookupVariable(ex.keyword, ex);
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
        throw new RuntimeError(
          ex.operator,
          'Operands must be two numbers or two strings.',
        );
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

    if (!isCallable(callee)) {
      throw new RuntimeError(ex.paren, 'Can only call functions and classes.');
    }

    if (args.length !== callee.arity()) {
      throw new RuntimeError(
        ex.paren,
        `Expected ${callee.arity()} arguments but got ${args.length}.`,
      );
    }
    return callee.call(this, args);
  }

  visitGetExpr(ex: expr.Get): Value {
    const object: Value = this.evaluate(ex.object);
    if (object instanceof Instance) {
      return object.get(ex.name);
    }

    throw new RuntimeError(ex.name, 'Only instances have properties.');
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
    return this.lookupVariable(ex.name, ex);
  }

  private lookupVariable(name: Token, ex: expr.Expr): Value {
    const distance = this.locals.get(ex);
    if (typeof distance === 'number') {
      return this.environment.getAt(distance, name.lexeme);
    } else {
      return this.globals.get(name);
    }
  }
}
