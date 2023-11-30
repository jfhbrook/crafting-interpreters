import { Token } from './token';
import { Value } from './value';
import { RuntimeError } from './error';

// This roughly corresponds to "Variables" in s7bas and the "symbol stack"
// in yabasic. I like this name.
export class Environment {
  private values: Record<string, Value>;

  constructor(private readonly enclosing: Environment | null = null) {
    this.values = {};
  }

  define(name: string, value: Value): void {
    this.values[name] = value;
  }

  get(name: Token): Value {
    if (this.has(name)) return this.values[name.lexeme];
    if (this.enclosing) return this.enclosing.get(name);

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
  }

  has(name: Token): boolean {
    return typeof this.values[name.lexeme]  !== 'undefined';
  }

  assign(name: Token, value: Value): void {
    if (this.has(name)) {
      this.values[name.lexeme] = value;
      return;
    }

    if (this.enclosing) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
  }
}
