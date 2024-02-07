import { Token } from './token';
import * as expr from './expr';
import * as stmt from './stmt';
import { Interpreter } from './interpreter';
import { errors } from './error';

enum FunctionType {
  None,
  Function,
  Initializer,
  Method,
}

enum ClassType {
  None,
  Class,
  SubClass,
}

// The resolver goes through the parsed code, figures out what variables
// are being referenced, and sends that information to the interpreter.
// The interpreter then uses that to traverse up the correct number of
// environments to access a variable.
//
// This step could easily be baked into the parser, and in fact that's how it's
// done in clox. But this shows us an example of a multi-stage process.
//
// This is a static analysis step, so there aren't otherwise any side
// effects, nor is there any looping/branching.
export class Resolver implements expr.Visitor<void>, stmt.Visitor<void> {
  private readonly scopes: Array<Record<string, boolean>>;
  private currentFunction: FunctionType = FunctionType.None;
  private currentClass: ClassType = ClassType.None;

  constructor(private readonly interpreter: Interpreter) {
    this.scopes = [];
  }

  // Create a scope, resolve everything in the block, end the scope
  public visitBlockStmt(st: stmt.Block) {
    this.beginScope();
    this.resolve(st.statements);
    this.endScope();
  }

  // All the visitors basically do the work of "resolving"
  public resolve(statements: stmt.Stmt[]): void;
  public resolve(statement: stmt.Stmt): void;
  public resolve(expr: expr.Expr): void;
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

  // "Why are declaring and defining two separate steps?" Resolving variables
  // has to happen in the initializer after the variable has been declared
  // but before it's defined. This is largely so we can ensure a variable
  // initializer doesn't reference itself.
  visitVarStmt(st: stmt.Var): void {
    // Declare the variable
    this.declare(st.name);
    // Resolve its initializer (if it has one)
    if (st.initializer !== null) {
      this.resolve(st.initializer);
    }
    // Define the variable
    this.define(st.name);
  }

  // Declaring marks a variable as in-scope, but doesn't treat it as resolved.
  private declare(name: Token): void {
    if (!this.scopes.length) return;

    const scope = this.scopes[this.scopes.length - 1];
    if (typeof scope[name.lexeme] !== 'undefined') {
      errors.error(name, 'Already a varable with this name in this scope.');
    }

    scope[name.lexeme] = false;
  }

  // A defined variable is not only declared, but has its value assigned.
  private define(name: Token): void {
    if (!this.scopes.length) return;

    this.scopes[this.scopes.length - 1][name.lexeme] = true;
  }

  // When visiting a variable expression, validate it and then resolve it as
  // a local variable
  visitVariableExpr(ex: expr.Variable) {
    if (
      this.scopes.length &&
      this.scopes[this.scopes.length - 1][ex.name.lexeme] === false
    ) {
      errors.error(
        ex.name,
        "Can't read local variable in its own initializer.",
      );
    }

    this.resolveLocal(ex, ex.name);
  }

  // Resolving a local variable means traversing the scopes from the inside
  // out (top-down stack-wise) until we find the variable has been either
  // declared or fully resolved. Then we tell the interpreter to resolve that
  // variable by "counting up" to the correct scope at runtime.
  private resolveLocal(ex: expr.Expr, name: Token): void {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (typeof this.scopes[i][name.lexeme] === 'boolean') {
        this.interpreter.resolve(ex, this.scopes.length - 1 - i);
        return;
      }
    }
  }

  // Resolve the value getting assigned, then resolve the local variable in
  // that expression
  visitAssignExpr(ex: expr.Assign): void {
    this.resolve(ex.value);
    this.resolveLocal(ex, ex.name);
  }

  // Create a scope, then declare/define the function's parameters, then
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

  public visitClassStmt(st: stmt.Class): void {
    const enclosingClass = this.currentClass;
    this.currentClass = ClassType.Class;

    // Declare and define the class itself
    this.declare(st.name);
    this.define(st.name);

    if (st.superclass) {
      if (st.name.lexeme === st.superclass.name.lexeme) {
        errors.error(st.superclass.name, "A class can't inherit from itself.");
      }

      this.currentClass = ClassType.SubClass;

      // Resolve the superclass
      this.resolve(st.superclass);

      this.beginScope();

      // Declares and defines 'super'
      this.scopes[this.scopes.length - 1]['super'] = true;
    }

    this.beginScope();

    // Declares and defines 'this'
    this.scopes[this.scopes.length - 1]['this'] = true;

    // Resolve each method
    for (let method of st.methods) {
      let declaration = FunctionType.Method;
      if (method.name.lexeme === 'init') {
        declaration = FunctionType.Initializer;
      }
      this.resolveFunction(method, declaration);
    }

    this.endScope();

    if (st.superclass) this.endScope();
    this.currentClass = enclosingClass;
  }

  // The rest of these are traversing and visiting various expressions, largely
  // just calling resolve on their children nodes.
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
      if (this.currentFunction === FunctionType.Initializer) {
        errors.error(st.keyword, "Can't return a value from an initializer.");
      }
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

  visitGetExpr(ex: expr.Get): void {
    this.resolve(ex.object);
  }

  visitGroupingExpr(ex: expr.Grouping): void {
    this.resolve(ex.expression);
  }

  visitLiteralExpr(_: expr.Literal): void {}

  visitLogicalExpr(ex: expr.Logical): void {
    this.resolve(ex.left);
    this.resolve(ex.right);
  }

  visitSetExpr(ex: expr.Set): void {
    this.resolve(ex.value);
    this.resolve(ex.object);
  }

  visitSuperExpr(ex: expr.Super): void {
    if (this.currentClass === ClassType.None) {
      errors.error(ex.keyword, "Can't use 'super' outside of a class.");
    } else if (this.currentClass != ClassType.SubClass) {
      errors.error(
        ex.keyword,
        "Can't user 'super' in a class with no superclass.",
      );
    }

    this.resolveLocal(ex, ex.keyword);
  }

  visitThisExpr(ex: expr.This): void {
    if (this.currentClass === ClassType.None) {
      errors.error(ex.keyword, "Can't use 'this' outside of a class.");
    }
    this.resolveLocal(ex, ex.keyword);
  }

  visitUnaryExpr(ex: expr.Unary): void {
    this.resolve(ex.right);
  }
}
