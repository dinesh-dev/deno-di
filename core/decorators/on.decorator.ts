import { onHandlers } from "./metadata.ts";
import type { MethodDecoratorFn } from "../types.ts";

/**
 * Binds a controller method to a named event.
 *
 * When {@linkcode IpcBridge.dispatch} is called with the matching event name,
 * the decorated method is invoked with the supplied payload and its return
 * value (or resolved promise) is forwarded back to the caller.
 *
 * The event transport is intentionally decoupled — wire the bridge to WebUI
 * IPC, a WebSocket message bus, an HTTP router, or any other source.
 *
 * @param event - The event name to listen for. Must be unique within a
 *   controller; re-using the same name on multiple methods of the same class
 *   is not supported.
 *
 * @example Basic handler
 * ```ts
 * import { Controller, On } from "@dsivam/core";
 *
 * @Controller()
 * export class PingController {
 *   @On("ping")
 *   handlePing() {
 *     return "pong";
 *   }
 * }
 * ```
 *
 * @example Handler with typed payload
 * ```ts
 * @Controller()
 * export class MathController {
 *   @On("add")
 *   add(payload: { a: number; b: number }) {
 *     return payload.a + payload.b;
 *   }
 * }
 * ```
 *
 * @example Async handler
 * ```ts
 * @Controller()
 * export class WeatherController {
 *   static deps = [WeatherService];
 *   constructor(private weather: WeatherService) {}
 *
 *   @On("getWeather")
 *   async handle(payload: { city: string }) {
 *     return await this.weather.getForecast(payload.city);
 *   }
 * }
 * ```
 */
export function On(event: string): MethodDecoratorFn {
  return (_value, context) => {
    context.addInitializer(function (this: unknown) {
      const ctor = (this as Record<string, unknown>).constructor;
      const existing = onHandlers.get(ctor) ?? new Map<string, string>();
      existing.set(event, context.name as string);
      onHandlers.set(ctor, existing);
    });
  };
}
