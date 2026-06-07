import { Injectable } from "../../mod.ts";

@Injectable()
export class CounterService {
  private count = 0;

  increment(by = 1): number {
    this.count += by;
    return this.count;
  }

  decrement(by = 1): number {
    this.count -= by;
    return this.count;
  }

  getCount(): number {
    return this.count;
  }

  reset(): void {
    this.count = 0;
  }
}
