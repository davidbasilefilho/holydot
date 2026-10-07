import { Effect } from "effect";
import { DEFAULT_CONFIG, decodeStored, parseConfig, type HolydotConfig } from "./config";
import { applyOverrides } from "./flags";
import { parseJson, readConfigFile, saveConfigFile } from "./adapters/files";
import type { HolydotError } from "./errors";

/** Interactive adapter contract; null is deliberate cancellation with no write. */
export type SetupPrompt = (
  config: HolydotConfig,
  migrated: boolean,
) => Effect.Effect<HolydotConfig | null, HolydotError>;

/**
 * Load settings for render or setup without silently changing the document.
 *
 * @param path - Absolute settings path.
 * @returns Decoded choices and original bytes, or null when no config exists.
 */
export function loadSettings(path: string) {
  return Effect.gen(function* () {
    const stored = yield* readConfigFile(path);
    if (stored === null) return null;
    const decoded = yield* decodeStored(yield* parseJson(stored.content));
    return { ...decoded, stored };
  });
}

/**
 * Create or edit local settings; cancellation leaves every original byte untouched.
 *
 * @param path - Absolute config path.
 * @param overrides - Explicit setup flags, applied to current choices before editing.
 * @param prompt - Actual interactive adapter or a deterministic test adapter.
 * @returns Short completion text directing the user to render; never prints instructions.
 */
export function setup(
  path: string,
  overrides: Readonly<Record<string, string>>,
  prompt: SetupPrompt,
) {
  return Effect.gen(function* () {
    const loaded = yield* loadSettings(path);
    const selected = yield* applyOverrides(loaded?.config ?? DEFAULT_CONFIG, overrides);
    const result = yield* prompt(selected, loaded?.migrated ?? false);
    if (result === null) return "Setup cancelled. Configuration unchanged.\n";
    const config = yield* parseConfig(result);
    const backup = yield* saveConfigFile(
      path,
      loaded?.stored ?? null,
      `${JSON.stringify(config, null, 2)}\n`,
    );
    return `Saved local preferences.${backup === null ? "" : ` Previous configuration: ${backup}.`}\nRun holydot render to print the complete instructions.\n`;
  });
}
