import { Callable, Value } from './value';
import { Interpreter } from './interpreter';

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
  constructor(private cls: Class) {}

  toString() {
    return `${this.cls.name} instance`;
  }
}
