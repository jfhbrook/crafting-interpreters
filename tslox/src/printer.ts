import { Token } from './token';
import * as expr from './expr';
import * as stmt from './stmt';

export class AstPrinter implements expr.Visitor<string>, stmt.Visitor<string> {
  print(node: stmt.Stmt[] | expr.Expr | stmt.Stmt | null): string {
    if (node instanceof Array) {
      return `[${node.map(this.print.bind(this)).join(' ')}]`;
    } else if (node instanceof expr.Expr) {
      return node.accept(this);
    } else if (node instanceof stmt.Stmt) {
      return node.accept(this);
    } else {
      return '';
    }
  }

  visitExpressionStmt(stmt: stmt.Expression): string {
    return this.parenthesize("expr", stmt.expression);
  }

  visitPrintStmt(stmt: stmt.Print): string {
    return this.parenthesize("print", stmt.expression);
  }

  visitVarStmt(stmt: stmt.Var): string {
    if (stmt.initializer === null) {
      return this.parenthesize("var", stmt.name);
    }
    return this.parenthesize("var", stmt.name, stmt.initializer);
  }

  visitBinaryExpr(ex: expr.Binary): string {
    return this.parenthesize(ex.operator.lexeme, ex.left, ex.right);
  }

  visitGroupingExpr(ex: expr.Grouping): string {
    return this.parenthesize("group", ex.expression);
  }

  visitLiteralExpr(ex: expr.Literal): string {
    if (ex.value === null) return 'nil';
    return String(ex.value);
  }

  visitUnaryExpr(ex: expr.Unary): string {
    return this.parenthesize(ex.operator.lexeme, ex.right);
  }

  visitVariableExpr(ex: expr.Variable): string {
    return this.parenthesize('variable', ex.name);
  }

  visitAssignExpr(ex: expr.Assign): string {
    return this.parenthesize('assign', ex.name, ex.value);
  }

  parenthesize(name: string, ...exprs: Array<expr.Expr | Token | string>) {
    return `(${name} ` + exprs.map((expr) => {
      if (typeof expr === 'string') {
        return expr;
      }
      if (expr instanceof Token) {
        return expr.lexeme;
      }
      return expr.accept(this)
    }).join(' ') + ')';
  }
}
