import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import { Container, type InjectionToken } from "../core/di/container.ts";
import { reflectedDeps } from "../core/di/reflect-registry.ts";

Deno.test("useValue binds a string token to a value", () => {
  const TOKEN = "CONFIG";
  const c = new Container();
  c.register({ provide: TOKEN, useValue: { url: "x" } });
  assertEquals(c.resolve(TOKEN), { url: "x" });
});

Deno.test("useFactory builds a value from resolved deps", () => {
  const PORT: InjectionToken<number> = Symbol("PORT");
  class Server {
    static deps = [PORT];
    constructor(public port: number) {}
  }

  const c = new Container();
  c.register({ provide: PORT, useValue: 8080 });
  c.register({
    provide: Server,
    useFactory: (port: number) => new Server(port),
    deps: [PORT],
  });

  assertEquals(c.resolve(Server).port, 8080);
});

Deno.test("useClass binds a token to a concrete implementation", () => {
  abstract class Logger {
    abstract log(): string;
  }
  class ConsoleLogger extends Logger {
    log() {
      return "console";
    }
  }
  const LOGGER = "Logger";

  const c = new Container();
  c.register({ provide: LOGGER, useClass: ConsoleLogger });
  assertEquals((c.resolve(LOGGER) as Logger).log(), "console");
});

Deno.test("a string token in static deps is injected", () => {
  const CONFIG = "CONFIG";
  class Service {
    static deps = [CONFIG];
    constructor(public config: { url: string }) {}
  }

  const c = new Container();
  c.register({ provide: CONFIG, useValue: { url: "https://api" } });
  assertEquals(c.resolve(Service).config.url, "https://api");
});

Deno.test("provider instances are singletons", () => {
  const TOKEN = "T";
  class Thing {}
  const c = new Container();
  c.register({ provide: TOKEN, useClass: Thing });
  assertStrictEquals(c.resolve(TOKEN), c.resolve(TOKEN));
});

Deno.test("throws on an unregistered string token", () => {
  const c = new Container();
  assertThrows(
    () => c.resolve("MISSING"),
    Error,
    "No provider registered for token: MISSING",
  );
});

Deno.test("throws on an unregistered symbol token (name in message)", () => {
  const TOKEN = Symbol("PORT");
  const c = new Container();
  assertThrows(
    () => c.resolve(TOKEN),
    Error,
    "Symbol(PORT)",
  );
});

Deno.test("falls back to reflectedDeps when a class has no static deps", () => {
  class Dep {}
  class Service {
    // no `static deps` — deps come from the reflect registry instead
    constructor(public dep: Dep) {}
  }
  reflectedDeps.set(Service, [Dep]);

  const c = new Container();
  const svc = c.resolve(Service);
  assertEquals(svc.dep instanceof Dep, true);
});

Deno.test("explicit static deps take precedence over reflectedDeps", () => {
  class A {}
  class B {}
  class Service {
    static deps = [A];
    constructor(public injected: A | B) {}
  }
  // Registry would inject B, but static deps wins.
  reflectedDeps.set(Service, [B]);

  const c = new Container();
  assertEquals(c.resolve(Service).injected instanceof A, true);
});
