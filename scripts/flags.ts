import { Effect, Schema } from "effect";
import { HolydotError } from "./errors";
import { DEFAULT_CONFIG, parseConfig, type HolydotConfig } from "./config";

/** Validated CLI input; only setup/render are public task commands. */
export interface CliFlags {
  /** Informational output or requested task. */
  readonly command: "help" | "version" | "setup" | "render";
  /** Optional settings filename, resolved against the invoking directory. */
  readonly configPath: string;
  /** Overrides validated before reading/writing any configuration. */
  readonly overrides: Readonly<Record<string, string>>;
}

const ArgumentsSchema = Schema.Array(Schema.String);
const preferences = new Set([
  "--coordinator-model",
  "--coordinator-effort",
  "--specialist-model",
  "--specialist-effort",
  "--speed",
  "--status-interval-minutes",
  "--codex-home",
]);

/**
 * Apply only explicit setting overrides and revalidate the entire resulting config.
 *
 * @param current - Existing/default validated choices.
 * @param overrides - Validated CLI pairs, never permissions.
 * @returns A new validated configuration, preserving unspecified choices.
 */
export function applyOverrides(
  current: HolydotConfig,
  overrides: Readonly<Record<string, string>>,
) {
  const coordinator = { ...current.delegation.coordinator };
  const specialist = { ...current.delegation.specialist };
  const interval = overrides["--status-interval-minutes"];
  const config = {
    ...current,
    delegation: {
      coordinator: {
        model: overrides["--coordinator-model"] ?? coordinator.model,
        effort: overrides["--coordinator-effort"] ?? coordinator.effort,
      },
      specialist: {
        model: overrides["--specialist-model"] ?? specialist.model,
        effort: overrides["--specialist-effort"] ?? specialist.effort,
      },
      speed: overrides["--speed"] ?? current.delegation.speed,
    },
    statusUpdates: {
      intervalMinutes:
        interval === undefined ? current.statusUpdates.intervalMinutes : Number(interval),
    },
    codexHome:
      overrides["--codex-home"] === "default"
        ? null
        : (overrides["--codex-home"] ?? current.codexHome),
  };
  if (interval !== undefined && !/^\d{1,4}$/.test(interval)) {
    return Effect.fail(
      new HolydotError({ message: "Status interval must be a whole number of minutes (1–1440)." }),
    );
  }
  return parseConfig(config);
}

/**
 * Parse and validate runtime flags before performing side effects.
 *
 * @param input - Argv excluding executable names.
 * @returns Validated command and pairs; unsupported/duplicate/missing flags fail explicitly.
 */
export function parseFlags(input: unknown): Effect.Effect<CliFlags, HolydotError> {
  return Effect.gen(function* () {
    const args = yield* Schema.decodeUnknownEffect(ArgumentsSchema)(input).pipe(
      Effect.mapError(
        (cause) => new HolydotError({ message: "CLI arguments must be strings.", cause }),
      ),
    );
    let command: CliFlags["command"] | undefined;
    let info: "help" | "version" | undefined;
    let configPath = "holydot.config.json";
    const seen = new Set<string>();
    const overrides: Record<string, string> = {};
    for (let index = 0; index < args.length; index++) {
      const arg = args[index]!;
      if (["-h", "--help", "-v", "--version"].includes(arg)) {
        const selected = arg === "-h" || arg === "--help" ? "help" : "version";
        if (info !== undefined)
          return yield* Effect.fail(
            new HolydotError({ message: "Use one informational flag at a time." }),
          );
        info = selected;
      } else if (arg === "setup" || arg === "render") {
        if (command !== undefined)
          return yield* Effect.fail(
            new HolydotError({ message: "Use exactly one command: setup or render." }),
          );
        command = arg;
      } else if (arg === "--config" || preferences.has(arg)) {
        const value = args[++index];
        if (seen.has(arg) || value === undefined || value.startsWith("--") || !value.trim()) {
          return yield* Effect.fail(new HolydotError({ message: `Use ${arg} once with a value.` }));
        }
        seen.add(arg);
        if (arg === "--config") configPath = value;
        else overrides[arg] = value;
      } else
        return yield* Effect.fail(
          new HolydotError({ message: `Unknown command or option: ${arg}. Use --help.` }),
        );
    }
    if (Object.keys(overrides).length > 0 && command !== "setup") {
      return yield* Effect.fail(
        new HolydotError({
          message: "Preference overrides belong to setup; render reads saved choices.",
        }),
      );
    }
    yield* applyOverrides(DEFAULT_CONFIG, overrides);
    if (
      !Array.from(configPath).every(
        (character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
      )
    )
      return yield* Effect.fail(new HolydotError({ message: "Invalid configuration path." }));
    return { command: info ?? command ?? "help", configPath, overrides };
  });
}
