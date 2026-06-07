import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import { Container } from "../core/di/container.ts";

Deno.test("resolves a class with no deps", () => {
  class A {}
  const c = new Container();
  assertEquals(c.resolve(A) instanceof A, true);
});

Deno.test("injects a single dep", () => {
  class B {}
  class A {
    static deps = [B];
    constructor(public b: B) {}
  }
  const c = new Container();
  const a = c.resolve(A);
  assertEquals(a.b instanceof B, true);
});

Deno.test("resolves a transitive dep chain (A → B → C)", () => {
  class C {}
  class B {
    static deps = [C];
    constructor(public c: C) {}
  }
  class A {
    static deps = [B];
    constructor(public b: B) {}
  }

  const c = new Container();
  const a = c.resolve(A);
  assertEquals(a.b instanceof B, true);
  assertEquals(a.b.c instanceof C, true);
});

Deno.test("returns the same singleton on repeated resolves", () => {
  class A {}
  const c = new Container();
  assertStrictEquals(c.resolve(A), c.resolve(A));
});

Deno.test("two classes sharing a dep get the same instance", () => {
  class Shared {}
  class X {
    static deps = [Shared];
    constructor(public s: Shared) {}
  }
  class Y {
    static deps = [Shared];
    constructor(public s: Shared) {}
  }

  const c = new Container();
  const x = c.resolve(X);
  const y = c.resolve(Y);
  assertStrictEquals(x.s, y.s);
});

Deno.test("throws when a dep is not constructable", () => {
  class A {
    // deno-lint-ignore no-explicit-any
    static deps = [null as any];
  }
  const c = new Container();
  assertThrows(() => c.resolve(A));
});
