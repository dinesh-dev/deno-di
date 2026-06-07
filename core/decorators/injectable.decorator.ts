/**
 * Marks a class as a DI-injectable provider (a **service**).
 *
 * Use `@Injectable` for classes that contain business logic, data access, or
 * any shared behaviour that other classes depend on. Injectables are listed in
 * a module's `providers` array and consumed via `static deps`.
 *
 * The DI container creates a single shared instance (singleton) per
 * application. No reflection is required — declare dependencies explicitly:
 *
 * ```ts
 * static deps = [ServiceA, ServiceB];
 * constructor(private a: ServiceA, private b: ServiceB) {}
 * ```
 *
 * **`@Injectable` vs `@Controller`**
 *
 * | | `@Injectable` | `@Controller` |
 * |---|---|---|
 * | Listed in `@Module` | `providers: []` | `controllers: []` |
 * | Handles events (`@On`) | ✗ — ignored by the factory | ✓ |
 * | Lifecycle hooks | ✗ | ✓ (`@OnBoot`, `@OnDestroy`) |
 * | Injected into others | ✓ | rarely |
 *
 * > **Note:** Placing `@On` or `@OnBoot`/`@OnDestroy` on an `@Injectable`
 * > class has no effect — the factory only wires event handlers for classes
 * > listed in `controllers`. Keep event handling in `@Controller` classes and
 * > business logic in `@Injectable` services.
 *
 * @example
 * ```ts
 * import { Injectable } from "@dsivam/core";
 *
 * @Injectable()
 * export class WeatherService {
 *   async getForecast(city: string): Promise<string> {
 *     const res = await fetch(`https://api.example.com/weather?city=${city}`);
 *     return res.text();
 *   }
 * }
 * ```
 */
import type { ClassDecoratorFn } from "../types.ts";

export function Injectable(): ClassDecoratorFn {
  return (_value, _ctx) => {};
}
