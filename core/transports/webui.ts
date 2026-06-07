import type { IpcBridge } from "../ipc/ipc-bridge.ts";

/**
 * deno_webui transport adapter — binds an {@linkcode IpcBridge} to a WebUI
 * window so `@On`-decorated handlers become callable from the webview.
 *
 * The adapter is **structurally typed**: it accepts any object with a `bind`
 * method (the deno_webui `WebUI` window), so `@dsivam/core` keeps zero runtime
 * dependencies — you import and own the webui instance.
 *
 * Every bound handler routes through {@linkcode IpcBridge.dispatchSafe}, so a
 * thrown handler error is returned to the webview as a structured `Result`
 * envelope (JSON), never a dropped rejection.
 *
 * @module
 */

/** A single argument accessor on a deno_webui event. */
export interface WebUIArg {
  string(index: number): string;
}

/** The event object deno_webui passes to a bound callback. */
export interface WebUIEvent {
  arg?: WebUIArg;
}

/**
 * Structural shape of a deno_webui window — anything with a `bind` method.
 *
 * Matches `WebUI` from `jsr:@webui/deno-webui` without importing it. `run` is
 * optional; when present, {@linkcode bindBridge} uses it to forward
 * `bridge.emit(...)` pushes into the webview.
 */
export interface WebUIWindow {
  bind(id: string, callback: (e: WebUIEvent) => unknown): unknown;
  run?(javascript: string): unknown;
}

/** Options for {@linkcode bindBridge}. */
export interface BindOptions {
  /**
   * Extracts the payload from a WebUI event. Defaults to JSON-parsing the
   * first string argument (`e.arg.string(0)`); an empty/missing arg yields
   * `undefined`, and non-JSON text is passed through as a raw string.
   */
  parse?: (e: WebUIEvent) => unknown;
  /**
   * Serializes the `Result` envelope before it is returned to the webview.
   * Defaults to `JSON.stringify`.
   */
  serialize?: (result: unknown) => string;
  /**
   * The event names to bind. Defaults to every event currently registered on
   * the bridge (`bridge.events()`).
   */
  events?: string[];
  /**
   * When `true` (the default) and the window exposes `run`, `bridge.emit(...)`
   * pushes are forwarded into the webview by calling the browser-side
   * `globalThis.__dsivamEmit(event, payload)` dispatcher (see
   * `@dsivam/core/client/webui`'s `on`). Set `false` to opt out.
   */
  forwardEmits?: boolean;
}

function defaultParse(e: WebUIEvent): unknown {
  const raw = e?.arg?.string?.(0);
  if (raw == null || raw === "") return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const defaultSerialize = (result: unknown): string => JSON.stringify(result);

/**
 * Binds every bridge event to the WebUI window.
 *
 * @param bridge - The bridge returned by `DenoUIFactory.create`.
 * @param win - A deno_webui window (any object with `bind`).
 * @param opts - Optional payload parsing / serialization overrides.
 * @returns The same `win`, for chaining.
 *
 * @example
 * ```ts
 * import { WebUI } from "jsr:@webui/deno-webui";
 * import { DenoUIFactory } from "jsr:@dsivam/core";
 * import { bindBridge } from "jsr:@dsivam/core/webui";
 * import { AppModule } from "./app.module.ts";
 *
 * const { bridge } = await DenoUIFactory.create(AppModule);
 * const win = new WebUI();
 * bindBridge(bridge, win);
 * await win.show("<html>…</html>");
 * await WebUI.wait();
 * ```
 */
export function bindBridge(
  bridge: IpcBridge,
  win: WebUIWindow,
  opts: BindOptions = {},
): WebUIWindow {
  const parse = opts.parse ?? defaultParse;
  const serialize = opts.serialize ?? defaultSerialize;
  const events = opts.events ?? bridge.events();
  const forwardEmits = opts.forwardEmits ?? true;

  for (const event of events) {
    win.bind(
      event,
      async (e) => serialize(await bridge.dispatchSafe(event, parse(e))),
    );
  }

  if (forwardEmits && typeof win.run === "function") {
    bridge.onEmit((event, payload) => {
      const js = `globalThis.__dsivamEmit&&globalThis.__dsivamEmit(` +
        `${JSON.stringify(event)},${JSON.stringify(payload ?? null)})`;
      win.run!(js);
    });
  }

  return win;
}
