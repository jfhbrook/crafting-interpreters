import { Callable, Value } from './value';
import * as stmt from './stmt';
import { Environment } from './environment';
import { Interpreter } from './interpreter';

export class Function implements Callable {
  constructor(private readonly declaration: stmt.Function) {}

  call(interpreter: Interpreter, args: Value[]): Value {
    const environment = new Environment(interpreter.globals);

    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }

    interpreter.executeBlock(this.declaration.body, environment);
    return null;
  }
}

export function function(value: Value): Callable | null {
}
