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
])(
  "actual setup/render/resume reject modified, truncated, duplicated or old canonical source",
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
  expect(resume).toContain("70b8a168767100bb05a36ba65960b942d0e2b7491e6dece4b4e6a2adc11089ea");
  expect(readFileSync(join(pkg.consumer, "holydot.config.json"))).toEqual(config);
  expect(readdirSync(pkg.consumer)).toEqual(["holydot.config.json"]);
});

test("receiver continuity contract preserves precedence, later corrections and actual capability limits", () => {
  for (const phrase of [
    "instruções superiores e controles obrigatórios",
    "solicitações explícitas atuais do usuário",
    "Uma correção explícita pode substituir uma decisão anterior no mesmo escopo",
    "preferências locais apenas para seus campos configuráveis",
    "esse comando não detecta compactação",
    "Peça confirmação do carregamento real",
    "não confunda uma string de digest repetida com leitura",
    "Antes de entregar, revise internamente",
    "após muitos turnos, resposta longa, status e resultado delegado",
    "Não prometa 100% de compliance de LLM por prompt",
  ])
    expect(canonical.toLowerCase()).toContain(phrase.toLowerCase());
});

// Rendered policy regressions, not simulated GitHub/account permission enforcement.
test.each([
  [
    "remote success",
    "Confira SHA remoto, head/base e estado não draft do PR, testes e checks da versão enviada antes da conclusão",
  ],
  [
    "push failure",
    "registre a tarefa como bloqueada, preserve o trabalho e explique causa/evidência e próximo passo",
  ],
  ["existing PR", "Reutilize o PR apropriado, sem abrir duplicata"],
  [
    "draft is not completion",
    "torne um draft pronto pelo controle suportado quando os gates permitirem, ou mantenha essa etapa bloqueada",
  ],
  [
    "unknown external triggers",
    "não suponha que todo push é seguro nem force release, deploy, merge ou tag não autorizados",
  ],
  [
    "integration ownership",
    "a coordenação verifica a persistência remota e o PR da contribuição integrada antes de declarar conclusão",
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
      "Checkpoint de trabalho autorizado",
      "PR normal e manutenção do mesmo escopo",
      "Resolução de review confirmado",
      "Estas receitas são propostas públicas",
      "não use wildcard de todos os repositórios",
      "Outdated não significa resolvido",
      "30 minutos",
      "estado, mudança, evidência, próxima etapa e verificação pendente",
      "Após mencionar uma conclusão uma vez, retire a tarefa dos seguintes",
      "exact_schedule",
      "condition_watch",
      "Recupere timezone pessoal e canal de entrega da instância atual",
      "Pedido enviado não é tarefa salva",
      "tarefa salva sem readback permanece não verificada",
      "não crie uma tarefa nesta sessão apenas para testar",
    ])
      expect(output).toContain(phrase);
    expect(output.split(literal)).toHaveLength(2);
    expect(output).toContain("formulário exato obrigatório");
  }
});

// Deterministic receiver-contract assertions; these do not simulate host account persistence.
test.each([
  [
    "new installation executes host steps",
    "execute essas etapas com as ferramentas reais do host disponíveis",
  ],
  ["idempotent reexecution", "execute somente o que ainda falta, sem duplicar o que existe"],
  [
    "pending and cancellation preserved",
    "Não reabra formulário pendente nem cancelado por iniciativa própria",
  ],
  [
    "saved requires host confirmation",
    "Somente a confirmação de gravação pelo host permite marcar salva",
  ],
  [
    "verified requires corresponding readback",
    "somente o readback correspondente permite marcar verificada",
  ],
  [
    "partial failure retains verified effects",
    "preserve esses resultados e registre a falha parcial",
  ],
  ["missing definitions stay explicit", "bloqueada por definição incompleta"],
  [
    "task verification and no blind interval fallback",
    "Não invente campos ausentes nem converta automaticamente 30 minutos",
  ],
])("host-installation contract (not live host evaluation): %s", (_, phrase) => {
  expect(canonical).toContain(phrase);
});
