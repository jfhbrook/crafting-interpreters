import { format } from 'util';
import { ExprVisitor, Expr, Binary, Grouping, Literal, Unary } from './expr';

export class AstPrinter implements ExprVisitor<string> {
  print(expr: Expr | null): string {
    if (!expr) {
      return '';
    }
    // if (process.env.DEBUG) return format(expr);
    return expr.accept(this);
  }

  visitBinaryExpr(expr: Binary): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitGroupingExpr(expr: Grouping): string {
    return this.parenthesize("group", expr.expression);
  }

  visitLiteralExpr(expr: Literal): string {
    if (expr.value === null) return 'nil';
    return String(expr.value);
  }

  visitUnaryExpr(expr: Unary): string {
    return this.parenthesize(expr.operator.lexeme, expr.right);
  }

  parenthesize(name: string, ...exprs: Expr[]) {
    return `(${name} ` + exprs.map((expr) => {
      return expr.accept(this)
    }).join(' ') + ')';
  }
}
