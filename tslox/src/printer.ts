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

  visitBinaryExpr(expr: expr.Binary): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitGroupingExpr(expr: expr.Grouping): string {
    return this.parenthesize("group", expr.expression);
  }

  visitLiteralExpr(expr: expr.Literal): string {
    if (expr.value === null) return 'nil';
    return String(expr.value);
  }

  visitUnaryExpr(expr: expr.Unary): string {
    return this.parenthesize(expr.operator.lexeme, expr.right);
  }

  visitVariableExpr(expr: expr.Variable): string {
    return this.parenthesize('variable', expr.name);
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
