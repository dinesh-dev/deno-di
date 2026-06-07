/**
 * Structured result envelope for transports that cross a serialization
 * boundary (WebUI IPC, WebSocket, HTTP, …).
 *
 * Native transports send JSON, where a thrown `Error` serializes to `{}` and
 * its message is lost. {@linkcode IpcBridge.dispatchSafe} wraps every call in a
 * `Result` so success values and failures survive the round trip as plain
 * data.
 *
 * @example
 * ```ts
 * const res = await bridge.dispatchSafe("getWeather", { city: "Paris" });
 * if (res.ok) {
 *   console.log(res.data);
 * } else {
 *   console.error(res.error.message);
 * }
 * ```
 */

/** Successful result carrying the handler's return value. */
export interface Ok<T> {
  ok: true;
  data: T;
}

/** Serialized error shape — always plain, JSON-safe data. */
export interface ErrorInfo {
  name: string;
  message: string;
  /** Present only when the original error carried a stack. */
  stack?: string;
}

/** Failed result carrying a serialized error. */
export interface Err {
  ok: false;
  error: ErrorInfo;
}

/** Either a successful {@linkcode Ok} or a failed {@linkcode Err}. */
export type Result<T> = Ok<T> | Err;

/**
 * Normalizes any thrown value into a JSON-safe {@linkcode Err} envelope.
 *
 * Handles `Error` instances (preserving `name`, `message`, and `stack`),
 * strings, and arbitrary values (stringified into `message`). Never throws.
 *
 * @param e - The thrown value to normalize.
 *
 * @example
 * ```ts
 * try {
 *   risky();
 * } catch (e) {
 *   return toErrorEnvelope(e); // { ok: false, error: { name, message, stack? } }
 * }
 * ```
 */
export function toErrorEnvelope(e: unknown): Err {
  if (e instanceof Error) {
    const error: ErrorInfo = { name: e.name, message: e.message };
    if (e.stack) error.stack = e.stack;
    return { ok: false, error };
  }
  if (typeof e === "string") {
    return { ok: false, error: { name: "Error", message: e } };
  }
  return { ok: false, error: { name: "Error", message: String(e) } };
}
