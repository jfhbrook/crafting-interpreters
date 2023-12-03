import { Callable, Value } from './value';
import * as stmt from './stmt';
import { Environment } from './environment';
import { Interpreter } from './interpreter';

export class Fn implements Callable {
  static isFunction(fn: any): fn is Fn {
    return typeof fn.call === 'function';
  }

  constructor(private readonly declaration: stmt.Function) {}

  arity(): number {
    return this.declaration.params.length;
  }

  call(interpreter: Interpreter, args: Value[]): Value {
    const environment = new Environment(interpreter.globals);

    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }

    interpreter.executeBlock(this.declaration.body, environment);
    return null;
  }
}
