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
import { join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { runCli } from "../scripts/cli";
import { DEFAULT_CONFIG, parseConfig, resolveCodexHome } from "../scripts/config";
import { parseFlags } from "../scripts/flags";
import type { SetupPrompt } from "../scripts/setup";
import manifest from "../package.json";

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
    expect(await Effect.runPromise(runCli(args, root, cancel))).toBe(`${manifest.version}\n`);
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
      ["setup", "--status-interval-minutes", "30\n"],
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
    expect(resolveCodexHome(config, "/chosen", "/home/test")).toBe(resolve("/chosen"));
    expect(resolveCodexHome(config, null, "/home/test")).toBe(resolve("/home/test", ".codex"));
    expect(resolveCodexHome({ ...config, codexHome: "/override" }, "/chosen")).toBe(
      resolve("/override"),
    );
  });
  test("initial setup persists choices and returns only short completion guidance", async () => {
    const root = directory();
    const output = await Effect.runPromise(
      runCli(["setup", "--speed", "fast", "--status-interval-minutes", "60"], root, save),
    );
    expect(output).toContain("Run holydot render");
    expect(output).toContain("Local setup does not apply or verify your dot name or custom rules");
    expect(output).not.toContain("# **holydot — main instructions**");
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
  test("render and resume read BOM-prefixed config without normalizing the saved file", async () => {
    const root = directory();
    const path = join(root, "holydot.config.json");
    const original = Buffer.from(`\uFEFF${JSON.stringify(DEFAULT_CONFIG)}\r\n`, "utf8");
    writeFileSync(path, original);
    const output = await Effect.runPromise(runCli(["render"], root, cancel));
    expect(await Effect.runPromise(runCli(["resume"], root, cancel))).toBe(output);
    expect(output).toContain("Delegated session coordination: gpt-6.1-sol / medium");
    expect(readFileSync(path)).toEqual(original);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  });
  test("multiple leading BOMs are invalid and never normalized by setup", async () => {
    const root = directory();
    const path = join(root, "holydot.config.json");
    const original = Buffer.from(`\uFEFF\uFEFF${JSON.stringify(DEFAULT_CONFIG)}`, "utf8");
    writeFileSync(path, original);
    await expectFailure(runCli(["setup"], root, () => Effect.die("prompt should not run")));
    expect(readFileSync(path)).toEqual(original);
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
    expect(output).toContain("Delegated session coordination: gpt-6.1-sol / high");
    expect(output).toContain("Specialists: gpt-6-luna / high");
    expect(output).toContain("Group related questions into one clear, self-contained batch");
    expect(output).toContain("Autonomy within the authorized scope, without a rule-mode selector");
    expect(output).toContain("Stopping, pausing, and resuming");
    expect(output).toContain("does not create a schedule");
    expect(output).not.toMatch(/\uFFFD|Ã§|Ã£|â€“/);
    expect(Buffer.from(output, "utf8").toString("utf8")).toBe(output);
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
  });
  test("render requires authorized remote checkpoints without applying account rules", async () => {
    const root = directory();
    await Effect.runPromise(runCli(["setup"], root, save));
    const before = readFileSync(join(root, "holydot.config.json"));
    const output = await Effect.runPromise(runCli(["render"], root, cancel));
    const checkpoint = output
      .split("### **Checkpoints and remote persistence**")[1]!
      .split(/\n#{2,3} /)[0]!;
    expect(checkpoint).toContain("when completing a significant step");
    expect(checkpoint).toContain("commit and push");
    expect(checkpoint).toContain("appropriate, authorized working branch");
    expect(checkpoint).toContain("Check workflows and their triggers before choosing the branch");
    expect(checkpoint).toContain("its SHA matches the checkpoint commit");
    expect(checkpoint).toContain(
      "A local-only commit does not complete the remote persistence step",
    );
    expect(checkpoint).toContain(
      "the host's actual authorization and custom-rule controls as the source of authority",
    );
    expect(checkpoint).toContain(
      "If push requires approval, request confirmation through the supported control only when it is still missing or mandatory",
    );
    expect(checkpoint).toContain(
      "preserve the local checkpoint and report the blocker until the response arrives",
    );
    expect(checkpoint).toContain("A connection or push failure");
    expect(checkpoint).toContain(
      "Do not force-push, merge, tag, release, publish, or deploy without the applicable specific authorization",
    );
    expect(checkpoint).toContain("does not save an account rule or recreate a deleted rule");
    expect(checkpoint).toContain("generic checkpoint/push rule proposal");
    expect(checkpoint).toContain("confirmed through the host's actual form");
    expect(checkpoint).toContain("do not constitute permanent permission");
    expect(checkpoint).not.toMatch(
      /libfile_|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  });
  test("render includes researched planning, complete decision batches and verified normal PRs", async () => {
    const root = directory();
    await Effect.runPromise(runCli(["setup"], root, save));
    const output = await Effect.runPromise(runCli(["render"], root, cancel));
    const planning = output.split("### **Preparation and planning**")[1]!.split(/\n#{2,3} /)[0]!;
    expect(
      planning.indexOf(
        "First retrieve the existing context and research options that are actually supported",
      ),
    ).toBeGreaterThanOrEqual(0);
    expect(planning.indexOf("Then use preference patterns grounded")).toBeGreaterThan(
      planning.indexOf("First retrieve"),
    );
    expect(planning.indexOf("present a coherent plan")).toBeGreaterThan(
      planning.indexOf("Then use"),
    );
    expect(planning).toContain("routine, reversible choices");
    expect(planning).toContain("Inferring a preference never grants permission");
    expect(output).toContain("all related decisions needed for the same step");
    expect(output).toContain("without a small arbitrary question limit");
    expect(output).toContain("Keep the batch clear and manageable");
    const prs = output.split("### **PRs and review**")[1]!.split(/\n#{2,3} /)[0]!;
    for (const requirement of [
      "bounded, authorized work",
      "proactively open a regular, non-draft PR",
      "confidence in functionality and quality",
      "If a compatible PR already exists",
      "mark it ready for review through the supported control",
      "regular PR state, and actual submitted head SHA",
      "tests and CI with that SHA",
      "remaining blockers honestly",
      "does not itself authorize merge, tag, release, publication, or deployment",
      "host-required confirmation",
    ])
      expect(prs).toContain(requirement);
    expect(output).toContain("A local-only commit does not complete the remote persistence step");
    expect(output).not.toMatch(
      /libfile_|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
  });
  test.each([
    {
      scenario: "known merge/dev authorization continues while stable remains forbidden",
      row: "| Merge and dev already authorized; known automatic workflow; only stable postponed | Continue merge and dev after the gates without reconfirming; keep the stable tag and latest prohibited until specifically instructed otherwise. |",
    },
    {
      scenario: "approved routine PR maintenance proceeds without repeated approval",
      row: "| PR description maintenance approved within the same scope | Update SHA, evidence, and limitations without reconfirming; preserve the destination and exclude private data. |",
    },
    {
      scenario: "a new material external effect requires its own authority",
      row: "| New material external effect not covered | Pause the new effect and ask for specific authorization; continue independent authorized work. |",
    },
    {
      scenario: "mandatory host denial is never bypassed by earlier approval",
      row: "| Host denial or mandatory confirmation | Respect the blocker and required control; do not bypass it or treat prior approval as a waiver. |",
    },
    {
      scenario: "claimed missing authorization first uses supported recovery",
      row: "| Tool claims missing authorization for an already covered action | Retrieve evidence and try supported resumption; if a mandatory denial persists, pause and report it. |",
    },
  ])("rendered authorization contract: $scenario", async ({ row }) => {
    const root = directory();
    await Effect.runPromise(runCli(["setup"], root, save));
    const before = readFileSync(join(root, "holydot.config.json"));
    const output = await Effect.runPromise(runCli(["render"], root, cancel));
    const policy = output.split("### **Authorization continuity**")[1]!.split(/\n#{2,3} /)[0]!;
    expect(policy).toContain(row);
    expect(policy).toContain("retrieve evidence of authorization already given");
    expect(policy).toContain("do not require duplicate instructions for each covered step");
    expect(policy).toContain("later restrictions, pauses, or revocations");
    expect(policy).toContain(
      "An isolated merge request, without evidence authorizing publication effects, does not authorize assuming those effects",
    );
    expect(policy).toContain(
      "New confirmation is appropriate when authorization is genuinely missing",
    );
    expect(policy).toContain("Never bypass a denial or ignore a mandatory requirement");
    expect(policy).toContain("rendered policy, not permission enforcement");
    expect(policy).toContain("Do not decide authorization from keywords");
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  });
  test("missing, malformed, oversized and symlink configs fail without touching their targets", async () => {
    const root = directory();
    const path = join(root, "holydot.config.json");
    await expectFailure(runCli(["render"], root, cancel));
    for (const content of ["{bad", " ".repeat(65_537), '{"schemaVersion":2}', "�"]) {
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
  test.each([
    { label: "null config", value: null },
    { label: "array config", value: [] },
    { label: "wrong schema version", value: { ...DEFAULT_CONFIG, schemaVersion: 3 } },
    {
      label: "delegation excess key",
      value: { ...DEFAULT_CONFIG, delegation: { ...DEFAULT_CONFIG.delegation, extra: true } },
    },
    {
      label: "coordinator excess key",
      value: {
        ...DEFAULT_CONFIG,
        delegation: {
          ...DEFAULT_CONFIG.delegation,
          coordinator: { ...DEFAULT_CONFIG.delegation.coordinator, extra: true },
        },
      },
    },
    {
      label: "specialist excess key",
      value: {
        ...DEFAULT_CONFIG,
        delegation: {
          ...DEFAULT_CONFIG.delegation,
          specialist: { ...DEFAULT_CONFIG.delegation.specialist, extra: true },
        },
      },
    },
    {
      label: "status excess key",
      value: { ...DEFAULT_CONFIG, statusUpdates: { ...DEFAULT_CONFIG.statusUpdates, extra: true } },
    },
    ...["coordinator", "specialist"].flatMap((role) =>
      ["extreme", null, 3].map((effort) => ({
        label: `${role} invalid effort ${String(effort)}`,
        value: {
          ...DEFAULT_CONFIG,
          delegation: {
            ...DEFAULT_CONFIG.delegation,
            [role]: { ...DEFAULT_CONFIG.delegation.coordinator, effort },
          },
        },
      })),
    ),
    ...[0, -1, 1441, 30.5, "30", null, true].map((intervalMinutes) => ({
      label: `invalid stored interval ${String(intervalMinutes)}`,
      value: { ...DEFAULT_CONFIG, statusUpdates: { intervalMinutes } },
    })),
  ])("stored v2 schema rejects $label before prompt or writes", async ({ value }) => {
    expect(Exit.isFailure(Effect.runSyncExit(parseConfig(value)))).toBe(true);
    const root = directory();
    const path = join(root, "holydot.config.json");
    const original = JSON.stringify(value);
    writeFileSync(path, original);
    const forbiddenPrompt: SetupPrompt = () => Effect.die("invalid stored config reached prompt");
    await expectFailure(runCli(["setup"], root, forbiddenPrompt));
    await expectFailure(runCli(["render"], root, forbiddenPrompt));
    expect(readFileSync(path, "utf8")).toBe(original);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  });
  test("explicit config path works for setup/render and help needs no settings", async () => {
    const root = directory();
    await Effect.runPromise(runCli(["setup", "--config", "custom.json"], root, save));
    expect(readdirSync(root)).toEqual(["custom.json"]);
    expect(
      await Effect.runPromise(runCli(["render", "--config", "custom.json"], root, cancel)),
    ).toContain("# **holydot — main instructions**");
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
