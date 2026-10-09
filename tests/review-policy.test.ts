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
      "Review pending ou ausência de review continua pendente",
      "Inatividade ou nenhum comentário novo não é conclusão",
    ],
  ],
  [
    "bot disabled/skipped",
    [
      "bot desativado, skipped ou limitado por quota é bloqueio externo explícito",
      "Status success com mensagem review skipped também não é revisão aprovada",
    ],
  ],
  [
    "CI auth/config blocked",
    [
      "continue acompanhando e tratando os bots independentes",
      "usando logs/resultados observados, sem presumir a causa",
      "Não altere credenciais, conta ou configuração de bot",
    ],
  ],
  [
    "late comments after push",
    [
      "Após cada push, reinicie a verificação no novo head",
      "inclusive comentários que chegaram depois do push",
      "Não use aprovação ou checks antigos como aceite automático",
    ],
  ],
  [
    "resolved only after verification",
    [
      "Resolva uma thread somente após correção ou resposta sustentada e verificada",
      "Releia para confirmar resolução",
      "outdated, arquivo removido ou status verde não bastam",
    ],
  ],
  [
    "green CI is insufficient",
    [
      "CI verde isolada não encerra revisão",
      "não declare o PR totalmente aprovado com revisão pendente",
    ],
  ],
  [
    "bounded observation",
    [
      "até review terminal verificado ou limite externo explícito",
      "Evite polling infinito",
      "não habilite bot, contrate plano, crie automação",
    ],
  ],
  [
    "integration and merge authority",
    [
      "A coordenação revisa a evidência de CI e bots do head integrado",
      "merge exige autorização vigente e todos os critérios aplicáveis",
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
      expect(output).toContain("comentários de conversa e inline, reviews e review threads");
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
  expect(prompt).toContain("70b8a168767100bb05a36ba65960b942d0e2b7491e6dece4b4e6a2adc11089ea");
});
