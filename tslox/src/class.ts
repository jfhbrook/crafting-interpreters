import { Token } from './token';
import { Callable, Value } from './value';
import { Fn } from './function';
import { Interpreter } from './interpreter';
import { RuntimeError } from './error';

export class Class implements Callable {
  constructor(
    public readonly name: string,
    private readonly methods: Map<string, Fn>,
  ) {}

  public findMethod(name: string): Fn | null {
    return this.methods.get(name) || null;
  }

  public call(interpreter: Interpreter, args: Value[]): Value {
    const instance: Value = new Instance(this);
    return instance;
  }

  public arity(): number {
    return 0;
  }

  public toString(): string {
    return this.name;
  }
}

export class Instance {
  public readonly fields: Map<string, Value>;
  constructor(private cls: Class) {
    this.fields = new Map();
  }

  get(name: Token): Value {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme) as Value;
    }

    const method: Fn | null = this.cls.findMethod(name.lexeme);
    if (method != null) return method.bind(this);

    throw new RuntimeError(name, `Undefined property '${name.lexeme}'."`);
  }

  set(name: Token, value: Value): void {
    this.fields.set(name.lexeme, value);
  }

  toString() {
    return `${this.cls.name} instance`;
  }
}
