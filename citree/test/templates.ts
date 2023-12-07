import t from "tap";

import { render, RenderConfig } from "../src/templates";

const CONFIG: RenderConfig = {
  imports: ['import { Token } from "./token";'],
  types: [
    {
      name: "Expr",
      nodes: [
        {
          name: "Assign",
          fields:
            "public readonly name: Token, public readonly value: Expr | null",
        },
      ],
    },
  ],
};

const RENDERED = `import { Token } from "./token";

export interface ExprVisitor<R> {
  visitAssignExpr(node: Assign): R;

}

export abstract class Expr {
  abstract accept<R>(visitor: ExprVisitor<R>): R;
}

class Assign extends Expr {
  constructor(public readonly name: Token, public readonly value: Expr | null) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitAssignExpr(this);
  }
}
`;

t.equal(render(CONFIG), RENDERED, "it renders a basic config");
