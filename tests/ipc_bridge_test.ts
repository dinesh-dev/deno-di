import { assertEquals, assertRejects } from "@std/assert";
import { IpcBridge } from "../core/ipc/ipc-bridge.ts";

Deno.test("dispatches to a registered handler", async () => {
  const bridge = new IpcBridge();
  bridge.register("ping", () => "pong");
  assertEquals(await bridge.dispatch("ping"), "pong");
});

Deno.test("passes payload through to the handler", async () => {
  const bridge = new IpcBridge();
  bridge.register("echo", (p) => p);
  assertEquals(await bridge.dispatch("echo", { value: 42 }), { value: 42 });
});

Deno.test("handler can be async", async () => {
  const bridge = new IpcBridge();
  bridge.register("slow", async () => {
    await Promise.resolve();
    return "done";
  });
  assertEquals(await bridge.dispatch("slow"), "done");
});

Deno.test("throws a clear error on unknown event", async () => {
  const bridge = new IpcBridge();
  await assertRejects(
    () => bridge.dispatch("nope"),
    Error,
    'No handler registered for event: "nope"',
  );
});

Deno.test("re-registering an event overwrites the previous handler", async () => {
  const bridge = new IpcBridge();
  bridge.register("greet", () => "hello");
  bridge.register("greet", () => "hi");
  assertEquals(await bridge.dispatch("greet"), "hi");
});

Deno.test("events() returns all registered event names", () => {
  const bridge = new IpcBridge();
  bridge.register("a", () => {});
  bridge.register("b", () => {});
  bridge.register("c", () => {});
  assertEquals(bridge.events().sort(), ["a", "b", "c"]);
});
