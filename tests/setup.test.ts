import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit } from "effect";
import { setup, loadSettings } from "../scripts/setup";
import { DEFAULT_CONFIG } from "../scripts/config";
import { HolydotError } from "../scripts/errors";
const roots: string[] = [];
/**
 * Allocate a settings fixture.
 *
 * @returns Isolated configuration path.
 */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "holydot-setup-"));
  roots.push(root);
  return join(root, "holydot.config.json");
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("legacy migration preserves specialist choices, introduces coordinator defaults, and waits for Save", async () => {
  const path = fixture();
  const legacy = JSON.stringify(
    {
      schemaVersion: 1,
      delegation: { model: "gpt-6-sol", effort: "medium", speed: "fast" },
      accountRules: { repository: "owner/repo", branch: "work", mode: "requested" },
      statusUpdates: { intervalMinutes: 90 },
    },
    null,
    4,
  );
  writeFileSync(path, legacy);
  const loaded = await Effect.runPromise(loadSettings(path));
  expect(loaded?.migrated).toBe(true);
  expect(loaded?.config.delegation.specialist).toEqual({ model: "gpt-6-sol", effort: "medium" });
  expect(loaded?.config.delegation.coordinator).toEqual(DEFAULT_CONFIG.delegation.coordinator);
  expect(loaded?.config.statusUpdates.intervalMinutes).toBe(90);
  expect(loaded?.config).not.toHaveProperty("accountRules");
  await Effect.runPromise(setup(path, {}, () => Effect.succeed(null)));
  expect(readFileSync(path, "utf8")).toBe(legacy);
  await Effect.runPromise(
    setup(path, {}, (config, migrated) => {
      expect(migrated).toBe(true);
      return Effect.succeed(config);
    }),
  );
  expect(JSON.parse(readFileSync(path, "utf8")).schemaVersion).toBe(2);
  const backup = readdirSync(roots[0]!).find((name) => name.includes(".bak-"))!;
  expect(readFileSync(join(roots[0]!, backup), "utf8")).toBe(legacy);
});

test("legacy settings without status/scope retain safe defaults", async () => {
  const path = fixture();
  writeFileSync(
    path,
    JSON.stringify({
      schemaVersion: 1,
      delegation: { model: "gpt-6-luna", effort: "high", speed: "standard" },
    }),
  );
  expect((await Effect.runPromise(loadSettings(path)))?.config.statusUpdates.intervalMinutes).toBe(
    30,
  );
});

test("concurrent edit during setup is detected without overwriting another writer", async () => {
  const path = fixture();
  writeFileSync(path, JSON.stringify(DEFAULT_CONFIG));
  await expectFailure(
    setup(path, {}, (config) => {
      writeFileSync(path, "other writer");
      return Effect.succeed(config);
    }),
  );
  expect(readFileSync(path, "utf8")).toBe("other writer");
});

test("creation race leaves another writer's file intact", async () => {
  const path = fixture();
  await expectFailure(
    setup(path, {}, (config) => {
      writeFileSync(path, "other writer");
      return Effect.succeed(config);
    }),
  );
  expect(readFileSync(path, "utf8")).toBe("other writer");
});

test("invalid prompt results fail before writing", async () => {
  const path = fixture();
  await expectFailure(
    setup(path, {}, () => Effect.succeed({ ...DEFAULT_CONFIG, codexHome: "bad\npath" })),
  );
  expect(readdirSync(roots[0]!)).toEqual([]);
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

test("unchanged repeated setup is idempotent and does not accumulate backups", async () => {
  const path = fixture();
  const save = (config: typeof DEFAULT_CONFIG) => Effect.succeed(config);
  const output = await Effect.runPromise(setup(path, {}, save));
  expect(output).toContain("Local setup does not apply or verify your dot name or custom rules");
  const before = readFileSync(path);
  await Effect.runPromise(setup(path, {}, save));
  expect(readFileSync(path)).toEqual(before);
  expect(readdirSync(roots[0]!)).toEqual(["holydot.config.json"]);
  await Effect.runPromise(setup(path, { "--status-interval-minutes": "60" }, save));
  const changed = readFileSync(path);
  const afterEdit = readdirSync(roots[0]!).sort();
  expect(afterEdit.filter((name) => name.includes(".bak-")).length).toBe(1);
  await Effect.runPromise(setup(path, {}, save));
  expect(readFileSync(path)).toEqual(changed);
  expect(readdirSync(roots[0]!).sort()).toEqual(afterEdit);
});

test("failed prompt preserves state and supported retry/cancel is recoverable", async () => {
  const path = fixture();
  const unavailable = () =>
    Effect.fail(new HolydotError({ message: "Fixture prompt unavailable" }));
  await expectFailure(setup(path, {}, unavailable));
  expect(readdirSync(roots[0]!)).toEqual([]);
  await Effect.runPromise(setup(path, {}, (config) => Effect.succeed(config)));
  const before = readFileSync(path);
  await expectFailure(setup(path, { "--speed": "fast" }, unavailable));
  expect(readFileSync(path)).toEqual(before);
  await Effect.runPromise(setup(path, { "--speed": "fast" }, () => Effect.succeed(null)));
  expect(readFileSync(path)).toEqual(before);
  expect(readdirSync(roots[0]!)).toEqual(["holydot.config.json"]);
});
