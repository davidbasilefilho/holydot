import { expect, test } from "bun:test";
import { Effect } from "effect";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../scripts/cli";

const literal = readFileSync(
  new URL("./fixtures/approved-communication.md", import.meta.url),
  "utf8",
);

// Callplan delivery regressions: no tool mocks and no claim of host/account execution.
test("actual setup/render/resume delivers active receiver bootstrap first, without a disconnected runtime", async () => {
  const root = mkdtempSync(join(tmpdir(), "holydot-bootstrap-"));
  try {
    const setup = await Effect.runPromise(
      runCli(["setup", "--status-interval-minutes", "45"], root, (config) =>
        Effect.succeed(config),
      ),
    );
    expect(setup).toContain(
      "receiver bootstrap initiates native profile, custom-rule form and scheduling controls",
    );
    expect(setup).not.toContain(literal);
    const before = readFileSync(join(root, "holydot.config.json"));
    const render = await Effect.runPromise(
      runCli(["render"], root, () => Effect.die("prompt forbidden")),
    );
    const resume = await Effect.runPromise(
      runCli(["resume"], root, () => Effect.die("prompt forbidden")),
    );
    expect(resume).toBe(render);
    expect(render.indexOf("### **Bootstrap ativo no dot receptor**")).toBeLessThan(
      render.indexOf("## **I. Autonomia**"),
    );
    expect(render).toContain("no primeiro turno após ler o render completo");
    expect(render).toContain("Panorama: 45 minutos");
    expect(render.split(literal)).toHaveLength(2);
    expect(render).not.toContain("adoptInHost");
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(manifest.exports).toBeUndefined();
    const build = readFileSync(new URL("../scripts/adapters/build.ts", import.meta.url), "utf8");
    expect(build).toContain('entrypoints: ["./scripts/cli.ts"]');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.each([
  [
    "first turn",
    [
      "nem termine apenas apresentando receitas",
      "Ler esta fonte para desenvolvimento, revisão ou teste do pacote não autoriza alterar essa conta",
    ],
  ],
  [
    "resume or changed approved instructions",
    [
      "Recarregar a fonte atual por resume/recurso real do host",
      "preserve autoridade vigente, correções atuais, versão/digest",
      "durante toda a thread",
    ],
  ],
  [
    "pending form",
    ["manter pendente até resposta", "sem duplicar existentes ou reabrir formulário pendente"],
  ],
  [
    "user denial or removal",
    [
      "Cancelamento/negativa não autoriza a ação",
      "Uma regra antes verificada que desapareceu permanece removida",
    ],
  ],
  [
    "existing rule or schedule",
    [
      "Comparar conteúdo, destino, escopo e estado, não só nomes",
      "Compare a tarefa salva equivalente antes de criar outra",
      "atualiza o identificador existente quando suportado",
    ],
  ],
  [
    "unavailable tools",
    [
      "Ferramenta ausente, formulário pendente ou negativa bloqueia somente sua etapa",
      "mantendo execução independente autorizada",
    ],
  ],
  [
    "current host schemas",
    [
      "leia seus schemas atuais",
      "campos obrigatórios, enumerações, limites, identificadores e resultados",
      "não um nome fixo de ferramenta",
      "Não invente duração ou destino ausentes",
    ],
  ],
  [
    "real scheduling intent",
    [
      "exact_schedule",
      "não converta isso em `condition_watch`",
      "nem altere o objetivo para caber no serviço",
      "schedule preserva a recorrência e timezone",
    ],
  ],
])("callplan in actual full render/resume (not native-tool acceptance): %s", async (_, phrases) => {
  const root = mkdtempSync(join(tmpdir(), "holydot-callplan-"));
  try {
    await Effect.runPromise(runCli(["setup"], root, (config) => Effect.succeed(config)));
    for (const command of ["render", "resume"]) {
      const output = await Effect.runPromise(
        runCli([command], root, () => Effect.die("prompt forbidden")),
      );
      for (const phrase of phrases) expect(output.toLowerCase()).toContain(phrase.toLowerCase());
      expect(output).toContain("testes de texto/callplan não são adoção na conta");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
