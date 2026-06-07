import type { Constructor } from "../types.ts";
import type { ProviderDef } from "../di/container.ts";

/**
 * Options accepted by the {@linkcode Module} decorator.
 *
 * **Scope:** a single flat module. Cross-module provider sharing (`imports` /
 * `exports` arrays as in NestJS) is not yet implemented — adding those fields
 * would be a no-op, so they are intentionally omitted until module tree
 * resolution is supported.
 */
export interface ModuleOptions {
  /** Controller classes to instantiate and wire into the event bridge. */
  controllers?: Constructor[];
  /**
   * Providers to register with the DI container. Each entry is either an
   * injectable class (resolved via its `static deps`) or an explicit
   * {@linkcode ProviderDef} (`useValue` / `useClass` / `useFactory`) that binds
   * a class, `string`, or `symbol` token to a value.
   */
  providers?: Array<Constructor | ProviderDef>;
}

export const moduleMetadata = new WeakMap<object, ModuleOptions>();

// keyed by class constructor; value maps event name → method name
export const onHandlers = new WeakMap<object, Map<string, string>>();

export const onBootHandlers = new WeakMap<object, string[]>();
export const onDestroyHandlers = new WeakMap<object, string[]>();
