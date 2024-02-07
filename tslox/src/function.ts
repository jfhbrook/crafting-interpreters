import { Callable, Value } from './value';
import { Instance } from './class';
import * as stmt from './stmt';
import { Environment } from './environment';
import { Interpreter } from './interpreter';
import { Return } from './error';

export class Fn implements Callable {
  constructor(
    private readonly declaration: stmt.Function,
    private readonly closure: Environment,
  ) {}

  arity(): number {
    return this.declaration.params.length;
  }

  call(interpreter: Interpreter, args: Value[]): Value {
    const environment = new Environment(this.closure);

    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }

    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (err) {
      if (Return.isReturn(err)) {
        return err.value;
      }
      throw err;
    }

    return null;
  }

  bind(instance: Instance) {
    const environment = new Environment(this.closure);
    environment.define('this', instance);
    return new Fn(this.declaration, environment);
  }
}
