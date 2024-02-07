import { Interpreter } from './interpreter';
import { Instance } from './class';

// jlox uses Java's internal Object type here. This works there because just
// about everything in Java is an Object, and Java's types are nullable.
//
// That isn't true in TypeScript. While we could've gotten away with using
// any, I instead decided to create a Value type which encompasses the
// different kinds of things those Objects could be.

// Callables include Functions, Classes and native functions.
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
