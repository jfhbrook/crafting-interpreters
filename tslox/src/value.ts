import { Token } from './token';
import { Environment } from './environment';
import { Interpreter } from './interpreter';
import { Instance } from './class';
import * as stmt from './stmt';

// We implement Callable as an interface because native functions
// are implemented with ad-hoc objects.
export interface Callable {
  call(interpreter: Interpreter, args: Value[]): Value;
  arity(): number;
}

export function isCallable(callable: any): callable is Callable {
  return (
    typeof callable.call === 'function' && typeof callable.arity === 'function'
  );
}

export type Value = boolean | number | string | Callable | Instance | null;
