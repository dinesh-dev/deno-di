export { Module } from "./core/decorators/module.decorator.ts";
export { Injectable } from "./core/decorators/injectable.decorator.ts";
export { Controller } from "./core/decorators/controller.decorator.ts";
export { On } from "./core/decorators/on.decorator.ts";
export { OnBoot, OnDestroy } from "./core/decorators/lifecycle.decorator.ts";
export { DenoUIFactory } from "./core/app/app-factory.ts";
export { IpcBridge } from "./core/ipc/ipc-bridge.ts";
export type { EmitListener } from "./core/ipc/ipc-bridge.ts";
export { toErrorEnvelope } from "./core/ipc/result.ts";
export type { Err, ErrorInfo, Ok, Result } from "./core/ipc/result.ts";
export { createClient } from "./core/rpc/contract.ts";
export type {
  ClientOf,
  Contract,
  Dispatcher,
  RawDispatcher,
  RpcEndpoint,
  SafeDispatcher,
} from "./core/rpc/contract.ts";
export type { ModuleOptions } from "./core/decorators/metadata.ts";
export type { AppRef, BootOptions } from "./core/app/app-factory.ts";
export type { Constructor } from "./core/types.ts";
export type {
  ClassProvider,
  FactoryProvider,
  InjectionToken,
  ProviderDef,
  ValueProvider,
} from "./core/di/container.ts";
