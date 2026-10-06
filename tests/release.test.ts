import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
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
  ref: "refs/heads/main",
  event: "push",
  repository: "davidbasilefilho/holydot",
  deleted: false,
  fork: false,
};

describe("release planning", () => {
  test("dev versions use a deterministic 12-character SHA and no npm v prefix", () => {
    expect(createReleasePlan(input)).toEqual({
      version: "0.1.0-dev-0123456789ab",
      tag: "v0.1.0-dev-0123456789ab",
      distTag: "dev",
      prerelease: true,
      sha: input.sha,
    });
  });

  test("dev accepts any branch and non-v tag", () => {
    for (const ref of ["refs/heads/feature/one", "refs/heads/v-next", "refs/tags/preview"]) {
      expect(createReleasePlan({ ...input, ref }).distTag).toBe("dev");
    }
  });

  test("stable matches source version and tag exactly", () => {
    const plan = createReleasePlan({ ...input, mode: "stable", ref: "refs/tags/v0.1.0" });
    expect(plan.version).toBe("0.1.0");
    expect(plan.tag).toBe("v0.1.0");
    expect(plan.distTag).toBe("latest");
    expect(plan.prerelease).toBe(false);
  });

  test("release channels cannot recursively consume development tags", () => {
    for (const mode of ["stable", "dev"]) {
      expect(() =>
        createReleasePlan({ ...input, mode, ref: "refs/tags/v0.1.0-dev-0123456789ab" }),
      ).toThrow();
    }
  });

  test("rejects every v-prefixed dev tag", () => {
    for (const ref of ["refs/tags/v0.1.0", "refs/tags/vdraft", "refs/tags/v"]) {
      expect(() => createReleasePlan({ ...input, ref })).toThrow();
    }
  });

  test("stable rejects wrong versions, branches, prereleases and build tags", () => {
    for (const ref of [
      "refs/tags/v0.2.0",
      "refs/heads/main",
      "refs/tags/v0.1.0+build",
      "refs/tags/v0.1.0-rc.1",
    ]) {
      expect(() => createReleasePlan({ ...input, mode: "stable", ref })).toThrow();
    }
  });

  test("source must be canonical stable SemVer", () => {
    for (const version of [
      "v0.1.0",
      "01.1.0",
      "0.1",
      "0.1.0-rc.1",
      "0.1.0+build",
      "0.1.0\n",
      "0.1.0; exit 0",
    ]) {
      expect(() => createReleasePlan({ ...input, version })).toThrow();
    }
  });

  test("rejects unauthorized events, repositories, forks, deletions and invalid SHAs", () => {
    const invalid: Partial<ReleaseInput>[] = [
      { event: "pull_request" },
      { event: "workflow_dispatch" },
      { repository: "someone/holydot" },
      { fork: true },
      { deleted: true },
      { sha: "0123456" },
      { sha: "A".repeat(40) },
      { ref: "refs/pull/1/merge" },
      { mode: "preview" },
    ];
    for (const replacement of invalid) {
      expect(() => createReleasePlan({ ...input, ...replacement })).toThrow();
    }
  });
});

describe("idempotent publication", () => {
  test("missing version may publish; identical version is skipped", () => {
    expect(isIdenticalPublication(null, "sha512-one")).toBe(false);
    expect(isIdenticalPublication("sha512-one", "sha512-one")).toBe(true);
  });

  test("conflicting content and unverifiable algorithms are rejected", () => {
    expect(() => isIdenticalPublication("sha512-old", "sha512-new")).toThrow();
    expect(() => isIdenticalPublication("sha1-old", "sha1-old")).toThrow();
  });

  test("publication verification retries only missing registry visibility", async () => {
    let reads = 0;
    let pauses = 0;
    await verifyPublication(
      async () => (++reads < 3 ? null : "sha512-one"),
      "sha512-one",
      async () => {
        pauses += 1;
      },
    );
    expect(reads).toBe(3);
    expect(pauses).toBe(2);
  });

  test("publication verification bounds read retries and never accepts absence", async () => {
    let reads = 0;
    let pauses = 0;
    const error = await verifyPublication(
      async () => {
        reads += 1;
        return null;
      },
      "sha512-one",
      async () => {
        pauses += 1;
      },
    ).then(
      () => null,
      (error: unknown) => error,
    );
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain("not yet visible");
    expect(reads).toBe(6);
    expect(pauses).toBe(5);
  });

  test("publication verification rejects a conflict without retrying", async () => {
    let pauses = 0;
    const error = await verifyPublication(
      async () => "sha512-other",
      "sha512-one",
      async () => {
        pauses += 1;
      },
    ).then(
      () => null,
      (error: unknown) => error,
    );
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain("different content");
    expect(pauses).toBe(0);
  });

  test("existing GitHub release must match immutable identity and channel", () => {
    const plan = createReleasePlan(input);
    const existing = {
      tag_name: plan.tag,
      prerelease: true,
      draft: false,
      body: "commit and integrity",
    };
    expect(() => assertMatchingRelease(existing, plan, existing.body)).not.toThrow();
    expect(() =>
      assertMatchingRelease({ ...existing, draft: true }, plan, existing.body, true),
    ).not.toThrow();
    for (const change of [
      { tag_name: "v0.2.0" },
      { prerelease: false },
      { draft: true },
      { body: "changed" },
    ]) {
      expect(() =>
        assertMatchingRelease({ ...existing, ...change }, plan, existing.body),
      ).toThrow();
    }
  });
});

describe("release workflow security", () => {
  test("release workflows install frozen dependencies and validate before release", async () => {
    for (const mode of ["dev", "stable"]) {
      const workflow = await readFile(
        new URL(`../.github/workflows/${mode}.yml`, import.meta.url),
        "utf8",
      );
      expect(workflow).toContain("persist-credentials: false");
      expect(workflow).toContain("uses: ./.github/workflows/validation.yml");
      expect(workflow).toContain("needs: validate");
      expect(workflow).toContain(`run: bun run release:${mode}`);
      expect(workflow.indexOf("needs: validate")).toBeLessThan(
        workflow.indexOf(`run: bun run release:${mode}`),
      );
      expect(workflow).toContain("id-token: write");
      expect(workflow).not.toContain("NPM_TOKEN");
      expect(workflow).not.toContain("pull_request_target");
      expect(workflow).toContain("github.repository == 'davidbasilefilho/holydot'");
      expect(workflow).toContain("cancel-in-progress: false");
      for (const action of workflow.matchAll(/uses: (\S+)/g)) {
        if (!action[1]?.startsWith("./")) expect(action[1]).toMatch(/@[a-f0-9]{40}$/);
      }
    }
  });

  test("YAML structurally declares exact event filters and validation dependency", async () => {
    const load = async (name: string) =>
      Bun.YAML.parse(
        await readFile(new URL(`../.github/workflows/${name}.yml`, import.meta.url), "utf8"),
      );
    const dev = await load("dev");
    const stable = await load("stable");
    const validation = await load("validation");
    expect(dev).toHaveProperty("on.push.branches", ["**"]);
    expect(dev).toHaveProperty("on.push.tags-ignore", ["v*"]);
    expect(stable).toHaveProperty("on.push.tags", ["v*"]);
    expect(validation).toHaveProperty("on.push");
    expect(validation).toHaveProperty("on.pull_request");
    expect(validation).toHaveProperty("on.workflow_call");
    for (const workflow of [dev, stable]) {
      expect(workflow).toHaveProperty("jobs.release.needs", "validate");
      expect(workflow).toHaveProperty("jobs.validate.permissions.contents", "read");
      expect(workflow).toHaveProperty("jobs.validate.uses", "./.github/workflows/validation.yml");
      expect(workflow).toHaveProperty("jobs.release.permissions.id-token", "write");
    }
  });

  test("validation is read-only and stable excludes development tags", async () => {
    const validation = await readFile(
      new URL("../.github/workflows/validation.yml", import.meta.url),
      "utf8",
    );
    const stable = await readFile(
      new URL("../.github/workflows/stable.yml", import.meta.url),
      "utf8",
    );
    const dev = await readFile(new URL("../.github/workflows/dev.yml", import.meta.url), "utf8");
    expect(validation).toContain("contents: read");
    expect(validation).toContain("run: bun run check");
    expect(validation).toContain("bun install --frozen-lockfile --ignore-scripts");
    expect(validation).not.toContain("contents: write");
    expect(validation).not.toContain("id-token: write");
    expect(stable).toContain("!contains(github.ref_name, '-')");
    expect(stable).toContain("!contains(github.ref_name, '+')");
    expect(dev).toContain('tags-ignore:\n      - "v*"');
  });
});
