import type { Constructor } from "../types.ts";
import { reflectedDeps } from "./reflect-registry.ts";

/**
 * A key the {@linkcode Container} resolves to an instance. A class is its own
 * token (the default, reflection-free path); a `string` or `symbol` token lets
 * you inject values that have no class — config objects, platform handles, etc.
 * — by registering a provider for them.
 */
export type InjectionToken<T = unknown> = Constructor<T> | string | symbol;

/** Provides a ready-made value for a token. */
export interface ValueProvider<T = unknown> {
  provide: InjectionToken<T>;
  useValue: T;
}

/** Provides a token by constructing the given class with resolved `deps`. */
export interface ClassProvider<T = unknown> {
  provide: InjectionToken<T>;
  useClass: Constructor<T>;
  deps?: InjectionToken[];
}

/** Provides a token by calling a factory with resolved `deps`. */
export interface FactoryProvider<T = unknown> {
  provide: InjectionToken<T>;
  // deno-lint-ignore no-explicit-any
  useFactory: (...args: any[]) => T;
  deps?: InjectionToken[];
}

/** Any explicit provider definition accepted by {@linkcode Container.register}. */
export type ProviderDef<T = unknown> =
  | ValueProvider<T>
  | ClassProvider<T>
  | FactoryProvider<T>;

function tokenName(token: InjectionToken): string {
  if (typeof token === "function") return token.name || "<anonymous class>";
  if (typeof token === "symbol") return token.toString();
  return String(token);
}

/**
 * Minimal singleton dependency-injection container.
 *
 * Two ways to declare dependencies, both backwards compatible:
 *
 * 1. **Class tokens (default, reflection-free):** a class declares its deps via
 *    a `static deps` array; entries may be classes or other tokens.
 * 2. **Provider definitions:** register `{ provide, useValue | useClass |
 *    useFactory }` to bind a `string`/`symbol`/class token to a value.
 *
 * Every token resolves to a single shared instance (singleton) per container.
 */
export class Container {
  private readonly instances = new Map<InjectionToken, unknown>();
  private readonly providers = new Map<InjectionToken, ProviderDef>();

  /** Registers an explicit provider definition for a token. */
  register(def: ProviderDef): void {
    this.providers.set(def.provide, def);
  }

  /**
   * Resolves a token to its singleton instance, constructing it (and its
   * transitive deps) on first request.
   *
   * @throws {Error} If a `string`/`symbol` token has no registered provider, or
   *   a class dep is not constructable.
   */
  resolve<T>(token: InjectionToken<T>): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    const def = this.providers.get(token);
    if (def) {
      const instance = this.instantiate(def);
      this.instances.set(token, instance);
      return instance as T;
    }

    if (typeof token === "function") {
      const explicit = (token as { deps?: InjectionToken[] }).deps;
      const deps = explicit ?? reflectedDeps.get(token as Constructor) ?? [];
      const resolvedDeps = deps.map((dep) => this.resolve(dep));
      const instance = new (token as Constructor)(...resolvedDeps);
      this.instances.set(token, instance);
      return instance as T;
    }

    throw new Error(`No provider registered for token: ${tokenName(token)}`);
  }

  private instantiate(def: ProviderDef): unknown {
    if ("useValue" in def) return def.useValue;
    const deps = (def.deps ?? []).map((dep) => this.resolve(dep));
    if ("useClass" in def) return new def.useClass(...deps);
    return def.useFactory(...deps);
  }
}
