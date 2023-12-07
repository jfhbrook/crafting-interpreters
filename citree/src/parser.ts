import {
  alt,
  apply,
  list_sc,
  opt,
  Parser,
  rep,
  seq,
  tok,
  Token
} from "typescript-parsec";
import { TokenKind } from "./scanner";

export type ImportStatement = {
  type: "import";
  statement: string;
  path: string;
};

export type NodeDefinition = {
  type: "node";
  name: string;
  fields: string;
};

export type TypeDefinition = {
  type: "type";
  name: string;
  path: string | null;
  imports: ImportStatement[];
  nodes: NodeDefinition[];
};

export type Spec = {
  imports: ImportStatement[];
  types: TypeDefinition[];
};

function applyPath(pathToken: Token<TokenKind>): string {
    let path = pathToken.text;
    if (path[0] === "'") {
      path = path.slice(1, path.length - 1);
      path = path.replace(/"/, '\\"').replace(/\\'/, "'");
      path = `"${path}"`;
    }
    path = JSON.parse(path);
    return path;
}

const importStatement: Parser<TokenKind, ImportStatement> = apply(
  seq(
    tok(TokenKind.Import),
    alt(
      apply(
        seq(tok(TokenKind.Asterisk), tok(TokenKind.As), tok(TokenKind.Ident)),
        ([_asterisk, _as, ident]) => `* as ${ident.text}`,
      ),
      apply(tok(TokenKind.Asterisk), (_) => "*"),
      apply(tok(TokenKind.Ident), (ident) => ident.text),
      apply(
        seq(
          tok(TokenKind.LBrace),
          list_sc(tok(TokenKind.Ident), tok(TokenKind.Comma)),
          tok(TokenKind.RBrace),
        ),
        ([_lbrace, idents, _rbrace]) =>
          `{ ${idents.map((i) => i.text).join(", ")} }`,
      ),
    ),
    tok(TokenKind.From),
    tok(TokenKind.Path),
  ),
  ([_import, target, _from, pathToken]) => {
    const path = applyPath(pathToken);
    return {
      type: "import",
      statement: `import ${target} from ${JSON.stringify(path)};`,
      path,
    };
  },
);

const fieldDefinition = apply(
  seq(
    tok(TokenKind.Ident),
    tok(TokenKind.OfType),
    rep(alt(tok(TokenKind.Ident), tok(TokenKind.Union))),
  ),
  ([ident, _ofType, type]) =>
    `${ident.text}: ${type.map((t) => t.text).join(" ")}`,
);

const nodeDefinition: Parser<TokenKind, NodeDefinition> = apply(
  seq(
    tok(TokenKind.Ident),
    tok(TokenKind.HasFields),
    list_sc(fieldDefinition, tok(TokenKind.Comma)),
  ),
  ([name, _hasFields, fields]) => {
    return {
      type: "node",
      name: name.text,
      fields: fields.map((f) => `public readonly ${f}`).join(", "),
    };
  },
);

const typeBody = rep(alt(importStatement, nodeDefinition));

const typeDefinition: Parser<TokenKind, TypeDefinition> = apply(
  seq(
    tok(TokenKind.Type),
    tok(TokenKind.Ident),
    opt(seq(tok(TokenKind.In), tok(TokenKind.Path))),
    tok(TokenKind.LBrace),
    typeBody,
    tok(TokenKind.RBrace),
  ),
  ([_type, name, path, _lbrace, body, _rbrace]) => {
    const imps: ImportStatement[] = [];
    const nodes: NodeDefinition[] = [];

    for (const statement of body) {
      if (statement.type === "import") {
        imps.push(statement);
      } else {
        nodes.push(statement);
      }
    }
    return {
      type: "type",
      name: name.text,
      path: path ? applyPath(path[1]) : null,
      imports: imps,
      nodes,
    };
  },
);

export const parser: Parser<TokenKind, Spec> = apply(
  rep(alt(importStatement, typeDefinition)),
  (statements) => {
    const spec: Spec = {
      imports: [],
      types: [],
    };

    for (const statement of statements) {
      if (statement.type === "import") {
        spec.imports.push(statement);
      } else {
        spec.types.push(statement);
      }
    }

    return spec;
  },
);
