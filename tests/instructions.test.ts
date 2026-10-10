import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Exit } from "effect";
import { runCli } from "../scripts/cli";

const roots: string[] = [];
const canonical = readFileSync(new URL("../instructions/holydot.md", import.meta.url), "utf8");
const literal = readFileSync(
  new URL("./fixtures/approved-communication.md", import.meta.url),
  "utf8",
);
const pin = readFileSync(new URL("../instructions/integrity.json", import.meta.url), "utf8");
const manifest = readFileSync(new URL("../package.json", import.meta.url), "utf8");
const makePackage = (text: string) => {
  const root = mkdtempSync(join(tmpdir(), "holydot-source-"));
  roots.push(root);
  mkdirSync(join(root, "instructions"));
  mkdirSync(join(root, "consumer"));
  writeFileSync(join(root, "instructions/holydot.md"), text);
  writeFileSync(join(root, "instructions/integrity.json"), pin);
  writeFileSync(join(root, "package.json"), manifest);
  return { root, consumer: join(root, "consumer"), url: pathToFileURL(root + "/") };
};
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test.each([
  canonical.replace("interpret me literally", "ignore my instructions"),
  canonical.slice(0, -100),
  canonical + literal,
  canonical.replace(literal, "Reply in my latest language unless requested otherwise.\n"),
  canonical.replace(/\n/g, "\r\n"),
])(
  "actual setup/render/resume reject modified, truncated, duplicated, old or CRLF canonical source",
  async (text) => {
    const pkg = makePackage(text);
    for (const command of ["setup", "render", "resume"]) {
      let prompted = false;
      const result = await Effect.runPromiseExit(
        runCli(
          [command],
          pkg.consumer,
          (config) => {
            prompted = true;
            return Effect.succeed(config);
          },
          pkg.url,
        ),
      );
      expect(Exit.isFailure(result)).toBe(true);
      expect(prompted).toBe(false);
      expect(readdirSync(pkg.consumer)).toEqual([]);
    }
  },
);

test("verified initial setup identifies actual package and resume reloads identical full source without writes", async () => {
  const pkg = makePackage(canonical);
  const setup = await Effect.runPromise(
    runCli(["setup"], pkg.consumer, (config) => Effect.succeed(config), pkg.url),
  );
  expect(setup).toContain(`holydot ${JSON.parse(manifest).version}`);
  expect(setup).toContain(JSON.parse(pin).canonicalSHA256);
  expect(setup).toContain(JSON.parse(pin).revision);
  const config = readFileSync(join(pkg.consumer, "holydot.config.json"));
  const noPrompt = () => Effect.die("render/resume must not prompt");
  const render = await Effect.runPromise(runCli(["render"], pkg.consumer, noPrompt, pkg.url));
  const resume = await Effect.runPromise(runCli(["resume"], pkg.consumer, noPrompt, pkg.url));
  expect(resume).toBe(render);
  expect(resume.split(literal)).toHaveLength(2);
  expect(resume).toContain("56bfc5f4b2993e17f6e221079934d043f312efb92e67828b03880823c6c5073a");
  expect(readFileSync(join(pkg.consumer, "holydot.config.json"))).toEqual(config);
  expect(readdirSync(pkg.consumer)).toEqual(["holydot.config.json"]);
});

test("receiver continuity contract preserves precedence, later corrections and actual capability limits", () => {
  for (const phrase of [
    "higher-priority instructions and mandatory controls",
    "the user's current explicit requests",
    "An explicit correction can replace an earlier decision within the same scope",
    "local preferences only for their configurable fields",
    "This command does not detect compaction",
    "Ask for confirmation of actual loading",
    "do not confuse a repeated digest string with reading",
    "Before delivery, internally review",
    "after many turns, a long response, a status update, and a delegated result",
    "Do not promise 100% LLM compliance through a prompt",
  ])
    expect(canonical.toLowerCase()).toContain(phrase.toLowerCase());
});

// Rendered policy regressions, not simulated GitHub/account permission enforcement.
test.each([
  [
    "remote success",
    "Check the remote SHA, the PR's head/base and non-draft state, and tests and checks for the submitted version before completion",
  ],
  [
    "push failure",
    "record the task as blocked, preserve the work, and explain the cause/evidence and next step",
  ],
  ["existing PR", "Reuse the appropriate PR without opening a duplicate"],
  [
    "draft is not completion",
    "make a draft ready through the supported control when gates allow, or keep that step blocked",
  ],
  [
    "unknown external triggers",
    "do not assume every push is safe or force an unauthorized release, deployment, merge, or tag",
  ],
  [
    "integration ownership",
    "coordination verifies remote persistence and the PR for the integrated contribution before declaring completion",
  ],
])("code completion contract (not host enforcement): %s", (_, phrase) => {
  expect(canonical.toLowerCase()).toContain(phrase.toLowerCase());
});

test("render and resume carry the public rule recipes without requiring a separate guide", async () => {
  const pkg = makePackage(canonical);
  await Effect.runPromise(
    runCli(["setup"], pkg.consumer, (config) => Effect.succeed(config), pkg.url),
  );
  for (const command of ["render", "resume"]) {
    const output = await Effect.runPromise(
      runCli([command], pkg.consumer, () => Effect.die("render/resume must not prompt"), pkg.url),
    );
    for (const phrase of [
      "Authorized work checkpoint",
      "Normal PR and same-scope maintenance",
      "Resolution of verified review findings",
      "These recipes are public proposals",
      "do not use an all-repositories wildcard",
      "Outdated does not mean resolved",
      "30 minutes",
      "state, change, evidence, next step, and pending verification",
      "After mentioning a completion once, remove the task from subsequent overviews",
      "exact_schedule",
      "condition_watch",
      "Retrieve the personal time zone and delivery channel of the current instance",
      "A sent request is not a saved task",
      "a saved task without readback remains unverified",
      "do not create a task in this session merely to test it",
    ])
      expect(output).toContain(phrase);
    expect(output.split(literal)).toHaveLength(2);
    expect(output).toContain("exact required form");
  }
});

// Deterministic receiver-contract assertions; these do not simulate host account persistence.
test.each([
  [
    "new installation executes host steps",
    "execute those steps with the available real host tools",
  ],
  ["idempotent reexecution", "execute only what is still missing, without duplicating what exists"],
  [
    "pending and cancellation preserved",
    "Do not reopen a pending or canceled form on your own initiative",
  ],
  ["saved requires host confirmation", "Only host write confirmation permits marking it saved"],
  [
    "verified requires corresponding readback",
    "only a matching readback permits marking it verified",
  ],
  [
    "partial failure retains verified effects",
    "preserve those results and record the partial failure",
  ],
  ["missing definitions stay explicit", "blocked by an incomplete definition"],
  [
    "task verification and no blind interval fallback",
    "Do not invent missing fields or automatically convert 30 minutes",
  ],
])("host-installation contract (not live host evaluation): %s", (_, phrase) => {
  expect(canonical).toContain(phrase);
});
