import { expect, test } from "bun:test";
import { Effect } from "effect";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../scripts/cli";

// These verify the distributed decision contract, not a host scheduler or model behavior.
test.each([
  [
    "release naming preserves suffixes and avoids prefix collisions",
    [
      "release/v<version>/<meaningful-slice>",
      "A stack contains multiple PRs",
      "release/v1.2.0-1",
      "release/v1.2.0/release-routing",
      "The order comes from actual dependencies between PRs",
      "Do not perform this migration in advance",
      "Do not create stacks for trivial changes",
      "do not claim that GitHub recorded a native stack without verification",
    ],
  ],
  [
    "independent projects",
    [
      "Maintain recoverable context for each project",
      "do not create a duplicate",
      "preserve other work",
    ],
  ],
  [
    "12 minutes warm",
    [
      "less than 20 minutes have elapsed since its last observed actual activity",
      "12 minutes ago",
      "Reuse as warm",
    ],
  ],
  [
    "20/21 minutes cold",
    ["20 or 21 minutes ago", "Treat as a cold candidate", "without arbitrarily discarding context"],
  ],
  ["busy session", ["Queue when supported", "never silently overwrite ongoing work"]],
  [
    "incompatible session",
    [
      "project, repository, environment, role/context, branch/worktree",
      "Freshness does not override incompatibility",
      "serialize or isolate conflicts before writing",
    ],
  ],
  [
    "missing controls",
    [
      "do not classify as warm without evidence or claim the session was resumed",
      "does not guarantee prompt caching, reduced charges, or provider retention",
    ],
  ],
  [
    "capability selection",
    [
      "native dot subagents > Codex Cloud > Codex on the user's machines",
      "including software engineering, implementation, testing, and review",
      "the previous one has a demonstrated insufficiency or the user explicitly chooses another environment",
      "do not create a competing configuration or pretend that unavailable synchronization exists",
    ],
  ],
  [
    "idempotent recovery",
    [
      "reread the current state, complete source, and checkpoints",
      "do not recreate tasks or overwrite later changes with old notes",
    ],
  ],
])("full render/resume preserves orchestration decision: %s", async (_, phrases) => {
  const root = mkdtempSync(join(tmpdir(), "holydot-orchestration-"));
  try {
    await Effect.runPromise(runCli(["setup"], root, (config) => Effect.succeed(config)));
    const before = readFileSync(join(root, "holydot.config.json"));
    for (const command of ["render", "resume"]) {
      const output = await Effect.runPromise(
        runCli([command], root, () => Effect.die("prompt forbidden")),
      );
      for (const phrase of phrases) expect(output).toContain(phrase);
      expect(output).not.toContain("without a strict tool hierarchy");
      expect(output).not.toContain("Use Codex/HolyCodex for software engineering");
    }
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.each(["task", "result"])(
  "%s contract references accessible canonical policy without duplicating it",
  (name) => {
    const text = readFileSync(new URL(`../templates/${name}.md`, import.meta.url), "utf8");
    expect(text).toContain("[instructions/holydot.md](../instructions/holydot.md)");
    expect(text).toContain("uma referência inacessível não substitui a leitura");
    expect(text).toContain("última atividade efetiva observada");
    expect(text).not.toContain("## **Continuidade da autorização**");
    expect(text).not.toContain("Merge e dev já autorizados no fluxo conhecido");
  },
);

test("public routing guides and busy-task acceptance match canonical selection", () => {
  const guide = readFileSync(new URL("../docs/adaptation.md", import.meta.url), "utf8");
  expect(guide).toContain("subagentes nativos do dot > Codex Cloud > Codex em máquinas do usuário");
  expect(guide).toContain("insuficiência comprovada do anterior ou escolha explícita do usuário");
  expect(guide).not.toContain("sem hierarquia rígida");
  const acceptance = readFileSync(
    new URL("../docs/operational-acceptance.md", import.meta.url),
    "utf8",
  );
  expect(acceptance).toContain("relacionado/equivalente");
  expect(acceptance).toContain("continue a atribuição existente");
  expect(acceptance).toContain("se independente, enfileire");
});

// Delivery regressions for the policy, not a scheduler or provider billing/intent evaluation.
test.each([
  [
    "native engineering before warm cloud",
    [
      "The dot and its native subagents may use connected apps",
      "dot's cloud computer and a Codex Cloud session are different resources",
      "do not by themselves justify opening Codex Cloud",
      "do not use a tool's absence from the coordinator as proof that it is absent from the executor",
      "a warm session at a lower-priority level does not take precedence over a sufficient native subagent",
    ],
  ],
  [
    "verified tier escalation and cost limits",
    [
      "record the capability, tool, file, runtime, or environment that is actually required",
      "Reuse and caching are optimizations within the appropriate level",
      "without making unverified claims about free native subagents, quotas, reduced charges, or savings",
      "The user's machines are the last level",
      "there is no absolute prohibition on these resources",
    ],
  ],
  [
    "routing checklist rejects unnecessary Codex delegation",
    [
      "### **Pre-delegation checklist**",
      "If the user explicitly chose an environment, assess it first",
      "Without an explicit choice of another environment, check whether native subagents",
      "required research, browsing, implementation, testing, and review",
      "If they can, assign the work at the native level and finish environment selection",
      "Only if the native level is insufficient",
      "Only if the cloud levels are insufficient",
      "are not evidence of insufficiency",
      "do not invent its absence to escalate",
    ],
  ],
  [
    "routine setup reuses bounded authority",
    [
      "A request to configure a CLI or development environment authorizes the routine steps necessary for that objective and destination",
      "Do not ask for approval of each command, safe attempt, or reversible detail already covered",
      "Equivalent alternatives at the same destination/within the same scope and permitted retries retain that authority",
      "a retrievable authorization record",
      "it references evidence and does not create permission",
      "Do not export that private record in the package",
    ],
  ],
  [
    "configuration never waives credential and security gates",
    [
      "creating or expanding persistent access, granting credentials/OAuth, changing security, or transmitting secrets",
      "ask only for the specific confirmation required by the host",
      "Broad configuration approval does not replace per-action confirmation or handoff when required",
      "Configuration requires a new OAuth grant, persistent credential, or security change",
      "Alternative changes the destination, transmitted data, or material commitment",
    ],
  ],
  [
    "explicit owner stop",
    [
      "Treat a stop instruction as an immediate priority",
      "Stop new actions and assignments within the requested scope",
      "keep other work paused",
    ],
  ],
  [
    "tool cancellation is not owner intent or permission",
    [
      "`user cancelled`",
      "automatic cancellation of approval review",
      "does not prove a user cancellation instruction",
      "Check the event's origin",
      "The absence of a stop instruction also does not grant missing approval",
    ],
  ],
  [
    "confirmed outcome before bounded retry",
    [
      "Inspect the available result, identifier, artifacts, and remote state",
      "If the effect already occurred, confirm it and continue from there",
      "If a write's result is uncertain, do not retry blindly",
      "verified technical interruption with no effect permits at most one retry of the same action and destination",
      "only when authorization remains valid and host policy allows it",
      "without a retry loop",
    ],
  ],
  [
    "publication recovery stays owned after a transient failure",
    [
      "The immediate-retry limit does not end recovery",
      "an alternative must never bypass a mandatory control",
      "A transient failure does not make publication an optional task",
      "Keep the contribution pending with an owner",
      "An external backup protects against loss but remains recovery, not a confirmed push",
      "preserve the user's explicit pauses",
    ],
  ],
  [
    "native review fallback preserves independence and merge gates",
    [
      "native review independent of implementation",
      "covering general quality and security",
      "do not treat an arbitrary number of rounds as approval",
      "another person/agent must verify that delta",
      "do not present them as two independent reviewers",
      "The fallback does not approve an external review or bypass mandatory platform checks",
      "An explicit instruction not to merge remains valid",
    ],
  ],
  [
    "repository delivery never becomes an unsolicited archive",
    [
      "Do not deliver a ZIP, snapshot, or repository bundle as a substitute",
      "Use the authorized repository and workflows",
      "a recovery file can preserve the work but does not replace that delivery",
    ],
  ],
  [
    "safety floor and independent work",
    [
      "An actual access or approval denial, security block",
      "pending/canceled mandatory form",
      "Do not switch tools, accounts, or environments to bypass the blocker",
      "or use this recovery to recreate canceled rules",
      "Continue independent authorized work",
      "do not ask for redundant confirmation because of a transient message",
      "always respect the host's safety floor",
    ],
  ],
])("render/resume preserves execution priority and safe recovery: %s", async (_, phrases) => {
  const root = mkdtempSync(join(tmpdir(), "holydot-priority-"));
  try {
    await Effect.runPromise(runCli(["setup"], root, (config) => Effect.succeed(config)));
    const before = readFileSync(join(root, "holydot.config.json"));
    const literal = readFileSync(new URL("./fixtures/approved-communication.md", import.meta.url));
    for (const command of ["render", "resume"]) {
      const output = await Effect.runPromise(
        runCli([command], root, () => Effect.die("prompt forbidden")),
      );
      for (const phrase of phrases) expect(output).toContain(phrase);
      const bytes = Buffer.from(output);
      const offset = bytes.indexOf(literal);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(bytes.subarray(offset, offset + literal.length)).toEqual(literal);
      expect(bytes.indexOf(literal, offset + literal.length)).toBe(-1);
    }
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.each(["docs/adaptation.md", "docs/usage.md"])(
  "%s keeps strict fallback priority and cache within the chosen tier",
  (file) => {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    expect(text).toContain(
      "subagentes nativos do dot > Codex Cloud > Codex em máquinas do usuário",
    );
    expect(text).toContain("insuficiência comprovada do anterior ou escolha explícita do usuário");
    expect(text).toContain("Reuso/cache fica dentro do nível adequado e não inverte essa ordem");
    expect(text).not.toMatch(/sem (?:hierarquia|ordem) rígida/);
  },
);

test("acceptance scenarios reject unintended escalation and unsafe cancellation recovery", () => {
  const text = readFileSync(new URL("../docs/operational-acceptance.md", import.meta.url), "utf8");
  for (const phrase of [
    "permanecer no nível nativo",
    "registrar a insuficiência comprovada e usar Codex Cloud",
    "Escolha explícita do usuário",
    "Ordem explícita de parada do usuário",
    "no máximo uma repetição autorizada e permitida da mesma ação",
    "repetir escrita incerta",
    "formulário obrigatório cancelado/pendente ou bloqueio de segurança",
    "silêncio e tempo decorrido não são aprovação",
    "Não simulam um escalonador",
  ])
    expect(text).toContain(phrase);
});

test("nested HolyCodex is conditional and never justifies native-tier escalation", () => {
  const source = readFileSync(new URL("../instructions/holydot.md", import.meta.url), "utf8");
  expect(source).toContain("The ability to install it does not justify escalation");
  const guide = readFileSync(new URL("../docs/adaptation.md", import.meta.url), "utf8");
  for (const phrase of [
    "opção condicional",
    "não é motivo para escalar quando os recursos nativos do dot bastam",
    "Linux x64 com glibc",
    "Node >=18, dependências opcionais e scripts de instalação",
    "não comprova pacote publicado",
    "não suporta device-code login",
    "não adota silenciosamente as credenciais do Codex oficial",
    "execução em Codex Cloud como não verificada",
    "instalação não substitui o orquestrador gerenciado",
    "Alegações de economia ou desempenho exigem medição",
  ])
    expect(guide).toContain(phrase);
});

test("release policy does not prescribe integration branches", () => {
  for (const file of [
    "instructions/holydot.md",
    "instructions/specialist.md",
    "templates/task.md",
    "templates/result.md",
    "docs/operational-acceptance.md",
  ]) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    expect(text).not.toContain("/integration");
    expect(text).toContain("release/v");
  }
});
