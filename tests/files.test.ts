import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Exit } from "effect";
import { saveConfigFile } from "../scripts/adapters/files";

test("a competing real process cannot save between the final comparison and rename", () => {
  const root = mkdtempSync(join(tmpdir(), "holydot-lock-race-"));
  try {
    const target = join(root, "config.json");
    writeFileSync(target, "original");
    const adapter = JSON.stringify(new URL("../scripts/adapters/files.ts", import.meta.url).href);
    const effect = JSON.stringify(
      pathToFileURL(join(import.meta.dir, "../node_modules/effect/src/index.ts")).href,
    );
    const worker = join(root, "worker.ts");
    writeFileSync(
      worker,
      `import { Effect, Exit } from ${effect};
import { saveConfigFile } from ${adapter};
const result = Effect.runSyncExit(saveConfigFile(${JSON.stringify(target)}, {content:"original"}, "competing"));
console.log(Exit.isFailure(result) ? "blocked" : "saved");`,
    );
    const runner = join(root, "runner.ts");
    writeFileSync(
      runner,
      `import fs from "node:fs";
import { mock } from "bun:test";
import { Effect } from ${effect};
const native = {...fs};
let attempted = false;
mock.module("node:fs", () => ({...native, writeFileSync(...args) {
  if (!attempted && String(args[0]).includes(".bak-")) {
    attempted = true;
    const contender = Bun.spawnSync([process.execPath, ${JSON.stringify(worker)}]);
    if (contender.exitCode !== 0) throw new Error(contender.stderr.toString());
    console.log(contender.stdout.toString().trim());
  }
  return native.writeFileSync(...args);
}}));
const {saveConfigFile} = await import(${adapter});
Effect.runSync(saveConfigFile(${JSON.stringify(target)}, {content:"original"}, "winner"));
if (!attempted) throw new Error("race point was not reached");`,
    );
    const run = Bun.spawnSync([process.execPath, runner]);
    expect(run.stderr.toString()).toBe("");
    expect(run.exitCode).toBe(0);
    expect(run.stdout.toString().trim()).toBe("blocked");
    expect(readFileSync(target, "utf8")).toBe("winner");
    const names = readdirSync(root);
    expect(names.filter((name) => name.includes(".bak-"))).toHaveLength(1);
    expect(
      readFileSync(
        join(
          root,
          names.find((name) => name.includes(".bak-"))!,
        ),
        "utf8",
      ),
    ).toBe("original");
    expect(names.some((name) => name.includes(".tmp-") || name.endsWith(".lock"))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an existing lock fails closed and is never removed by the contender", () => {
  const root = mkdtempSync(join(tmpdir(), "holydot-lock-existing-"));
  try {
    const target = join(root, "config.json");
    writeFileSync(target, "original");
    writeFileSync(`${target}.lock`, "existing owner");
    const result = Effect.runSyncExit(saveConfigFile(target, { content: "original" }, "new"));
    expect(Exit.isFailure(result)).toBe(true);
    expect(readFileSync(target, "utf8")).toBe("original");
    expect(readFileSync(`${target}.lock`, "utf8")).toBe("existing owner");
    expect(readdirSync(root).sort()).toEqual(["config.json", "config.json.lock"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("lock cleanup permits retry after conflict and leaves unchanged saves clean", () => {
  const root = mkdtempSync(join(tmpdir(), "holydot-lock-cleanup-"));
  try {
    const target = join(root, "config.json");
    writeFileSync(target, "newer");
    expect(
      Exit.isFailure(Effect.runSyncExit(saveConfigFile(target, { content: "old" }, "new"))),
    ).toBe(true);
    expect(readdirSync(root)).toEqual(["config.json"]);
    expect(Effect.runSync(saveConfigFile(target, { content: "newer" }, "newer"))).toBeNull();
    expect(readdirSync(root)).toEqual(["config.json"]);
    Effect.runSync(saveConfigFile(target, { content: "newer" }, "accepted"));
    expect(readFileSync(target, "utf8")).toBe("accepted");
    expect(readdirSync(root).some((name) => name.endsWith(".lock"))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
