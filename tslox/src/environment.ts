import { Token } from './token';
import { Value } from './value';
import { RuntimeError } from './error';

// This roughly corresponds to "Variables" in s7bas and the "symbol stack"
// in yabasic. I like this name.
export class Environment {
  private values: Record<string, Value>;

  constructor() {
    this.values = {};
  }

  define(name: string, value: Value): void {
    this.values[name] = value;
  }

  get(name: Token) {
    if (this.has(name)) {
      return this.values[name.lexeme];
    }
    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
  }

  has(name: Token): boolean {
    return typeof this.values[name.lexeme]  !== 'undefined';
  }
}
