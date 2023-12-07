import { join } from "path";

import * as nunjucks from "nunjucks";

nunjucks.configure({ autoescape: false });

export interface NodeConfig {
  name: string;
  fields: string;
}

export interface TypeConfig {
  name: string;
  nodes: NodeConfig[];
}

export interface RenderConfig {
  imports: string[];
  types: TypeConfig[];
}

export function render(config: RenderConfig): string {
  return nunjucks.render(join(__dirname, "main.ts.njk"), config);
}
