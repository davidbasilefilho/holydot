import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { runCli } from "../scripts/cli";

const approved = readFileSync(new URL("./fixtures/approved-communication.md", import.meta.url));
const digest = "8d35ae8d9d1ba6656abad7cb44b93320112d7c01f367905a4414360789b4a5ff";

test("approved communication block remains byte-exact in the canonical source", () => {
  expect(createHash("sha256").update(approved).digest("hex")).toBe(digest);
  expect(approved.length).toBe(8646);
  const source = readFileSync(new URL("../instructions/holydot.md", import.meta.url));
  const offset = source.indexOf(approved);
  expect(offset).toBeGreaterThanOrEqual(0);
  expect(source.subarray(offset, offset + approved.length)).toEqual(approved);
  expect(source.indexOf(approved, offset + approved.length)).toBe(-1);
});

test("full render preserves exact Markdown, bold headings, privacy and unrelated contracts", async () => {
  const root = mkdtempSync(join(tmpdir(), "holydot-communication-"));
  try {
    await Effect.runPromise(runCli(["setup"], root, (config) => Effect.succeed(config)));
    const before = readFileSync(join(root, "holydot.config.json"));
    const output = await Effect.runPromise(
      runCli(["render"], root, () => Effect.die("render prompted")),
    );
    const bytes = Buffer.from(output, "utf8");
    const offset = bytes.indexOf(approved);
    expect(bytes.subarray(offset, offset + approved.length)).toEqual(approved);
    for (const heading of output.split("\n").filter((line) => /^#{1,3} /.test(line)))
      expect(heading).toMatch(/^#{1,3} \*\*.+\*\*$/);
    expect(output).toContain(
      "length or technical depth is not a reason to revert to generic prose",
    );
    expect(output).toContain("When I need raw Markdown, put the complete source in a fenced block");
    expect(output).toContain("Um commit apenas local não conclui a etapa de persistência remota");
    expect(output).toContain("não autoriza merge, tag, release, publicação ou implantação");
    expect(output).toContain("não salvam uma regra de conta nem recriam uma regra excluída");
    expect(output).toContain("confirme sua configuração antes de afirmar que está ativo");
    expect(output).not.toContain("Não envie aviso imediato a cada mudança substancial");
    expect(output).not.toContain("Use write-like-me em trabalhos de escrita nos quais");
    expect(output).not.toMatch(
      /\uFFFD|libfile_|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
    expect(readdirSync(root)).toEqual(["holydot.config.json"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("direct wording states the intended test, environment and expected log without response rituals", () => {
  const source = readFileSync(new URL("../instructions/holydot.md", import.meta.url), "utf8");
  const section = source
    .split("### **Formulação direta**")[1]
    ?.split("### **Comunicação e apresentação")[0];
  expect(section).toBeDefined();
  for (const phrase of [
    "ação ou intenção real",
    "quem deve agir",
    "qual retorno é esperado",
    "nomes concretos",
    "arquivo intermediário de final",
    "contexto que ainda não foi comunicado",
    "mais curta que preserve escopo",
    "sem compensar uma frase ruim com mais parágrafos",
    "não exige checklist, títulos ou relatório em toda resposta",
    "profundidade e formatos úteis quando solicitados",
    "teste no Windows já instalado no seu PC e me envie o log",
    "não instala nem formata nada",
    "não é instalar Windows",
    "candidata de diagnóstico",
    "deixa ação, ambiente e retorno indefinidos",
  ])
    expect(section).toContain(phrase);
});
