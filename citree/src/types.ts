import { resolvePath } from "./paths";

import { Spec } from "./parser";

type TypeName = string;
type Path = string;

export interface Node {
  name: string;
  fields: string;
}

export interface Type {
  name: string;
  path: string;
  nodes: Node[];
}

export type TypeDefs = Record<TypeName, Type>;
export type Types = Record<Path, TypeDefs>;

export function resolveTypes(filename: string, spec: Spec): Types {
  const ts: Types = {};

  for (const t of spec.types) {
    const p = resolvePath(filename, t.path);
    if (!ts[p]) {
      ts[p] = {};
    }
    ts[p][t.name] = {
      name: t.name,
      path: p,
      nodes: t.nodes.map((n) => {
        return {
          name: n.name,
          fields: n.fields,
        };
      }),
    };
  }

  return ts;
}
