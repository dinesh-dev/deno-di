import { onBootHandlers, onDestroyHandlers } from "./metadata.ts";
import type { MethodDecoratorFn } from "../types.ts";

/**
 * Marks a controller method as a boot hook.
 *
 * `@OnBoot` methods are called by {@linkcode DenoUIFactory.create} after all
 * providers and controllers have been instantiated and all `@On` handlers have
 * been registered. Multiple `@OnBoot` methods on the same class are called in
 * declaration order. Async methods are fully awaited before the next hook runs.
 *
 * Use this hook to perform startup tasks that require injected dependencies to
 * be ready — opening connections, seeding state, logging, etc.
 *
 * @example
 * ```ts
 * import { Controller, OnBoot } from "@dsivam/core";
 * import { DatabaseService } from "./database.service.ts";
 *
 * @Controller()
 * export class AppController {
 *   static deps = [DatabaseService];
 *   constructor(private db: DatabaseService) {}
 *
 *   @OnBoot()
 *   async init() {
 *     await this.db.connect();
 *     console.log("Database connected");
 *   }
 * }
 * ```
 */
export function OnBoot(): MethodDecoratorFn {
  return (_value, context) => {
    context.addInitializer(function (this: unknown) {
      const ctor = (this as Record<string, unknown>).constructor;
      const existing = onBootHandlers.get(ctor) ?? [];
      if (!existing.includes(context.name as string)) {
        existing.push(context.name as string);
      }
      onBootHandlers.set(ctor, existing);
    });
  };
}

/**
 * Marks a controller method as a destroy hook.
 *
 * `@OnDestroy` methods are called when {@linkcode AppRef.destroy} is invoked,
 * or automatically on the process `unload` event if `destroy()` has not
 * already been called. Multiple `@OnDestroy` methods on the same class are
 * called in declaration order. Async methods are awaited only when `destroy()`
 * is called explicitly (the `unload` path is synchronous by browser/Deno
 * contract).
 *
 * **Node.js / Bun:** `globalThis.addEventListener` is not available in these
 * runtimes, so the auto-fire on process exit does not apply. Call `destroy()`
 * explicitly during your shutdown sequence to ensure hooks run.
 *
 * Use this hook to release resources — closing connections, flushing buffers,
 * etc.
 *
 * @example
 * ```ts
 * import { Controller, OnDestroy } from "@dsivam/core";
 * import { DatabaseService } from "./database.service.ts";
 *
 * @Controller()
 * export class AppController {
 *   static deps = [DatabaseService];
 *   constructor(private db: DatabaseService) {}
 *
 *   @OnDestroy()
 *   async teardown() {
 *     await this.db.disconnect();
 *     console.log("Database disconnected");
 *   }
 * }
 * ```
 */
export function OnDestroy(): MethodDecoratorFn {
  return (_value, context) => {
    context.addInitializer(function (this: unknown) {
      const ctor = (this as Record<string, unknown>).constructor;
      const existing = onDestroyHandlers.get(ctor) ?? [];
      if (!existing.includes(context.name as string)) {
        existing.push(context.name as string);
      }
      onDestroyHandlers.set(ctor, existing);
    });
  };
}
