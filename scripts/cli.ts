#!/usr/bin/env bun
import { Effect } from "effect";
import { resolve } from "node:path";
import { HolydotError } from "./errors";
import { parseFlags } from "./flags";
import { renderInstructions } from "./render";
import { readText } from "./adapters/files";
import { loadInstructionSource } from "./adapters/instructions";
import { loadSettings, setup, type SetupPrompt } from "./setup";

/** Human-readable CLI help; development bumps are intentionally absent. */
export const HELP = `holydot — local preferences and reusable instructions

Usage: holydot setup [options]
       holydot render [--config PATH] > holydot.instructions.md
       holydot resume [--config PATH] > holydot.instructions.md

  -h, --help                       Show help (also after a command)
  -v, --version                    Show the installed package version
  --config PATH                    Settings file (default: holydot.config.json)
  --coordinator-model ID           Delegated coordinator model
  --coordinator-effort low|medium|high
  --specialist-model ID            Specialist model
  --specialist-effort low|medium|high
  --speed standard|fast            Standard default; Fast opt-in
  --status-interval-minutes N       Reporting preference, 1–1440 (default: 30)
  --codex-home PATH|default         Advanced override; default respects CODEX_HOME

Setup edits existing preferences, saves only on Save, and prints no instructions.
Setup verifies the installed instruction source before opening the editor.
Render/resume print complete verified instructions; resume does not inject them into a host session.
Use bunx holydot@VERSION setup and bunx holydot@VERSION render after publication.
`;

/**
 * Execute a validated command with a replaceable interactive adapter.
 *
 * @param input - Runtime arguments excluding executable names.
 * @param directory - Invoking directory; settings paths are relative to it.
 * @param prompt - Interactive Effect adapter, lazily loaded by the executable boundary.
 * @param packageRoot - Installed package root; optional isolated package seam for validation.
 * @returns Informational text, verified setup completion or full Markdown render.
 */
export function runCli(
  input: unknown,
  directory: string,
  prompt: SetupPrompt,
  packageRoot = new URL("../", import.meta.url),
) {
  return Effect.gen(function* () {
    const flags = yield* parseFlags(input);
    if (flags.command === "help") return HELP;
    if (flags.command === "version") {
      const text = yield* readText(new URL("package.json", packageRoot));
      const manifest = yield* importManifest(text);
      return `${manifest.version}\n`;
    }
    const source = yield* loadInstructionSource(packageRoot);
    const manifest = yield* importManifest(yield* readText(new URL("package.json", packageRoot)));
    const identity = `holydot ${manifest.version}; instructions ${source.identity.revision}; SHA-256 ${source.identity.canonicalSHA256}; adopted SHA-256 ${source.identity.adoptedSHA256}`;
    const path = resolve(directory, flags.configPath);
    if (flags.command === "setup") {
      const result = yield* setup(path, flags.overrides, prompt);
      return `${result}Verified ${identity}.\n`;
    }
    const loaded = yield* loadSettings(path);
    if (loaded === null)
      return yield* Effect.fail(
        new HolydotError({ message: "Configuration is missing. Run holydot setup first." }),
      );
    const rendered = yield* renderInstructions(source.text, loaded.config);
    return `${rendered}\nVerified package identity: ${identity}.\n`;
  });
}

// Manifest parsing uses the same Effect schema boundary as untrusted runtime input.
import { Schema } from "effect";
import { parseJson } from "./adapters/files";
const ManifestSchema = Schema.Struct({
  version: Schema.String.check(Schema.isPattern(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?![\s\S])/)),
});
/**
 * Validate installed version metadata.
 *
 * @param text - Package manifest bytes decoded as UTF-8.
 * @returns A bounded informational version or typed failure.
 */
function importManifest(text: string) {
  return parseJson(text).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(ManifestSchema)),
    Effect.mapError(
      (cause) => new HolydotError({ message: "Invalid installed package version.", cause }),
    ),
  );
}

if (import.meta.main) {
  const prompt: SetupPrompt = (config, migrated) =>
    Effect.gen(function* () {
      // Solid's preload must finish before importing any Solid/OpenTUI consumer.
      // Static sibling imports race module loading and can cache Solid's server implementation.
      yield* Effect.tryPromise({
        try: () => import("@opentui/solid/preload"),
        catch: (cause) =>
          new HolydotError({ message: "Cannot initialize Solid runtime support.", cause }),
      });
      const adapter = yield* Effect.tryPromise({
        try: () => import("./adapters/tui"),
        catch: (cause) => new HolydotError({ message: "Cannot load interactive setup.", cause }),
      });
      return yield* adapter.promptSettings(config, migrated);
    });
  await Effect.runPromise(
    runCli(process.argv.slice(2), process.cwd(), prompt).pipe(
      Effect.match({
        onFailure: (error) => {
          process.stderr.write(`${error.message}\n`);
          process.exitCode = 1;
        },
        onSuccess: (output) => {
          process.stdout.write(output);
        },
      }),
    ),
  );
}
