import { Token } from './token';
import { Environment } from './environment';
import { Interpreter } from './interpreter';
import * as stmt from './stmt';

// TODO: Value is imported by function and class. To avoid a
// circular import, I set interfaces here and do duck typing.
// However, I believe typescript will actually allow circular
// imports for types only. That would help clean things up a lot
// here.

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
  fields: Map<string, Value>;
  get(name: Token): Value;
  set(name: Token, value: Value): void;
}

export function isInstance(instance: any): instance is Instance {
  return (
    instance.fields instanceof Map &&
    typeof instance.get === 'function' &&
    typeof instance.set === 'function'
  );
}

export type Value = boolean | number | string | Callable | Instance | null;
