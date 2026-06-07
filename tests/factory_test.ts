import { assertEquals, assertRejects } from "@std/assert";
import {
  Controller,
  DenoUIFactory,
  Injectable,
  Module,
  On,
  OnBoot,
  OnDestroy,
} from "../mod.ts";

Deno.test("wires @On handler and dispatches correctly", async () => {
  @Injectable()
  class EchoService {
    echo(msg: string) {
      return msg;
    }
  }

  @Controller()
  class EchoController {
    static deps = [EchoService];
    constructor(private svc: EchoService) {}

    @On("echo")
    handle(payload: { msg: string }) {
      return this.svc.echo(payload.msg);
    }
  }

  @Module({ controllers: [EchoController], providers: [EchoService] })
  class EchoModule {}

  const { bridge } = await DenoUIFactory.create(EchoModule);
  assertEquals(await bridge.dispatch("echo", { msg: "hello" }), "hello");
});

Deno.test("resolves controller dep from providers list", async () => {
  const calls: string[] = [];

  @Injectable()
  class LogService {
    log(msg: string) {
      calls.push(msg);
    }
  }

  @Controller()
  class LogController {
    static deps = [LogService];
    constructor(private log: LogService) {}

    @On("log")
    handle(payload: { msg: string }) {
      this.log.log(payload.msg);
    }
  }

  @Module({ controllers: [LogController], providers: [LogService] })
  class LogModule {}

  const { bridge } = await DenoUIFactory.create(LogModule);
  await bridge.dispatch("log", { msg: "test" });
  assertEquals(calls, ["test"]);
});

Deno.test("calls @OnBoot hooks after init", async () => {
  const order: string[] = [];

  @Controller()
  class BootCtrl {
    @OnBoot()
    first() {
      order.push("first");
    }

    @OnBoot()
    second() {
      order.push("second");
    }
  }

  @Module({ controllers: [BootCtrl] })
  class BootMod {}

  await DenoUIFactory.create(BootMod);
  assertEquals(order, ["first", "second"]);
});

Deno.test("async @OnBoot hooks are awaited in order", async () => {
  const order: number[] = [];

  @Controller()
  class AsyncBootCtrl {
    @OnBoot()
    async first() {
      await new Promise((r) => setTimeout(r, 10));
      order.push(1);
    }

    @OnBoot()
    second() {
      order.push(2);
    }
  }

  @Module({ controllers: [AsyncBootCtrl] })
  class AsyncBootMod {}

  await DenoUIFactory.create(AsyncBootMod);
  assertEquals(order, [1, 2]);
});

Deno.test("destroy() calls @OnDestroy hooks", async () => {
  const calls: string[] = [];

  @Controller()
  class DestroyCtrl {
    @OnDestroy()
    teardown() {
      calls.push("done");
    }
  }

  @Module({ controllers: [DestroyCtrl] })
  class DestroyMod {}

  const { destroy } = await DenoUIFactory.create(DestroyMod);
  assertEquals(calls, []);
  await destroy();
  assertEquals(calls, ["done"]);
});

Deno.test("throws when class is not decorated with @Module", async () => {
  class Bare {}
  await assertRejects(
    () => DenoUIFactory.create(Bare),
    Error,
    "Bare is not decorated with @Module",
  );
});

Deno.test("multiple @On handlers on one controller all route correctly", async () => {
  @Controller()
  class MathCtrl {
    @On("add")
    add(p: { a: number; b: number }) {
      return p.a + p.b;
    }

    @On("mul")
    mul(p: { a: number; b: number }) {
      return p.a * p.b;
    }
  }

  @Module({ controllers: [MathCtrl] })
  class MathMod {}

  const { bridge } = await DenoUIFactory.create(MathMod);
  assertEquals(await bridge.dispatch("add", { a: 3, b: 4 }), 7);
  assertEquals(await bridge.dispatch("mul", { a: 3, b: 4 }), 12);
});

Deno.test("duplicate @On across controllers warns via logger by default", async () => {
  @Controller()
  class A {
    @On("ping")
    a() {
      return "a";
    }
  }
  @Controller()
  class B {
    @On("ping")
    b() {
      return "b";
    }
  }

  @Module({ controllers: [A, B] })
  class Mod {}

  const logs: string[] = [];
  const { bridge } = await DenoUIFactory.create(Mod, {
    logger: (m) => logs.push(m),
  });

  // Last controller wins; a warning was emitted.
  assertEquals(await bridge.dispatch("ping"), "b");
  assertEquals(logs.some((m) => m.includes('Duplicate @On("ping")')), true);
});

Deno.test("duplicate @On throws in strict mode", async () => {
  @Controller()
  class A {
    @On("dup")
    a() {}
  }
  @Controller()
  class B {
    @On("dup")
    b() {}
  }

  @Module({ controllers: [A, B] })
  class Mod {}

  await assertRejects(
    () => DenoUIFactory.create(Mod, { strict: true }),
    Error,
    'Duplicate @On("dup")',
  );
});

Deno.test("logger receives a registered-events summary", async () => {
  @Controller()
  class Ctrl {
    @On("alpha")
    a() {}
    @On("beta")
    b() {}
  }

  @Module({ controllers: [Ctrl] })
  class Mod {}

  const logs: string[] = [];
  await DenoUIFactory.create(Mod, { logger: (m) => logs.push(m) });

  assertEquals(logs.some((m) => m.includes("Registered 2 event(s)")), true);
});

Deno.test("create() works with no options (backwards compatible)", async () => {
  @Controller()
  class Ctrl {
    @On("ping")
    p() {
      return "pong";
    }
  }
  @Module({ controllers: [Ctrl] })
  class Mod {}

  const { bridge } = await DenoUIFactory.create(Mod);
  assertEquals(await bridge.dispatch("ping"), "pong");
});
