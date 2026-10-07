import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  REQUIRED_FILES,
  SOURCE_REVISION,
  validatePackage as validateEffect,
} from "../scripts/validate";
import { Effect } from "effect";
const validatePackage = (directory: string) => Effect.runSync(validateEffect(directory));

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
  test("public package instructions reflect autonomy, role separation and batched questions", () => {
    const instructions = readFileSync(
      new URL("../instructions/holydot.md", import.meta.url),
      "utf8",
    );
    expect(instructions).toContain("Agrupe perguntas relacionadas em um único lote");
    expect(instructions).toContain("GPT-6.1 Sol com esforço medium");
    expect(instructions).toContain("GPT-6 Luna com esforço high");
    expect(instructions).toContain("sem seletor rule-mode");
    expect(instructions).toContain(
      "Uma chamada aceita pela ferramenta não comprova que o formulário apareceu",
    );
    expect(instructions).toContain("licença Apache-2.0");
  });

  test("adoption uses real rename and readback, preserves profile appearance and qualifies status claims", () => {
    const instructions = readFileSync(
      new URL("../instructions/holydot.md", import.meta.url),
      "utf8",
    );
    const adoption = instructions.split("## Identidade e adoção")[1]!.split("\n## ")[0]!;
    expect(adoption).toContain("Quando o dono pedir para adotar ou instalar");
    expect(adoption).toContain("cloud_threads.change_orbit_name");
    expect(adoption).toContain("definindo **holydot**");
    expect(adoption).toContain("cloud_threads.get_orbit_profile");
    expect(adoption).toContain("só afirme que o nome mudou se o resultado confirmar **holydot**");
    expect(adoption).toContain("Preserve o avatar e as cores atuais");
    expect(adoption).toContain("Não altere pet, imagem, cor, nem outras configurações do perfil");
    expect(adoption).toContain("Diferencie instruções em uso de nome de perfil verificado");
    expect(adoption).toContain("Se a alteração ou a verificação falhar ou não estiver disponível");
    expect(adoption).toContain("o que continua pendente, com o próximo passo suportado");
    expect(adoption).toContain("não comprova a mudança");
    expect(adoption).toContain("sem pedir que o usuário repita uma autorização já explícita");
    const status = instructions.split("## Atualizações de status")[1]!.split("\n## ")[0]!;
    expect(status).toContain("Uma preferência de intervalo não cria um agendamento");
    expect(status).toContain("confirme sua configuração antes de afirmar que está ativo");
    expect(status).toContain("uma mensagem curta por projeto ainda ativo");
    expect(status).toContain("verificação pendente");
    expect(status).toContain("Responda imediatamente a pedidos de status");
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
