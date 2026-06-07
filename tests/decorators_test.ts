import { assertEquals } from "@std/assert";
import {
  Controller,
  Injectable,
  Module,
  On,
  OnBoot,
  OnDestroy,
} from "../mod.ts";
import {
  moduleMetadata,
  onBootHandlers,
  onDestroyHandlers,
  onHandlers,
} from "../core/decorators/metadata.ts";

Deno.test("@Module stores controllers and providers", () => {
  @Injectable()
  class Svc {}

  @Controller()
  class Ctrl {}

  @Module({ controllers: [Ctrl], providers: [Svc] })
  class Mod {}

  const meta = moduleMetadata.get(Mod);
  assertEquals(meta?.controllers, [Ctrl]);
  assertEquals(meta?.providers, [Svc]);
});

Deno.test("@Module with empty options stores empty arrays-equivalent", () => {
  @Module({})
  class EmptyMod {}

  const meta = moduleMetadata.get(EmptyMod);
  assertEquals(meta?.controllers, undefined);
  assertEquals(meta?.providers, undefined);
});

Deno.test("@On registers event → method mapping on constructor", () => {
  @Controller()
  class Ctrl {
    @On("ping")
    pong() {
      return "pong";
    }
  }

  new Ctrl(); // addInitializer fires on construction
  const handlers = onHandlers.get(Ctrl);
  assertEquals(handlers?.get("ping"), "pong");
});

Deno.test("@On supports multiple handlers on same class", () => {
  @Controller()
  class Ctrl {
    @On("a")
    handleA() {}

    @On("b")
    handleB() {}
  }

  new Ctrl(); // addInitializer fires on construction
  const handlers = onHandlers.get(Ctrl);
  assertEquals(handlers?.get("a"), "handleA");
  assertEquals(handlers?.get("b"), "handleB");
});

Deno.test("@OnBoot registers method name", () => {
  @Controller()
  class Ctrl {
    @OnBoot()
    init() {}
  }

  new Ctrl(); // addInitializer fires on construction
  assertEquals(onBootHandlers.get(Ctrl), ["init"]);
});

Deno.test("@OnDestroy registers method name", () => {
  @Controller()
  class Ctrl {
    @OnDestroy()
    teardown() {}
  }

  new Ctrl(); // addInitializer fires on construction
  assertEquals(onDestroyHandlers.get(Ctrl), ["teardown"]);
});

Deno.test("@OnBoot and @OnDestroy accumulate multiple hooks", () => {
  @Controller()
  class Ctrl {
    @OnBoot()
    bootA() {}

    @OnBoot()
    bootB() {}

    @OnDestroy()
    destroyA() {}

    @OnDestroy()
    destroyB() {}
  }

  new Ctrl(); // addInitializer fires on construction
  assertEquals(onBootHandlers.get(Ctrl), ["bootA", "bootB"]);
  assertEquals(onDestroyHandlers.get(Ctrl), ["destroyA", "destroyB"]);
});

Deno.test("@On / @OnBoot / @OnDestroy WeakMaps are empty before first instantiation", () => {
  @Controller()
  class Ctrl {
    @On("ping")
    pong() {}

    @OnBoot()
    init() {}

    @OnDestroy()
    teardown() {}
  }

  // TC39 addInitializer fires at construction time, not class-definition time
  assertEquals(onHandlers.get(Ctrl), undefined);
  assertEquals(onBootHandlers.get(Ctrl), undefined);
  assertEquals(onDestroyHandlers.get(Ctrl), undefined);
});

Deno.test("@OnBoot and @OnDestroy don't duplicate hooks when class is instantiated multiple times", () => {
  @Controller()
  class Ctrl {
    @OnBoot()
    init() {}

    @OnDestroy()
    teardown() {}
  }

  new Ctrl();
  new Ctrl();
  new Ctrl();

  // includes guard ensures each method name appears exactly once
  assertEquals(onBootHandlers.get(Ctrl), ["init"]);
  assertEquals(onDestroyHandlers.get(Ctrl), ["teardown"]);
});
