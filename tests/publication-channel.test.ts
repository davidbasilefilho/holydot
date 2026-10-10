import { expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import { canAdvanceChannel, createReleasePlan } from "../scripts/release";
import { resolve } from "node:path";

const sha = "a".repeat(40);
const next = "f".repeat(40);
const fixture = resolve(import.meta.dir, "fixtures/publication-offline.ts");
const adapter = resolve(import.meta.dir, "../scripts/adapters/publication.ts");
const plan = (mode: "dev" | "stable", base = "0.1.0", commit = sha) =>
  Effect.runSync(
    createReleasePlan({
      mode,
      version: base,
      sha: commit,
      ref: mode === "dev" ? "refs/heads/release/offline" : `refs/tags/v${base}`,
      event: "push",
      repository: "davidbasilefilho/holydot",
      deleted: false,
      fork: false,
    }),
  );
const scenarios = [
  ...(["dev", "stable"] as const).map((mode) => ({
    name: `identical older ${mode} resumes matching draft without channel writes`,
    mode,
    base: "0.1.0",
    existingIntegrity: "sha512-offline-pack",
    existingDraft: true,
    channels:
      mode === "dev"
        ? { dev: { version: `0.2.0-dev-${next.slice(0, 12)}`, commit: next } }
        : { latest: { version: "0.1.1", commit: next } },
    write: false,
    published: true,
    resume: true,
  })),
  { name: "first dev publication", mode: "dev", base: "0.1.0", channels: {}, write: true },
  { name: "first stable publication", mode: "stable", base: "0.1.0", channels: {}, write: true },
  {
    name: "old unpublished stable stays absent",
    mode: "stable",
    base: "0.1.0",
    channels: { latest: { version: "0.1.1", commit: next } },
    write: false,
  },
  {
    name: "old maintenance stable stays absent",
    mode: "stable",
    base: "0.1.0-2",
    channels: { latest: { version: "0.1.0-3", commit: next } },
    write: false,
  },
  {
    name: "product maintenance advances despite SemVer prerelease ordering",
    mode: "stable",
    base: "0.1.0-1",
    channels: { latest: { version: "0.1.0", commit: next } },
    write: true,
  },
  {
    name: "old unpublished dev same base uses ancestry not hash order",
    mode: "dev",
    base: "0.1.0",
    sha: next,
    channels: { dev: { version: `0.1.0-dev-${sha.slice(0, 12)}`, commit: sha } },
    relation: "behind",
    write: false,
  },
  {
    name: "new dev same base uses ancestry not hash order",
    mode: "dev",
    base: "0.1.0",
    channels: { dev: { version: `0.1.0-dev-${next.slice(0, 12)}`, commit: next } },
    relation: "ahead",
    write: true,
  },
  {
    name: "older dev product base stays absent",
    mode: "dev",
    base: "0.1.0",
    channels: { dev: { version: `0.2.0-dev-${next.slice(0, 12)}`, commit: next } },
    write: false,
  },
  {
    name: "new dev product base can advance without ambiguous same-base ancestry",
    mode: "dev",
    base: "0.2.0",
    channels: { dev: { version: `0.1.0-dev-${next.slice(0, 12)}`, commit: null } },
    write: true,
  },
  {
    name: "latest does not affect dev",
    mode: "dev",
    base: "0.1.0",
    channels: { latest: { version: "0.9.0", commit: next } },
    write: true,
  },
  {
    name: "dev does not affect latest",
    mode: "stable",
    base: "0.1.0",
    channels: { dev: { version: `0.9.0-dev-${next.slice(0, 12)}`, commit: next } },
    write: true,
  },
  {
    name: "identical stable rerun never writes",
    mode: "stable",
    base: "0.1.0",
    existingIntegrity: "sha512-offline-pack",
    channels: { latest: { version: "0.1.1", commit: next } },
    write: false,
    published: true,
  },
  {
    name: "identical dev rerun never writes",
    mode: "dev",
    base: "0.1.0",
    existingIntegrity: "sha512-offline-pack",
    channels: { dev: { version: `0.2.0-dev-${next.slice(0, 12)}`, commit: next } },
    write: false,
    published: true,
  },
  {
    name: "identical current stable resumes GitHub only",
    mode: "stable",
    base: "0.1.0",
    existingIntegrity: "sha512-offline-pack",
    channels: { latest: { version: "0.1.0", commit: sha } },
    write: false,
    published: true,
    resume: true,
  },
  {
    name: "channel rechecked after draft protects concurrent advancement",
    mode: "stable",
    base: "0.1.0",
    channels: {},
    advanced: { version: "0.1.1", commit: next },
    write: false,
    draft: true,
  },
] as const;
for (const scenario of scenarios)
  test(`offline real publication adapter: ${scenario.name}`, async () => {
    const child = Bun.spawn(
      [process.execPath, fixture, JSON.stringify({ sha, ...scenario }), adapter],
      { stdout: "pipe", stderr: "pipe" },
    );
    const result = JSON.parse(await new Response(child.stdout).text());
    expect(await child.exited).toBe(0);
    expect(result.error).toBeNull();
    expect(result.restored).toBe(true);
    expect(result.actions.filter((action: string) => action === "npm publish").length).toBe(
      scenario.write ? 1 : 0,
    );
    expect(result.versionPublished).toBe(
      scenario.write || ("published" in scenario && scenario.published),
    );
    if (!scenario.write && !("draft" in scenario) && !("resume" in scenario))
      expect(
        result.actions.filter(
          (action: string) => action.startsWith("POST ") || action.startsWith("PATCH "),
        ),
      ).toEqual([]);
    if ("draft" in scenario) expect(result.draft).toBe(true);
    if ("existingDraft" in scenario) {
      expect(result.draft).toBe(false);
      expect(
        result.actions.filter(
          (action: string) => action === "PATCH /repos/davidbasilefilho/holydot/releases/1",
        ),
      ).toHaveLength(1);
      expect(result.channels).toEqual(scenario.channels);
    }
    const selected = scenario.mode === "dev" ? "dev" : "latest";
    const other = selected === "dev" ? "latest" : "dev";
    expect(result.channels[other]).toEqual((scenario.channels as Record<string, unknown>)[other]);
  });
for (const relation of ["diverged", "identical"] as const)
  test(`same-base ambiguous dev comparison ${relation} blocks`, () => {
    expect(
      Exit.isFailure(
        Effect.runSyncExit(
          canAdvanceChannel(
            plan("dev"),
            { version: `0.1.0-dev-${next.slice(0, 12)}`, commit: next },
            () => Effect.succeed(relation),
          ),
        ),
      ),
    ).toBe(true);
  });
test("unverifiable or mismatched channel versions fail closed", () => {
  for (const current of [
    { version: "bad", commit: null },
    { version: "0.1.0", commit: null },
    { version: `0.1.0-dev-${next.slice(0, 12)}`, commit: null },
    { version: `0.1.0-dev-${next.slice(0, 12)}`, commit: sha },
  ])
    expect(
      Exit.isFailure(
        Effect.runSyncExit(canAdvanceChannel(plan("dev"), current, () => Effect.succeed("ahead"))),
      ),
    ).toBe(true);
  expect(
    Exit.isFailure(
      Effect.runSyncExit(
        canAdvanceChannel(plan("stable"), { version: "0.1.0-0", commit: sha }, () =>
          Effect.succeed("ahead"),
        ),
      ),
    ),
  ).toBe(true);
});

test.each([
  {
    mode: "dev",
    base: "0.1.0",
    channels: { dev: { version: `0.1.0-dev-${next.slice(0, 12)}`, commit: null } },
  },
  {
    mode: "dev",
    base: "0.1.0",
    channels: { dev: { version: `0.1.0-dev-${next.slice(0, 12)}`, commit: next } },
    relation: "diverged",
  },
  {
    mode: "stable",
    base: "0.1.0",
    channels: { latest: { version: "0.1.1", commit: next } },
    existingIntegrity: "sha512-conflicting-bytes",
  },
])(
  "offline actual adapter rejects unverifiable order or immutable conflict before writes: %j",
  async (scenario) => {
    const child = Bun.spawn(
      [process.execPath, fixture, JSON.stringify({ sha, ...scenario }), adapter],
      { stdout: "pipe", stderr: "pipe" },
    );
    const result = JSON.parse(await new Response(child.stdout).text());
    expect(await child.exited).toBe(0);
    expect(result.error).not.toBeNull();
    expect(result.restored).toBe(true);
    expect(
      result.actions.filter(
        (action: string) =>
          action === "npm publish" || action.startsWith("POST ") || action.startsWith("PATCH "),
      ),
    ).toEqual([]);
  },
);

test.each([{ npmVersion: "11.19.0" }, { nodeVersion: "v20.0.0" }])(
  "actual publication preflight rejects an unexpected child runtime before writes: %j",
  async (runtime) => {
    const child = Bun.spawn(
      [
        process.execPath,
        fixture,
        JSON.stringify({ sha, mode: "dev", base: "0.1.0", channels: {}, ...runtime }),
        adapter,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const result = JSON.parse(await new Response(child.stdout).text());
    expect(await child.exited).toBe(0);
    expect(result.error).toContain("configured npm 11.21.0 and Node 24 child runtime");
    expect(result.restored).toBe(true);
    expect(result.actions).toEqual(["npm --version", "node --version"]);
  },
);
