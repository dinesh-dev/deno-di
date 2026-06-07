/**
 * `@dsivam/core` scaffolding CLI.
 *
 * ```sh
 * deno run -A jsr:@dsivam/core/cli new weather
 * ```
 *
 * Generates `weather.module.ts`, `weather.controller.ts`, and
 * `weather.service.ts` in the current directory.
 *
 * @module
 */
import { writeScaffold } from "./core/cli/scaffold.ts";

const USAGE = `@dsivam/core scaffolder

Usage:
  deno run -A jsr:@dsivam/core/cli new <name>

Generates a module/controller/service trio in the current directory.`;

/**
 * Runs the CLI for the given args and returns a process exit code.
 *
 * @param args - Argument vector (e.g. `["new", "weather"]`).
 * @returns `0` on success or bare invocation, `1` on usage/scaffold errors.
 */
export async function main(args: string[]): Promise<number> {
  const [command, name] = args;
  if (command !== "new" || !name) {
    console.log(USAGE);
    return command === undefined ? 0 : 1;
  }

  try {
    const written = await writeScaffold(name, Deno.cwd());
    for (const path of written) console.log(`created ${path}`);
    return 0;
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return 1;
  }
}

if (import.meta.main) {
  Deno.exit(await main(Deno.args));
}
