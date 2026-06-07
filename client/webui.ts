/**
 * Browser-side companion to {@linkcode bindBridge} — call backend `@On`
 * handlers from inside a deno_webui webview and get the unwrapped result.
 *
 * Ship this to the webview (or inline an equivalent). It calls the bound
 * function exposed by deno_webui, parses the `Result` envelope produced by
 * `bindBridge`, returns `data` on success, and **throws** a reconstructed
 * `Error` on `{ ok: false }`.
 *
 * @module
 */

/** The subset of the deno_webui browser global this helper relies on. */
export interface WebUIClientGlobal {
  call(id: string, arg: string): Promise<string>;
}

function getWebUI(): WebUIClientGlobal {
  const webui = (globalThis as { webui?: WebUIClientGlobal }).webui;
  if (!webui || typeof webui.call !== "function") {
    throw new Error(
      "deno_webui bridge not found on globalThis.webui — is this running inside a WebUI window?",
    );
  }
  return webui;
}

/**
 * Invokes a backend event and resolves with its (unwrapped) return value.
 *
 * @typeParam T - The expected result type.
 * @param event - The event name registered via `@On` and bound by `bindBridge`.
 * @param payload - Optional payload; JSON-serialized before crossing the bridge.
 * @throws {Error} If the backend handler failed — the thrown error carries the
 *   original `name` and `message` from the envelope.
 *
 * @example
 * ```ts
 * import { invoke } from "jsr:@dsivam/core/client/webui";
 *
 * const count = await invoke<number>("increment", { by: 5 });
 * ```
 */
export async function invoke<T = unknown>(
  event: string,
  payload?: unknown,
): Promise<T> {
  const webui = getWebUI();
  const arg = payload === undefined ? "" : JSON.stringify(payload);
  const raw = await webui.call(event, arg);

  const res = raw ? JSON.parse(raw) : { ok: true, data: undefined };
  if (res && res.ok === false) {
    const err = new Error(res.error?.message ?? "RPC error");
    err.name = res.error?.name ?? "Error";
    throw err;
  }
  return res?.data as T;
}

type EmitCallback = (payload: unknown) => void;
const emitListeners = new Map<string, Set<EmitCallback>>();

function ensureEmitDispatcher(): void {
  const g = globalThis as { __dsivamEmit?: (e: string, p: unknown) => void };
  if (g.__dsivamEmit) return;
  g.__dsivamEmit = (event, payload) => {
    const set = emitListeners.get(event);
    if (set) for (const cb of set) cb(payload);
  };
}

/**
 * Subscribes to a backend `bridge.emit(event, …)` push.
 *
 * Installs (once) the `globalThis.__dsivamEmit` dispatcher that the
 * {@linkcode bindBridge} adapter calls via `win.run`, then routes pushes to
 * your callback.
 *
 * @typeParam T - The expected payload type.
 * @param event - The push event name emitted on the backend.
 * @param callback - Invoked with each pushed payload.
 * @returns An unsubscribe function.
 *
 * @example
 * ```ts
 * import { on } from "jsr:@dsivam/core/client/webui";
 *
 * const off = on<{ pct: number }>("progress", ({ pct }) => render(pct));
 * ```
 */
export function on<T = unknown>(
  event: string,
  callback: (payload: T) => void,
): () => void {
  ensureEmitDispatcher();
  let set = emitListeners.get(event);
  if (!set) {
    set = new Set();
    emitListeners.set(event, set);
  }
  set.add(callback as EmitCallback);
  return () => {
    set!.delete(callback as EmitCallback);
  };
}
