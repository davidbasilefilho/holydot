import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Effect, Exit } from "effect";
import {
  assertMatchingRelease,
  createReleasePlan,
  isIdenticalPublication,
  verifyPublication,
  type ReleaseInput,
} from "../scripts/release";

const input: ReleaseInput = {
  mode: "dev",
  version: "0.1.0",
  sha: "0123456789abcdef0123456789abcdef01234567",
  ref: "refs/heads/release/v0.0.1",
  event: "push",
  repository: "davidbasilefilho/holydot",
  deleted: false,
  fork: false,
};

describe("Effect release planning", () => {
  test("dev combines product base, channel and immutable short SHA", () => {
    expect(Effect.runSync(createReleasePlan(input))).toEqual({
      version: "0.1.0-dev-0123456789ab",
      tag: "v0.1.0-dev-0123456789ab",
      distTag: "dev",
      prerelease: true,
      sha: input.sha,
    });
    expect(Effect.runSync(createReleasePlan({ ...input, version: "0.1.2-3" })).version).toBe(
      "0.1.2-3-dev-0123456789ab",
    );
  });
  test("stable maintenance deliberately uses latest and a non-prerelease GitHub release", () => {
    for (const version of ["0.1.0", "0.1.2-3"]) {
      expect(
        Effect.runSync(
          createReleasePlan({ ...input, mode: "stable", version, ref: `refs/tags/v${version}` }),
        ),
      ).toMatchObject({ version, tag: `v${version}`, distTag: "latest", prerelease: false });
    }
  });
  test.each([
    "refs/heads/codex/holydot-reconstruct",
    "refs/heads/feature/one",
    "refs/heads/work",
    "refs/tags/v0.1.0",
    "refs/tags/preview",
    "refs/pull/1/merge",
  ])("dev cannot publish checkpoint or tag ref %s", (ref) => {
    expect(Exit.isFailure(Effect.runSyncExit(createReleasePlan({ ...input, ref })))).toBe(true);
  });
  test.each([
    "v0.1.0",
    "01.1.0",
    "1.1.0",
    "0.01.0",
    "0.1.0-rc.1",
    "0.1.0-dev-abc",
    "0.1.0+build",
    "0.1.0-01",
    "0.1.0\n",
  ])("malformed product version %s fails", (version) => {
    expect(Exit.isFailure(Effect.runSyncExit(createReleasePlan({ ...input, version })))).toBe(true);
  });
  test("unauthorized events and mismatched stable tags fail before publication adapters", () => {
    for (const change of [
      { event: "workflow_dispatch" },
      { event: "pull_request" },
      { repository: "someone/holydot" },
      { deleted: true },
      { fork: true },
      { sha: "short" },
      { mode: "other" },
      { mode: "stable", ref: "refs/tags/v0.2.0" },
    ])
      expect(Exit.isFailure(Effect.runSyncExit(createReleasePlan({ ...input, ...change })))).toBe(
        true,
      );
  });
});

describe("immutable publication verification", () => {
  test("identical package skips writes; conflicts fail", () => {
    expect(Effect.runSync(isIdenticalPublication(null, "sha512-one"))).toBe(false);
    expect(Effect.runSync(isIdenticalPublication("sha512-one", "sha512-one"))).toBe(true);
    expect(
      Exit.isFailure(Effect.runSyncExit(isIdenticalPublication("sha512-other", "sha512-one"))),
    ).toBe(true);
    expect(
      Exit.isFailure(Effect.runSyncExit(isIdenticalPublication("sha1-other", "sha1-other"))),
    ).toBe(true);
  });
  test("read-only visibility retries are bounded and never retry conflicting content", async () => {
    let reads = 0;
    let pauses = 0;
    const read = Effect.sync(() => (++reads < 3 ? null : "sha512-one"));
    const pause = Effect.sync(() => {
      pauses++;
    });
    await Effect.runPromise(verifyPublication(read, "sha512-one", pause));
    expect(reads).toBe(3);
    expect(pauses).toBe(2);
    reads = 0;
    pauses = 0;
    expect(
      Exit.isFailure(
        await Effect.runPromiseExit(
          verifyPublication(
            Effect.sync(() => {
              reads++;
              return null;
            }),
            "sha512-one",
            pause,
          ),
        ),
      ),
    ).toBe(true);
    expect(reads).toBe(6);
    expect(pauses).toBe(5);
    pauses = 0;
    expect(
      Exit.isFailure(
        await Effect.runPromiseExit(
          verifyPublication(Effect.succeed("sha512-other"), "sha512-one", pause),
        ),
      ),
    ).toBe(true);
    expect(pauses).toBe(0);
  });
  test("resume requires identical release identity, channel and evidence", () => {
    const plan = Effect.runSync(createReleasePlan(input));
    const release = {
      tag_name: plan.tag,
      prerelease: true,
      draft: false,
      body: "immutable evidence",
    };
    expect(
      Exit.isSuccess(Effect.runSyncExit(assertMatchingRelease(release, plan, release.body))),
    ).toBe(true);
    expect(
      Exit.isSuccess(
        Effect.runSyncExit(
          assertMatchingRelease({ ...release, draft: true }, plan, release.body, true),
        ),
      ),
    ).toBe(true);
    for (const change of [
      { tag_name: "v0.2.0" },
      { prerelease: false },
      { draft: true },
      { body: "different" },
    ])
      expect(
        Exit.isFailure(
          Effect.runSyncExit(assertMatchingRelease({ ...release, ...change }, plan, release.body)),
        ),
      ).toBe(true);
  });
});

test("single publication workflow excludes checkpoint pushes and validates before writes", () => {
  const text = readFileSync(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
  const workflow = Bun.YAML.parse(text);
  expect(workflow).toHaveProperty("on.push.branches", ["main", "release/**"]);
  expect(workflow).toHaveProperty("on.push.tags", ["v*"]);
  expect(workflow).toHaveProperty("jobs.release.needs", "validate");
  expect(workflow).toHaveProperty("jobs.release.permissions.id-token", "write");
  expect(text).toContain("bun install --frozen-lockfile --ignore-scripts");
  expect(text).toContain("persist-credentials: false");
  expect(text).not.toContain("NPM_TOKEN");
  expect(text).not.toContain("pull_request_target");
  expect(text).toContain("cancel-in-progress: false");
  for (const action of text.matchAll(/uses: (\S+)/g))
    if (!action[1]?.startsWith("./")) expect(action[1]).toMatch(/@[a-f0-9]{40}$/);
  const validationText = readFileSync(
    new URL("../.github/workflows/validation.yml", import.meta.url),
    "utf8",
  );
  const validation = Bun.YAML.parse(validationText);
  expect(validation).toHaveProperty("on.push");
  expect(validation).toHaveProperty("on.pull_request");
  expect(validation).toHaveProperty("jobs.check.strategy.matrix.os", [
    "ubuntu-latest",
    "windows-latest",
  ]);
  expect(validationText).not.toContain("contents: write");
  expect(validationText).not.toContain("id-token: write");
});

test("mise publication tasks explicitly select trusted-publishing capable npm", () => {
  const config = readFileSync(new URL("../mise.toml", import.meta.url), "utf8");
  expect(config).toContain('run = "mise exec npm:npm@11.21.0 -- bun scripts/release.ts dev"');
  expect(config).toContain('run = "mise exec npm:npm@11.21.0 -- bun scripts/release.ts stable"');
});
