import { Environment } from './environment';
import { Interpreter } from './interpreter';
import * as stmt from './stmt';
/*
export interface IInterpreter {
  globals: Environment;

  executeBlock(statements: stmt.Stmt[], environment: Environment): void;
};
*/

export interface Callable {
  call(interpreter: Interpreter, args: Value[]): Value;
  arity(): number
}


export type Value = boolean | number | string | Callable | null;
