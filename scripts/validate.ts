import { Effect } from "effect";
import { resolve } from "node:path";
import { inspectPackage } from "./adapters/validate";
import { HolydotError } from "./errors";
/** Package integrity requirements and pinned public provenance used by callers. */
export { REQUIRED_FILES, SOURCE_REVISION } from "./adapters/validate";

/**
 * Validate package completeness and links through a native filesystem Effect adapter.
 *
 * @param directory - Root to inspect without modification.
 * @returns Integrity errors, or a typed filesystem failure; no network calls occur.
 */
export function validatePackage(directory: string): Effect.Effect<string[], HolydotError> {
  return Effect.try({
    try: () => inspectPackage(directory),
    catch: (cause) => new HolydotError({ message: "Package inspection failed.", cause }),
  });
}

if (import.meta.main) {
  await Effect.runPromise(
    validatePackage(resolve(import.meta.dir, "..")).pipe(
      Effect.match({
        onFailure: (error) => {
          console.error(error.message);
          process.exitCode = 1;
        },
        onSuccess: (errors) => {
          if (errors.length > 0) {
            console.error(errors.join("\n"));
            process.exitCode = 1;
          } else
            console.log(
              "PASS: package files, inline links, pinned public provenance and license markers.",
            );
        },
      }),
    ),
  );
}
