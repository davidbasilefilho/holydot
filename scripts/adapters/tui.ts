import { createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";
import { createSignal } from "solid-js";
import { Effect } from "effect";
import { parseConfig, type HolydotConfig } from "../config";
import { HolydotError } from "../errors";
import type { EditorValues } from "../ui/setup-editor";

/**
 * Translate editor strings into unknown data; runtime schemas validate before acceptance.
 *
 * @param values - Unsaved form values.
 * @returns A candidate v2 document, containing no account grants.
 */
export function editorConfig(values: EditorValues): unknown {
  return {
    schemaVersion: 2,
    delegation: {
      coordinator: { model: values.coordinatorModel, effort: values.coordinatorEffort },
      specialist: { model: values.specialistModel, effort: values.specialistEffort },
      speed: values.speed,
    },
    statusUpdates: {
      intervalMinutes: /^\d{1,4}(?![\s\S])/.test(values.interval)
        ? Number(values.interval)
        : Number.NaN,
    },
    codexHome: values.codexHome === "" ? null : values.codexHome,
  };
}

/**
 * Open the actual TUI and restore terminal resources on Save, Cancel, error or interruption.
 *
 * @param config - Current validated preferences.
 * @param migrated - Display whether Save will migrate with a backup.
 * @returns Accepted settings or null on cancellation; noninteractive invocation fails explicitly.
 */
export function promptSettings(
  config: HolydotConfig,
  migrated: boolean,
): Effect.Effect<HolydotConfig | null, HolydotError> {
  return Effect.scoped(
    Effect.gen(function* () {
      if (!process.stdin.isTTY || !process.stdout.isTTY)
        return yield* Effect.fail(
          new HolydotError({
            message:
              "Setup needs an interactive terminal. Use --help for options, then run setup in a terminal.",
          }),
        );
      const module = yield* Effect.tryPromise({
        try: () => import("../ui/setup-editor.tsx"),
        catch: (cause) =>
          new HolydotError({ message: "Cannot load Solid setup components.", cause }),
      });
      const renderer = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () => createCliRenderer({ exitOnCtrlC: false, backgroundColor: "#1e2030" }),
          catch: (cause) =>
            new HolydotError({
              message: "Cannot initialize OpenTUI; check terminal support.",
              cause,
            }),
        }),
        (instance) => Effect.sync(() => instance.destroy()),
      );
      return yield* Effect.callback<HolydotConfig | null, HolydotError>((resume, signal) => {
        const [error, setError] = createSignal("");
        let completed = false;
        const finish = (value: HolydotConfig | null) => {
          if (!completed) {
            completed = true;
            resume(Effect.succeed(value));
          }
        };
        const save = (values: EditorValues) => {
          void Effect.runPromise(
            parseConfig(editorConfig(values)).pipe(
              Effect.match({
                onFailure: () =>
                  setError("Invalid value. Check model IDs, effort, speed, minutes and path."),
                onSuccess: finish,
              }),
            ),
            { signal },
          );
        };
        void render(
          () =>
            module.SetupEditor({
              config,
              migrated,
              error,
              onSave: save,
              onCancel: () => finish(null),
            }),
          renderer,
        ).catch((cause: unknown) =>
          resume(
            Effect.fail(
              new HolydotError({
                message: "Interactive setup failed; configuration unchanged.",
                cause,
              }),
            ),
          ),
        );
        const closed = () => finish(null);
        renderer.on("destroy", closed);
        return Effect.sync(() => {
          completed = true;
          renderer.off("destroy", closed);
        });
      });
    }),
  );
}
