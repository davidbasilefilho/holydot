#!/usr/bin/env bun
import { randomUUID } from "node:crypto";
import { existsSync, lstatSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Reasoning preference requested from a host that supports explicit selection. */
export type Effort = "low" | "medium" | "high";
/** Delegated speed preference; Fast is always an explicit opt-in. */
export type Speed = "standard" | "fast";

/** Local preference document, not a cloud-dot API configuration or permission grant. */
export interface HolydotConfig {
  /** Supported local configuration format version. */
  schemaVersion: 1;
  /** Preferences for delegated tasks, never for the main conversation. */
  delegation: {
    /** Host model identifier, validated as a short identifier rather than free-form instructions. */
    model: string;
    /** Requested reasoning effort, subject to actual host support. */
    effort: Effort;
    /** Standard by default; Fast requires an explicit local setting. */
    speed: Speed;
  };
}

/** Default delegated preferences, without any paid speed-tier opt-in. */
export const DEFAULT_CONFIG: HolydotConfig = {
  schemaVersion: 1,
  delegation: { model: "gpt-6-luna", effort: "high", speed: "standard" },
};

/**
 * Require an object with exactly the supported own keys.
 *
 * @param value - Untrusted parsed configuration value.
 * @param keys - Allowed and required property names.
 * @returns Whether the object has the exact expected shape.
 */
function hasKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

/**
 * Validate and copy local preferences without interpreting them as instructions or permissions.
 *
 * @param value - Parsed JSON configuration.
 * @returns A fresh validated configuration object.
 * @throws If unknown fields, unsupported settings or malformed identifiers are present.
 */
export function parseConfig(value: unknown): HolydotConfig {
  if (
    !hasKeys(value, ["schemaVersion", "delegation"]) ||
    value.schemaVersion !== 1 ||
    !hasKeys(value.delegation, ["model", "effort", "speed"])
  ) {
    throw new Error("Expected schemaVersion 1 and delegation with only model, effort and speed.");
  }
  const { model, effort, speed } = value.delegation;
  if (typeof model !== "string" || model.length > 80 || !/^gpt-[a-z0-9.-]+$/.test(model)) {
    throw new Error("Model must be a short host identifier such as gpt-6-luna.");
  }
  if (effort !== "low" && effort !== "medium" && effort !== "high") {
    throw new Error("Effort must be low, medium or high.");
  }
  if (speed !== "standard" && speed !== "fast") {
    throw new Error("Speed must be standard or fast; Fast is opt-in.");
  }
  return { schemaVersion: 1, delegation: { model, effort, speed } };
}

/**
 * Produce user-reviewable instructions containing all base policies and explicit preferences.
 *
 * @param base - Public holydot instructions distributed with this package.
 * @param config - Validated or untrusted-shaped preference object, checked again before rendering.
 * @returns Markdown text that the user may provide to a dot; no host setting is changed.
 */
export function renderInstructions(base: string, config: HolydotConfig): string {
  const { model, effort, speed } = parseConfig(config).delegation;
  return (
    `${base.trim()}\n\n## Preferências explícitas desta configuração\n\n` +
    `Esta seção substitui apenas as preferências padrão de delegação do texto acima.\n\n` +
    `- Modelo delegado solicitado: ${model}\n- Esforço solicitado: ${effort}\n- Velocidade solicitada: ${speed}\n\n` +
    (speed === "fast"
      ? "Fast foi escolhido explicitamente nesta configuração e pode consumir mais franquia ou créditos.\n\n"
      : "Use Standard como padrão; Fast não foi autorizado por esta configuração.\n\n") +
    "Aplique as preferências somente quando o ambiente oferecer seleção real e a ação estiver autorizada. " +
    "Não altere o modelo principal, compre créditos, crie permissões ou aceite regras de conta por causa deste arquivo. " +
    "Informe limitações e o fallback antes de usá-lo; não afirme que este gerador alterou o dot.\n"
  );
}

/**
 * Apply explicit CLI overrides to a fresh copy of an existing or default configuration.
 *
 * @param args - Pairs of supported option names and values.
 * @param current - Validated base preferences.
 * @returns Updated validated preferences without mutating the input.
 * @throws When arguments are missing, duplicated, unknown or invalid.
 */
export function configure(args: readonly string[], current: HolydotConfig): HolydotConfig {
  const config = parseConfig(current);
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key || !value || seen.has(key) || !["--model", "--effort", "--speed"].includes(key)) {
      throw new Error("Use each of --model, --effort and --speed at most once, with a value.");
    }
    seen.add(key);
    if (key === "--model") config.delegation.model = value;
    else if (key === "--effort") {
      if (value !== "low" && value !== "medium" && value !== "high")
        throw new Error("Invalid effort.");
      config.delegation.effort = value;
    } else {
      if (value !== "standard" && value !== "fast") throw new Error("Invalid speed.");
      config.delegation.speed = value;
    }
  }
  return parseConfig(config);
}

/**
 * Run the local setup generator. It never connects to a dot or other service.
 *
 * @param args - Command and explicit option pairs, excluding the executable name.
 * @param directory - Directory containing the user's local holydot.config.json.
 * @returns Text for stdout: help, status or generated instructions.
 * @throws For invalid input, existing init targets, missing config or filesystem failures.
 */
export function runCli(args: readonly string[], directory: string): string {
  const [command, ...options] = args;
  const path = resolve(directory, "holydot.config.json");
  if (!command || command === "--help" || command === "help") {
    return (
      "holydot init [--model ID] [--effort low|medium|high] [--speed standard|fast]\n" +
      "holydot configure [--model ID] [--effort low|medium|high] [--speed standard|fast] [--write]\n" +
      "holydot render > holydot.instructions.md\n\n" +
      "Defaults: gpt-6-luna / high / standard. Local text generation only; no dot settings are changed.\n"
    );
  }
  if (command === "init") {
    const config = configure(options, DEFAULT_CONFIG);
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
    return "Created holydot.config.json. Run holydot render, review the output, and give it to your dot.\n";
  }
  if (command !== "configure" && command !== "render")
    throw new Error("Unknown command. Use holydot --help.");
  if (!existsSync(path)) throw new Error("holydot.config.json is missing. Run holydot init first.");
  if (!lstatSync(path).isFile())
    throw new Error("Configuration must be a regular file, not a symlink.");
  const original = readFileSync(path, "utf8");
  if (original.length > 65_536) throw new Error("Configuration is too large.");
  const config = parseConfig(JSON.parse(original) as unknown);
  if (command === "render") {
    if (options.length !== 0) throw new Error("Render takes no options; edit configuration first.");
    const base = readFileSync(
      fileURLToPath(new URL("../instructions/holydot.md", import.meta.url)),
      "utf8",
    );
    return renderInstructions(base, config);
  }
  const writeFlags = options.filter((option) => option === "--write").length;
  if (writeFlags > 1) throw new Error("Use --write at most once.");
  const preferenceOptions = options.filter((option) => option !== "--write");
  if (preferenceOptions.length === 0)
    throw new Error("Configure requires an explicit preference option.");
  const updated = configure(preferenceOptions, config);
  const encoded = `${JSON.stringify(updated, null, 2)}\n`;
  if (writeFlags === 0) return encoded;
  const suffix = randomUUID();
  const backup = `${path}.bak-${suffix}`;
  const temporary = `${path}.tmp-${suffix}`;
  writeFileSync(backup, original, { flag: "wx" });
  writeFileSync(temporary, encoded, { flag: "wx" });
  renameSync(temporary, path);
  return `Updated local preferences; previous config is in ${backup}. Render and reapply the instructions to your dot.\n`;
}

if (import.meta.main) {
  try {
    process.stdout.write(runCli(process.argv.slice(2), process.cwd()));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Configuration failed.");
    process.exitCode = 1;
  }
}
