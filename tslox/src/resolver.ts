import { Token } from './token';
import * as expr from './expr';
import * as stmt from './stmt';
import { Interpreter } from './interpreter';
import { errors } from './error';

enum FunctionType {
  None,
  Function
}

// note this is doing "static" analysis, rather than stateful execution. that
// means no side effects, and no looping/branching.

export class Resolver implements expr.Visitor<void>, stmt.Visitor<void> {
  private readonly scopes: Array<Record<string, boolean>>;
  private currentFunction: FunctionType = FunctionType.None;

  constructor(private readonly interpreter: Interpreter) {
    this.scopes = [];
  }

  // create a scope, resolve everything in the block, end the scope
  public visitBlockStmt(st: stmt.Block) {
    this.beginScope();
    this.resolve(st.statements);
    this.endScope();
  }

  // all the visitors basically do the work of "resolving"
  public resolve(statements: stmt.Stmt[]): void
  public resolve(statement: stmt.Stmt): void
  public resolve(expr: expr.Expr): void
  public resolve(st: expr.Expr | stmt.Stmt | stmt.Stmt[]): void {
    if (st instanceof Array) {
      for (let statement of st) {
        this.resolve(statement);
      }
      return;
    }

    if (st instanceof expr.Expr) {
      st.accept(this);
    } else {
      st.accept(this);
    }
  }

  // scopes are kept on a stack
  private beginScope(): void {
    this.scopes.push({});
  }

  private endScope() {
    this.scopes.pop();
  }

  // declare a variable, resolve its initializer if it has one, then *define*
  // it.
  visitVarStmt(st: stmt.Var): void {
    this.declare(st.name);
    if (st.initializer !== null) {
      this.resolve(st.initializer);
    }
    this.define(st.name);
  }

  // mark as declared (in the scope) but NOT resolved (false)
  private declare(name: Token): void {
    if (!this.scopes.length) return;

    const scope = this.scopes[this.scopes.length - 1];
    if (typeof scope[name.lexeme] !== 'undefined') {
      errors.error(name, "Already a varable with this name in this scope.");
    }

    scope[name.lexeme] = false;
  }

  // marked as resolved by setting to true
  private define(name: Token): void {
    if (!this.scopes.length) return;

    this.scopes[this.scopes.length - 1][name.lexeme] = true;
  }

  // assuming the variable definition doesn't reference itself, resolve the
  // local variable
  visitVariableExpr(ex: expr.Variable) {
    if (!this.scopes.length && this.scopes[this.scopes.length - 1][ex.name.lexeme] === false) {
      errors.error(ex.name, "Can't read local variable in its own initializer.");
    }

    this.resolveLocal(ex, ex.name);
  }

  // resolving a local variable means traversing the scopes from the inside
  // out (top-down stack-wise) until you find the variable has been either
  // declared or fully resolved; then tell the interpreter to resolve that
  // variable by "counting up" to the correct scope at runtime
  private resolveLocal(ex: expr.Expr, name: Token): void {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (typeof this.scopes[i][name.lexeme] === 'boolean') {
        this.interpreter.resolve(ex, this.scopes.length - 1 - i);
        return;
      }
    }
  }

  // resolve anything in the value getting assigned to it, then resolve the
  // local variable to that expression
  visitAssignExpr(ex: expr.Assign): void {
    this.resolve(ex.value);
    this.resolveLocal(ex, ex.name);
  }

  // create a scope, then declare/define the function's parameters, then
  // resolve anything in the body
  visitFunctionStmt(st: stmt.Function): void {
    this.declare(st.name);
    this.define(st.name);

    this.resolveFunction(st, FunctionType.Function);
  }

  private resolveFunction(fn: stmt.Function, type: FunctionType): void {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;
    this.beginScope();
    for (let param of fn.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolve(fn.body);
    this.endScope();
    this.currentFunction = enclosingFunction;
  }

  // everything from here on is pretty boring, mostly traversing/visiting the
  // various expressions
  visitExpressionStmt(st: stmt.Expression): void {
    this.resolve(st.expression);
  }

  visitIfStmt(st: stmt.If): void {
    this.resolve(st.condition);
    this.resolve(st.thenBranch);
    if (st.elseBranch !== null) this.resolve(st.elseBranch);
  }

  visitPrintStmt(st: stmt.Print): void {
    this.resolve(st.expression);
  }

  visitReturnStmt(st: stmt.Return): void {
    // You can in lua!! lol
    if (this.currentFunction === FunctionType.None) {
      errors.error(st.keyword, "Can't return from top-level code.");
    }

    if (st.value !== null) {
      this.resolve(st.value);
    }
  }

  visitWhileStmt(st: stmt.While): void {
    this.resolve(st.condition);
    this.resolve(st.body);
  }

  visitBinaryExpr(ex: expr.Binary): void {
    this.resolve(ex.left);
    this.resolve(ex.right);
  }

  visitCallExpr(ex: expr.Call): void {
    this.resolve(ex.callee);

    for (let arg of ex.args) {
      this.resolve(arg);
    }
  }

  visitGroupingExpr(ex: expr.Grouping): void {
    this.resolve(ex.expression);
  }

  visitLiteralExpr(_: expr.Literal): void {
  }

  visitLogicalExpr(ex: expr.Logical): void {
    this.resolve(ex.left);
    this.resolve(ex.right);
  }

  visitUnaryExpr(ex: expr.Unary): void {
    this.resolve(ex.right);
  }
}