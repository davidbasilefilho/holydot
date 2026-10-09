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
      "PRs aceitos e feedback recorrente",
      "menor diff coeso suficiente",
      "complexidade especulativa",
    ],
  ],
  [
    "independent quality",
    [
      "independentemente das afirmações do executor",
      "Funcional",
      "Visual, quando houver interface",
      "Arquitetural",
      "Produto",
      "inclusive quando todos os testes automatizados passam",
    ],
  ],
  [
    "real interface",
    [
      "composição, tipografia, espaçamento, responsividade, acessibilidade",
      "junto à validação funcional",
      "Build, mockup e imagem sintética não substituem esse gate",
    ],
  ],
  [
    "proportional review",
    [
      "quando houver benefício real",
      "sugestões subjetivas permanecem opcionais",
      "Não exija inspeção visual para projetos sem interface",
      "bateria extensa para alterações triviais",
    ],
  ],
  [
    "push scope positive",
    [
      "Push confirmado atende ao escopo push-only mesmo com revisão pendente",
      "acompanhamento separado com responsável, estado e próximo passo",
      "Não declare o PR aprovado por isso",
    ],
  ],
  [
    "push scope negative",
    [
      "sem desviar para investigação de deploy, Cloudflare",
      "um efeito automático não autorizado pode bloquear aquela branch",
      "Não amplie autorização nem contorne negativas",
    ],
  ],
  [
    "complete implementation",
    [
      "entrega completa de implementação continua sujeita",
      "contribuição revisável",
      "CI verde isolada não encerra revisão",
      "inclusive comentários que chegaram depois do push",
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
