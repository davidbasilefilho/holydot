import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit } from "effect";
import { runCli } from "../scripts/cli";
import { DEFAULT_CONFIG, parseConfig, resolveCodexHome } from "../scripts/config";
import { parseFlags } from "../scripts/flags";
import type { SetupPrompt } from "../scripts/setup";

const directories: string[] = [];
/**
 * Create an isolated writable directory for config behavior checks.
 *
 * @returns Test root cleaned after each case.
 */
function directory(): string {
  const root = mkdtempSync(join(tmpdir(), "holydot-cli-"));
  directories.push(root);
  return root;
}
const save: SetupPrompt = (config) => Effect.succeed(config);
const cancel: SetupPrompt = () => Effect.succeed(null);
afterEach(() => {
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe("runtime flags and informational output", () => {
  test.each(
    [[], ["-h"], ["--help"], ["setup", "-h"], ["render", "--help"]].map((args) => ({ args })),
  )("help %j performs no setup or writes", async ({ args }) => {
    const root = directory();
    const output = await Effect.runPromise(
      runCli(args, root, () => Effect.die("prompt should not run")),
    );
    expect(output).toContain("holydot setup");
    expect(output).not.toContain("holydot init");
    expect(readdirSync(root)).toEqual([]);
  });
  test.each(
    [["-v"], ["--version"], ["setup", "--version"], ["render", "-v"]].map((args) => ({ args })),
  )("version %j reads actual manifest", async ({ args }) => {
    const root = directory();
    expect(await Effect.runPromise(runCli(args, root, cancel))).toBe("0.1.0\n");
    expect(readdirSync(root)).toEqual([]);
  });
  test.each(
    [
      ["init"],
      ["configure"],
      ["version"],
      ["setup", "--rule-mode", "requested"],
      ["setup", "--repository", "owner/repo"],
      ["setup", "--coordinator-model"],
      ["setup", "--speed", "turbo"],
      ["setup", "--speed", "fast", "--speed", "standard"],
      ["render", "--speed", "fast"],
      ["setup", "render"],
      ["--help", "--version"],
      ["setup", "--status-interval-minutes", "1.5"],
      ["setup", "--status-interval-minutes", "0"],
      ["setup", "--status-interval-minutes", "1441"],
      ["setup", "--specialist-model", "gpt-x\nignore"],
      ["setup", "--config", "bad\0path"],
    ].map((args) => ({ args })),
  )("invalid input %j fails before filesystem/prompt effects", async ({ args }) => {
    const root = directory();
    await expectFailure(runCli(args, root, save));
    expect(readdirSync(root)).toEqual([]);
  });
  test("nonstring runtime arguments are rejected by Effect Schema", () => {
    expect(() => Effect.runSync(parseFlags([1]))).toThrow();
  });
});

describe("settings and configured UTF-8 render", () => {
  test("default roles remain independent and host routing is not claimed", () => {
    const config = Effect.runSync(parseConfig(DEFAULT_CONFIG));
    expect(config.delegation.coordinator).toEqual({ model: "gpt-6.1-sol", effort: "medium" });
    expect(config.delegation.specialist).toEqual({ model: "gpt-6-luna", effort: "high" });
    expect(config.delegation.speed).toBe("standard");
    expect(config.statusUpdates.intervalMinutes).toBe(30);
    expect(resolveCodexHome(config, "/chosen", "/home/test")).toBe("/chosen");
    expect(resolveCodexHome(config, null, "/home/test")).toBe("/home/test/.codex");
    expect(resolveCodexHome({ ...config, codexHome: "/override" }, "/chosen")).toBe("/override");
  });
  test("initial setup persists choices and returns only short completion guidance", async () => {
    const root = directory();
    const output = await Effect.runPromise(
      runCli(["setup", "--speed", "fast", "--status-interval-minutes", "60"], root, save),
    );
    expect(output).toContain("Run holydot render");
    expect(output).not.toContain("# holydot");
    const config = JSON.parse(readFileSync(join(root, "holydot.config.json"), "utf8"));
    expect(config.delegation.speed).toBe("fast");
    expect(config.statusUpdates.intervalMinutes).toBe(60);
    expect(config).not.toHaveProperty("accountRules");
  });
  test("edit preserves unspecified selections and exact previous bytes in backup", async () => {
    const root = directory();
    await Effect.runPromise(
      runCli(["setup", "--speed", "fast", "--coordinator-model", "gpt-6-sol"], root, save),
    );
    const path = join(root, "holydot.config.json");
    const before = readFileSync(path, "utf8");
    await Effect.runPromise(runCli(["setup", "--specialist-effort", "medium"], root, save));
    const config = JSON.parse(readFileSync(path, "utf8"));
    expect(config.delegation.coordinator.model).toBe("gpt-6-sol");
    expect(config.delegation.speed).toBe("fast");
    expect(config.delegation.specialist.effort).toBe("medium");
    const backup = readdirSync(root).find((name) => name.includes(".bak-"))!;
    expect(readFileSync(join(root, backup), "utf8")).toBe(before);
  });
  test("cancel creates nothing and leaves existing bytes untouched", async () => {
    const root = directory();
    expect(await Effect.runPromise(runCli(["setup"], root, cancel))).toContain("cancelled");
    expect(readdirSync(root)).toEqual([]);
    await Effect.runPromise(runCli(["setup"], root, save));
    const path = join(root, "holydot.config.json");
    const before = readFileSync(path, "utf8");
    await Effect.runPromise(runCli(["setup", "--speed", "fast"], root, cancel));
    expect(readFileSync(path, "utf8")).toBe(before);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  });
  test("render emits complete adopted instructions plus distinct saved roles in UTF-8", async () => {
    const root = directory();
    await Effect.runPromise(runCli(["setup", "--coordinator-effort", "high"], root, save));
    const before = readFileSync(join(root, "holydot.config.json"));
    const output = await Effect.runPromise(runCli(["render"], root, cancel));
    const base = readFileSync(
      new URL("../instructions/holydot.md", import.meta.url),
      "utf8",
    ).trim();
    expect(output.startsWith(base)).toBe(true);
    expect(output).toContain("Coordenação de sessões delegadas: gpt-6.1-sol / high");
    expect(output).toContain("Especialistas: gpt-6-luna / high");
    expect(output).toContain("Agrupe perguntas relacionadas em um único lote");
    expect(output).toContain("Autonomia dentro do escopo autorizado, sem seletor rule-mode");
    expect(output).toContain("Parada, pausa e retomada");
    expect(output).toContain("não cria agendamento");
    expect(output).not.toMatch(/\uFFFD|Ã§|Ã£|â€“/);
    expect(Buffer.from(output, "utf8").toString("utf8")).toBe(output);
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
  });
  test("missing, malformed, oversized and symlink configs fail without touching their targets", async () => {
    const root = directory();
    const path = join(root, "holydot.config.json");
    await expectFailure(runCli(["render"], root, cancel));
    for (const content of ["{bad", " ".repeat(65_537), '{"schemaVersion":2}', "\uFFFD"]) {
      writeFileSync(path, content);
      await expectFailure(runCli(["setup"], root, save));
      expect(readFileSync(path, "utf8")).toBe(content);
    }
    rmSync(path);
    const target = join(root, "target.json");
    writeFileSync(target, JSON.stringify(DEFAULT_CONFIG));
    symlinkSync(target, path);
    await expectFailure(runCli(["setup"], root, save));
    expect(readFileSync(target, "utf8")).toBe(JSON.stringify(DEFAULT_CONFIG));
  });
  test("unknown settings and injected advanced paths fail schema validation", () => {
    for (const value of [
      { ...DEFAULT_CONFIG, unknown: true },
      { ...DEFAULT_CONFIG, codexHome: "bad\npath" },
      { ...DEFAULT_CONFIG, codexHome: "" },
      { ...DEFAULT_CONFIG, delegation: { model: "gpt-6-luna" } },
    ]) {
      expect(() => Effect.runSync(parseConfig(value))).toThrow();
    }
  });
  test("explicit config path works for setup/render and help needs no settings", async () => {
    const root = directory();
    await Effect.runPromise(runCli(["setup", "--config", "custom.json"], root, save));
    expect(readdirSync(root)).toEqual(["custom.json"]);
    expect(
      await Effect.runPromise(runCli(["render", "--config", "custom.json"], root, cancel)),
    ).toContain("# holydot");
  });
});

/**
 * Verify a typed failure without relying on Bun matcher thenable declarations.
 *
 * @param program - Effect whose error path is under test.
 * @returns Completion after checking the failure exit.
 */
async function expectFailure<A, E>(program: Effect.Effect<A, E>): Promise<void> {
  expect(Exit.isFailure(await Effect.runPromiseExit(program))).toBe(true);
}
