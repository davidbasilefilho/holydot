import { Effect, Schema } from "effect";
import { HolydotError } from "./errors";
import { parseJson, readConfigFile, saveConfigFile } from "./adapters/files";
import { resolve } from "node:path";

/** Product convention: 0.X.Y with optional numeric maintenance suffix -Z. */
export const ProductVersionSchema = Schema.String.check(
  Schema.isPattern(/^0\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*))?(?![\s\S])/),
);
/** Developer bump axes; these are never public holydot CLI commands. */
export const AxisSchema = Schema.Literals(["x", "y", "z"]);

/**
 * Increment the requested product axis and reset lower fields.
 *
 * @param version - Current 0.X.Y[-Z] product version.
 * @param axis - X resets Y/Z, Y resets Z, Z increments maintenance (absent Z starts at 1).
 * @returns Next canonical product version or a typed validation failure.
 */
export function bumpVersion(version: unknown, axis: unknown): Effect.Effect<string, HolydotError> {
  return Effect.gen(function* () {
    const current = yield* Schema.decodeUnknownEffect(ProductVersionSchema)(version).pipe(
      Effect.mapError(
        (cause) => new HolydotError({ message: "Expected product version 0.X.Y[-Z].", cause }),
      ),
    );
    const field = yield* Schema.decodeUnknownEffect(AxisSchema)(axis).pipe(
      Effect.mapError(
        (cause) => new HolydotError({ message: "Bump axis must be x, y or z.", cause }),
      ),
    );
    const [base, suffix] = current.split("-");
    const [, x, y] = base!.split(".").map(Number);
    const z = suffix === undefined ? 0 : Number(suffix);
    if (
      ![x, y, z].every(
        (number) =>
          number !== undefined && Number.isSafeInteger(number) && number < Number.MAX_SAFE_INTEGER,
      )
    ) {
      return yield* Effect.fail(
        new HolydotError({ message: "Version fields exceed safe integer limits." }),
      );
    }
    return field === "x"
      ? `0.${x! + 1}.0`
      : field === "y"
        ? `0.${x}.${y! + 1}`
        : `0.${x}.${y}-${z + 1}`;
  });
}

/**
 * Update only a local package manifest, keeping a recoverable prior file.
 *
 * @param directory - Project root.
 * @param axis - Developer-selected axis, schema-validated before writing.
 * @returns New version; no Git or publication action is performed.
 */
export function bumpManifest(directory: string, axis: unknown) {
  return Effect.gen(function* () {
    const path = resolve(directory, "package.json");
    const stored = yield* readConfigFile(path);
    if (stored === null)
      return yield* Effect.fail(new HolydotError({ message: "package.json is missing." }));
    const unknown = yield* parseJson(stored.content);
    const manifest = yield* Schema.decodeUnknownEffect(
      Schema.Struct({ name: Schema.Literal("holydot"), version: ProductVersionSchema }),
    )(unknown).pipe(
      Effect.mapError(
        (cause) => new HolydotError({ message: "Expected a holydot product manifest.", cause }),
      ),
    );
    const version = yield* bumpVersion(manifest.version, axis);
    yield* saveConfigFile(
      path,
      stored,
      `${JSON.stringify({ ...(unknown as Record<string, unknown>), version }, null, 2)}\n`,
    );
    return version;
  });
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const action =
    args.length === 1
      ? bumpManifest(process.cwd(), args[0])
      : Effect.fail(new HolydotError({ message: "Use bun run bump:x, bump:y or bump:z." }));
  await Effect.runPromise(
    action.pipe(
      Effect.match({
        onFailure: (error) => {
          console.error(error.message);
          process.exitCode = 1;
        },
        onSuccess: (version) => console.log(version),
      }),
    ),
  );
}
