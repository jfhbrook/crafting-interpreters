export interface IInterpreter {};

export interface Callable {
  call(interpreter: IInterpreter, args: Value[]): Value;
  arity(): number
}


export type Value = boolean | number | string | Callable | null;
