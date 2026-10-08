import { Effect } from "effect";
import { inspectArchitecture } from "./adapters/architecture";
import { HolydotError } from "./errors";

/**
 * Run the architectural gate with typed filesystem/parser failures.
 *
 * @param root - Project root.
 * @returns Domain-boundary/JSDoc findings, without altering source files.
 */
export function checkArchitecture(root: string) {
  return Effect.try({
    try: () => inspectArchitecture(root),
    catch: (cause) => new HolydotError({ message: "Architecture/UTF-8 inspection failed.", cause }),
  });
}

if (import.meta.main) {
  await Effect.runPromise(
    checkArchitecture(process.cwd()).pipe(
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
            console.log("PASS: Effect domain boundaries, public JSDoc and strict UTF-8 source.");
        },
      }),
    ),
  );
}
