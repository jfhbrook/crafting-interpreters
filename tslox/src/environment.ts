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

  // Note, these "is not null" checks should be unnecessary because we know
  // the env is defined already (the resolver ensures that)
  getAt(distance: number, name: string): Value {
    const env = this.ancestor(distance);
    if (env) {
      return env.values[name];
    }
    return null;
  }

  assignAt(distance: number, name: Token, value: Value): void {
    const env = this.ancestor(distance);
    if (env) {
      env.values[name.lexeme] = value;
    }
  }

  ancestor(distance: number) {
    let env: Environment | null = this;
    for (let i = 0; i < distance; i++) {
      if (!env) {
        break;
      }
      env = env.enclosing;
    }

    return env;
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
