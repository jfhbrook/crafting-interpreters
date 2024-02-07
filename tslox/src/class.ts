import { Token } from './token';
import { Callable, Value } from './value';
import { Fn } from './function';
import { Interpreter } from './interpreter';
import { RuntimeError } from './error';

export class Class implements Callable {
  constructor(
    public readonly name: string,
    private readonly superclass: Class | null,
    private readonly methods: Map<string, Fn>,
  ) {}

  public findMethod(name: string): Fn | null {
    if (this.methods.has(name)) {
      return this.methods.get(name) || null;
    }

    if (this.superclass) {
      return this.superclass.findMethod(name);
    }

    return null;
  }

  public call(interpreter: Interpreter, args: Value[]): Value {
    const instance: Value = new Instance(this);
    const initializer = this.findMethod('init');
    if (initializer !== null) {
      initializer.bind(instance).call(interpreter, args);
    }
    return instance;
  }

  public arity(): number {
    const initializer = this.findMethod('init');
    if (initializer == null) return 0;
    return initializer.arity();
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
