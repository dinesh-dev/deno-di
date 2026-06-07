/**
 * Bun example for @dsivam/core
 *
 * Install:
 *   bunx jsr add @dsivam/core
 *
 * Run:
 *   bun run main.ts
 *
 * Bun supports TypeScript and TC39 decorators natively — no tsconfig flags needed.
 *
 * Note: @OnDestroy hooks do not auto-fire on process exit in Bun because
 * globalThis.addEventListener("unload") is unavailable. Call destroy()
 * explicitly in your shutdown handler (see below).
 */

import {
  Controller,
  DenoUIFactory,
  Injectable,
  Module,
  On,
  OnBoot,
  OnDestroy,
} from "@dsivam/core";

@Injectable()
class CounterService {
  private count = 0;

  increment(by = 1): number {
    return (this.count += by);
  }
  decrement(by = 1): number {
    return (this.count -= by);
  }
  getCount(): number {
    return this.count;
  }
}

@Controller()
class CounterController {
  static deps = [CounterService];
  constructor(private counter: CounterService) {}

  @OnBoot()
  init() {
    console.log(
      "[boot] CounterController ready. count =",
      this.counter.getCount(),
    );
  }

  @On("increment")
  handleIncrement(payload: { by?: number }) {
    return this.counter.increment(payload?.by);
  }

  @On("decrement")
  handleDecrement(payload: { by?: number }) {
    return this.counter.decrement(payload?.by);
  }

  @On("getCount")
  handleGetCount() {
    return this.counter.getCount();
  }

  @OnDestroy()
  teardown() {
    console.log(
      "[destroy] CounterController done. final count =",
      this.counter.getCount(),
    );
  }
}

@Module({
  controllers: [CounterController],
  providers: [CounterService],
})
class AppModule {}

const { bridge, destroy } = await DenoUIFactory.create(AppModule);

console.log("getCount  →", await bridge.dispatch("getCount"));
console.log("increment →", await bridge.dispatch("increment", { by: 5 }));
console.log("increment →", await bridge.dispatch("increment", { by: 3 }));
console.log("decrement →", await bridge.dispatch("decrement", { by: 2 }));
console.log("getCount  →", await bridge.dispatch("getCount"));

// Explicit shutdown — required in Bun since unload event is unavailable.
// Wire to your process signal handler for long-running servers:
//
//   process.on("SIGINT", async () => { await destroy(); process.exit(0); });
//
await destroy();
