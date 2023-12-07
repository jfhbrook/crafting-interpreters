import { alt, apply, list_sc, opt, Parser, rep, seq, tok } from 'typescript-parsec';
import { TokenKind } from './scanner';

type ImportStatement = {
  import: string
};

type NodeDefinition = {
  node: string,
  fields: string
};


const importStatement: Parser<TokenKind, ImportStatement> = apply(
  seq(
    tok(TokenKind.Import),
    alt(
      apply(
        seq(
          tok(TokenKind.Asterisk),
          tok(TokenKind.As),
          tok(TokenKind.Ident)
        ),
        ([_asterisk, _as, ident]) => `* as ${ident.text}`
      ),
      apply(tok(TokenKind.Asterisk), (_) => '*'),
      apply(tok(TokenKind.Ident), (ident) => ident.text),
      apply(
        seq(
          tok(TokenKind.LBrace),
          list_sc(tok(TokenKind.Ident), tok(TokenKind.Comma)),
          tok(TokenKind.RBrace)
        ),
        ([_lbrace, idents, _rbrace]) => `{ ${idents.map(i => i.text).join(', ')} }`
      )
    ),
    tok(TokenKind.From),
    tok(TokenKind.Path)
  ),
  ([_import, target, _from, path]) => {
    return {
      import: `import ${target} from ${path.text};`
    };
  }
);

const fieldDefinition = apply(
  seq(
    tok(TokenKind.Ident),
    tok(TokenKind.OfType),
    rep(
      alt(
        tok(TokenKind.Ident),
        tok(TokenKind.Union)
      )
    )
  ),
  ([ident, _ofType, type]) => `${ident.text}: ${type.map(t => t.text).join(' ')}`
);

const nodeDefinition: Parser<TokenKind, NodeDefinition> = apply(
  seq(
    tok(TokenKind.Ident),
    tok(TokenKind.HasFields),
    list_sc(fieldDefinition, tok(TokenKind.Comma))
  ),
  ([name, _hasFields, fields]) => {
    return {
      node: name.text,
      fields: fields.join(', ')
    };
  }
);

const typeBody = rep(
  alt(
    importStatement,
    nodeDefinition
  )
);

type TypeDefinition = {
  type: string,
  path: string | null,
  body: Array<ImportStatement | NodeDefinition>
};

const typeDefinition: Parser<TokenKind, TypeDefinition> = apply(
  seq(
    tok(TokenKind.Type),
    tok(TokenKind.Ident),
    opt(
      seq(
        tok(TokenKind.In),
        tok(TokenKind.Path)
      )
    ),
    tok(TokenKind.LBrace),
    typeBody,
    tok(TokenKind.RBrace)
  ),
  ([_type, name, path, _lbrace, body, _rbrace]) => {
    return {
      type: name.text,
      path: path ? path[1].text : null,
      body
    };
  }
);

export const parser: Parser<TokenKind, TypeDefinition[]> = rep(typeDefinition);
