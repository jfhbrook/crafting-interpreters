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

  visitExpressionStmt(st: stmt.Expression): string {
    return this.parenthesize("expr", st.expression);
  }

  visitPrintStmt(st: stmt.Print): string {
    return this.parenthesize("print", st.expression);
  }

  visitBlockStmt(st: stmt.Block): string {
    return this.parenthesize("block", this.print(st.statements));
  }

  visitVarStmt(st: stmt.Var): string {
    if (st.initializer === null) {
      return this.parenthesize("var", st.name);
    }
    return this.parenthesize("var", st.name, st.initializer);
  }

  visitIfStmt(st: stmt.If): string {
    if (st.elseBranch === null) {
      return this.parenthesize("if", st.condition, st.thenBranch);
    }
    return this.parenthesize("if", st.condition, st.thenBranch, st.elseBranch);
  }

  visitLogicalExpr(ex: expr.Logical): string {
    return this.parenthesize(ex.operator.lexeme, ex.left, ex.right);
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

  parenthesize(name: string, ...exprs: Array<stmt.Stmt | expr.Expr | Token | string>) {
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
