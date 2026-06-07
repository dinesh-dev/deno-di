import type { Result } from "../ipc/result.ts";

/**
 * Type-safe RPC client over an {@linkcode IpcBridge}.
 *
 * Declare a **contract** — a map of event name → `{ payload, result }` — once,
 * and `createClient<Contract>(bridge)` gives you a typed object whose methods
 * are checked against it. Renaming or removing an `@On` handler then becomes a
 * compile error at every call site instead of a runtime
 * `No handler registered`.
 *
 * @example
 * ```ts
 * import { createClient, type Contract } from "@dsivam/core";
 *
 * interface CounterApi extends Contract {
 *   increment: { payload: { by: number }; result: number };
 *   getCount: { result: number };
 * }
 *
 * const api = createClient<CounterApi>(bridge);
 * const next = await api.increment({ by: 5 }); // typed as number
 * const now  = await api.getCount();           // no payload required
 * ```
 *
 * @module
 */

/** One endpoint of a {@linkcode Contract}: its payload and result types. */
export interface RpcEndpoint {
  /** Payload type. Omit (or `undefined`) for handlers that take no argument. */
  payload?: unknown;
  /** Resolved result type of the handler. */
  result: unknown;
}

/** A map of event name → {@linkcode RpcEndpoint}. */
export type Contract = Record<string, RpcEndpoint>;

/** Maps a single endpoint to a client method, keeping payload optionality. */
type ClientMethod<E extends RpcEndpoint> = undefined extends E["payload"]
  ? (payload?: E["payload"]) => Promise<E["result"]>
  : (payload: E["payload"]) => Promise<E["result"]>;

/** The typed client object produced by {@linkcode createClient}. */
export type ClientOf<C extends Contract> = {
  [K in keyof C]: ClientMethod<C[K]>;
};

/** A dispatcher that returns a structured {@linkcode Result} (e.g. an IpcBridge). */
export interface SafeDispatcher {
  dispatchSafe(event: string, payload?: unknown): Promise<Result<unknown>>;
}

/** A dispatcher that resolves the raw value and rejects on error. */
export interface RawDispatcher {
  dispatch(event: string, payload?: unknown): Promise<unknown>;
}

/** Anything `createClient` can route through. */
export type Dispatcher = SafeDispatcher | RawDispatcher;

function hasSafe(d: Dispatcher): d is SafeDispatcher {
  return typeof (d as SafeDispatcher).dispatchSafe === "function";
}

/**
 * Builds a typed RPC client over a dispatcher.
 *
 * Prefers `dispatchSafe` when available: it unwraps the {@linkcode Result},
 * returning `data` on success and **throwing** a reconstructed `Error` on
 * failure. Falls back to `dispatch` otherwise.
 *
 * @typeParam C - The contract describing every event's payload and result.
 * @param dispatcher - An `IpcBridge` or any object with `dispatchSafe`/`dispatch`.
 *
 * @example
 * ```ts
 * const api = createClient<CounterApi>(bridge);
 * await api.increment({ by: 1 });
 * ```
 */
export function createClient<C extends Contract>(
  dispatcher: Dispatcher,
): ClientOf<C> {
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return async (payload?: unknown) => {
        if (hasSafe(dispatcher)) {
          const res = await dispatcher.dispatchSafe(prop, payload);
          if (!res.ok) {
            const err = new Error(res.error.message);
            err.name = res.error.name;
            throw err;
          }
          return res.data;
        }
        return await dispatcher.dispatch(prop, payload);
      };
    },
  }) as ClientOf<C>;
}
