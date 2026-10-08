import { Effect } from "effect";
import { compileCli } from "./adapters/build";
import { HolydotError } from "./errors";

/**
 * Build installable JavaScript through the official external-library adapter.
 *
 * @returns Completion or a typed build error; no publication is performed.
 */
export function buildCli() {
  return Effect.tryPromise({
    try: compileCli,
    catch: (cause) => new HolydotError({ message: "Cannot build the installable CLI.", cause }),
  });
}

if (import.meta.main) {
  await Effect.runPromise(
    buildCli().pipe(
      Effect.match({
        onFailure: (error) => {
          console.error(error.message);
          process.exitCode = 1;
        },
        onSuccess: () => console.log("Built split OpenTUI/Solid CLI in dist/."),
      }),
    ),
  );
}
