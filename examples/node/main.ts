/**
 * Node.js example for @dsivam/core
 *
 * Install:
 *   npx jsr add @dsivam/core
 *
 * Run (tsx or ts-node with TypeScript 5.0+):
 *   npx tsx main.ts
 *
 * tsconfig.json must NOT have experimentalDecorators — TC39 decorators
 * are the default in TypeScript 5.0+ and require no compiler flags.
 *
 * Note: @OnDestroy hooks do not auto-fire on process exit in Node.js
 * because globalThis.addEventListener("unload") is unavailable.
 * Call destroy() explicitly in your shutdown handler (see below).
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

// Explicit shutdown — required in Node.js since unload event is unavailable.
// Wire to your process signal handler for long-running servers:
//
//   process.on("SIGINT", async () => { await destroy(); process.exit(0); });
//
await destroy();
