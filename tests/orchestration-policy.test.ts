import { expect, test } from "bun:test";
import { Effect } from "effect";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../scripts/cli";

// These verify the distributed decision contract, not a host scheduler or model behavior.
test.each([
  [
    "independent projects",
    [
      "Mantenha por projeto um contexto recuperável",
      "não crie duplicata",
      "preserve os demais trabalhos",
    ],
  ],
  [
    "12 minutes warm",
    [
      "menos de 20 minutos desde sua última atividade efetiva observada",
      "há 12 minutos",
      "Reutilizar como warm",
    ],
  ],
  [
    "20/21 minutes cold",
    [
      "há 20 minutos ou 21 minutos",
      "Tratar como candidata cold",
      "sem descartar contexto arbitrariamente",
    ],
  ],
  [
    "busy session",
    ["Enfileirar quando suportado", "nunca sobrescrever silenciosamente trabalho ocupado"],
  ],
  [
    "incompatible session",
    [
      "projeto, repositório, ambiente, papel/contexto, branch/worktree",
      "Frescor não supera incompatibilidade",
      "serializar ou isolar conflitos antes de escrever",
    ],
  ],
  [
    "missing controls",
    [
      "não classificar como warm sem evidência nem alegar sessão retomada",
      "não garante prompt caching, cobrança reduzida ou retenção",
    ],
  ],
  [
    "capability selection",
    [
      "sem hierarquia rígida de ferramentas",
      "Use Codex/HolyCodex para engenharia de software",
      "não crie configuração concorrente nem finja sincronização ausente",
    ],
  ],
  [
    "idempotent recovery",
    [
      "releia estado atual, fonte íntegra e checkpoints",
      "não recrie tarefas nem sobrescreva alterações posteriores com notas antigas",
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
      expect(output).not.toContain("Escolha o primeiro recurso");
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
