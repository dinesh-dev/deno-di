import { assertEquals, assertRejects } from "@std/assert";
import { IpcBridge } from "../core/ipc/ipc-bridge.ts";
import { toErrorEnvelope } from "../core/ipc/result.ts";

Deno.test("dispatchSafe wraps a success in { ok: true, data }", async () => {
  const bridge = new IpcBridge();
  bridge.register("ping", () => "pong");
  assertEquals(await bridge.dispatchSafe("ping"), { ok: true, data: "pong" });
});

Deno.test("dispatchSafe passes payload through", async () => {
  const bridge = new IpcBridge();
  bridge.register("echo", (p) => p);
  assertEquals(await bridge.dispatchSafe("echo", { value: 42 }), {
    ok: true,
    data: { value: 42 },
  });
});

Deno.test("dispatchSafe wraps an unknown event in { ok: false } without rejecting", async () => {
  const bridge = new IpcBridge();
  const res = await bridge.dispatchSafe("nope");
  assertEquals(res.ok, false);
  if (!res.ok) {
    assertEquals(res.error.message, 'No handler registered for event: "nope"');
  }
});

Deno.test("dispatchSafe wraps a thrown handler error, preserving the message", async () => {
  const bridge = new IpcBridge();
  bridge.register("boom", () => {
    throw new TypeError("kaboom");
  });
  const res = await bridge.dispatchSafe("boom");
  assertEquals(res.ok, false);
  if (!res.ok) {
    assertEquals(res.error.name, "TypeError");
    assertEquals(res.error.message, "kaboom");
  }
});

Deno.test("dispatchSafe wraps a rejected async handler", async () => {
  const bridge = new IpcBridge();
  bridge.register("slow", () => Promise.reject(new Error("async fail")));
  const res = await bridge.dispatchSafe("slow");
  assertEquals(res.ok, false);
  if (!res.ok) assertEquals(res.error.message, "async fail");
});

Deno.test("regression: dispatch still rejects on unknown event", async () => {
  const bridge = new IpcBridge();
  await assertRejects(
    () => bridge.dispatch("nope"),
    Error,
    'No handler registered for event: "nope"',
  );
});

Deno.test("toErrorEnvelope normalizes an Error", () => {
  const env = toErrorEnvelope(new RangeError("out of range"));
  assertEquals(env.ok, false);
  assertEquals(env.error.name, "RangeError");
  assertEquals(env.error.message, "out of range");
});

Deno.test("toErrorEnvelope includes a stack when present", () => {
  const env = toErrorEnvelope(new Error("boom"));
  assertEquals(env.ok, false);
  assertEquals(typeof env.error.stack, "string");
});

Deno.test("toErrorEnvelope omits stack when the error has none", () => {
  const e = new Error("no stack");
  e.stack = undefined;
  const env = toErrorEnvelope(e);
  assertEquals("stack" in env.error, false);
});

Deno.test("toErrorEnvelope normalizes a string", () => {
  assertEquals(toErrorEnvelope("plain"), {
    ok: false,
    error: { name: "Error", message: "plain" },
  });
});

Deno.test("toErrorEnvelope normalizes an arbitrary value", () => {
  assertEquals(toErrorEnvelope({ weird: true }), {
    ok: false,
    error: { name: "Error", message: "[object Object]" },
  });
});
