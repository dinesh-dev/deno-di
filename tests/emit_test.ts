import { assertEquals } from "@std/assert";
import { IpcBridge } from "../core/ipc/ipc-bridge.ts";
import {
  bindBridge,
  type WebUIEvent,
  type WebUIWindow,
} from "../core/transports/webui.ts";

Deno.test("onEmit subscribers receive emits", () => {
  const bridge = new IpcBridge();
  const received: Array<[string, unknown]> = [];
  bridge.onEmit((e, p) => received.push([e, p]));

  bridge.emit("progress", { pct: 50 });
  bridge.emit("done");

  assertEquals(received, [
    ["progress", { pct: 50 }],
    ["done", undefined],
  ]);
});

Deno.test("onEmit unsubscribe stops delivery", () => {
  const bridge = new IpcBridge();
  let count = 0;
  const off = bridge.onEmit(() => count++);

  bridge.emit("tick");
  off();
  bridge.emit("tick");

  assertEquals(count, 1);
});

Deno.test("multiple onEmit subscribers all fire", () => {
  const bridge = new IpcBridge();
  let a = 0, b = 0;
  bridge.onEmit(() => a++);
  bridge.onEmit(() => b++);
  bridge.emit("x");
  assertEquals([a, b], [1, 1]);
});

Deno.test("bindBridge forwards emits into the webview via run", () => {
  const scripts: string[] = [];
  const win: WebUIWindow = {
    bind(_id: string, _cb: (e: WebUIEvent) => unknown) {},
    run(js: string) {
      scripts.push(js);
    },
  };

  const bridge = new IpcBridge();
  bindBridge(bridge, win);
  bridge.emit("progress", { pct: 25 });

  assertEquals(scripts.length, 1);
  assertEquals(
    scripts[0],
    'globalThis.__dsivamEmit&&globalThis.__dsivamEmit("progress",{"pct":25})',
  );
});

Deno.test("bindBridge tolerates a window without run (no emit forwarding)", () => {
  const win: WebUIWindow = { bind() {} }; // no `run` method
  const bridge = new IpcBridge();
  bindBridge(bridge, win);
  // Must not throw even though there is nowhere to forward to.
  bridge.emit("progress", { pct: 10 });
});

Deno.test("bindBridge does not forward emits when forwardEmits is false", () => {
  const scripts: string[] = [];
  const win: WebUIWindow = {
    bind() {},
    run(js: string) {
      scripts.push(js);
    },
  };

  const bridge = new IpcBridge();
  bindBridge(bridge, win, { forwardEmits: false });
  bridge.emit("progress", { pct: 25 });

  assertEquals(scripts.length, 0);
});
