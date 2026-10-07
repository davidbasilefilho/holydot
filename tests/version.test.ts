import { expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { bumpManifest, bumpVersion } from "../scripts/version";

test("X/Y reset lower axes and Z increments maintenance from absent or numeric suffix", () => {
  expect(Effect.runSync(bumpVersion("0.1.2-3", "x"))).toBe("0.2.0");
  expect(Effect.runSync(bumpVersion("0.1.2-3", "y"))).toBe("0.1.3");
  expect(Effect.runSync(bumpVersion("0.1.2-3", "z"))).toBe("0.1.2-4");
  expect(Effect.runSync(bumpVersion("0.1.0", "z"))).toBe("0.1.0-1");
  for (const [version, axis] of [
    ["0.1.0-dev-abc", "x"],
    ["1.0.0", "z"],
    ["0.1.0-01", "z"],
    ["0.1.0", "q"],
    ["0.9007199254740992.0", "x"],
  ])
    expect(Exit.isFailure(Effect.runSyncExit(bumpVersion(version, axis)))).toBe(true);
});

test("manifest bump preserves unrelated fields and does not mutate an invalid request", async () => {
  const root = mkdtempSync(join(tmpdir(), "holydot-bump-"));
  try {
    const path = join(root, "package.json");
    const original = JSON.stringify({
      name: "holydot",
      version: "0.1.0",
      scripts: { check: "mise run check" },
      custom: true,
    });
    writeFileSync(path, original);
    expect(Exit.isFailure(await Effect.runPromiseExit(bumpManifest(root, "q")))).toBe(true);
    expect(readFileSync(path, "utf8")).toBe(original);
    expect(await Effect.runPromise(bumpManifest(root, "z"))).toBe("0.1.0-1");
    expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({
      custom: true,
      scripts: { check: "mise run check" },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.each(["x", "y", "z"])(
  "bump %s keeps the CLI version suite valid in an isolated project",
  (axis) => {
    const root = mkdtempSync(join(tmpdir(), "holydot-bump-cli-"));
    const source = resolve(import.meta.dir, "..");
    try {
      for (const entry of ["scripts", "instructions", "package.json", "bunfig.toml"])
        cpSync(join(source, entry), join(root, entry), { recursive: true });
      cpSync(join(source, "tests", "cli.test.ts"), join(root, "tests", "cli.test.ts"));
      symlinkSync(join(source, "node_modules"), join(root, "node_modules"), "junction");
      const before = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
      const expected = Effect.runSync(bumpVersion(before, axis));
      const bumped = Bun.spawnSync([process.execPath, "scripts/version.ts", axis], { cwd: root });
      expect(bumped.exitCode).toBe(0);
      expect(bumped.stdout.toString().trim()).toBe(expected);
      expect(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version).toBe(expected);
      const checked = Bun.spawnSync([process.execPath, "test", "tests/cli.test.ts"], { cwd: root });
      expect(checked.stderr.toString()).toContain("0 fail");
      expect(checked.exitCode).toBe(0);
      expect(JSON.parse(readFileSync(join(source, "package.json"), "utf8")).version).toBe(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);
