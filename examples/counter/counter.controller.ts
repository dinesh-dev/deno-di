import { Controller, On, OnBoot, OnDestroy } from "../../mod.ts";
import { CounterService } from "./counter.service.ts";

@Controller()
export class CounterController {
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
