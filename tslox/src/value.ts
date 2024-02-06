import { Environment } from './environment';
import { Interpreter } from './interpreter';
import * as stmt from './stmt';

export interface Callable {
  call(interpreter: Interpreter, args: Value[]): Value;
  arity(): number
}

export function isCallable(callable: any): callable is Callable {
  return typeof callable.call === 'function' && typeof callable.arity === 'function';
}

// Instance is defined in class.ts - Instance and Class mutually reference
// each other so that makes sense. But class.ts imports Value and we can't
// have a circular reference.
//
// Eventually, instances should have an interface we can count on. But in the
// meantime, we'll cheese it.
type Instance = any;

export type Value = boolean | number | string | Callable | Instance | null;
