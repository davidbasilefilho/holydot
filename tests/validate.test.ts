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
