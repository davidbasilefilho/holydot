import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { REQUIRED_FILES, SOURCE_REVISION, validatePackage } from "../scripts/validate";

const directories: string[] = [];

/**
 * Build a complete synthetic package fixture without dependencies or network access.
 *
 * @returns The temporary package root, removed after each test.
 */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "holydot-test-"));
  directories.push(root);
  for (const file of REQUIRED_FILES) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), "Synthetic test fixture\n");
  }
  writeFileSync(join(root, "LICENSE"), "Apache License\nEND OF TERMS AND CONDITIONS\n");
  return root;
}

afterEach(() => {
  for (const root of directories.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("offline package validation", () => {
  test("maintainer API-equivalent cost estimate stays conditional, separate from agent budgets", () => {
    const usage = readFileSync(new URL("../docs/usage.md", import.meta.url), "utf8");
    expect(usage).toContain("Modelo de estimativa para manutenção");
    expect(usage).toContain("custo ponderado API-equivalente");
    expect(usage).toContain("não é a fórmula confirmada do Pro");
    expect(usage).toContain("não fixe multiplicadores nesta instrução");
  });

  test("task contract contains the information needed for a Root handoff", () => {
    const template = readFileSync(new URL("../templates/task.md", import.meta.url), "utf8");
    for (const field of [
      "Objetivo e resultado pretendido, em termos claros",
      "Escopo aceito e entregáveis",
      "Fora do escopo e exclusões",
      "Abordagem viável",
      "Fontes consultadas e evidências disponíveis",
      "Decisões materiais resolvidas antes do handoff",
      "Dependências, acessos e permissões necessários",
      "Riscos e impactos relevantes",
      "Critérios de aceitação, testes e verificações",
      "Efeitos externos já autorizados",
    ]) {
      expect(template).toContain(field);
    }
  });

  test("quickstart uses bunx without requiring a project dependency and qualifies release tags", () => {
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    const setup = readFileSync(new URL("../docs/setup.md", import.meta.url), "utf8");
    expect(readme).toContain("bunx holydot@latest setup");
    expect(readme).toContain("Depois da primeira versão estável publicada no npm");
    expect(readme).toContain("sem `bun add`, instalação global ou dependência no seu projeto");
    expect(setup).toContain("bunx holydot@X.Y.Z setup");
    expect(setup).toContain(
      "use `bunx holydot@dev setup` somente quando a tag `dev` estiver publicada",
    );
    expect(setup).toContain("sem instalação global, dependência no projeto");
    expect(setup).toContain("cria `holydot.config.json` atomicamente");
    expect(setup).toContain(
      "Se o diretório não for gravável ou o sistema de arquivos não oferecer suporte a hard links",
    );
    expect(setup).toContain("não tenta uma gravação não atômica como alternativa");
    expect(setup).not.toContain("bun add --dev holydot@");
  });

  test("public elevation guidance reuses informed approval for the same action and device", () => {
    const instructions = readFileSync(
      new URL("../instructions/holydot.md", import.meta.url),
      "utf8",
    );
    const rules = readFileSync(new URL("../docs/account-rules.md", import.meta.url), "utf8");
    const acceptance = readFileSync(new URL("../examples/acceptance.md", import.meta.url), "utf8");
    expect(instructions).toContain("Se existir, não peça a mesma aprovação outra vez");
    expect(rules).toContain("Se sim, não pergunte de novo");
    expect(acceptance).toContain("prosseguir sem pedir a mesma confirmação de novo");
    for (const content of [instructions, rules, acceptance]) {
      expect(content).toContain("ação, dispositivo");
      expect(content).toContain("senha no chat");
      expect(content).toContain("cloud do dot");
    }
  });

  test("project status cadence is configurable and host scheduling is not claimed by the CLI", () => {
    const instructions = readFileSync(
      new URL("../instructions/holydot.md", import.meta.url),
      "utf8",
    );
    const usage = readFileSync(new URL("../docs/usage.md", import.meta.url), "utf8");
    const setup = readFileSync(new URL("../docs/setup.md", import.meta.url), "utf8");
    const statusSection =
      instructions.split("## Panorama periódico de status por projeto")[1]?.split("\n## ")[0] ?? "";
    expect(statusSection).toContain(
      "Não envie mensagens proativas de andamento fora do intervalo configurado",
    );
    expect(statusSection).toContain("mesmo quando houver mudança substancial");
    expect(statusSection).toContain(
      "A única exceção é uma notificação imediata de pronto para merge que o usuário tenha pedido explicitamente",
    );
    expect(statusSection).toContain("padrão é 30 minutos");
    expect(statusSection).toContain("uma mensagem breve por projeto");
    expect(statusSection).toContain("mudanças desde o último panorama e evidências verificadas");
    expect(statusSection).toContain("responda imediatamente nesse mesmo formato");
    expect(statusSection).toContain(
      "Um lembrete periódico de intervenção é uma mensagem breve, separada do panorama de progresso",
    );
    expect(statusSection).toContain(
      "só pode ser enviado no intervalo configurado se o projeto tiver pedido essencial ainda sem resposta ou ciência",
    );
    expect(statusSection).toContain("Limite o lembrete a esses pedidos");
    expect(statusSection).toContain(
      "Não repita pedidos respondidos, reconhecidos, cancelados, resolvidos ou substituídos",
    );
    expect(statusSection).toContain("se não houver pedido essencial pendente, não envie lembrete");
    expect(statusSection).toContain(
      "usando formulário, controle dedicado ou ferramenta estruturada de perguntas apropriada",
    );
    expect(statusSection).toContain("Nunca apresente opções em texto comum");
    expect(statusSection).toContain("relate falha ou incerteza honestamente");
    expect(statusSection).toContain("Não invente progresso");
    expect(statusSection).not.toContain("mensagens de progresso imediatas");
    expect(statusSection).toContain("não instala nem inicia um agendador");
    expect(usage).toContain("padrão é um panorama breve por projeto ativo a cada 30 minutos");
    expect(setup).toContain('"intervalMinutes": 30');
    expect(setup).toContain("--status-interval-minutes 60");
    expect(setup).toContain("O CLI não cria cron, daemon ou serviço de fundo");
    expect(setup).toContain("Não envie progresso proativo fora do intervalo");
    expect(setup).toContain("Para decisão, opinião, ação ou aprovação");
    expect(setup).toContain("Lembretes de intervenção são mensagens breves, separadas do panorama");
    expect(setup).toContain("só ocorrem no intervalo para projetos com pedido essencial");
    expect(setup).toContain("sem pendência essencial, não envie lembrete");
  });

  test("status acceptance examples suppress progress churn and track only pending interventions", () => {
    const acceptance = readFileSync(new URL("../examples/acceptance.md", import.meta.url), "utf8");
    const panoramaPolicy = [
      "não enviar mensagens proativas de andamento fora do intervalo configurado, que é 30 minutos por padrão",
      "Inícios de verificação, login confirmado, push na fila, CI intermediária e transferências não viram avisos separados",
      "Um pedido direto de status recebe resposta imediata, uma por projeto",
      "Um pedido aceito pela ferramenta não prova que foi exibido",
    ];
    for (const rule of panoramaPolicy) expect(acceptance).toContain(rule);
    expect(acceptance).toContain(
      "Não repita pedidos respondidos, reconhecidos, cancelados, resolvidos ou substituídos",
    );
    expect(acceptance).toContain(
      "A única exceção é uma notificação imediata de pronto para merge pedida explicitamente",
    );
    expect(acceptance).toContain(
      "Lembretes de intervenção são mensagens breves, separadas do panorama",
    );
    expect(acceptance).toContain(
      "só ocorrem no intervalo para projetos com pedido essencial ainda sem resposta ou ciência",
    );
    expect(acceptance).toContain("Limite-os a esses pedidos");
    expect(acceptance).toContain("sem pendência essencial, não envie lembrete");
  });

  test("model-role preferences require observable host routing and public role guidance", () => {
    const instructions = readFileSync(
      new URL("../instructions/holydot.md", import.meta.url),
      "utf8",
    );
    const specialist = readFileSync(
      new URL("../instructions/specialist.md", import.meta.url),
      "utf8",
    );
    const provenance = readFileSync(new URL("../docs/provenance.md", import.meta.url), "utf8");
    expect(instructions).toContain("GPT-6.1 Sol (`gpt-6.1-sol`) com esforço `medium`");
    expect(instructions).toContain("GPT-6 Luna (`gpt-6-luna`) com esforço `high`");
    expect(instructions).toContain("evidência de roteamento efetivo");
    expect(instructions).toContain(
      "Fast é opcional e só deve ser solicitado quando o usuário optar explicitamente",
    );
    expect(instructions).toContain("conteúdo de papel no pacote público");
    expect(specialist).toContain("Execute apenas a tarefa limitada recebida");
    expect(provenance).toContain("ff1b9ff5c2f35100095f19a4b55802bb931f6434");
    expect(provenance).not.toContain("writing-instructions/SKILL.md");
  });

  test("accepts a complete fixture and its local and external links", () => {
    const root = fixture();
    writeFileSync(
      join(root, "README.md"),
      `[guide](docs/usage.md) [web](https://example.com) [anchor](#start) [source](https://github.com/davidbasilefilho/holycodex/tree/${SOURCE_REVISION})`,
    );
    expect(validatePackage(root)).toEqual([]);
  });

  test("reports absent package directories", () => {
    expect(validatePackage(join(fixture(), "absent"))).toEqual([
      "Package directory does not exist or is not a directory",
    ]);
  });

  test.each(["missing", "empty", "directory"])("rejects a %s required file", (condition) => {
    const root = fixture();
    const path = join(root, "templates/task.md");
    rmSync(path);
    if (condition === "empty") writeFileSync(path, " \n");
    if (condition === "directory") mkdirSync(path);
    expect(validatePackage(root)).toContain("Missing or empty required file: templates/task.md");
  });

  test.each([
    ["[broken](missing.md)", "Broken local link"],
    ["[escape](../outside.md)", "Link escapes package"],
    [
      "[source](https://github.com/davidbasilefilho/holycodex/tree/next)",
      "Unpinned or unexpected source revision",
    ],
  ])("rejects invalid Markdown target %s", (content, expected) => {
    const root = fixture();
    writeFileSync(join(root, "README.md"), content);
    expect(validatePackage(root).some((error) => error.startsWith(expected))).toBe(true);
  });

  test("rejects links following a symlink outside the package", () => {
    const root = fixture();
    const outside = fixture();
    symlinkSync(join(outside, "README.md"), join(root, "external.md"));
    writeFileSync(join(root, "README.md"), "[outside](external.md)");
    expect(
      validatePackage(root).some((error) => error.startsWith("Link resolves outside package")),
    ).toBe(true);
  });

  test("rejects incomplete license markers", () => {
    const root = fixture();
    writeFileSync(join(root, "LICENSE"), "Apache License");
    expect(validatePackage(root)).toContain("Expected complete Apache-2.0 license markers");
  });

  test("ignores dependency and build Markdown", () => {
    const root = fixture();
    for (const name of [".git", "node_modules", "dist"]) {
      mkdirSync(join(root, name));
      writeFileSync(join(root, name, "README.md"), "[bad](missing.md)");
    }
    expect(validatePackage(root)).toEqual([]);
  });

  test("does not mutate inspected content", () => {
    const root = fixture();
    const before = readFileSync(join(root, "README.md"), "utf8");
    validatePackage(root);
    expect(readFileSync(join(root, "README.md"), "utf8")).toBe(before);
  });
});
