import { expect, test } from "bun:test";
import { Effect } from "effect";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../scripts/cli";

// Distributed-policy regressions, not fake provider approvals or model evaluations.
test.each([
  [
    "bot pending",
    [
      "Review pending or the absence of a review remains pending",
      "Inactivity or no new comments is not completion",
    ],
  ],
  [
    "bot disabled/skipped",
    [
      "a disabled, skipped, or quota-limited bot is an explicit external blocker",
      "A success status with a review skipped message is not an approved review either",
    ],
  ],
  [
    "CI auth/config blocked",
    [
      "continue tracking and addressing independent bots",
      "using observed logs/results, without assuming the cause",
      "Do not change credentials, accounts, or bot configuration",
    ],
  ],
  [
    "late comments after push",
    [
      "After every push, restart verification on the new head",
      "including comments that arrived after the push",
      "Do not use old approvals or checks as automatic acceptance",
    ],
  ],
  [
    "resolved only after verification",
    [
      "Resolve a thread only after a supported, verified correction or response",
      "Reread to confirm resolution",
      "outdated status, a removed file, or green status is not sufficient",
    ],
  ],
  [
    "green CI is insufficient",
    [
      "green CI alone does not close review",
      "do not declare the PR fully approved with review pending",
    ],
  ],
  [
    "bounded observation",
    [
      "until a verified terminal review state or an explicit external limit",
      "Avoid infinite polling",
      "do not enable a bot, purchase a plan, create an automation",
    ],
  ],
  [
    "integration and merge authority",
    [
      "coordination reviews CI and bot evidence for the integrated head",
      "merge requires current authorization and all applicable criteria",
    ],
  ],
])("CI/review policy in full render/resume (not provider acceptance): %s", async (_, phrases) => {
  const root = mkdtempSync(join(tmpdir(), "holydot-review-policy-"));
  try {
    await Effect.runPromise(runCli(["setup"], root, (config) => Effect.succeed(config)));
    const before = readFileSync(join(root, "holydot.config.json"));
    for (const command of ["render", "resume"]) {
      const output = await Effect.runPromise(
        runCli([command], root, () => Effect.die("prompt forbidden")),
      );
      for (const phrase of phrases) expect(output.toLowerCase()).toContain(phrase.toLowerCase());
      expect(output).toContain("checks/statuses");
      expect(output).toContain("conversation and inline comments, reviews, and review threads");
    }
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("public release/provenance docs exclude owner account runbook and private executor history", () => {
  const release = readFileSync(new URL("../docs/releases.md", import.meta.url), "utf8");
  const prompt = readFileSync(new URL("../docs/prompt-design.md", import.meta.url), "utf8");
  for (const phrase of [
    "davidbasilefilho / holydot",
    "Criar/configurar previamente",
    "Não deixe um publisher paralelo",
    "Selected branches and tags",
  ])
    expect(release).not.toContain(phrase);
  for (const phrase of [
    "materialização original verificada pela coordenação",
    "duas tentativas de transferência",
    "neste executor",
  ])
    expect(prompt).not.toContain(phrase);
  expect(prompt).toContain("tests/communication.test.ts");
  expect(prompt).toContain("instructions/integrity.json");
});
