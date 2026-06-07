import { assertEquals, assertRejects } from "@std/assert";
import { IpcBridge } from "../core/ipc/ipc-bridge.ts";
import { type Contract, createClient } from "../core/rpc/contract.ts";

interface CounterApi extends Contract {
  increment: { payload: { by: number }; result: number };
  getCount: { result: number };
  boom: { result: never };
}

function makeBridge() {
  let count = 0;
  const bridge = new IpcBridge();
  bridge.register("increment", (p) => (count += (p as { by: number }).by));
  bridge.register("getCount", () => count);
  bridge.register("boom", () => {
    throw new Error("explode");
  });
  return bridge;
}

Deno.test("createClient routes typed calls through the bridge", async () => {
  const api = createClient<CounterApi>(makeBridge());
  assertEquals(await api.increment({ by: 5 }), 5);
  assertEquals(await api.increment({ by: 3 }), 8);
  assertEquals(await api.getCount(), 8);
});

Deno.test("createClient throws on a failed handler (unwraps envelope)", async () => {
  const api = createClient<CounterApi>(makeBridge());
  await assertRejects(() => api.boom(), Error, "explode");
});

Deno.test("createClient falls back to dispatch on a raw dispatcher", async () => {
  const calls: Array<[string, unknown]> = [];
  const api = createClient<CounterApi>({
    dispatch: (event, payload) => {
      calls.push([event, payload]);
      return Promise.resolve(42);
    },
  });
  assertEquals(await api.increment({ by: 1 }), 42);
  assertEquals(calls, [["increment", { by: 1 }]]);
});

Deno.test("createClient prefers dispatchSafe when both exist", async () => {
  let safeUsed = false;
  const api = createClient<CounterApi>({
    dispatchSafe: () => {
      safeUsed = true;
      return Promise.resolve({ ok: true, data: 7 });
    },
    dispatch: () => Promise.resolve(-1),
  });
  assertEquals(await api.getCount(), 7);
  assertEquals(safeUsed, true);
});
