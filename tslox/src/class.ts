import { Token } from './token';
import { Callable, Value } from './value';
import { Interpreter } from './interpreter';
import { RuntimeError } from './error';

export class Class implements Callable {
  constructor(public readonly name: string) {}

  public call(interpreter: Interpreter, args: Value[]): Value {
    const instance: Value = new Instance(this);
    return instance;
  }

  arity(): number {
    return 0;
  }

  public toString(): string {
    return this.name;
  }
}

export class Instance {
  private readonly fields: Map<string, Value>;
  constructor(private cls: Class) {
    this.fields = new Map();
  }

  get(name: Token): Value {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme) as Value;
    }

    throw new RuntimeError(name, `Undefined property '${name.lexeme}'."`);
  }

  toString() {
    return `${this.cls.name} instance`;
  }
}
