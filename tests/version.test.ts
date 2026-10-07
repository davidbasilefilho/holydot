import { expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
