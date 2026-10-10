import { expect, test } from "bun:test";
import { Effect } from "effect";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../scripts/cli";

// Policy distribution tests: no fake push/approval, receiver-model or UI execution claims.
test.each([
  [
    "maintainer fit",
    [
      "AGENTS.md, CONTRIBUTING.md, CODEOWNERS",
      "accepted PRs and recurring feedback",
      "smallest cohesive diff that is sufficient",
      "speculative complexity",
    ],
  ],
  [
    "independent quality",
    [
      "independently of the executor's claims",
      "Functional",
      "Visual, when there is an interface",
      "Architectural",
      "Product",
      "including when all automated tests pass",
    ],
  ],
  [
    "real interface",
    [
      "composition, typography, spacing, responsiveness, accessibility",
      "alongside functional validation",
      "A build, mockup, or synthetic image does not replace this gate",
    ],
  ],
  [
    "proportional review",
    [
      "when there is real benefit",
      "subjective suggestions remain optional",
      "Do not require visual inspection for projects without an interface",
      "an extensive test suite for trivial changes",
    ],
  ],
  [
    "push scope positive",
    [
      "A confirmed push satisfies push-only scope even with review pending",
      "separate follow-up with an owner, state, and next step",
      "Do not declare the PR approved on that basis",
    ],
  ],
  [
    "push scope negative",
    [
      "without diverging into investigation of deployment, Cloudflare",
      "an unauthorized automatic effect may block that branch",
      "Do not broaden authorization or bypass denials",
    ],
  ],
  [
    "complete implementation",
    [
      "Complete implementation delivery remains subject",
      "reviewable contribution",
      "green CI alone does not close review",
      "including comments that arrived after the push",
    ],
  ],
])("render/resume preserves quality and scoped completion: %s", async (_, phrases) => {
  const root = mkdtempSync(join(tmpdir(), "holydot-quality-"));
  try {
    await Effect.runPromise(runCli(["setup"], root, (config) => Effect.succeed(config)));
    for (const command of ["render", "resume"]) {
      const output = await Effect.runPromise(
        runCli([command], root, () => Effect.die("prompt forbidden")),
      );
      for (const phrase of phrases) expect(output).toContain(phrase);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.each([
  "templates/result.md",
  "instructions/specialist.md",
  "docs/usage.md",
  "docs/account-rules.md",
])("%s distinguishes push scope from PR review", (file) => {
  const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  expect(text).toContain("limitad");
  expect(text).toContain("SHA remoto");
  expect(text).toContain("acompanhamento separado");
  expect(text.toLowerCase()).toContain("implementação");
});
