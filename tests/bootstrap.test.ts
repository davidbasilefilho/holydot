import { expect, test } from "bun:test";
import { Effect } from "effect";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../scripts/cli";

const literal = readFileSync(
  new URL("./fixtures/approved-communication.md", import.meta.url),
  "utf8",
);

// Callplan delivery regressions: no tool mocks and no claim of host/account execution.
test("actual setup/render/resume delivers active receiver bootstrap first, without a disconnected runtime", async () => {
  const root = mkdtempSync(join(tmpdir(), "holydot-bootstrap-"));
  try {
    const setup = await Effect.runPromise(
      runCli(["setup", "--status-interval-minutes", "45"], root, (config) =>
        Effect.succeed(config),
      ),
    );
    expect(setup).toContain(
      "receiver bootstrap initiates native profile, custom-rule form and scheduling controls",
    );
    expect(setup).not.toContain(literal);
    const before = readFileSync(join(root, "holydot.config.json"));
    const render = await Effect.runPromise(
      runCli(["render"], root, () => Effect.die("prompt forbidden")),
    );
    const resume = await Effect.runPromise(
      runCli(["resume"], root, () => Effect.die("prompt forbidden")),
    );
    expect(resume).toBe(render);
    expect(render.indexOf("### **Active bootstrap in the receiving dot**")).toBeLessThan(
      render.indexOf("## **I. Autonomy**"),
    );
    expect(render).toContain("on the first turn after reading the complete render");
    expect(render).toContain("Overview: 45 minutes");
    expect(render.split(literal)).toHaveLength(2);
    expect(render).not.toContain("adoptInHost");
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(manifest.exports).toBeUndefined();
    const build = readFileSync(new URL("../scripts/adapters/build.ts", import.meta.url), "utf8");
    expect(build).toContain('entrypoints: ["./scripts/cli.ts"]');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.each([
  [
    "first turn",
    [
      "or finish by merely presenting recipes",
      "Reading this source for package development, review, or testing does not authorize changing that account",
    ],
  ],
  [
    "resume or changed approved instructions",
    [
      "Reload the current source through resume/a real host resource",
      "preserve current authority, current corrections, version/digest",
      "throughout the thread",
    ],
  ],
  [
    "pending form",
    [
      "keep it pending until a response",
      "without duplicating existing items or reopening a pending form",
    ],
  ],
  [
    "user denial or removal",
    [
      "Cancellation/denial does not authorize the action",
      "A previously verified rule that disappeared remains removed",
    ],
  ],
  [
    "existing rule or schedule",
    [
      "Compare content, destination, scope, and state, not just names",
      "Compare the equivalent saved task before creating another",
      "updates the existing identifier when supported",
    ],
  ],
  [
    "unavailable tools",
    [
      "A missing tool, pending form, or denial blocks only its own step",
      "while independent authorized execution continues",
    ],
  ],
  [
    "current host schemas",
    [
      "read their current schemas",
      "required fields, enumerations, limits, identifiers, and results",
      "not a fixed tool name",
      "Do not invent a missing duration or destination",
    ],
  ],
  [
    "real scheduling intent",
    [
      "exact_schedule",
      "do not convert this to `condition_watch`",
      "or change the objective to fit the service",
      "the schedule preserves recurrence and time zone",
    ],
  ],
])("callplan in actual full render/resume (not native-tool acceptance): %s", async (_, phrases) => {
  const root = mkdtempSync(join(tmpdir(), "holydot-callplan-"));
  try {
    await Effect.runPromise(runCli(["setup"], root, (config) => Effect.succeed(config)));
    for (const command of ["render", "resume"]) {
      const output = await Effect.runPromise(
        runCli([command], root, () => Effect.die("prompt forbidden")),
      );
      for (const phrase of phrases) expect(output.toLowerCase()).toContain(phrase.toLowerCase());
      expect(output).toContain("text/callplan tests are not account adoption");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
