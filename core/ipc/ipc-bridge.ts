import { type Result, toErrorEnvelope } from "./result.ts";

type Handler = (payload: unknown) => unknown | Promise<unknown>;

/** Listener for backend → caller pushes, registered via {@linkcode IpcBridge.onEmit}. */
export type EmitListener = (event: string, payload: unknown) => void;

/**
 * Transport-agnostic event dispatcher returned by {@linkcode DenoUIFactory.create}.
 *
 * `IpcBridge` decouples event routing from the underlying transport. Wire
 * `dispatch` to any source — WebUI IPC callbacks, WebSocket messages, HTTP
 * request handlers, CLI prompts, or test code — and `@On`-decorated controller
 * methods receive the call automatically.
 *
 * @example Dispatching from a WebUI IPC callback
 * ```ts
 * const { bridge } = await DenoUIFactory.create(AppModule);
 *
 * // Wire to whatever transport delivers events
 * webui.bind("getWeather", async (e) => {
 *   return await bridge.dispatch("getWeather", JSON.parse(e.data));
 * });
 * ```
 *
 * @example Dispatching directly in tests
 * ```ts
 * const { bridge } = await DenoUIFactory.create(AppModule);
 * const result = await bridge.dispatch("ping");
 * assertEquals(result, "pong");
 * ```
 */
export class IpcBridge {
  private readonly handlers = new Map<string, Handler>();
  private readonly emitListeners = new Set<EmitListener>();

  /**
   * Registers a handler for the given event name.
   *
   * Calling `register` with an event name that already has a handler silently
   * replaces the previous one. Normally you do not need to call this directly
   * — `@On` wires handlers automatically at boot time.
   *
   * @param event - The event name to bind.
   * @param handler - Function that receives the payload and returns a result
   *   (sync or async).
   */
  register(event: string, handler: Handler): void {
    this.handlers.set(event, handler);
  }

  /**
   * Dispatches an event and returns the handler's resolved result.
   *
   * @param event - The event name to dispatch. Must match a name registered
   *   via `@On` or {@linkcode register}; throws if no handler is found.
   * @param payload - Optional data forwarded as the first argument to the
   *   handler.
   * @throws {Error} If no handler is registered for `event`.
   *
   * @example
   * ```ts
   * const count = await bridge.dispatch("getCount");
   * const next  = await bridge.dispatch("increment", { by: 5 });
   * ```
   */
  dispatch(event: string, payload?: unknown): Promise<unknown> {
    const handler = this.handlers.get(event);
    if (!handler) {
      return Promise.reject(
        new Error(`No handler registered for event: "${event}"`),
      );
    }
    return Promise.resolve(handler(payload));
  }

  /**
   * Dispatches an event and returns a structured {@linkcode Result} instead of
   * throwing or rejecting.
   *
   * Unlike {@linkcode dispatch}, this method **never rejects** — an unknown
   * event and a handler that throws both resolve to `{ ok: false, error }`.
   * This is the right entry point for transports that cross a serialization
   * boundary (WebUI IPC, WebSocket, HTTP), where a rejected promise or a raw
   * `Error` cannot be sent to the caller.
   *
   * @param event - The event name to dispatch.
   * @param payload - Optional data forwarded to the handler.
   * @returns `{ ok: true, data }` on success, `{ ok: false, error }` on failure.
   *
   * @example
   * ```ts
   * const res = await bridge.dispatchSafe("increment", { by: 5 });
   * if (res.ok) console.log(res.data);
   * else console.error(res.error.message);
   * ```
   */
  async dispatchSafe(
    event: string,
    payload?: unknown,
  ): Promise<Result<unknown>> {
    try {
      return { ok: true, data: await this.dispatch(event, payload) };
    } catch (e) {
      return toErrorEnvelope(e);
    }
  }

  /**
   * Returns the names of all currently registered events.
   *
   * Useful for introspection and debugging — e.g. logging available commands
   * at boot time.
   *
   * @example
   * ```ts
   * console.log("Available events:", bridge.events());
   * // → ["getWeather", "ping", "increment"]
   * ```
   */
  events(): string[] {
    return [...this.handlers.keys()];
  }

  /**
   * Pushes an event to every {@linkcode onEmit} subscriber.
   *
   * This is the backend → frontend direction: handlers (or services) call
   * `emit` to stream state to the UI — progress, live counters, notifications —
   * without the webview having to poll. A transport adapter (e.g. the
   * deno_webui adapter) subscribes once and forwards each push into the
   * webview.
   *
   * @param event - The push event name.
   * @param payload - Optional data delivered to subscribers.
   *
   * @example
   * ```ts
   * for (let i = 0; i <= 100; i += 10) bridge.emit("progress", { pct: i });
   * ```
   */
  emit(event: string, payload?: unknown): void {
    for (const listener of this.emitListeners) listener(event, payload);
  }

  /**
   * Subscribes to {@linkcode emit} pushes.
   *
   * @param listener - Called with `(event, payload)` for every push.
   * @returns An unsubscribe function that removes the listener.
   *
   * @example
   * ```ts
   * const off = bridge.onEmit((event, payload) => console.log(event, payload));
   * off(); // stop listening
   * ```
   */
  onEmit(listener: EmitListener): () => void {
    this.emitListeners.add(listener);
    return () => {
      this.emitListeners.delete(listener);
    };
  }
}
