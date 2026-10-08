import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { runCli } from "../scripts/cli";

const approved = readFileSync(new URL("./fixtures/approved-communication.md", import.meta.url));
const digest = "70b8a168767100bb05a36ba65960b942d0e2b7491e6dece4b4e6a2adc11089ea";

test("approved communication block remains byte-exact in the canonical source", () => {
  expect(createHash("sha256").update(approved).digest("hex")).toBe(digest);
  expect(approved.length).toBe(14816);
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
    const outsideLiteral = output.replace(approved.toString("utf8"), "");
    for (const heading of outsideLiteral.split("\n").filter((line) => /^#{1,3} /.test(line)))
      expect(heading).toMatch(/^#{1,3} \*\*.+\*\*$/);
    expect(bytes.indexOf(approved, offset + approved.length)).toBe(-1);
    expect(output).toContain("match my vocabulary, directness, and sentence rhythm");
    expect(output).toContain(
      "when I request raw Markdown, provide its complete source in a code fence",
    );
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

test("replacement keeps conditional research, presentation and channel guidance intact", () => {
  const source = readFileSync(new URL("../instructions/holydot.md", import.meta.url), "utf8");
  for (const phrase of [
    "prefer lowercase except I and its contractions, proper names, acronyms, and identifiers",
    "when reporting on multiple projects, send a separate message for each project or task where the channel supports it",
    "otherwise, separate projects clearly without mixing their progress",
    "don't assume ChatGPT Intelligent UI or DIL rendering is available in a dot conversation",
    "these are preferences, not a whitelist",
    "rather than treating every conditional preference as mandatory in every situation",
    "apply an adaptive hybrid design system to supported rich content and created artifacts",
  ])
    expect(source).toContain(phrase);
  for (const removed of [
    "Conformidade persistente",
    "Uma mensagem por projeto ou tarefa",
    "Formulação direta",
    "Neither is mandatory in every paragraph or response.",
    "Reply in my latest language unless requested otherwise.",
  ])
    expect(source).not.toContain(removed);
});

// Authored acceptance examples test contract expectations, not generated model behavior.
const presentationCases = [
  {
    kind: "long response after many turns",
    turns: 120,
    meaningfulEmphasis: true,
    messages: [
      {
        scope: "project-a",
        text:
          "## **Resultado**\n\nO teste confirmou **preservação dos arquivos** no ambiente avaliado. A evidência cobre *esta execução local*, com os limites indicados.\n\n" +
          "A verificação registra o comando, o resultado observado e a versão avaliada. Ela preserva a diferença entre conclusão local e efeito remoto confirmado. ".repeat(
            10,
          ) +
          "\n\n## **Limite**\n\nA publicação segue pendente; o resultado local não comprova efeito externo.",
      },
    ],
  },
  {
    kind: "status of every active project",
    turns: 80,
    meaningfulEmphasis: true,
    messages: [
      {
        scope: "project-a",
        text: "**Projeto A:** os testes passaram *localmente*. Aguardo a verificação remota desta versão.",
      },
      {
        scope: "project-b",
        text: "**Projeto B:** a revisão foi concluída. A aprovação cobre *o mesmo escopo*; sigo com a etapa autorizada.",
      },
    ],
  },
  {
    kind: "integrated worker result",
    turns: 100,
    meaningfulEmphasis: true,
    messages: [
      {
        scope: "project-c",
        text: "## **Entrega verificada**\n\nRevisei o resultado do worker: **o teste passou** na versão avaliada. O relato cobre *o ambiente local*; a etapa externa continua sem confirmação.",
      },
    ],
  },
  {
    kind: "short answer without useful emphasis",
    turns: 120,
    meaningfulEmphasis: false,
    messages: [{ scope: "task-d", text: "A versão instalada é 0.1.0." }],
  },
];
const presentationErrors = (example: (typeof presentationCases)[number]) => {
  const errors: string[] = [];
  const scopes = new Set<string>();
  for (const message of example.messages) {
    if (scopes.has(message.scope)) errors.push("duplicate scope update");
    scopes.add(message.scope);
    for (const heading of message.text.split("\n").filter((line) => /^#{1,6} /.test(line)))
      if (!/^#{1,6} \*\*.+\*\*$/.test(heading)) errors.push("section heading must be bold");
    if (example.meaningfulEmphasis && !/\*\*[^*]+\*\*/.test(message.text))
      errors.push("important information missing emphasis");
    if (example.meaningfulEmphasis && !/(?<!\*)\*[^*\n]+\*(?!\*)/.test(message.text))
      errors.push("meaningful contrast missing italics");
    if (message.scope.includes(",")) errors.push("independent projects combined");
  }
  return errors;
};
for (const example of presentationCases)
  test(`authored persistent-compliance acceptance: ${example.kind}`, () => {
    expect(example.turns).toBeGreaterThanOrEqual(80);
    expect(presentationErrors(example)).toEqual([]);
    if (example.kind.startsWith("long"))
      expect(example.messages[0]!.text.length).toBeGreaterThan(1000);
    if (example.kind.startsWith("status"))
      expect(example.messages.map((message) => message.scope)).toEqual(["project-a", "project-b"]);
  });
test("authored rejection cases catch lost emphasis/headings and mixed or duplicated project messages", () => {
  expect(
    presentationErrors({
      kind: "degraded long answer",
      turns: 120,
      meaningfulEmphasis: true,
      messages: [{ scope: "project-a", text: "## Resultado\n\nTeste local passou." }],
    }),
  ).toContain("section heading must be bold");
  expect(
    presentationErrors({
      kind: "mixed status",
      turns: 80,
      meaningfulEmphasis: false,
      messages: [{ scope: "project-a,project-b", text: "Dois projetos em uma mensagem." }],
    }),
  ).toContain("independent projects combined");
  expect(
    presentationErrors({
      kind: "duplicated status",
      turns: 80,
      meaningfulEmphasis: false,
      messages: [
        { scope: "project-a", text: "Teste passou." },
        { scope: "project-a", text: "Teste passou." },
      ],
    }),
  ).toContain("duplicate scope update");
});
