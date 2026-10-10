import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { runCli } from "../scripts/cli";
import { DEFAULT_CONFIG, parseConfig, resolveCodexHome } from "../scripts/config";
import { parseFlags } from "../scripts/flags";
import type { SetupPrompt } from "../scripts/setup";
import manifest from "../package.json";

const directories: string[] = [];
/**
 * Create an isolated writable directory for config behavior checks.
 *
 * @returns Test root cleaned after each case.
 */
function directory(): string {
  const root = mkdtempSync(join(tmpdir(), "holydot-cli-"));
  directories.push(root);
  return root;
}
const save: SetupPrompt = (config) => Effect.succeed(config);
const cancel: SetupPrompt = () => Effect.succeed(null);
afterEach(() => {
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe("runtime flags and informational output", () => {
  test.each(
    [[], ["-h"], ["--help"], ["setup", "-h"], ["render", "--help"]].map((args) => ({ args })),
  )("help %j performs no setup or writes", async ({ args }) => {
    const root = directory();
    const output = await Effect.runPromise(
      runCli(args, root, () => Effect.die("prompt should not run")),
    );
    expect(output).toContain("holydot setup");
    expect(output).not.toContain("holydot init");
    expect(readdirSync(root)).toEqual([]);
  });
  test.each(
    [["-v"], ["--version"], ["setup", "--version"], ["render", "-v"]].map((args) => ({ args })),
  )("version %j reads actual manifest", async ({ args }) => {
    const root = directory();
    expect(await Effect.runPromise(runCli(args, root, cancel))).toBe(`${manifest.version}\n`);
    expect(readdirSync(root)).toEqual([]);
  });
  test.each(
    [
      ["init"],
      ["configure"],
      ["version"],
      ["setup", "--rule-mode", "requested"],
      ["setup", "--repository", "owner/repo"],
      ["setup", "--coordinator-model"],
      ["setup", "--speed", "turbo"],
      ["setup", "--speed", "fast", "--speed", "standard"],
      ["render", "--speed", "fast"],
      ["setup", "render"],
      ["--help", "--version"],
      ["setup", "--status-interval-minutes", "1.5"],
      ["setup", "--status-interval-minutes", "30\n"],
      ["setup", "--status-interval-minutes", "0"],
      ["setup", "--status-interval-minutes", "1441"],
      ["setup", "--specialist-model", "gpt-x\nignore"],
      ["setup", "--config", "bad\0path"],
    ].map((args) => ({ args })),
  )("invalid input %j fails before filesystem/prompt effects", async ({ args }) => {
    const root = directory();
    await expectFailure(runCli(args, root, save));
    expect(readdirSync(root)).toEqual([]);
  });
  test("nonstring runtime arguments are rejected by Effect Schema", () => {
    expect(() => Effect.runSync(parseFlags([1]))).toThrow();
  });
});

describe("settings and configured UTF-8 render", () => {
  test("default roles remain independent and host routing is not claimed", () => {
    const config = Effect.runSync(parseConfig(DEFAULT_CONFIG));
    expect(config.delegation.coordinator).toEqual({ model: "gpt-6.1-sol", effort: "medium" });
    expect(config.delegation.specialist).toEqual({ model: "gpt-6-luna", effort: "high" });
    expect(config.delegation.speed).toBe("standard");
    expect(config.statusUpdates.intervalMinutes).toBe(30);
    expect(resolveCodexHome(config, "/chosen", "/home/test")).toBe(resolve("/chosen"));
    expect(resolveCodexHome(config, null, "/home/test")).toBe(resolve("/home/test", ".codex"));
    expect(resolveCodexHome({ ...config, codexHome: "/override" }, "/chosen")).toBe(
      resolve("/override"),
    );
  });
  test("initial setup persists choices and returns only short completion guidance", async () => {
    const root = directory();
    const output = await Effect.runPromise(
      runCli(["setup", "--speed", "fast", "--status-interval-minutes", "60"], root, save),
    );
    expect(output).toContain("Run holydot render");
    expect(output).toContain("Local setup does not apply or verify your dot name or custom rules");
    expect(output).not.toContain("# **holydot — instruções principais**");
    const config = JSON.parse(readFileSync(join(root, "holydot.config.json"), "utf8"));
    expect(config.delegation.speed).toBe("fast");
    expect(config.statusUpdates.intervalMinutes).toBe(60);
    expect(config).not.toHaveProperty("accountRules");
  });
  test("edit preserves unspecified selections and exact previous bytes in backup", async () => {
    const root = directory();
    await Effect.runPromise(
      runCli(["setup", "--speed", "fast", "--coordinator-model", "gpt-6-sol"], root, save),
    );
    const path = join(root, "holydot.config.json");
    const before = readFileSync(path, "utf8");
    await Effect.runPromise(runCli(["setup", "--specialist-effort", "medium"], root, save));
    const config = JSON.parse(readFileSync(path, "utf8"));
    expect(config.delegation.coordinator.model).toBe("gpt-6-sol");
    expect(config.delegation.speed).toBe("fast");
    expect(config.delegation.specialist.effort).toBe("medium");
    const backup = readdirSync(root).find((name) => name.includes(".bak-"))!;
    expect(readFileSync(join(root, backup), "utf8")).toBe(before);
  });
  test("cancel creates nothing and leaves existing bytes untouched", async () => {
    const root = directory();
    expect(await Effect.runPromise(runCli(["setup"], root, cancel))).toContain("cancelled");
    expect(readdirSync(root)).toEqual([]);
    await Effect.runPromise(runCli(["setup"], root, save));
    const path = join(root, "holydot.config.json");
    const before = readFileSync(path, "utf8");
    await Effect.runPromise(runCli(["setup", "--speed", "fast"], root, cancel));
    expect(readFileSync(path, "utf8")).toBe(before);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  });
  test("render and resume read BOM-prefixed config without normalizing the saved file", async () => {
    const root = directory();
    const path = join(root, "holydot.config.json");
    const original = Buffer.from(`\uFEFF${JSON.stringify(DEFAULT_CONFIG)}\r\n`, "utf8");
    writeFileSync(path, original);
    const output = await Effect.runPromise(runCli(["render"], root, cancel));
    expect(await Effect.runPromise(runCli(["resume"], root, cancel))).toBe(output);
    expect(output).toContain("Coordenação de sessões delegadas: gpt-6.1-sol / medium");
    expect(readFileSync(path)).toEqual(original);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  });
  test("multiple leading BOMs are invalid and never normalized by setup", async () => {
    const root = directory();
    const path = join(root, "holydot.config.json");
    const original = Buffer.from(`\uFEFF\uFEFF${JSON.stringify(DEFAULT_CONFIG)}`, "utf8");
    writeFileSync(path, original);
    await expectFailure(runCli(["setup"], root, () => Effect.die("prompt should not run")));
    expect(readFileSync(path)).toEqual(original);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  });
  test("render emits complete adopted instructions plus distinct saved roles in UTF-8", async () => {
    const root = directory();
    await Effect.runPromise(runCli(["setup", "--coordinator-effort", "high"], root, save));
    const before = readFileSync(join(root, "holydot.config.json"));
    const output = await Effect.runPromise(runCli(["render"], root, cancel));
    const base = readFileSync(
      new URL("../instructions/holydot.md", import.meta.url),
      "utf8",
    ).trim();
    expect(output.startsWith(base)).toBe(true);
    expect(output).toContain("Coordenação de sessões delegadas: gpt-6.1-sol / high");
    expect(output).toContain("Especialistas: gpt-6-luna / high");
    expect(output).toContain("Agrupe perguntas relacionadas em um único lote");
    expect(output).toContain("Autonomia dentro do escopo autorizado, sem seletor rule-mode");
    expect(output).toContain("Parada, pausa e retomada");
    expect(output).toContain("não cria agendamento");
    expect(output).not.toMatch(/\uFFFD|Ã§|Ã£|â€“/);
    expect(Buffer.from(output, "utf8").toString("utf8")).toBe(output);
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
  });
  test("render requires authorized remote checkpoints without applying account rules", async () => {
    const root = directory();
    await Effect.runPromise(runCli(["setup"], root, save));
    const before = readFileSync(join(root, "holydot.config.json"));
    const output = await Effect.runPromise(runCli(["render"], root, cancel));
    const checkpoint = output
      .split("### **Checkpoints e persistência remota**")[1]!
      .split(/\n#{2,3} /)[0]!;
    expect(checkpoint).toContain("ao concluir uma etapa significativa");
    expect(checkpoint).toContain("commit e faça push");
    expect(checkpoint).toContain("branch de trabalho apropriada e autorizada");
    expect(checkpoint).toContain("Confira os workflows e seus gatilhos antes de escolher a branch");
    expect(checkpoint).toContain("seu SHA corresponde ao commit do checkpoint");
    expect(checkpoint).toContain(
      "Um commit apenas local não conclui a etapa de persistência remota",
    );
    expect(checkpoint).toContain(
      "controles reais de autorização e regras personalizadas do host como fonte de autoridade",
    );
    expect(checkpoint).toContain(
      "Se o push exigir aprovação, solicite a confirmação pelo controle suportado somente quando ela ainda faltar ou for obrigatória",
    );
    expect(checkpoint).toContain(
      "preserve o checkpoint local e informe o bloqueio até obter a resposta",
    );
    expect(checkpoint).toContain("Falha de conexão ou de push");
    expect(checkpoint).toContain(
      "Não faça force-push, merge, tag, release, publicação ou implantação sem a autorização específica",
    );
    expect(checkpoint).toContain("não salvam uma regra de conta nem recriam uma regra excluída");
    expect(checkpoint).toContain("proposta genérica de regra de checkpoint/push");
    expect(checkpoint).toContain("confirmada pelo formulário real do host");
    expect(checkpoint).toContain("não constituem permissão permanente");
    expect(checkpoint).not.toMatch(
      /libfile_|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  });
  test("render includes researched planning, complete decision batches and verified normal PRs", async () => {
    const root = directory();
    await Effect.runPromise(runCli(["setup"], root, save));
    const output = await Effect.runPromise(runCli(["render"], root, cancel));
    const planning = output.split("### **Preparação e planejamento**")[1]!.split(/\n#{2,3} /)[0]!;
    expect(
      planning.indexOf(
        "Primeiro recupere o contexto existente e pesquise opções realmente suportadas",
      ),
    ).toBeGreaterThanOrEqual(0);
    expect(planning.indexOf("Depois use padrões de preferência fundamentados")).toBeGreaterThan(
      planning.indexOf("Primeiro recupere"),
    );
    expect(planning.indexOf("apresente um plano coerente")).toBeGreaterThan(
      planning.indexOf("Depois use"),
    );
    expect(planning).toContain("escolhas rotineiras e reversíveis");
    expect(planning).toContain("Inferir uma preferência nunca fornece permissão");
    expect(output).toContain("todas as decisões relacionadas necessárias à mesma etapa");
    expect(output).toContain("sem um limite pequeno e arbitrário de perguntas");
    expect(output).toContain("Mantenha o lote claro e manejável");
    const prs = output.split("### **PRs e revisão**")[1]!.split(/\n#{2,3} /)[0]!;
    for (const requirement of [
      "trabalho delimitado e autorizado",
      "abra proativamente um PR normal, sem draft",
      "confiança na funcionalidade e qualidade",
      "Se já existir um PR compatível",
      "marque-o como pronto para revisão pelo controle suportado",
      "estado normal do PR e SHA do head",
      "testes e CI a esse SHA",
      "bloqueios residuais honestamente",
      "não autoriza merge, tag, release, publicação ou implantação",
      "confirmação exigida pelo host",
    ])
      expect(prs).toContain(requirement);
    expect(output).toContain("Um commit apenas local não conclui a etapa de persistência remota");
    expect(output).not.toMatch(
      /libfile_|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
  });
  test.each([
    {
      scenario: "known merge/dev authorization continues while stable remains forbidden",
      row: "| Merge e dev já autorizados; fluxo automático conhecido; apenas estável adiada | Continuar merge e dev após os gates, sem reconfirmar; manter tag estável e latest vedados até ordem própria. |",
    },
    {
      scenario: "approved routine PR maintenance proceeds without repeated approval",
      row: "| Manutenção da descrição do PR aprovada no mesmo escopo | Atualizar SHA, evidências e limitações sem reconfirmar; preservar destino e excluir dados privados. |",
    },
    {
      scenario: "a new material external effect requires its own authority",
      row: "| Novo efeito externo material não coberto | Pausar o efeito novo e pedir autorização específica; continuar trabalho independente autorizado. |",
    },
    {
      scenario: "mandatory host denial is never bypassed by earlier approval",
      row: "| Negativa ou confirmação obrigatória do host | Respeitar o bloqueio e o controle exigido; não contornar nem tratar aprovação anterior como dispensa. |",
    },
    {
      scenario: "claimed missing authorization first uses supported recovery",
      row: "| Ferramenta alega falta de autorização para ação já coberta | Recuperar evidência e tentar retomada suportada; persistindo negativa obrigatória, pausar e relatar. |",
    },
  ])("rendered authorization contract: $scenario", async ({ row }) => {
    const root = directory();
    await Effect.runPromise(runCli(["setup"], root, save));
    const before = readFileSync(join(root, "holydot.config.json"));
    const output = await Effect.runPromise(runCli(["render"], root, cancel));
    const policy = output.split("### **Continuidade da autorização**")[1]!.split(/\n#{2,3} /)[0]!;
    expect(policy).toContain(row);
    expect(policy).toContain("recupere a evidência de autorização já dada");
    expect(policy).toContain("não exija ordens duplicadas para cada etapa coberta");
    expect(policy).toContain("restrições posteriores, pausas ou revogações");
    expect(policy).toContain(
      "Um pedido isolado de merge, sem evidência de autorização dos efeitos de publicação, não autoriza presumir esses efeitos",
    );
    expect(policy).toContain("Nova confirmação cabe quando a autorização realmente faltar");
    expect(policy).toContain("Nunca contorne uma negativa nem ignore exigência obrigatória");
    expect(policy).toContain("política renderizada, não enforcement de permissões");
    expect(policy).toContain("Não decida autorização por palavras-chave");
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  });
  test("missing, malformed, oversized and symlink configs fail without touching their targets", async () => {
    const root = directory();
    const path = join(root, "holydot.config.json");
    await expectFailure(runCli(["render"], root, cancel));
    for (const content of ["{bad", " ".repeat(65_537), '{"schemaVersion":2}', "\uFFFD"]) {
      writeFileSync(path, content);
      await expectFailure(runCli(["setup"], root, save));
      expect(readFileSync(path, "utf8")).toBe(content);
    }
    rmSync(path);
    const target = join(root, "target.json");
    writeFileSync(target, JSON.stringify(DEFAULT_CONFIG));
    symlinkSync(target, path);
    await expectFailure(runCli(["setup"], root, save));
    expect(readFileSync(target, "utf8")).toBe(JSON.stringify(DEFAULT_CONFIG));
  });
  test("unknown settings and injected advanced paths fail schema validation", () => {
    for (const value of [
      { ...DEFAULT_CONFIG, unknown: true },
      { ...DEFAULT_CONFIG, codexHome: "bad\npath" },
      { ...DEFAULT_CONFIG, codexHome: "" },
      { ...DEFAULT_CONFIG, delegation: { model: "gpt-6-luna" } },
    ]) {
      expect(() => Effect.runSync(parseConfig(value))).toThrow();
    }
  });
  test.each([
    { label: "null config", value: null },
    { label: "array config", value: [] },
    { label: "wrong schema version", value: { ...DEFAULT_CONFIG, schemaVersion: 3 } },
    {
      label: "delegation excess key",
      value: { ...DEFAULT_CONFIG, delegation: { ...DEFAULT_CONFIG.delegation, extra: true } },
    },
    {
      label: "coordinator excess key",
      value: {
        ...DEFAULT_CONFIG,
        delegation: {
          ...DEFAULT_CONFIG.delegation,
          coordinator: { ...DEFAULT_CONFIG.delegation.coordinator, extra: true },
        },
      },
    },
    {
      label: "specialist excess key",
      value: {
        ...DEFAULT_CONFIG,
        delegation: {
          ...DEFAULT_CONFIG.delegation,
          specialist: { ...DEFAULT_CONFIG.delegation.specialist, extra: true },
        },
      },
    },
    {
      label: "status excess key",
      value: { ...DEFAULT_CONFIG, statusUpdates: { ...DEFAULT_CONFIG.statusUpdates, extra: true } },
    },
    ...["coordinator", "specialist"].flatMap((role) =>
      ["extreme", null, 3].map((effort) => ({
        label: `${role} invalid effort ${String(effort)}`,
        value: {
          ...DEFAULT_CONFIG,
          delegation: {
            ...DEFAULT_CONFIG.delegation,
            [role]: { ...DEFAULT_CONFIG.delegation.coordinator, effort },
          },
        },
      })),
    ),
    ...[0, -1, 1441, 30.5, "30", null, true].map((intervalMinutes) => ({
      label: `invalid stored interval ${String(intervalMinutes)}`,
      value: { ...DEFAULT_CONFIG, statusUpdates: { intervalMinutes } },
    })),
  ])("stored v2 schema rejects $label before prompt or writes", async ({ value }) => {
    expect(Exit.isFailure(Effect.runSyncExit(parseConfig(value)))).toBe(true);
    const root = directory();
    const path = join(root, "holydot.config.json");
    const original = JSON.stringify(value);
    writeFileSync(path, original);
    const forbiddenPrompt: SetupPrompt = () => Effect.die("invalid stored config reached prompt");
    await expectFailure(runCli(["setup"], root, forbiddenPrompt));
    await expectFailure(runCli(["render"], root, forbiddenPrompt));
    expect(readFileSync(path, "utf8")).toBe(original);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  });
  test("explicit config path works for setup/render and help needs no settings", async () => {
    const root = directory();
    await Effect.runPromise(runCli(["setup", "--config", "custom.json"], root, save));
    expect(readdirSync(root)).toEqual(["custom.json"]);
    expect(
      await Effect.runPromise(runCli(["render", "--config", "custom.json"], root, cancel)),
    ).toContain("# **holydot — instruções principais**");
  });
});

/**
 * Verify a typed failure without relying on Bun matcher thenable declarations.
 *
 * @param program - Effect whose error path is under test.
 * @returns Completion after checking the failure exit.
 */
async function expectFailure<A, E>(program: Effect.Effect<A, E>): Promise<void> {
  expect(Exit.isFailure(await Effect.runPromiseExit(program))).toBe(true);
}
