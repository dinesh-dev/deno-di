// deno-lint-ignore-file no-explicit-any
export type Constructor<T = unknown> = new (...args: any[]) => T;

/** Return type for TC39 class decorators produced by this library. */
export type ClassDecoratorFn = (
  value: new (...args: any[]) => any,
  ctx: ClassDecoratorContext,
) => void;

/** Return type for TC39 method decorators produced by this library. */
export type MethodDecoratorFn = (
  value: (...args: any[]) => any,
  ctx: ClassMethodDecoratorContext,
) => void;
