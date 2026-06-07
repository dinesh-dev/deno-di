import { Container } from "../di/container.ts";
import { IpcBridge } from "../ipc/ipc-bridge.ts";
import {
  moduleMetadata,
  onBootHandlers,
  onDestroyHandlers,
  onHandlers,
} from "../decorators/metadata.ts";
import type { Constructor } from "../types.ts";

/**
 * The object returned by {@linkcode DenoUIFactory.create}.
 *
 * @property bridge - The event dispatcher. Call `bridge.dispatch(event, payload)`
 *   to route events to `@On`-decorated controller methods.
 * @property destroy - Runs all `@OnDestroy` hooks in declaration order and
 *   awaits async hooks. Safe to call multiple times — subsequent calls are
 *   no-ops because hooks are drained on the first invocation.
 */
export interface AppRef {
  bridge: IpcBridge;
  destroy(): Promise<void>;
}

/**
 * Optional behaviour flags for {@linkcode DenoUIFactory.create}.
 *
 * @property strict - When `true`, a duplicate `@On` event name across
 *   controllers throws at boot instead of warning. Default `false`.
 * @property logger - Sink for diagnostics. Receives a duplicate-event warning
 *   (also emitted to `console.warn` when omitted) and, when provided, a
 *   one-line summary of every registered event at boot.
 */
export interface BootOptions {
  strict?: boolean;
  logger?: (message: string) => void;
}

/**
 * Application factory — the entry point for every `@dsivam/core` app.
 *
 * `DenoUIFactory.create(AppModule)` wires the full application:
 *
 * 1. Reads `@Module` metadata to discover providers and controllers.
 * 2. Resolves providers through the DI container (singleton, `static deps[]`).
 * 3. Instantiates controllers with their injected dependencies.
 * 4. Registers each `@On`-decorated method with the {@linkcode IpcBridge}.
 * 5. Calls all `@OnBoot` hooks in declaration order (async hooks are awaited).
 * 6. Returns an {@linkcode AppRef} with the live bridge and a `destroy()` fn.
 *
 * @example Minimal app
 * ```ts
 * import { DenoUIFactory } from "@dsivam/core";
 * import { AppModule } from "./app.module.ts";
 *
 * const { bridge, destroy } = await DenoUIFactory.create(AppModule);
 *
 * // Dispatch events from any transport
 * const result = await bridge.dispatch("ping");
 *
 * // Graceful shutdown (also fires automatically on process unload)
 * await destroy();
 * ```
 *
 * @throws {Error} If `moduleClass` is not decorated with `@Module`.
 */
export class DenoUIFactory {
  /**
   * Boots the application defined by `moduleClass` and returns a live
   * {@linkcode AppRef}.
   *
   * @param moduleClass - A class decorated with `@Module`.
   * @param opts - Optional {@linkcode BootOptions} for strict mode and logging.
   */
  static async create(
    moduleClass: Constructor,
    opts: BootOptions = {},
  ): Promise<AppRef> {
    const { strict = false, logger } = opts;
    const warn = logger ?? ((m: string) => console.warn(m));

    const meta = moduleMetadata.get(moduleClass);
    if (!meta) {
      throw new Error(`${moduleClass.name} is not decorated with @Module`);
    }

    const container = new Container();
    const bridge = new IpcBridge();
    const bootHooks: Array<() => unknown> = [];
    const destroyHooks: Array<() => unknown> = [];
    const eventOwners = new Map<string, string>();

    for (const provider of meta.providers ?? []) {
      if (typeof provider === "function") {
        container.resolve(provider);
      } else {
        container.register(provider);
      }
    }

    for (const controllerClass of meta.controllers ?? []) {
      const instance = container.resolve(controllerClass) as Record<
        string,
        (payload?: unknown) => unknown
      >;

      const handlers = onHandlers.get(controllerClass);
      if (handlers) {
        for (const [event, method] of handlers) {
          const prevOwner = eventOwners.get(event);
          if (prevOwner !== undefined) {
            const msg = `Duplicate @On("${event}") handler: ` +
              `${controllerClass.name} overrides ${prevOwner}`;
            if (strict) throw new Error(msg);
            warn(msg);
          }
          eventOwners.set(event, controllerClass.name);
          bridge.register(event, (payload) => instance[method](payload));
        }
      }

      for (const method of onBootHandlers.get(controllerClass) ?? []) {
        bootHooks.push(() => instance[method]());
      }

      for (const method of onDestroyHandlers.get(controllerClass) ?? []) {
        destroyHooks.push(() => instance[method]());
      }
    }

    if (logger) {
      const events = bridge.events();
      logger(`Registered ${events.length} event(s): ${events.join(", ")}`);
    }

    for (const hook of bootHooks) {
      await hook();
    }

    // splice(0) drains the array so the unload listener below is a no-op after explicit destroy()
    const destroy = async (): Promise<void> => {
      for (const hook of destroyHooks.splice(0)) {
        await hook();
      }
    };

    globalThis.addEventListener?.("unload", () => {
      for (const hook of destroyHooks.splice(0)) {
        hook();
      }
    });

    return { bridge, destroy };
  }
}
