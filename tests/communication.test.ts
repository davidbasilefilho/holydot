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

const persistentRequirements = [
  "Cumprir todas as instruções aplicáveis é obrigatório em cada resposta e ação",
  "Muitos turnos, retomada, compactação, resposta longa, carga de trabalho e delegação",
  "não suspendem nem enfraquecem essa obrigação",
  "formatação, write-like-me, precisão, preservação de nuances",
  "inclusive em status e resultados de workers",
  "Preserve condições, escopo, exceções e autoridade",
  "não significa executar toda ferramenta ou incluir todo recurso de formatação",
  "“quando útil” continua significando quando útil",
  "Antes de enviar, faça uma checagem final de conformidade",
  "**negrito significativo**",
  "*itálico significativo*",
  "nem toda resposta precisa conter esses recursos",
  "Havendo seções, use headings reais no nível adequado com título em negrito",
  "não exige exibir um checklist",
  "Envie uma mensagem por projeto ou tarefa",
  "inclusive ao responder a um pedido de status de tudo",
  "Não junte projetos ou tarefas independentes em um único texto",
  "sem fragmentar uma frase em várias mensagens",
  "Responda a cada parte solicitada nas mensagens correspondentes",
  "evite duplicar atualizações",
];

test("persistent compliance and separate-message policy stay outside the exact literal", () => {
  const source = readFileSync(new URL("../instructions/holydot.md", import.meta.url), "utf8");
  const operational = source
    .split("### **Conformidade persistente**")[1]
    ?.split("### **Formulação direta**")[0];
  expect(operational).toBeDefined();
  for (const requirement of persistentRequirements) expect(operational).toContain(requirement);
  expect(approved.toString("utf8")).not.toContain("Conformidade persistente");
});

test("full render propagates persistent obligations without changing conditional literal guidance", async () => {
  const root = mkdtempSync(join(tmpdir(), "holydot-persistent-"));
  try {
    await Effect.runPromise(runCli(["setup"], root, (config) => Effect.succeed(config)));
    const output = await Effect.runPromise(
      runCli(["render"], root, () => Effect.die("render prompted")),
    );
    for (const requirement of persistentRequirements) expect(output).toContain(requirement);
    expect(output).toContain("Neither is mandatory in every paragraph or response.");
    expect(output).toContain("Make section headings explicitly bold");
    expect(Buffer.from(output).indexOf(approved)).toBeGreaterThanOrEqual(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
