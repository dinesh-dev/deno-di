import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  scaffold,
  toKebab,
  toPascal,
  writeScaffold,
} from "../core/cli/scaffold.ts";
import { main } from "../cli.ts";

Deno.test("toKebab / toPascal normalize names", () => {
  assertEquals(toKebab("WeatherForecast"), "weather-forecast");
  assertEquals(toKebab("weather_forecast"), "weather-forecast");
  assertEquals(toPascal("weather-forecast"), "WeatherForecast");
  assertEquals(toPascal("weather"), "Weather");
});

Deno.test("scaffold generates the module/controller/service trio", () => {
  const files = scaffold("weather");
  assertEquals(files.map((f) => f.path).sort(), [
    "weather.controller.ts",
    "weather.module.ts",
    "weather.service.ts",
  ]);

  const controller = files.find((f) => f.path === "weather.controller.ts")!;
  assertStringIncludes(controller.content, "export class WeatherController");
  assertStringIncludes(controller.content, "static deps = [WeatherService]");
  assertStringIncludes(controller.content, '@On("weather.ping")');
});

Deno.test("scaffold turns a hyphenated name into a valid param identifier", () => {
  const files = scaffold("weather-forecast");
  const controller = files.find((f) =>
    f.path === "weather-forecast.controller.ts"
  )!;
  assertStringIncludes(
    controller.content,
    "export class WeatherForecastController",
  );
  // hyphen is not a legal identifier char — must become underscore
  assertStringIncludes(
    controller.content,
    "private weather_forecast: WeatherForecastService",
  );
});

Deno.test("scaffold rejects an empty name", () => {
  let threw = false;
  try {
    scaffold("---");
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("writeScaffold writes files into a target dir", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const written = await writeScaffold("weather", dir);
    assertEquals(written.length, 3);
    for (const path of written) {
      const content = await Deno.readTextFile(path);
      assertStringIncludes(content, "Weather");
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("writeScaffold refuses to overwrite existing files", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await writeScaffold("weather", dir);
    await assertRejects(
      () => writeScaffold("weather", dir),
      Error,
      "Refusing to overwrite",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("main: bare invocation prints usage and exits 0", async () => {
  assertEquals(await main([]), 0);
});

Deno.test("main: unknown command exits 1", async () => {
  assertEquals(await main(["bogus"]), 1);
});

Deno.test("main: 'new' without a name exits 1", async () => {
  assertEquals(await main(["new"]), 1);
});

Deno.test("main: 'new <name>' scaffolds and exits 0", async () => {
  const dir = await Deno.makeTempDir();
  const cwd = Deno.cwd();
  try {
    Deno.chdir(dir);
    assertEquals(await main(["new", "weather"]), 0);
    assertStringIncludes(
      await Deno.readTextFile(`${dir}/weather.module.ts`),
      "WeatherModule",
    );
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(dir, { recursive: true });
  }
});
