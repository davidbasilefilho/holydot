import { Effect } from "effect";
import { parseConfig, type HolydotConfig } from "./config";

/**
 * Render reusable instructions and explicit role preferences, without host/account effects.
 *
 * @param base - UTF-8 reusable product instructions.
 * @param config - Saved local preferences, revalidated before interpolation.
 * @returns Complete Markdown with distinct coordinator/specialist choices.
 */
export function renderInstructions(base: string, config: HolydotConfig) {
  return Effect.gen(function* () {
    const parsed = yield* parseConfig(config);
    const { coordinator, specialist, speed } = parsed.delegation;
    return (
      `${base.trim()}\n\n## **Explicit preferences for this configuration**\n\n` +
      `This section overrides the corresponding defaults. These are local preferences, without granting access or approval.\n\n` +
      `- Delegated session coordination: ${coordinator.model} / ${coordinator.effort}.\n` +
      `- Specialists: ${specialist.model} / ${specialist.effort}.\n` +
      `- Speed: ${speed === "standard" ? "Standard" : "Fast (explicit opt-in)"}.\n` +
      `- Overview: ${parsed.statusUpdates.intervalMinutes} minutes; does not create a schedule.\n` +
      `- CODEX_HOME: ${parsed.codexHome === null ? "respect the explicit environment value or default ~/.codex" : JSON.stringify(parsed.codexHome)}.\n\n` +
      "Apply choices only through real controls and when supported. Do not change the dot's main model. " +
      "If a future HolyCodex integration works, prefer its settings as the source of truth, avoiding duplicate selectors.\n"
    );
  });
}
