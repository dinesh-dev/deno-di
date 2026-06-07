/**
 * Marks a class as a controller — the event-handling entry point of a module.
 *
 * Use `@Controller` for classes that own `@On` event handlers and/or
 * `@OnBoot`/`@OnDestroy` lifecycle hooks. Controllers are listed in a module's
 * `controllers` array; the factory instantiates them, wires their `@On`
 * methods to the {@linkcode IpcBridge}, and calls their lifecycle hooks.
 *
 * Dependencies are injected via `static deps` — no reflection needed:
 *
 * ```ts
 * static deps = [WeatherService];
 * constructor(private weather: WeatherService) {}
 * ```
 *
 * **`@Controller` vs `@Injectable`**
 *
 * | | `@Controller` | `@Injectable` |
 * |---|---|---|
 * | Listed in `@Module` | `controllers: []` | `providers: []` |
 * | Handles events (`@On`) | ✓ | ✗ — ignored by the factory |
 * | Lifecycle hooks | ✓ (`@OnBoot`, `@OnDestroy`) | ✗ |
 * | Injected into others | rarely | ✓ |
 *
 * The general pattern is: **controllers handle events, injectables do the
 * work**. A controller receives an event, delegates to an injected service,
 * and returns the result.
 *
 * @example
 * ```ts
 * import { Controller, On } from "@dsivam/core";
 * import { WeatherService } from "./weather.service.ts";
 *
 * @Controller()
 * export class WeatherController {
 *   static deps = [WeatherService];
 *   constructor(private weather: WeatherService) {}
 *
 *   @On("getWeather")
 *   async handle(payload: { city: string }) {
 *     return this.weather.getForecast(payload.city);
 *   }
 * }
 * ```
 */
import type { ClassDecoratorFn } from "../types.ts";

export function Controller(): ClassDecoratorFn {
  return (_value, _ctx) => {};
}
