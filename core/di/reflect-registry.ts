import type { Constructor } from "../types.ts";
import type { InjectionToken } from "./container.ts";

/**
 * Side registry the {@linkcode Container} consults when a class has no explicit
 * `static deps`. It is empty by default — the optional `@dsivam/core/reflect`
 * entry point populates it from constructor type metadata so the reflection-free
 * core stays dependency-free.
 *
 * @internal
 */
export const reflectedDeps: WeakMap<Constructor, InjectionToken[]> =
  new WeakMap();
