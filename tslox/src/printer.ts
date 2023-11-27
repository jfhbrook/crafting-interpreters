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

  parenthesize(name: string, ...exprs: expr.Expr[]) {
    return `(${name} ` + exprs.map((expr) => {
      return expr.accept(this)
    }).join(' ') + ')';
  }
}
