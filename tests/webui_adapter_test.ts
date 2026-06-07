import { assertEquals } from "@std/assert";
import { IpcBridge } from "../core/ipc/ipc-bridge.ts";
import {
  bindBridge,
  type WebUIEvent,
  type WebUIWindow,
} from "../core/transports/webui.ts";

/** Minimal fake of a deno_webui window that records bound callbacks. */
class FakeWindow implements WebUIWindow {
  readonly bound = new Map<string, (e: WebUIEvent) => unknown>();

  bind(id: string, callback: (e: WebUIEvent) => unknown): number {
    this.bound.set(id, callback);
    return this.bound.size;
  }

  /** Simulates the webview calling a bound function with a JSON string arg. */
  call(id: string, payload?: unknown): unknown {
    const cb = this.bound.get(id);
    if (!cb) throw new Error(`not bound: ${id}`);
    const raw = payload === undefined ? "" : JSON.stringify(payload);
    return cb({ arg: { string: () => raw } });
  }
}

Deno.test("bindBridge binds every registered event", () => {
  const bridge = new IpcBridge();
  bridge.register("a", () => 1);
  bridge.register("b", () => 2);

  const win = new FakeWindow();
  bindBridge(bridge, win);

  assertEquals([...win.bound.keys()].sort(), ["a", "b"]);
});

Deno.test("bound handler round-trips a success as a serialized envelope", async () => {
  const bridge = new IpcBridge();
  bridge.register("increment", (p) => ((p as { by: number }).by) + 1);

  const win = new FakeWindow();
  bindBridge(bridge, win);

  const raw = await win.call("increment", { by: 5 });
  assertEquals(JSON.parse(raw as string), { ok: true, data: 6 });
});

Deno.test("bound handler round-trips a thrown error as an envelope", async () => {
  const bridge = new IpcBridge();
  bridge.register("boom", () => {
    throw new Error("nope");
  });

  const win = new FakeWindow();
  bindBridge(bridge, win);

  const res = JSON.parse((await win.call("boom")) as string);
  assertEquals(res.ok, false);
  assertEquals(res.error.message, "nope");
});

Deno.test("bindBridge respects an explicit events allowlist", () => {
  const bridge = new IpcBridge();
  bridge.register("a", () => 1);
  bridge.register("b", () => 2);

  const win = new FakeWindow();
  bindBridge(bridge, win, { events: ["a"] });

  assertEquals([...win.bound.keys()], ["a"]);
});

Deno.test("default parse yields undefined for an empty arg", async () => {
  const bridge = new IpcBridge();
  bridge.register("peek", (p) => p ?? "was-undefined");

  const win = new FakeWindow();
  bindBridge(bridge, win);

  // FakeWindow.call with no payload sends an empty string arg.
  const res = JSON.parse((await win.call("peek")) as string);
  assertEquals(res, { ok: true, data: "was-undefined" });
});

Deno.test("default parse passes non-JSON text through as a raw string", async () => {
  const bridge = new IpcBridge();
  bridge.register("echo", (p) => p);

  const win = new FakeWindow();
  bindBridge(bridge, win);

  // Bypass FakeWindow.call's JSON.stringify by invoking the bound cb directly.
  const cb = win.bound.get("echo")!;
  const out = await cb({ arg: { string: () => "not json" } });
  assertEquals(JSON.parse(out as string), { ok: true, data: "not json" });
});

Deno.test("custom parse/serialize overrides are used", async () => {
  const bridge = new IpcBridge();
  bridge.register("echo", (p) => p);

  const win = new FakeWindow();
  bindBridge(bridge, win, {
    parse: () => "fixed",
    serialize: (r) => `wrapped:${JSON.stringify(r)}`,
  });

  const out = await win.call("echo", { ignored: true }) as string;
  assertEquals(out, `wrapped:${JSON.stringify({ ok: true, data: "fixed" })}`);
});
