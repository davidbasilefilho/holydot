import { Effect, Schema } from "effect";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { HolydotError } from "./errors";

/** A bounded host model identifier, never executable instructions. */
export const ModelSchema = Schema.String.check(Schema.isPattern(/^gpt-[a-z0-9.-]{1,76}(?![\s\S])/));
/** Reasoning effort requested only on a supporting host. */
export const EffortSchema = Schema.Literals(["low", "medium", "high"]);
/** Explicit speed selection; Standard is the default. */
export const SpeedSchema = Schema.Literals(["standard", "fast"]);
/** Whole reporting minutes; this preference creates no schedule. */
export const IntervalSchema = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 1440 }));
/** Advanced path override; control characters and empty paths are rejected. */
export const HomeSchema = Schema.NullOr(
  Schema.String.check(
    Schema.isBetweenLength(1, 4096),
    Schema.makeFilter((value: string) =>
      Array.from(value).every(
        (character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
      ),
    ),
  ),
);
/** Model and effort for one explicit delegation role. */
export const RoleSchema = Schema.Struct({ model: ModelSchema, effort: EffortSchema });
/** Validated v2 local preferences, without account authority or project scope. */
export const ConfigSchema = Schema.Struct({
  schemaVersion: Schema.Literal(2),
  delegation: Schema.Struct({
    coordinator: RoleSchema,
    specialist: RoleSchema,
    speed: SpeedSchema,
  }),
  statusUpdates: Schema.Struct({ intervalMinutes: IntervalSchema }),
  codexHome: HomeSchema,
});
/** Immutable validated settings used by the CLI and interactive editor. */
export type HolydotConfig = typeof ConfigSchema.Type;
/** Fresh v2 defaults; callers should validate/copy before editing. */
export const DEFAULT_CONFIG: HolydotConfig = {
  /** Version of the persisted local-preference format. */
  schemaVersion: 2,
  /** Separate requested roles and speed; no host routing or approval is created. */
  delegation: {
    /** Defaults for delegated coordination, distinct from the main dot. */
    coordinator: {
      /** Supporting-host model preference for coordination. */
      model: "gpt-6.1-sol",
      /** Balanced requested reasoning effort. */
      effort: "medium",
    },
    /** Defaults for bounded specialist work. */
    specialist: {
      /** Supporting-host model preference for specialists. */
      model: "gpt-6-luna",
      /** Requested specialist reasoning effort. */
      effort: "high",
    },
    /** Standard is the default; Fast needs explicit selection. */
    speed: "standard",
  },
  /** Reporting preferences; a real scheduler remains necessary. */
  statusUpdates: {
    /** Default recurring-panorama interval in minutes, without scheduling a task. */
    intervalMinutes: 30,
  },
  /** Null preserves the explicit environment or Codex default home. */
  codexHome: null,
};

/**
 * Validate an untrusted configuration with typed Effect errors and reject excess keys.
 *
 * @param value - Parsed configuration to validate.
 * @returns A validated copy or an actionable typed failure.
 */
export function parseConfig(value: unknown): Effect.Effect<HolydotConfig, HolydotError> {
  return Schema.decodeUnknownEffect(ConfigSchema, { onExcessProperty: "error" })(value).pipe(
    Effect.mapError(
      (cause) => new HolydotError({ message: "Invalid holydot configuration.", cause }),
    ),
  );
}

const LegacyScope = Schema.Struct({
  repository: Schema.NullOr(Schema.String),
  branch: Schema.NullOr(Schema.String),
  mode: Schema.NullOr(Schema.Literals(["ask", "requested"])),
});
const LegacyConfig = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  delegation: Schema.Struct({ model: ModelSchema, effort: EffortSchema, speed: SpeedSchema }),
  accountRules: Schema.optionalKey(LegacyScope),
  statusUpdates: Schema.optionalKey(Schema.Struct({ intervalMinutes: IntervalSchema })),
});

/**
 * Decode v1 or v2 without modifying disk; only setup Save commits migration.
 *
 * @param value - Untrusted saved settings.
 * @returns Settings plus an explicit migration indicator; v1 model/effort belong to specialists.
 */
export function decodeStored(value: unknown) {
  return Effect.gen(function* () {
    if (
      typeof value === "object" &&
      value !== null &&
      "schemaVersion" in value &&
      value.schemaVersion === 1
    ) {
      const legacy = yield* Schema.decodeUnknownEffect(LegacyConfig, { onExcessProperty: "error" })(
        value,
      ).pipe(
        Effect.mapError(
          (cause) =>
            new HolydotError({
              message: "Invalid legacy configuration; original preserved.",
              cause,
            }),
        ),
      );
      const config = yield* parseConfig({
        ...DEFAULT_CONFIG,
        delegation: {
          coordinator: { ...DEFAULT_CONFIG.delegation.coordinator },
          specialist: { model: legacy.delegation.model, effort: legacy.delegation.effort },
          speed: legacy.delegation.speed,
        },
        statusUpdates: legacy.statusUpdates ?? { ...DEFAULT_CONFIG.statusUpdates },
      });
      return { config, migrated: true };
    }
    return { config: yield* parseConfig(value), migrated: false };
  });
}

/**
 * Resolve the displayed advanced home preference without altering process env or Codex files.
 *
 * @param config - Validated local preferences.
 * @param environment - Explicit CODEX_HOME from the invoking environment, if present.
 * @param home - Operating-system home directory for the Codex default.
 * @returns Effective absolute path; local override precedes environment and ~/.codex.
 */
export function resolveCodexHome(
  config: HolydotConfig,
  environment: string | null | undefined = process.env.CODEX_HOME,
  home = homedir(),
): string {
  return resolve(config.codexHome ?? environment ?? resolve(home, ".codex"));
}
