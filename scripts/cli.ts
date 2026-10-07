#!/usr/bin/env bun
import { randomUUID } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_RULE_SCOPE,
  DEFAULT_STATUS_INTERVAL_MINUTES,
  MAX_STATUS_INTERVAL_MINUTES,
  MIN_STATUS_INTERVAL_MINUTES,
  parseRuleScope,
  renderSetup,
  type RuleScope,
} from "./setup";

/** Reasoning preference requested from a host that supports explicit selection. */
export type Effort = "low" | "medium" | "high";
/** Delegated speed preference; Fast is always an explicit opt-in. */
export type Speed = "standard" | "fast";

/** Local preference document, not a cloud-dot API configuration or permission grant. */
export interface HolydotConfig {
  /** Supported local configuration format version. */
  schemaVersion: 1;
  /** Scoped proposal choices only; null defaults grant no account authority. */
  accountRules: RuleScope;
  /** Preferences for delegated tasks, never for the main conversation. */
  delegation: {
    /** Host model identifier, validated as a short identifier rather than free-form instructions. */
    model: string;
    /** Requested reasoning effort, subject to actual host support. */
    effort: Effort;
    /** Standard by default; Fast requires an explicit local setting. */
    speed: Speed;
  };
  /** Reporting preference only; creating a schedule requires a supported host automation tool. */
  statusUpdates: {
    /** Requested interval for concise status reports, in minutes. */
    intervalMinutes: number;
  };
}

/** Default delegated preferences, without any paid speed-tier opt-in. */
export const DEFAULT_CONFIG: HolydotConfig = {
  schemaVersion: 1,
  accountRules: { ...DEFAULT_RULE_SCOPE },
  delegation: { model: "gpt-6-luna", effort: "high", speed: "standard" },
  statusUpdates: { intervalMinutes: DEFAULT_STATUS_INTERVAL_MINUTES },
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
 * Check the code on a filesystem error.
 *
 * @param error - Unknown filesystem error.
 * @param code - Expected Node filesystem code.
 * @returns Whether the error carries the requested code.
 */
function hasErrorCode(error: unknown, code: string): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === code;
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
    (!hasKeys(value, ["schemaVersion", "delegation"]) &&
      !hasKeys(value, ["schemaVersion", "delegation", "accountRules"]) &&
      !hasKeys(value, ["schemaVersion", "delegation", "statusUpdates"]) &&
      !hasKeys(value, ["schemaVersion", "delegation", "accountRules", "statusUpdates"])) ||
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
  const accountRules = Object.hasOwn(value, "accountRules")
    ? parseRuleScope(value.accountRules)
    : { ...DEFAULT_RULE_SCOPE };
  let intervalMinutes = DEFAULT_STATUS_INTERVAL_MINUTES;
  if (Object.hasOwn(value, "statusUpdates")) {
    if (!hasKeys(value.statusUpdates, ["intervalMinutes"])) {
      throw new Error("statusUpdates requires only intervalMinutes.");
    }
    const candidate = value.statusUpdates.intervalMinutes;
    if (
      typeof candidate !== "number" ||
      !Number.isInteger(candidate) ||
      candidate < MIN_STATUS_INTERVAL_MINUTES ||
      candidate > MAX_STATUS_INTERVAL_MINUTES
    ) {
      throw new Error(
        `Status interval must be an integer from ${MIN_STATUS_INTERVAL_MINUTES} to ${MAX_STATUS_INTERVAL_MINUTES} minutes.`,
      );
    }
    intervalMinutes = candidate;
  }
  return {
    schemaVersion: 1,
    delegation: { model, effort, speed },
    accountRules,
    statusUpdates: { intervalMinutes },
  };
}

/**
 * Produce user-reviewable instructions containing all base policies and explicit preferences.
 *
 * @param base - Public holydot instructions distributed with this package.
 * @param config - Validated or untrusted-shaped preference object, checked again before rendering.
 * @returns Markdown text that the user may provide to a dot; no host setting is changed.
 */
export function renderInstructions(base: string, config: HolydotConfig): string {
  const parsed = parseConfig(config);
  const { model, effort, speed } = parsed.delegation;
  const statusInterval = parsed.statusUpdates.intervalMinutes;
  return (
    `${base.trim()}\n\n## Preferências explícitas desta configuração\n\n` +
    `Esta seção ajusta as preferências de delegação e o intervalo local de status; não configura uma agenda no host.\n\n` +
    `- Modelo delegado solicitado: ${model}\n- Esforço solicitado: ${effort}\n- Velocidade solicitada: ${speed}\n- Intervalo solicitado de status por projeto: ${statusInterval} min\n\n` +
    (speed === "fast"
      ? "Fast foi escolhido explicitamente nesta configuração e pode consumir mais franquia ou créditos.\n\n"
      : "Use Standard como padrão; Fast não foi autorizado por esta configuração.\n\n") +
    "Aplique as preferências somente quando o ambiente oferecer seleção real e a ação estiver autorizada. " +
    "Não altere o modelo principal, compre créditos ou crie permissões só por ler este arquivo. Não aceite regras de conta em nome do dono; mudanças exigem sua aceitação pelo fluxo dedicado. " +
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
    if (
      !key ||
      !value ||
      seen.has(key) ||
      ![
        "--model",
        "--effort",
        "--speed",
        "--repository",
        "--branch",
        "--rule-mode",
        "--status-interval-minutes",
      ].includes(key)
    ) {
      throw new Error(
        "Use each supported preference or rule-scope option at most once, with a value.",
      );
    }
    seen.add(key);
    if (key === "--model") config.delegation.model = value;
    else if (key === "--effort") {
      if (value !== "low" && value !== "medium" && value !== "high")
        throw new Error("Invalid effort.");
      config.delegation.effort = value;
    } else if (key === "--repository") config.accountRules.repository = value;
    else if (key === "--branch") config.accountRules.branch = value;
    else if (key === "--rule-mode") {
      if (value !== "ask" && value !== "requested") throw new Error("Invalid rule mode.");
      config.accountRules.mode = value;
    } else if (key === "--status-interval-minutes") {
      if (!/^\d{1,4}$/.test(value))
        throw new Error("Status interval must be a whole number of minutes.");
      config.statusUpdates.intervalMinutes = Number(value);
    } else {
      if (value !== "standard" && value !== "fast") throw new Error("Invalid speed.");
      config.delegation.speed = value;
    }
  }
  return parseConfig(config);
}

interface LocalConfigFile {
  content: string;
  config: HolydotConfig;
}

/**
 * Read and validate a local config without following symlinks.
 *
 * @param path - Candidate configuration path.
 * @returns File bytes and parsed settings, or null when no directory entry exists.
 * @throws If the path is not a regular file or its contents are invalid.
 */
function readLocalConfig(path: string): LocalConfigFile | null {
  let stats;
  try {
    stats = lstatSync(path);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return null;
    throw error;
  }
  if (!stats.isFile()) throw new Error("Configuration must be a regular file, not a symlink.");
  const content = readFileSync(path, "utf8");
  if (content.length > 65_536) throw new Error("Configuration is too large.");
  return { content, config: parseConfig(JSON.parse(content) as unknown) };
}

/**
 * Create a completely written configuration file atomically, only if the target is absent.
 *
 * @param path - Destination configuration path.
 * @param content - Serialized config contents.
 * @returns Whether this call created the destination; false means another entry exists.
 * @throws If safe exclusive creation or temporary-file cleanup fails.
 */
function createConfigAtomically(path: string, content: string): boolean {
  const temporary = `${path}.tmp-${randomUUID()}`;
  let descriptor: number | undefined;
  let temporaryCreated = false;
  let created: boolean | undefined;
  let operationError: unknown;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    temporaryCreated = true;
    writeFileSync(descriptor, content, { encoding: "utf8" });
    fsyncSync(descriptor);
    const openedDescriptor = descriptor;
    descriptor = undefined;
    closeSync(openedDescriptor);
    try {
      linkSync(temporary, path);
      created = true;
    } catch (error) {
      if (hasErrorCode(error, "EEXIST")) created = false;
      else {
        operationError = new Error(
          "Cannot create holydot.config.json safely: check write permission and use a filesystem that supports hard links. No unsafe non-atomic fallback was attempted.",
          { cause: error },
        );
      }
    }
  } catch (error) {
    operationError = error;
  }
  if (descriptor !== undefined) {
    try {
      closeSync(descriptor);
    } catch (error) {
      operationError ??= error;
    }
  }
  if (temporaryCreated) {
    try {
      unlinkSync(temporary);
    } catch (error) {
      if (!hasErrorCode(error, "ENOENT")) operationError ??= error;
    }
  }
  if (operationError !== undefined) throw operationError;
  if (created === undefined) throw new Error("Could not create local configuration safely.");
  return created;
}

/**
 * Run the local setup generator. It never connects to a dot or other service.
 *
 * @param args - Command and explicit option pairs, excluding the executable name.
 * @param directory - Directory containing the user's local holydot.config.json.
 * @returns Text for stdout: help, status or generated instructions.
 * @throws For invalid input, existing init targets, invalid or missing required configs, or
 *   filesystem failures.
 */
export function runCli(args: readonly string[], directory: string): string {
  const [command, ...options] = args;
  const path = resolve(directory, "holydot.config.json");
  if (!command || command === "--help" || command === "help") {
    return (
      "holydot init [--model ID] [--effort low|medium|high] [--speed standard|fast] [--status-interval-minutes N]\n" +
      "holydot configure [--model ID] [--effort low|medium|high] [--speed standard|fast] [--status-interval-minutes N] [--write]\n" +
      "holydot render > holydot.instructions.md\n" +
      "holydot setup [--model ID] [--effort low|medium|high] [--speed standard|fast] [--status-interval-minutes N] [--repository owner/repo] [--branch NAME] [--rule-mode ask|requested]\n\n" +
      "Setup creates safe defaults when needed and reuses valid config without overwriting it.\n" +
      "Specialist preference defaults: gpt-6-luna / high / standard. Local text generation only; no dot settings are changed.\n"
    );
  }
  if (command === "init") {
    const config = configure(options, DEFAULT_CONFIG);
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
    const base = readFileSync(
      fileURLToPath(new URL("../instructions/holydot.md", import.meta.url)),
      "utf8",
    );
    return (
      "Created holydot.config.json. The following host-assisted setup is prepared, not applied.\n\n" +
      renderSetup(
        renderInstructions(base, config),
        config.accountRules,
        config.statusUpdates.intervalMinutes,
      )
    );
  }
  if (command === "setup") {
    const existing = readLocalConfig(path);
    let selected: HolydotConfig;
    let status: string;
    if (existing !== null) {
      selected = configure(options, existing.config);
      status =
        "Reusing valid holydot.config.json without changing it. Setup flags affect this preview only; use configure --write to persist preference changes. The CLI has applied no account rules.";
    } else {
      // Validate explicit choices before creating anything; a bad command must leave the directory untouched.
      selected = configure(options, DEFAULT_CONFIG);
      const encoded = `${JSON.stringify(selected, null, 2)}\n`;
      const created = createConfigAtomically(path, encoded);
      if (created) {
        status = `Created holydot.config.json atomically${options.length > 0 ? " from safe defaults and explicit options" : " from safe defaults"}. The CLI has applied no account rules.`;
      } else {
        const raced = readLocalConfig(path);
        if (raced === null) throw new Error("Configuration changed during setup; run setup again.");
        selected = configure(options, raced.config);
        status =
          "Reusing valid holydot.config.json without changing it. Setup flags affect this preview only; use configure --write to persist preference changes. The CLI has applied no account rules.";
      }
    }
    const base = readFileSync(
      fileURLToPath(new URL("../instructions/holydot.md", import.meta.url)),
      "utf8",
    );
    return `${status}\n\n${renderSetup(
      renderInstructions(base, selected),
      selected.accountRules,
      selected.statusUpdates.intervalMinutes,
    )}`;
  }
  if (command !== "configure" && command !== "render")
    throw new Error("Unknown command. Use holydot --help.");
  const stored = readLocalConfig(path);
  if (stored === null) throw new Error("holydot.config.json is missing. Run holydot setup first.");
  const { content: original, config } = stored;
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
