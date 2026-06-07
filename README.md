# @dsivam/core

[![JSR](https://jsr.io/badges/@dsivam/core)](https://jsr.io/@dsivam/core)
[![CI](https://github.com/dinesh-dev/deno-di/actions/workflows/ci.yml/badge.svg)](https://github.com/dinesh-dev/deno-di/actions/workflows/ci.yml)

A Deno-first annotation library published to **JSR** that brings NestJS-inspired
decorators to any Deno application.

No Node.js. No heavy runtime. Just typed decorators and a minimal DI container
that work with Deno's native module system.

---

## What it provides

| Decorator     | Purpose                                             |
| ------------- | --------------------------------------------------- |
| `@Module`     | Declare a module with its controllers and providers |
| `@Injectable` | Mark a class as a DI-injectable provider            |
| `@Controller` | Mark a class as a controller (bound to a module)    |
| `@On(event)`  | Bind a controller method to a named IPC/event       |
| `@OnBoot`     | Lifecycle hook — runs after the app is initialized  |
| `@OnDestroy`  | Lifecycle hook — runs before the app shuts down     |

A `DenoUIFactory.create(AppModule)` bootstrap function wires everything
together: it resolves the dependency graph, instantiates providers in order, and
dispatches events to the correct `@On` handlers.

Beyond the decorators, the runtime ships:

| API                                                | Purpose                                                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `bridge.dispatchSafe(event, payload)`              | Dispatch into a structured `Result` envelope — never rejects (ideal across IPC)     |
| `bridge.emit` / `bridge.onEmit`                    | Push events backend → frontend (live updates, no polling)                           |
| `createClient<Contract>(bridge)`                   | Type-safe RPC — calling a renamed handler is a compile error                        |
| `bindBridge` (`@dsivam/core/webui`)                | One-call deno_webui wiring + companion `invoke` / `on` client helpers               |
| Provider defs (`useValue`/`useClass`/`useFactory`) | Inject config objects, handles, or interfaces via `string`/`symbol` tokens          |
| `DenoUIFactory.create(mod, { strict, logger })`    | Boot diagnostics: duplicate-event detection + event logging                         |
| `@dsivam/core/cli`                                 | `deno run -A jsr:@dsivam/core/cli new <name>` scaffolds a module/controller/service |

---

## Install

```ts
import { Controller, Injectable, Module, On } from "jsr:@dsivam/core";
```

---

## Quick example

```ts
// weather.service.ts
import { Injectable } from "jsr:@dsivam/core";

@Injectable()
export class WeatherService {
  async getForecast(city: string) {
    // fetch from any API
  }
}

// weather.controller.ts
import { Controller, On } from "jsr:@dsivam/core";
import { WeatherService } from "./weather.service.ts";

@Controller()
export class WeatherController {
  static deps = [WeatherService];
  constructor(private weather: WeatherService) {}

  @On("getWeather")
  async handle(payload: { city: string }) {
    return this.weather.getForecast(payload.city);
  }
}

// app.module.ts
import { Module } from "jsr:@dsivam/core";
import { WeatherController } from "./weather.controller.ts";
import { WeatherService } from "./weather.service.ts";

@Module({
  controllers: [WeatherController],
  providers: [WeatherService],
})
export class AppModule {}

// main.ts
import { DenoUIFactory } from "jsr:@dsivam/core";
import { AppModule } from "./app.module.ts";

await DenoUIFactory.create(AppModule);
```

---

## Native desktop apps (deno_webui)

The `@dsivam/core/webui` adapter binds every `@On` handler to a
[deno_webui](https://github.com/webui-dev/deno-webui) window in one call — no
hand-written `bind → dispatch` glue. Calls cross the boundary as a structured
`Result` envelope, so a thrown handler error reaches the webview with its
message intact instead of serializing to `{}`.

```ts
// main.ts (backend)
import { WebUI } from "jsr:@webui/deno-webui";
import { DenoUIFactory } from "jsr:@dsivam/core";
import { bindBridge } from "jsr:@dsivam/core/webui";
import { AppModule } from "./app.module.ts";

const { bridge } = await DenoUIFactory.create(AppModule);

const win = new WebUI();
bindBridge(bridge, win); // wires every @On event to the window

await win.show("./index.html");
await WebUI.wait();
```

On the webview side, the companion `invoke` helper calls a handler and unwraps
the envelope — returning the value on success, throwing on failure:

```ts
// index.html (frontend)
import { invoke } from "jsr:@dsivam/core/client/webui";

const count = await invoke<number>("increment", { by: 5 });
```

### Type-safe calls with a contract

Declare a contract once and `createClient` gives you a typed object — a renamed
or removed `@On` handler becomes a compile error at every call site instead of a
runtime `No handler registered`:

```ts
import { type Contract, createClient } from "jsr:@dsivam/core";

interface CounterApi extends Contract {
  increment: { payload: { by: number }; result: number };
  getCount: { result: number };
}

const api = createClient<CounterApi>(bridge);
const next = await api.increment({ by: 5 }); // typed as number
const now = await api.getCount(); // no payload required
```

`createClient` works over any dispatcher (the `bridge`, or a custom one) and,
when given an `IpcBridge`, unwraps the `Result` envelope — returning the value
on success and throwing on failure.

### Live updates (backend → frontend)

Handlers and services can push to the UI with `bridge.emit(...)` — progress,
counters, notifications — without the webview polling. The webui adapter
forwards each push automatically; subscribe on the frontend with `on`:

```ts
// backend
for (let pct = 0; pct <= 100; pct += 20) bridge.emit("progress", { pct });

// frontend
import { on } from "jsr:@dsivam/core/client/webui";
const off = on<{ pct: number }>("progress", ({ pct }) => render(pct));
```

---

## Scaffolding CLI

Generate a feature's module/controller/service trio in one command:

```sh
deno run -A jsr:@dsivam/core/cli new weather
# → weather.module.ts, weather.controller.ts, weather.service.ts
```

---

## Architecture

```
DenoUIFactory.create(AppModule)
  │
  ├─ Reads @Module metadata
  │    ├─ providers   → resolved by DI container (constructor injection)
  │    └─ controllers → instantiated with injected deps
  │
  └─ IPC bridge
       @On("event") ──► handler method called with event payload
```

### Dependency injection

Providers declare their dependencies via a static `deps` array (no reflection
required, so `experimentalDecorators` is the only tsconfig flag needed):

```ts
@Injectable()
class B {}

@Injectable()
class A {
  static deps = [B];
  constructor(private b: B) {}
}
```

The DI container resolves the graph, detects cycles, and throws on missing
providers at boot time — not at runtime.

#### Injecting values that aren't classes

For config objects, platform handles, or interface-typed services, register an
explicit provider against a `string`/`symbol` token and reference that token in
`static deps` — still no reflection:

```ts
const CONFIG = "CONFIG";

@Module({
  providers: [
    { provide: CONFIG, useValue: { apiUrl: "https://api.example.com" } },
    // also: { provide: Logger, useClass: ConsoleLogger }
    // also: { provide: Db, useFactory: (c) => new Db(c.apiUrl), deps: [CONFIG] }
    WeatherService,
  ],
  controllers: [WeatherController],
})
class AppModule {}

@Injectable()
class WeatherService {
  static deps = [CONFIG];
  constructor(private config: { apiUrl: string }) {}
}
```

### IPC / event binding

`@On(eventName)` registers a method as a handler for a named event. The event
dispatcher is decoupled from the transport — wire it to WebUI IPC, a WebSocket
message bus, an HTTP router, or any other event source.

`bridge.dispatch(event, payload)` returns the raw value and rejects on error;
`bridge.dispatchSafe(event, payload)` instead resolves to a structured
`{ ok, data | error }` `Result` and **never rejects** — the right choice when
the result has to cross a serialization boundary (it's what the webui adapter
uses under the hood).

### Boot diagnostics

`DenoUIFactory.create` takes an optional second argument. In `strict` mode a
duplicate `@On` event across controllers throws at boot; a `logger` receives the
warning and a one-line summary of every registered event:

```ts
await DenoUIFactory.create(AppModule, {
  strict: true,
  logger: (msg) => console.log("[boot]", msg),
});
```

### Lifecycle hooks

```ts
@Controller()
class AppController {
  @OnBoot()
  init() {/* called after all providers are ready */}

  @OnDestroy()
  teardown() {/* called on graceful shutdown */}
}
```

---

## Project structure

```
@dsivam/core/
├── deno.json             ← Deno config + JSR export map
├── mod.ts                ← Public API re-exports (".")
├── cli.ts                ← Scaffolder entry ("./cli")
├── client/
│   └── webui.ts          ← Browser-side invoke / on ("./client/webui")
└── core/
    ├── decorators/       ← @Module, @Injectable, @Controller, @On, lifecycle
    ├── di/
    │   ├── container.ts  ← DI resolver + provider defs / tokens
    │   └── reflect-registry.ts
    ├── ipc/
    │   ├── ipc-bridge.ts ← Event dispatcher + dispatchSafe + emit/onEmit
    │   └── result.ts     ← Result envelope + toErrorEnvelope
    ├── rpc/
    │   └── contract.ts   ← createClient typed RPC
    ├── transports/
    │   └── webui.ts      ← bindBridge deno_webui adapter ("./webui")
    ├── cli/
    │   └── scaffold.ts   ← code generator
    └── app/
        └── app-factory.ts ← DenoUIFactory.create()
```

---

## Compatibility

- **Deno** 1.40+ (uses native decorator support)
- No Node.js or npm dependencies
- Works for desktop apps (WebUI), HTTP servers, CLI tools, or any Deno runtime
