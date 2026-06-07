import { moduleMetadata, type ModuleOptions } from "./metadata.ts";
import type { ClassDecoratorFn } from "../types.ts";

/**
 * Declares a module — the top-level unit of organisation in a `@dsivam/core`
 * application.
 *
 * A module groups a set of controllers and providers together. Pass it to
 * {@linkcode DenoUIFactory.create} to boot the application.
 *
 * @param options.controllers - Controller classes to instantiate and wire.
 *   Each controller's `@On`, `@OnBoot`, and `@OnDestroy` methods are
 *   registered automatically.
 * @param options.providers - Injectable service classes to register with the
 *   DI container. Providers are resolved before controllers and are available
 *   for injection via `static deps`.
 *
 * @example
 * ```ts
 * import { Module } from "@dsivam/core";
 * import { WeatherController } from "./weather.controller.ts";
 * import { WeatherService } from "./weather.service.ts";
 *
 * @Module({
 *   controllers: [WeatherController],
 *   providers: [WeatherService],
 * })
 * export class AppModule {}
 * ```
 */
export function Module(options: ModuleOptions): ClassDecoratorFn {
  return (value, _ctx) => {
    moduleMetadata.set(value, options);
  };
}

export type { ModuleOptions };
