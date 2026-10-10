import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { runCli } from "../scripts/cli";

const source = readFileSync(new URL("../instructions/holydot.md", import.meta.url), "utf8");
const literal = readFileSync(new URL("./fixtures/approved-communication.md", import.meta.url));
const identity = JSON.parse(
  readFileSync(new URL("../instructions/integrity.json", import.meta.url), "utf8"),
);

// Reviewed language/content boundaries, not a claim that ASCII proves English or model behavior.
const englishHeadings = [
  "holydot — main instructions",
  "Active bootstrap in the receiving dot",
  "I. Autonomy",
  "Autonomy and responsibility",
  "Authorization continuity",
  "Identity and adoption",
  "Custom rules in the host",
  "User questions and decisions",
  "Stopping, pausing, and resuming",
  "External effects and privilege elevation",
  "Status updates",
  "II. Efficiency",
  "Preparation and planning",
  "Execution and environment selection",
  "Pre-delegation checklist",
  "Coordinating multiple projects",
  "Discovering and reusing warm sessions",
  "Delegation and specialists",
  "Context and execution efficiency",
  "Writing instructions for executors",
  "III. Quality and mergeability",
  "Fidelity, context, and continuity",
  "Quality and mergeability",
  "Research and evidence",
  "Visualization and visual validation",
  "Checkpoints and remote persistence",
  "PRs and review",
  "Tracking CI and review bots",
  "Acceptance and completion",
  "Defaults for this configuration",
  "Installing rules and a task in the host",
  "Loading, resumption, and operational compliance",
  "Repository delivery and alternative review",
  "Release branches and stacks",
  "Adopted instructions — complete text",
];

test("the reviewed canonical sections use English and retain verified source provenance", () => {
  const headings = source
    .split("\n")
    .filter((line) => /^#{1,3} \*\*/.test(line))
    .map((line) => line.replace(/^#{1,3} \*\*|\*\*$/g, ""));
  expect(headings).toEqual(englishHeadings);
  expect(identity.revision).toBe("2026-10-10.6");
  expect(createHash("sha256").update(source).digest("hex")).toBe(identity.canonicalSHA256);
  expect(createHash("sha256").update(literal).digest("hex")).toBe(identity.adoptedSHA256);
  expect(source.split("### **Adopted instructions — complete text**\n\n")[1]).toBe(
    literal.toString("utf8") + "\n",
  );
  expect(source).toContain("adapts public HolyCodex contracts");
  expect(source).toContain("preserve the attribution and Apache-2.0 license");
  expect(source).toContain("If the user explicitly chose an environment");
  expect(source).toContain(
    "An explicit correction can replace an earlier decision within the same scope",
  );
});

test("recipient context and generic branch examples do not carry another owner's authority", () => {
  for (const phrase of [
    "the receiving dot's current owner and that owner's projects",
    "Do not carry over another person's account data, project choices, approvals, or standing permissions",
    "First-person references in the adopted instructions refer to the current owner",
    "Repository and branch: the context of each task, not a requirement for general installation",
    "Follow the codebase's established branch conventions",
    "Use `release/v<version>/<meaningful-slice>` only as a fallback when no applicable repository convention exists",
    "do not force a valid repository-specific branch to be renamed",
    "Preserve mergeability, existing PR bases, and applicable CI, review, and release controls",
    "If the fallback is applicable and the planned stack would cause this prefix collision",
  ])
    expect(source).toContain(phrase);
  expect(source).toContain("`release/v1.2.0` and `release/v1.2.0-1` are distinct version prefixes");
  expect(source).not.toMatch(/(?:In|No) HolyCodex,|davidbasilefilho|release\/v0\.17\.0/);
  expect(source).not.toContain("Use `release/v<version>/<change>` as the branch pattern");
});

test("preferred-source list is removed while general research and response-language conditions survive", () => {
  for (const text of [source, literal.toString("utf8")]) {
    expect(text).not.toContain("# preferred research sources");
    expect(text).not.toContain("these are preferences, not a whitelist");
    expect(text).not.toMatch(/\*\*(?:international|Brazil|US\/Canada|UK\/EU|technology\/AI):\*\*/);
    expect(text).toContain("prefer original sources for factual records");
    expect(text).toContain(
      "cross-check independent primary, local, specialist, and secondary reporting",
    );
    expect(text).toContain("reply in my latest language unless requested otherwise");
    expect(text).toContain(
      "rather than treating every conditional preference as mandatory in every situation",
    );
  }
});

test.each([
  { name: "defaults", flags: [], speed: "Standard", interval: 30, home: null },
  {
    name: "explicit preferences",
    flags: [
      "--speed",
      "fast",
      "--status-interval-minutes",
      "45",
      "--codex-home",
      "/tmp/owner-codex",
    ],
    speed: "Fast (explicit opt-in)",
    interval: 45,
    home: "/tmp/owner-codex",
  },
])(
  "actual render/resume stays English across $name without translating technical values",
  async ({ flags, speed, interval, home }) => {
    const root = mkdtempSync(join(tmpdir(), "holydot-language-"));
    try {
      await Effect.runPromise(
        runCli(["setup", ...flags], root, (config) => Effect.succeed(config)),
      );
      const before = readFileSync(join(root, "holydot.config.json"));
      const render = await Effect.runPromise(
        runCli(["render"], root, () => Effect.die("no prompt")),
      );
      const resume = await Effect.runPromise(
        runCli(["resume"], root, () => Effect.die("no prompt")),
      );
      expect(resume).toBe(render);
      expect(render.startsWith(source.trim())).toBe(true);
      const suffix = render.slice(source.trim().length);
      expect(suffix).toContain("## **Explicit preferences for this configuration**");
      expect(suffix).toContain("These are local preferences, without granting access or approval");
      expect(suffix).toContain("Delegated session coordination: gpt-6.1-sol / medium");
      expect(suffix).toContain("Specialists: gpt-6-luna / high");
      expect(suffix).toContain(`Speed: ${speed}`);
      expect(suffix).toContain(`Overview: ${interval} minutes; does not create a schedule`);
      expect(suffix).toContain(
        `CODEX_HOME: ${home === null ? "respect the explicit environment value or default ~/.codex" : JSON.stringify(home)}`,
      );
      expect(suffix).toContain("Apply choices only through real controls and when supported");
      expect(suffix).toContain(`Verified package identity: holydot `);
      expect(suffix).toContain(
        `instructions ${identity.revision}; SHA-256 ${identity.canonicalSHA256}; adopted SHA-256 ${identity.adoptedSHA256}`,
      );
      expect(suffix).not.toMatch(
        /Preferências|Coordenação|Especialistas|Velocidade|minutos|Identidade verificada/,
      );
      expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);
