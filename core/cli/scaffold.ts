/**
 * Code generator behind `deno run -A jsr:@dsivam/core/cli new <name>`.
 *
 * {@linkcode scaffold} is pure (filename → content) so it is trivially
 * testable; {@linkcode writeScaffold} writes the result to disk, refusing to
 * overwrite existing files.
 *
 * @module
 */

/** A generated file: its path (relative to the target dir) and contents. */
export interface ScaffoldFile {
  path: string;
  content: string;
}

/** `weather`, `WeatherForecast`, `weather_forecast` → `weather-forecast`. */
export function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

/** `weather-forecast` → `WeatherForecast`. */
export function toPascal(name: string): string {
  return toKebab(name)
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Generates the module/controller/service trio for a feature.
 *
 * @param rawName - The feature name in any case (e.g. `weather`, `Weather`).
 * @returns The files to write, mirroring `examples/counter`'s layout.
 * @throws {Error} If `rawName` has no usable characters.
 */
export function scaffold(rawName: string): ScaffoldFile[] {
  const kebab = toKebab(rawName);
  if (!kebab) throw new Error(`Invalid name: "${rawName}"`);
  const Pascal = toPascal(rawName);
  const pkg = "jsr:@dsivam/core";

  const service = `import { Injectable } from "${pkg}";

@Injectable()
export class ${Pascal}Service {
  getMessage(): string {
    return "Hello from ${Pascal}Service";
  }
}
`;

  const controller = `import { Controller, On } from "${pkg}";
import { ${Pascal}Service } from "./${kebab}.service.ts";

@Controller()
export class ${Pascal}Controller {
  static deps = [${Pascal}Service];
  constructor(private ${kebab.replace(/-/g, "_")}: ${Pascal}Service) {}

  @On("${kebab}.ping")
  ping() {
    return this.${kebab.replace(/-/g, "_")}.getMessage();
  }
}
`;

  const module = `import { Module } from "${pkg}";
import { ${Pascal}Controller } from "./${kebab}.controller.ts";
import { ${Pascal}Service } from "./${kebab}.service.ts";

@Module({
  controllers: [${Pascal}Controller],
  providers: [${Pascal}Service],
})
export class ${Pascal}Module {}
`;

  return [
    { path: `${kebab}.service.ts`, content: service },
    { path: `${kebab}.controller.ts`, content: controller },
    { path: `${kebab}.module.ts`, content: module },
  ];
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return false;
    throw e;
  }
}

/**
 * Writes {@linkcode scaffold} output into `dir`.
 *
 * @param rawName - The feature name.
 * @param dir - Target directory (created if missing).
 * @returns The absolute-ish paths written.
 * @throws {Error} If any target file already exists (never overwrites).
 */
export async function writeScaffold(
  rawName: string,
  dir: string,
): Promise<string[]> {
  const files = scaffold(rawName);
  await Deno.mkdir(dir, { recursive: true });

  const targets = files.map((f) => ({ ...f, full: `${dir}/${f.path}` }));
  for (const t of targets) {
    if (await exists(t.full)) {
      throw new Error(`Refusing to overwrite existing file: ${t.full}`);
    }
  }

  for (const t of targets) {
    await Deno.writeTextFile(t.full, t.content);
  }
  return targets.map((t) => t.full);
}
