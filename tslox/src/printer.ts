import * as expr from './expr';

export class AstPrinter implements expr.Visitor<string> {
  print(expr: expr.Expr | null): string {
    if (!expr) {
      return '';
    }
    return expr.accept(this);
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
