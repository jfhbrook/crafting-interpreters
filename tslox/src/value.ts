import { Token } from './token';
import { Environment } from './environment';
import { Interpreter } from './interpreter';
import * as stmt from './stmt';

export interface Callable {
  call(interpreter: Interpreter, args: Value[]): Value;
  arity(): number;
}

export function isCallable(callable: any): callable is Callable {
  return (
    typeof callable.call === 'function' && typeof callable.arity === 'function'
  );
}

export interface Instance {
  get(name: Token): Value;
}

export function isInstance(instance: any): instance is Instance {
  return typeof instance.get === 'function';
}

export type Value = boolean | number | string | Callable | Instance | null;
